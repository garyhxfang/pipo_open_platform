import { defineConfig } from 'vitepress'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? ''
const isUserOrOrgPagesRepo = repositoryName.endsWith('.github.io')
const base =
  process.env.GITHUB_ACTIONS === 'true' && repositoryName && !isUserOrOrgPagesRepo
    ? `/${repositoryName}/`
    : '/'

export default defineConfig({
  base,
  lang: 'zh-CN',
  title: 'PIPO',
  description: '面向商户与服务商的支付产品与集成指南',
  cleanUrls: true,
  themeConfig: {
    nav: [
      { text: '首页', link: '/' },
      {
        text: '产品',
        items: [
          {
            text: '全球收单',
            items: [
              {
                text: '<span class="mega-title">线上支付</span><span class="mega-desc">多渠道在线收款</span>',
                link: '/products/online-pay'
              },
              {
                text: '<span class="mega-title">代扣</span><span class="mega-desc">授权后自动扣费</span>',
                link: '/products/withholding'
              },
              {
                text: '<span class="mega-title">订阅</span><span class="mega-desc">周期性自动续费</span>',
                link: '/products/subscription'
              }
            ]
          },
          {
            text: '支付后',
            items: [
              {
                text: '<span class="mega-title">退款</span><span class="mega-desc">全额或部分退款</span>',
                link: '/api/refunds'
              },
              {
                text: '<span class="mega-title">拒付</span><span class="mega-desc">争议处理与申诉</span>',
                link: '/products/chargeback'
              },
              {
                text: '<span class="mega-title">结算</span><span class="mega-desc">按周期自动结算</span>',
                link: '/products/settlement'
              },
              {
                text: '<span class="mega-title">提现</span><span class="mega-desc">余额提现到银行户</span>',
                link: '/products/withdrawal'
              }
            ]
          },
          {
            text: '全球代发',
            items: [
              {
                text: '<span class="mega-title">单笔代发</span><span class="mega-desc">单次付款与追踪</span>',
                link: '/products/payout#single-payout'
              },
              {
                text: '<span class="mega-title">批量代发</span><span class="mega-desc">批次发放与回执</span>',
                link: '/products/payout#batch-payout'
              }
            ]
          },
          {
            text: '平台支付',
            items: [
              {
                text: '<span class="mega-title">合单支付</span><span class="mega-desc">多订单一次支付</span>',
                link: '/products/combined-payment'
              },
              {
                text: '<span class="mega-title">分账</span><span class="mega-desc">按规则自动分润</span>',
                link: '/products/split-billing'
              },
              {
                text: '<span class="mega-title">商户转账</span><span class="mega-desc">商户间资金划转</span>',
                link: '/products/merchant-transfer'
              },
              {
                text: '<span class="mega-title">基本户支付</span><span class="mega-desc">企业对公付款</span>',
                link: '/products/basic-account-payment'
              }
            ]
          }
        ]
      },
      {
        text: '解决方案',
        items: [
          { text: '解决方案总览', link: '/solutions/' },
          { text: '快速开始', link: '/guide/quick-start' },
          { text: 'Webhook 回调方案', link: '/guide/webhook' }
        ]
      },
      {
        text: '资源',
        items: [
          { text: '资源中心', link: '/resources/' },
          { text: '鉴权与签名', link: '/guide/auth-signature' },
          { text: '错误码与 FAQ', link: '/best-practices/faq' }
        ]
      }
    ],
    sidebar: [
      {
        text: '接入指南',
        items: [
          { text: '快速开始', link: '/guide/quick-start' },
          { text: '鉴权与签名', link: '/guide/auth-signature' },
          { text: 'Webhook 回调', link: '/guide/webhook' }
        ]
      },
      {
        text: 'API 文档',
        items: [
          { text: '支付下单', link: '/api/payments' },
          { text: '退款接口', link: '/api/refunds' }
        ]
      },
      {
        text: '运营与支持',
        items: [{ text: '错误码与 FAQ', link: '/best-practices/faq' }]
      }
    ],
    search: {
      provider: 'local'
    },
    socialLinks: [{ icon: 'github', link: 'https://example.com' }]
  }
})
