import { defineConfig } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig({
  resolve: {
    alias: {
      "@app": fileURLToPath(new URL("./src/app", import.meta.url)),
      "@assets": fileURLToPath(new URL("./src/assets", import.meta.url)),
      "@config": fileURLToPath(new URL("./src/config", import.meta.url))
    }
  },
  build: {
    target: "es2020"
  },
  server: {
    port: 5173,
    open: true
  }
});
