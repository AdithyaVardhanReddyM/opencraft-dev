import { defineConfig } from "vite";
import { resolve } from "path";

// Separate config for building content script as IIFE
export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/content/element-selector.ts"),
      name: "contentScript",
      formats: ["iife"],
      fileName: () => "content-script.js",
    },
    outDir: "dist",
    emptyOutDir: false, // Don't clear - main build runs first
    rollupOptions: {
      output: {
        extend: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
    },
  },
});
