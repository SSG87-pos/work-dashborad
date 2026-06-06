import { defineConfig } from "vite";

export default defineConfig({
  esbuild: {
    jsx: "automatic"
  },
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        if (warning.code === "MODULE_LEVEL_DIRECTIVE") return;
        warn(warning);
      },
      output: {
        manualChunks(id) {
          if (id.includes("/node_modules/emoji-picker-react/") || id.includes("/node_modules/flairup/")) return "emoji-picker";
          if (id.includes("/node_modules/@supabase/")) return "supabase";
          if (
            id.includes("/node_modules/@xyflow/") ||
            id.includes("/node_modules/d3-") ||
            id.includes("/node_modules/zustand/")
          ) return "mindmap-vendor";
          if (id.includes("/node_modules/")) return "vendor";
        }
      }
    }
  },
  resolve: {
    alias: {
      "@": "/src"
    }
  }
});
