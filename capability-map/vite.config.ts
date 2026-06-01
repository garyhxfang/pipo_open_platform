import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const repositoryName = process.env.GITHUB_REPOSITORY?.split('/')[1] ?? ''
const isGitHubActions = process.env.GITHUB_ACTIONS === 'true'
const base = isGitHubActions && repositoryName ? `/${repositoryName}/capability-map/` : '/'

export default defineConfig({
  base,
  plugins: [vue()]
})
