import './style.css';
import { invoke } from '@tauri-apps/api/core';
import { casefile, casefileHtml, download, makeSampleRun, sampleStages, type RunReceipt, type Stage } from './diagnostic';
import { signedCasefile } from './signing';

const root = document.querySelector<HTMLDivElement>('#app')!;
const product = 'VRAM Burn-in Kit';
let demo = location.pathname === '/demo' || location.search.includes('demo=1');
const demoStorageKey = 'demo:gpu-vram-burnin:receipt';
const realStorageKey = 'gpu-vram-burnin:receipt';
const isDesktop = '__TAURI_INTERNALS__' in window;
let run: RunReceipt | null = loadRun(demo ? demoStorageKey : realStorageKey) || (demo ? makeSampleRun() : null);
let offline = !navigator.onLine;
let liveMessage = '';
let adapters: Adapter[] = [];
let benchMessage = '';
let running = false;
const releaseApi = 'https://api.github.com/repos/B-Divyesh/sf-gpu-vram-burnin/releases/latest';

type License = { token: string; valid: boolean; checkedAt: number };
type Adapter = { id: string; name: string; memoryMib?: number; temperatureC?: number; supported: boolean; note: string };
type DiagnosticConfig = { adapterId: string; windowMib: number; temperatureLimitC: number; retries: number };
const licenseKey = 'sb_license:gpu-vram-burnin';
const licenseCache = 'sb_license_cache:gpu-vram-burnin';
function license(): License | null { try { return JSON.parse(localStorage.getItem(licenseCache) || 'null'); } catch { return null; } }
function isPro() { const item = license(); return !!item?.valid; }
function loadRun(key: string): RunReceipt | null { try { return JSON.parse(localStorage.getItem(key) || 'null') as RunReceipt | null; } catch { return null; } }
function saveRun(receipt: RunReceipt) { localStorage.setItem(receipt.demo ? demoStorageKey : realStorageKey, JSON.stringify(receipt)); }
function esc(value: string) { return value.replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]!); }
if (demo && run && !localStorage.getItem(demoStorageKey)) saveRun(run);

