import { chromium } from 'playwright';
import path from 'node:path';
import fs from 'node:fs/promises';

const BASE_URL = process.env.DOCUFLOW_WEB_URL || 'http://127.0.0.1:3000';
const CHROME_CANDIDATES = [
  process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
  process.env.CHROME_PATH,
  process.env.CHROME_BINARY_PATH,
  '/usr/bin/google-chrome',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
  '/usr/bin/brave-browser',
].filter(Boolean);

const existingChrome = async () => {
  for (const candidate of CHROME_CANDIDATES) {
    try {
      await fs.access(candidate);
      return candidate;
    } catch {}
  }
  return undefined;
};

const requireText = (body, text, route) => {
  if (!body.includes(text)) throw new Error(`${route} did not include expected text: ${text}`);
};

const main = async () => {
  const browser = await chromium.launch({ headless: true, executablePath: await existingChrome(), args: ['--no-sandbox', '--disable-setuid-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const routes = ['/', '/redact', '/privacy-scan', '/stamp', '/protect', '/unlock', '/compress', '/pdf-to-md', '/hwp-to-pdf', '/pdf-to-hwp'];
  for (const route of routes) {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle' });
    const body = await page.locator('body').innerText();
    if (body.length < 20 || body.includes('Unexpected Application Error')) throw new Error(`${route} failed route smoke`);
  }

  const fixture = path.resolve('server-runtime', 'fixtures', 'regression-smoke.pdf');
  const stamp = path.resolve('server-runtime', 'fixtures', 'stamp.png');

  await page.goto(`${BASE_URL}/redact`, { waitUntil: 'networkidle' });
  await page.locator('input[type=file]').setInputFiles(fixture);
  await page.waitForTimeout(2500);
  let body = await page.locator('body').innerText();
  requireText(body, 'Detection summary', '/redact');
  requireText(body, 'Drag on the page', '/redact');

  await page.goto(`${BASE_URL}/stamp`, { waitUntil: 'networkidle' });
  await page.locator('input[type=file]').setInputFiles(fixture);
  await page.waitForTimeout(1000);
  await page.locator('input[accept="image/png,image/jpeg,.png,.jpg,.jpeg"]').setInputFiles(stamp);
  await page.waitForTimeout(1500);
  body = await page.locator('body').innerText();
  requireText(body, 'Click or drag on the page', '/stamp');

  await page.goto(`${BASE_URL}/hwp-to-pdf`, { waitUntil: 'networkidle' });
  body = await page.locator('body').innerText();
  requireText(body, 'HWP', '/hwp-to-pdf');

  await page.goto(`${BASE_URL}/pdf-to-hwp`, { waitUntil: 'networkidle' });
  body = await page.locator('body').innerText();
  requireText(body, 'HWP', '/pdf-to-hwp');

  await browser.close();
  console.log('Browser route smoke passed', JSON.stringify({ routes: routes.length }));
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
