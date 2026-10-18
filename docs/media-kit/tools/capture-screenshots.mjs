// Recaptures the media-kit screenshots from a running build of Valence.
//
//   npm run build && npx vite preview --port 4173      (in one terminal)
//   npx -y -p playwright@1.56.0 node docs/media-kit/tools/capture-screenshots.mjs
//
// Needs Chromium for Playwright (`npx playwright install chromium` once, if it is not installed).
// Writes 2880 × 1800 PNGs to docs/media-kit/screenshots/. Set VALENCE_URL to point at another server.
import { chromium } from 'playwright'
import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const base = (process.env.VALENCE_URL ?? 'http://localhost:4173') + '/#'
const out = join(dirname(fileURLToPath(import.meta.url)), '..', 'screenshots')
mkdirSync(out, { recursive: true })

const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist'] })
const page = async (theme) =>
  (await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: theme })).newPage()
const shot = (p, name) => p.screenshot({ path: join(out, `valence-${name}.png`) })
const toTop = (p) =>
  p.evaluate(() => {
    window.scrollTo(0, 0)
    document.querySelectorAll('*').forEach((e) => { if (e.scrollTop) e.scrollTop = 0 })
  })
const click = async (p, name) => {
  try { await p.getByRole('button', { name }).first().click({ timeout: 2500 }); await p.waitForTimeout(900) }
  catch { console.warn('button not found:', name) }
}
const openLab = async (p, route) => {
  await p.goto(base + route, { waitUntil: 'networkidle' })
  await p.waitForTimeout(800)
  try { await p.getByRole('button', { name: 'Start the lab' }).click({ timeout: 2000 }) } catch {}
  await p.waitForTimeout(500)
  try { await p.getByRole('tab', { name: 'Lab' }).click({ timeout: 2000 }) } catch {}
  await p.waitForTimeout(1200)
}

let p = await page('light')
await p.goto(base + '/explore/caffeine', { waitUntil: 'networkidle' }); await p.waitForTimeout(3000); await shot(p, 'explorer-caffeine')
await p.goto(base + '/explore/elements/Cu', { waitUntil: 'networkidle' }); await p.waitForTimeout(2000); await toTop(p); await shot(p, 'periodic-table')
await openLab(p, '/lab/red-cabbage-ph'); await click(p, /Add the indicator/); await p.waitForTimeout(1500); await toTop(p); await shot(p, 'lab-red-cabbage')
await openLab(p, '/lab/titration'); await toTop(p); await shot(p, 'lab-titration')
await openLab(p, '/lab/aqueous'); await click(p, /Mix the two/); await p.waitForTimeout(1500); await toTop(p); await shot(p, 'lab-aqueous')
await p.goto(base + '/learn/hcl-nahco3', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500)
for (let i = 0; i < 3; i++) await click(p, /^Next/)
await click(p, /Energy/); await p.waitForTimeout(2000); await toTop(p); await shot(p, 'mechanism-timeline')

p = await page('dark')
await p.goto(base + '/explore/caffeine', { waitUntil: 'networkidle' }); await p.waitForTimeout(3000); await shot(p, 'explorer-caffeine-dark')
await p.goto(base + '/explore/elements', { waitUntil: 'networkidle' }); await p.waitForTimeout(2000); await shot(p, 'periodic-table-dark')

await browser.close()
console.log('Screenshots written to', out)
