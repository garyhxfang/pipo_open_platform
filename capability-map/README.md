# 收单产品能力地图 Demo

能力地图是仓库内的独立 Vue 3 + Vite 应用，线上地址：

<https://garyhxfang.github.io/pipo_open_platform/capability-map/>

## 开始修改

1. 从最新的 `main` 创建功能分支，建议使用 `feature/<topic>` 或 `fix/<topic>`。
2. 在仓库根目录安装依赖并启动能力地图：

```bash
npm ci
npm run capability:dev
```

3. 打开 <http://localhost:5174/> 查看修改效果。
4. 提交前运行：

```bash
npm run capability:build
```

5. 推送分支并创建 Pull Request。PR 合并到 `main` 后，GitHub Actions 会自动发布线上版本。

## Supabase 后端

能力地图支持两种存储模式：

- 未配置环境变量时使用浏览器 `localStorage`，适合本地 UI 开发。
- 配置 Supabase 后，配置中心保存个人草稿，并通过不可变发布版本向能力地图提供数据。

### 1. 创建并初始化项目

在 Supabase 创建项目后，将仓库中的 migration 推送到项目：

```bash
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

数据库结构位于 `supabase/migrations/`。migration 会创建成员名单、个人草稿、发布版本、RLS 策略以及读取和发布函数。

### 2. 添加首位发布者

在 Supabase Dashboard 的 Authentication → Users 中创建用户，设置邮箱和密码并启用自动确认；然后在 SQL Editor 中执行：

```sql
insert into public.app_members (email, role)
values ('your-email@example.com', 'publisher');
```

邮箱必须使用小写。其他成员可以设置为 `viewer`、`editor` 或 `publisher`。

配置中心使用邮箱和密码登录，不发送 Magic Link。成员必须同时存在于 Authentication → Users 和 `public.app_members`；前者负责身份认证，后者负责配置中心角色授权。

### 配置数据结构

当前发布格式为 `schemaVersion: 4`，主要由以下部分组成：

- `dimensions`：产品链路支持条件维度，例如商户类型、产品、环境和集成模式。
- `capabilities`：统一维护选型能力特性和业务能力特性。普通/平台商户、支付产品、TT 端内外和集成模式都拥有自己的元数据及场景规则。
- `scenarioRules`：按照每个能力选中的场景维度展开完整组合，逐行维护各责任域支持状态。
- `marketRules`：维护主体与国家/地区支持条件中的单国家/地区例外。
- `marketPairExceptions`：维护确实存在限制的商户签约地与用户支付地组合。
- `conflicts`：不可同时支持或需要额外评估的能力组合。

配置中心会自动读取并迁移旧版 `schemaVersion: 1/2/3` 配置。发布仍采用不可变 JSONB 版本快照，以便稳定读取和回滚；下游能力的场景组合根据上游选型能力的支持状态自动裁剪，市场覆盖仍独立维护。

### 3. 配置前端

复制 `capability-map/.env.example` 为 `capability-map/.env.local`，填写：

```bash
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

在 Supabase Auth 的 URL Configuration 中加入：

- 本地：`http://localhost:5174/`
- 线上：`https://garyhxfang.github.io/pipo_open_platform/capability-map/`

GitHub Pages 部署还需要在仓库 Settings → Secrets and variables → Actions 中创建同名的两个 Repository secrets。

前端只能使用 publishable key。不要将 secret key 或 service role key 写入 `.env`、源码或 GitHub Pages 构建变量。

## 主要文件

| 文件 | 用途 |
| --- | --- |
| `src/App.vue` | 页面框架、顶部筛选和业务阶段切换 |
| `src/capabilityData.ts` | 收单支付能力和支付方式演示数据 |
| `src/RefundDisputeView.vue` | 退款与拒付 |
| `src/SettlementView.vue` | 清结算 |
| `src/ReconciliationView.vue` | 账单与对账 |
| `src/AcquiringConfigView.vue` | 收单能力配置中心 |
| `src/styles.css` | 全局页面样式和响应式规则 |

## 协作约定

- 一个 PR 只处理一个明确主题，避免同时调整多个业务阶段。
- 不要提交 `capability-map/dist` 的构建产物。
- 能力状态或规则变更需要在 PR 中说明数据依据和受影响场景。
- UI 修改需要附桌面端截图；涉及响应式布局时同时附移动端截图。
- 不直接向 `main` 推送功能改动，使用分支和 PR 完成评审。

## GitHub 网页修改

小范围文案或数据调整可以在 GitHub 文件页面点击编辑按钮，GitHub 会自动创建分支并引导发起 PR。涉及组件、样式或交互的修改，建议使用 GitHub Codespaces 或在本地运行项目，以便实时预览和执行构建检查。
