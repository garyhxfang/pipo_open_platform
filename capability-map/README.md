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
