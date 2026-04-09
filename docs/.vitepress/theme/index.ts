import DefaultTheme from 'vitepress/theme'
import type { Theme } from 'vitepress'
import PaymentProducts from './components/PaymentProducts.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('PaymentProducts', PaymentProducts)
  }
} satisfies Theme
