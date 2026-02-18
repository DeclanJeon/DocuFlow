import express from "express";
import { chromium } from "playwright";

const app = express();
const PORT = Number(process.env.PDF_SERVER_PORT || 4177);

app.use(express.json({ limit: "60mb" }));

let browserPromise;

const getBrowser = async () => {
  if (!browserPromise) {
    browserPromise = chromium
      .launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
      })
      .catch((error) => {
        browserPromise = undefined;
        throw error;
      });
  }
  return browserPromise;
};

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/render-pdf", async (req, res) => {
  try {
    const html = typeof req.body?.html === "string" ? req.body.html : "";
    if (!html.trim()) {
      res.status(400).json({ error: "html is required" });
      return;
    }

    const browser = await getBrowser();
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.setContent(html, { waitUntil: "networkidle" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "14mm", right: "14mm", bottom: "14mm", left: "14mm" },
    });

    await context.close();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Cache-Control", "no-store");
    res.send(Buffer.from(pdfBuffer));
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    console.error("Headless PDF render failed", error);

    const needsInstall = message.includes("Executable doesn't exist");
    const clientMessage = needsInstall
      ? "Playwright browser is missing. Run: pnpm exec playwright install chromium"
      : "Failed to render PDF";

    res.status(500).json({ error: clientMessage });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Headless PDF server listening on :${PORT}`);
});

const shutdown = async () => {
  try {
    if (browserPromise) {
      const browser = await browserPromise;
      await browser.close();
    }
  } finally {
    server.close(() => process.exit(0));
  }
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
