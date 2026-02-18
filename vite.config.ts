import path from "path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  return {
    server: {
      port: 3000,
      host: "0.0.0.0",
      proxy: {
        "/api": {
          target: "http://127.0.0.1:4177",
          changeOrigin: true,
        },
      },
    },
    plugins: [
      react(),
      VitePWA({
        registerType: "autoUpdate",
        includeAssets: ["favicon.svg"],
        manifest: {
          name: "DocuFlow - Smart PDF Tools",
          short_name: "DocuFlow",
          description:
            "Merge, split, convert, and manage PDF documents with ease",
          theme_color: "#2563eb",
          background_color: "#ffffff",
          display: "standalone",
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          icons: [
            {
              src: "favicon.svg",
              sizes: "any",
              type: "image/svg+xml",
              purpose: "any maskable",
            },
          ],
        },
        workbox: {
          globPatterns: ["**/*.{js,css,html,ico,png,svg}"],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: "CacheFirst",
              options: {
                cacheName: "google-fonts-cache",
                expiration: {
                  maxEntries: 4,
                  maxAgeSeconds: 365 * 24 * 60 * 60, // 365 days
                },
              },
            },
          ],
        },
      }),
    ],
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return undefined;
            }

            if (id.includes("react") || id.includes("scheduler")) {
              return "vendor-react";
            }

            if (id.includes("react-router-dom") || id.includes("@remix-run")) {
              return "vendor-router";
            }

            if (
              id.includes("pdf-lib") ||
              id.includes("pdfjs-dist") ||
              id.includes("path2d")
            ) {
              return "vendor-pdf";
            }

            if (
              id.includes("docx") ||
              id.includes("mammoth") ||
              id.includes("jszip")
            ) {
              return "vendor-office";
            }

            if (
              id.includes("@dnd-kit") ||
              id.includes("lucide-react") ||
              id.includes("file-saver")
            ) {
              return "vendor-ui";
            }

            return "vendor-misc";
          },
        },
      },
      chunkSizeWarningLimit: 700,
    },
    define: {
      "process.env.API_KEY": JSON.stringify(env.GEMINI_API_KEY),
      "process.env.GEMINI_API_KEY": JSON.stringify(env.GEMINI_API_KEY),
    },
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "."),
      },
    },
  };
});
