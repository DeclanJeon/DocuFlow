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
        includeAssets: [
          "favicon.svg",
          "icon.svg",
          "maskable-icon.svg",
          "apple-touch-icon.png",
          "og-image.png",
          "robots.txt",
          "sitemap.xml",
          "llms.txt",
        ],
        manifest: {
          name: "DocuFlow | 무료 PDF 변환·편집·OCR·보안 문서 도구",
          short_name: "DocuFlow",
          description:
            "무료 PDF 병합, 분할, 압축, OCR, Markdown 변환, HWP/HWPX 변환, 암호 보호, 잠금 해제, 개인정보 검사, 보안 처리, 도장·서명 문서 도구",
          theme_color: "#4F46E5",
          background_color: "#ffffff",
          display: "standalone",
          orientation: "portrait",
          scope: "/",
          start_url: "/",
          categories: ["productivity", "utilities", "business"],
          lang: "ko-KR",
          icons: [
            {
              src: "favicon.svg",
              sizes: "64x64",
              type: "image/svg+xml",
              purpose: "any",
            },
            {
              src: "icon.svg",
              sizes: "512x512",
              type: "image/svg+xml",
              purpose: "any",
            },
            {
              src: "maskable-icon.svg",
              sizes: "512x512",
              type: "image/svg+xml",
              purpose: "maskable",
            },
            {
              src: "apple-touch-icon.png",
              sizes: "180x180",
              type: "image/png",
              purpose: "any",
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
