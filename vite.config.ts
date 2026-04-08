import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import vuetify from "vite-plugin-vuetify";
import { fileURLToPath, URL } from "node:url";

const REPORTING_CHUNK_WARNING_LIMIT_KB = 1200;

export default defineConfig({
  plugins: [vue(), vuetify({ autoImport: true })],
  build: {
    chunkSizeWarningLimit: REPORTING_CHUNK_WARNING_LIMIT_KB,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("src/app/utils/maintenance-intelligence-reports")) {
            return "reports-core";
          }
          if (id.includes("node_modules/exceljs")) {
            return "reports-excel";
          }
          if (id.includes("node_modules/jspdf") || id.includes("node_modules/jspdf-autotable")) {
            return "reports-pdf";
          }
          if (id.includes("node_modules/html2canvas")) {
            return "reports-canvas";
          }
          return undefined;
        },
      },
    },
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
