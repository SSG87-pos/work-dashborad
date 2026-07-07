import { defineConfig } from "vite";

const githubRepositoryName = process.env.GITHUB_REPOSITORY?.split("/").pop();
const configuredBasePath = process.env.VITE_BASE_PATH?.trim();
const base = configuredBasePath || (process.env.GITHUB_ACTIONS === "true" && githubRepositoryName ? `/${githubRepositoryName}/` : "/");

export default defineConfig({
  base,
  assetsInclude: ["**/*.glb"],
  esbuild: {
    jsx: "automatic"
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
        warn(warning);
      },
      output: {}
    }
  },
  resolve: {
    alias: {
      "@": "/src"
    }
  }
});
