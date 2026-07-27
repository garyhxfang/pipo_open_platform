import { resolve } from "node:path";
import { defineConfig } from "vite";

const repositoryName = process.env.GITHUB_REPOSITORY?.split("/")[1] ?? "";
const isGitHubActions = process.env.GITHUB_ACTIONS === "true";
const base =
  isGitHubActions && repositoryName
    ? `/${repositoryName}/open-platform/`
    : "/";

export default defineConfig({
  base,
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        payment: resolve(__dirname, "payment/index.html"),
        paymentMethods: resolve(__dirname, "payment-methods/index.html"),
        integrationGuide: resolve(__dirname, "integration-guide/index.html"),
        docsCenter: resolve(__dirname, "docs/index.html"),
        onlinePaymentDocs: resolve(__dirname, "docs/payment/online-payment/index.html"),
      },
    },
  },
});