function appPath() { if (location.search.includes('demo=1')) return '/demo'; return location.pathname.replace(/\/$/, '') || '/'; }
function nav(to: string) { history.pushState({}, '', to); render(); window.scrollTo({ top: 0, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }
window.addEventListener('popstate', render);
window.addEventListener('online', () => { offline = false; render(); });
window.addEventListener('offline', () => { offline = true; render(); });

function header() { return `<a class="skip" href="#main">Skip to content</a><header class="site-head"><a class="wordmark" href="/" data-link><span aria-hidden="true">▣</span> VRAM Burn-in Kit</a><nav aria-label="Main navigation"><a href="/demo" data-link>Demo</a><a href="#how" data-anchor>How it works</a><a href="/privacy" data-link>Privacy</a></nav></header>`; }
function footer() { return `<footer><p>Bounded GPU memory tests with a diagnostic receipt.</p><p><a href="/privacy" data-link>Privacy</a> · <a href="/terms" data-link>Terms</a> · Built by Param Factory · v0.1.9</p><p class="generated-note">Illustration generated for this product.</p></footer>`; }
function banner() { return demo ? `<aside class="demo-banner" aria-label="Demo mode"><strong>Demo — sample data, nothing is saved</strong><span><button class="quiet" data-action="reset-demo">Reset demo</button><button class="quiet" data-action="start-real">Start for real</button></span></aside>` : ''; }
function layout(content: string) { return `${header()}${banner()}<main id="main" tabindex="-1">${offline ? '<p class="offline" role="status">You are offline. The sample run and exports still work.</p>' : ''}${content}</main>${footer()}<div class="sr" aria-live="polite">${liveMessage}</div>`; }

function stageList(stages: Stage[], compact = false) { return `<ol class="stages ${compact ? 'compact' : ''}">${stages.map((s, i) => `<li class="stage ${s.result}"><span class="number">${i + 1}</span><div><strong>${s.name}</strong><small>${s.detail}</small></div><span class="stage-data">${s.bytes}<b>${s.errors ? `${s.errors} mismatch` : s.result === 'pending' ? 'waiting' : s.result}</b></span></li>`).join('')}</ol>`; }
function runPanel() {
  if (!run) return diagnosticBench();
  const verdict = run.stages.some(s => s.result === 'fail') ? 'Fault found' : run.stages.some(s => s.result === 'retry') ? 'Retry needed' : 'No mismatch seen';
  return `<section class="bench run" aria-labelledby="run-heading"><div class="run-top"><div><p class="eyebrow">${run.demo ? 'Sample diagnostic receipt' : 'Diagnostic receipt'}</p><h2 id="run-heading">${run.gpu}</h2><p>${run.id} · ${new Date(run.startedAt).toLocaleString()}</p></div><div class="temp"><strong>${run.temperature}°C</strong><span>peak temperature</span></div></div><div class="verdict ${verdict === 'No mismatch seen' ? 'pass' : 'fail'}"><strong>${verdict}</strong><span>${run.confidence}</span></div>${stageList(run.stages)}<div class="export-row"><button class="secondary" data-action="json">Download JSON casefile</button><button class="secondary" data-action="html">Download HTML casefile</button>${isPro() ? '<button class="secondary" data-action="signed-json">Download signed JSON</button>' : ''}</div><p class="fine-print">A clean pass does not certify hardware health. Repeat when the system is warm and under your normal load.</p></section>`;
}
function diagnosticBench() {
  if (!isDesktop) return `<section class="bench empty"><div><p class="eyebrow">Desktop diagnostic bench</p><h2>Run the real test in the desktop app.</h2><p>The browser demo is a receipt preview. Install the app to select an adapter and test a bounded memory window locally.</p><a class="primary" href="#downloads">Get the desktop app</a></div><div class="paper-stack" aria-hidden="true"><span></span><span></span><span></span></div></section>`;
  const options = adapters.length ? adapters.map(adapter => `<option value="${esc(adapter.id)}" ${!adapter.supported ? 'disabled' : ''}>${esc(adapter.name)}${adapter.memoryMib ? ` · ${adapter.memoryMib} MiB` : ''}${adapter.temperatureC !== undefined ? ` · ${adapter.temperatureC}°C` : ''}</option>`).join('') : '<option value="">Scan to list adapters</option>';
  return `<section class="bench empty diagnostic" aria-labelledby="diagnostic-heading"><div><p class="eyebrow">Diagnostic bench</p><h2 id="diagnostic-heading">Choose a GPU, then run a bounded test.</h2><p>The app allocates, fills, copies, reads back, and submits a compute pass. It checks NVIDIA temperature telemetry before each attempt.</p><div class="bench-controls"><label>GPU adapter<select id="adapter">${options}</select></label><label>Test window <select id="window-mib"><option value="256">256 MiB</option><option value="512">512 MiB</option><option value="1024" selected>1 GiB</option><option value="2048">2 GiB</option><option value="4096">4 GiB</option><option value="8192">8 GiB</option></select></label><label>Stop at <select id="temperature-limit"><option value="75">75°C</option><option value="80" selected>80°C</option><option value="85">85°C</option><option value="90">90°C</option></select></label><label>Retry failed run <select id="retries"><option value="0">Never</option><option value="1" selected>Once</option><option value="2">Twice</option></select></label></div><div class="export-row"><button class="secondary" data-action="scan" ${running ? 'disabled' : ''}>Scan adapters</button><button class="primary" data-action="run" ${running || !adapters.some(adapter => adapter.supported) ? 'disabled' : ''}>${running ? 'Running test…' : 'Run memory test'}</button></div>${benchMessage ? `<p class="bench-message" role="status">${esc(benchMessage)}</p>` : ''}</div></section>`;
}
function paid() { return `<section class="paid" aria-labelledby="paid-heading"><div><p class="eyebrow">One-time license</p><h2 id="paid-heading">Keep the basic test free.</h2><p>Pro adds locally signed JSON casefiles for $19 once.</p></div><div><p class="price">$19 <small>one time</small></p>${isPro() ? '<p class="pass-note">License active on this device.</p>' : '<a class="primary" href="https://api.sociobot.in/api/v1/products/gpu-vram-burnin/checkout">Buy Pro</a>'}<form class="restore-license" data-form="restore"><label for="license-token">Have a license? Paste it</label><div><input id="license-token" name="license" autocomplete="off" spellcheck="false" required aria-describedby="license-help"><button class="text-button" type="submit">Restore license</button></div><small id="license-help">The token stays in this browser or app storage.</small></form></div></section>`; }
function downloads() { return `<section id="downloads" class="downloads" aria-labelledby="downloads-heading"><p class="eyebrow">Desktop app</p><h2 id="downloads-heading">Install a local test bench.</h2><p>Choose your platform. Builds are unsigned while publisher certificates are arranged.</p><div class="download-actions"><button class="secondary" data-action="download-windows">Windows download</button><button class="secondary" data-action="download-macos">macOS download</button><button class="secondary" data-action="download-linux">Linux download</button></div><p class="download-status" id="download-status" role="status">Downloads are being published. Each button checks the current release first.</p></section>`; }
function landing() { return layout(`<section class="hero"><div class="hero-copy"><p class="eyebrow">GPU memory test receipt</p><h1>Test GPU memory before long jobs.</h1><p class="lede">For PC builders and local-AI operators who need evidence before trusting a card overnight.</p><div class="actions"><button class="primary" data-action="sample">Try it with sample data</button><span>See a finished test receipt.</span></div><ul class="facts"><li>Desktop tests run locally</li><li>Sample works offline</li><li>Basic pass is free</li></ul></div><figure><img src="/paper-gpu.webp" width="1200" height="800" fetchpriority="high" alt="A paper-cut graphics card test bench with memory chips and an inspection slip."><figcaption>Each paper layer is a test stage you can inspect.</figcaption></figure></section><section class="product-preview" aria-labelledby="preview-heading"><div><p class="eyebrow">The product</p><h2 id="preview-heading">Know which path disagreed.</h2><p>Allocation, fill, copy, readback, and shader passes remain separate in the receipt.</p></div>${runPanel()}</section><section id="how" class="how" aria-labelledby="how-heading"><p class="eyebrow">How it works</p><h2 id="how-heading">Run a bounded memory check in three steps.</h2><ol><li><strong>Pick the adapter.</strong><span>The desktop app lists its supported GPU adapters.</span></li><li><strong>Set the guardrails.</strong><span>Choose a memory window, stop temperature, and retry count.</span></li><li><strong>Attach the casefile.</strong><span>Export the exact stages and result for support.</span></li></ol></section><section class="limits"><h2>What this tool does not do.</h2><p>It does not overclock, repair, tune drivers, or promise a healthy card. It tests a chosen memory window and reports what it saw.</p><p>No telemetry runs. Your test receipt stays on this device unless you download it.</p></section>${downloads()}${paid()}`); }
function demoPage() { return layout(`<section class="app-page"><div class="app-intro"><p class="eyebrow">Sample data</p><h1>Inspect a GPU memory test receipt.</h1><p class="lede">This sample shows a clean, bounded 8 GiB test on a typical local-AI card.</p></div>${runPanel()}<aside class="callout"><strong>What you are seeing</strong><p>The receipt separates transfer failures from compute-path failures. Download either casefile format to inspect it.</p></aside></section>${paid()}`); }
function legal(kind: 'privacy' | 'terms') { const privacy = kind === 'privacy'; document.title = `${privacy ? 'Privacy' : 'Terms'} — ${product}`; return layout(`<article class="legal"><p class="eyebrow">${privacy ? 'Privacy' : 'Terms'}</p><h1>${privacy ? 'Your test data stays on this device.' : 'Terms for VRAM Burn-in Kit.'}</h1>${privacy ? '<p>VRAM Burn-in Kit does not send diagnostics, hardware names, or casefiles to us. The sample mode uses a separate browser storage key and is discarded when you start for real.</p><p>If you buy Pro or verify a license, your browser contacts Sociobot’s billing service. Sociobot and Dodo act as merchant of record. We do not operate analytics.</p><p>You can clear local product data in your browser or app storage at any time.</p>' : '<p>This tool reports the outcome of bounded memory tests. It does not certify hardware health or prevent data loss. Use it on a stable system and keep backups.</p><p>Pro is a one-time license. License verification is provided by Sociobot. A refund may revoke the license.</p><p>Nothing in this app is repair, driver-tuning, or overclocking advice.</p>'}</article>`); }
function notFound() { document.title = `Not found — ${product}`; return layout(`<section class="not-found"><div class="paper-stack" aria-hidden="true"><span></span><span></span><span></span></div><h1>That test sheet is missing.</h1><p>Return to the diagnostic bench to start a sample run.</p><a class="primary" href="/" data-link>Return to the bench</a></section>`); }

function render() { const path = appPath(); document.title = path === '/' ? `${product} — test GPU memory` : path === '/demo' ? `Demo — ${product}` : document.title; root.innerHTML = path === '/' ? landing() : path === '/demo' ? demoPage() : path === '/privacy' ? legal('privacy') : path === '/terms' ? legal('terms') : notFound(); bind(); requestAnimationFrame(() => document.querySelector<HTMLElement>('h1')?.focus()); }
function bind() {
  root.querySelectorAll<HTMLAnchorElement>('[data-link]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); nav(a.getAttribute('href')!); }));
  root.querySelectorAll<HTMLAnchorElement>('[data-anchor]').forEach(a => a.addEventListener('click', e => { e.preventDefault(); document.querySelector(a.getAttribute('href')!)?.scrollIntoView({ behavior: 'smooth' }); }));
  root.querySelectorAll<HTMLElement>('[data-action]').forEach(el => el.addEventListener('click', () => action(el.dataset.action!)));
  root.querySelector<HTMLFormElement>('[data-form="restore"]')?.addEventListener('submit', event => { event.preventDefault(); const form = event.currentTarget as HTMLFormElement; const token = new FormData(form).get('license'); if (typeof token === 'string' && token.trim()) void verify(token.trim()); });
}
async function action(kind: string) {
  if (kind === 'sample' || kind === 'reset-demo') { demo = true; run = makeSampleRun(); saveRun(run); liveMessage = 'Sample diagnostic receipt loaded.'; if (appPath() !== '/demo') nav('/demo'); else render(); return; }
  if (kind === 'start-real') { demo = false; run = loadRun(realStorageKey); localStorage.removeItem(demoStorageKey); liveMessage = 'Demo data discarded.'; nav('/'); return; }
  if (kind === 'json' && run) { download(casefile(run), `${run.id}.json`, 'application/json'); liveMessage = 'JSON casefile downloaded.'; return; }
  if (kind === 'html' && run) { download(casefileHtml(run), `${run.id}.html`, 'text/html'); liveMessage = 'HTML casefile downloaded.'; return; }
  if (kind === 'signed-json' && run && isPro()) {
    try { download(await signedCasefile(run), `${run.id}.signed.json`, 'application/json'); liveMessage = 'Signed JSON casefile downloaded.'; }
    catch { liveMessage = 'Could not create the local signing identity. Check browser or app storage, then try again.'; render(); }
    return;
  }
  if (kind === 'scan') { await scanAdapters(); return; }
  if (kind === 'run') { await runDiagnostic(); return; }
  if (kind.startsWith('download-')) { await downloadLatest(kind.replace('download-', '')); }
}
async function scanAdapters() {
  if (!isDesktop) return;
  running = true; benchMessage = 'Scanning GPU adapters…'; render();
  try { adapters = await invoke<Adapter[]>('scan_adapters'); benchMessage = adapters.some(adapter => adapter.supported) ? 'Choose an adapter and test window.' : adapters[0]?.note || 'No adapter found.'; }
  catch { benchMessage = 'The desktop core could not scan adapters. Check the installed GPU driver, then retry.'; }
  running = false; render();
}
async function runDiagnostic() {
  const adapterId = root.querySelector<HTMLSelectElement>('#adapter')?.value || '';
  const windowMib = Number(root.querySelector<HTMLSelectElement>('#window-mib')?.value || 0);
  const temperatureLimitC = Number(root.querySelector<HTMLSelectElement>('#temperature-limit')?.value || 0);
  const retries = Number(root.querySelector<HTMLSelectElement>('#retries')?.value || 0);
  if (!adapterId) { benchMessage = 'Scan and choose an adapter before starting.'; render(); return; }
  running = true; benchMessage = 'Running bounded allocation, fill, copy, readback, and compute checks…'; render();
  try {
    const receipt = await invoke<RunReceipt>('run_diagnostic', { config: { adapterId, windowMib, temperatureLimitC, retries } satisfies DiagnosticConfig });
    run = { ...receipt, demo: false }; saveRun(run); liveMessage = 'Memory test receipt ready.'; benchMessage = '';
  } catch (error) { benchMessage = typeof error === 'string' ? error : 'The test could not finish. Let the card cool or choose a smaller window, then retry.'; }
  finally { running = false; render(); }
}
async function downloadLatest(platform: string) {
  const status = document.querySelector('#download-status');
  if (status) status.textContent = 'Checking the current release…';
  try {
    type Release = { html_url: string; assets: { name: string; browser_download_url: string }[] };
    const cached = (() => { try { return JSON.parse(localStorage.getItem('gpu-vram-burnin:release') || 'null') as { savedAt: number; value: Release } | null; } catch { return null; } })();
    let release: Release;
    if (cached && Date.now() - cached.savedAt < 3_600_000) release = cached.value;
    else { const response = await fetch(releaseApi); if (!response.ok) throw new Error('release not found'); release = await response.json() as Release; localStorage.setItem('gpu-vram-burnin:release', JSON.stringify({ savedAt: Date.now(), value: release })); }
    const names: Record<string, RegExp> = { windows: /\.(msi|exe|zip)$/i, macos: /\.(dmg|app\.tar\.gz)$/i, linux: /\.(AppImage|deb)$/i };
    const asset = release.assets.find(item => names[platform].test(item.name));
    if (!asset) throw new Error('platform asset not found');
    location.assign(asset.browser_download_url);
  } catch {
    if (status) status.innerHTML = 'Downloads are being published. <a href="https://github.com/B-Divyesh/sf-gpu-vram-burnin/releases">Open the release page</a>.';
  }
}
async function verify(token: string) {
  localStorage.setItem(licenseKey, token);
  const cached = license(); if (cached?.token === token && Date.now() - cached.checkedAt < 86_400_000) { render(); return; }
  try { const response = await fetch(`https://api.sociobot.in/api/v1/products/gpu-vram-burnin/verify?license=${encodeURIComponent(token)}`); const value = await response.json() as { valid: boolean }; localStorage.setItem(licenseCache, JSON.stringify({ token, valid: value.valid, checkedAt: Date.now() })); liveMessage = value.valid ? 'License active.' : 'License no longer active.'; } catch { liveMessage = 'License saved. It will verify when you are online.'; }
  render();
}
function restoreCachedLicense() {
  const token = localStorage.getItem(licenseKey); const cached = license();
  if (token && (!cached || cached.token !== token || Date.now() - cached.checkedAt >= 86_400_000) && navigator.onLine) void verify(token);
}
if ('serviceWorker' in navigator) window.addEventListener('load', () => {
  let hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (hadController) location.reload();
    hadController = true;
  });
  void navigator.serviceWorker.register('/sw.js').then(registration => {
    registration.addEventListener('updatefound', () => {
      const worker = registration.installing;
      worker?.addEventListener('statechange', () => {
        if (worker.state === 'installed' && navigator.serviceWorker.controller) worker.postMessage('skip-waiting');
      });
    });
  });
});
const token = new URLSearchParams(location.search).get('license'); if (token) { history.replaceState({}, '', location.pathname); void verify(token); } else { restoreCachedLicense(); render(); }

export { casefile, makeSampleRun, sampleStages };
