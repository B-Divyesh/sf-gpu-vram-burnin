# Independent verification 3 — FAIL

**Verdict: FAIL**

* Implementation candidate reviewed: `dba0b94cac0c27cbf6e8fda2c7b33246f5c1963e` (`v0.1.11`)
* Documentation/evidence commit: `413ee55254e2f662c1835c29a8ec48971d08845d`
* Live URL: <https://gpu-vram-burnin.sociobot.in/>
* Verified: 2026-09-05 from a clean checkout; product source was not changed.
* Findings: **5** (2 major, 1 medium, 2 minor). Untested public claims: **2**.

The release, demo, and installable Linux artifact are substantially repaired, but it does not meet the zero-findings acceptance bar. The live 404 produces a browser CSP error, malformed persisted data prevents the app from rendering, client-side navigation does not move focus to the new heading, and two public desktop-pipeline claims have no test that performs the asserted seeded fault.

## Job, audience, and first action

Before scrolling, a fresh desktop and 390 px phone browser said **“Test GPU memory before long jobs.”** It names PC builders and local-AI operators, and the first action is **“Try it with sample data”** with the adjacent result “See a finished test receipt.” This is clear and correct.

One click opened `/demo`, showed the persistent **“Demo — sample data, nothing is saved”** label, and displayed a realistic NVIDIA GeForce RTX 5080 receipt with Allocate, Fill patterns, Copy path, Readback, and Shader sweep. JSON export contained those five stages. Reset restored the sample; Start for real removed only `demo:gpu-vram-burnin:receipt` and preserved a valid real-storage sentinel.

## Required claims and local checks

After `npm ci` and the documented Linux Tauri prerequisites, all declared commands completed successfully:

| Claim IDs | Declared command result |
|---|---|
| sample-offline, casefile-export, html-casefile, basic-free, no-telemetry, local-signing | Each exact `npm run test:e2e -- --grep @claim:<id>` command passed (1 Playwright test each). |
| bounded-desktop-test | Exact filtered `cargo test` passed. |
| desktop-pipeline, desktop-local | Exact filtered `cargo test` command passed twice as declared. Evidence adequacy is a finding below. |
| thermal-guard | Exact filtered `cargo test` passed. |
| adapter-discovery | Exact filtered `cargo test` passed. |

Other local checks passed: `npm test` (6), `npx tsc --noEmit`, `npm run build` (20.28 KB JS / 7.82 KB gzip; 10.43 KB CSS / 3.11 KB gzip), all 15 Playwright tests, all five Rust tests, `sh -n public/install.sh`, and `git diff --check`. The initial Rust run required `libwebkit2gtk-4.1-dev` and companion packages, the same documented/release-workflow Linux prerequisites; it then passed.

The repository has no `verify-url.sh`. `npx @axe-core/cli` could not start because this worker has Playwright Chromium but no system Chrome binary. The permitted Playwright axe integration was run instead: live `/`, `/demo`, `/privacy`, `/terms`, and `/404.html` had zero serious or critical violations.

## Live, privacy, and release evidence

* Fresh desktop and phone contexts had no horizontal overflow at 390 px; Tab reached the skip link and reduced motion set `scroll-behavior: auto`.
* A fresh controlled service-worker context rendered `/demo` after an offline reload and showed the offline message. Demo requests stayed same-origin.
* `/`, `/demo`, `/privacy`, `/terms`, `/404.html`, `robots.txt`, and `sitemap.xml` returned 200. An arbitrary route returned a designed page with the expected HTTP 404 status. Privacy and terms titles were correct.
* Live JS, CSS, and hero hashes exactly match a fresh build from the candidate; `413ee55` changes only `.factory/handoff.md` relative to `dba0b94`.
* `v0.1.11` resolves exactly to `dba0b94`. Its release has six installable assets, a valid six-asset `latest.json`, and a six-line `SHA256SUMS` that excludes the metadata files. The AMD64 DEB checksum verified.
* The DEB metadata identifies version 0.1.11 and the expected GTK/WebKit dependencies. It installed into an isolated temporary consumer root and its executable remained running for a 12-second Xvfb/DBus launch smoke test. No physical GPU exists in this worker, so allocation/readback hardware smoke coverage remains unavailable.
* The live Linux button fetched GitHub release metadata without a console error and started the published Linux AppImage download. Hashed assets have immutable one-year cache headers.

## Earlier findings disposition

| Earlier finding | Current disposition |
|---|---|
| No functional diagnostic controls/native stages | Code now exposes adapter scan, bounded window/temperature/retry controls in Tauri and has WGPU allocation, fill, copy, readback, and shader code. The released DEB launches; lack of physical GPU prevents hardware allocation verification. |
| No multi-platform release/checksums | Fixed: six assets, `latest.json`, and checksums are published and verified. |
| Offline demo false / local preview `/demo` 404 | Fixed: exact browser claim commands pass; live controlled offline reload works. |
| Axe contrast and undersized controls | Fixed in the normal routes: zero serious/critical axe findings, mobile layout and focus smoke passed. |
| Demo isolation and license restore | Fixed: separate demo key/reset preservation and labelled restore field are present. |
| Shader path was a no-op / signing identity was ephemeral | Shader now reads the copied buffer; local signing test verifies a stable P-256 key id and signatures. The specific claimed seeded-fault test remains inadequate (Finding 4). |
| Stale service-worker cache | Fixed: cache is `gpu-vram-burnin-v3`, update policy has a regression test, and live offline reload works. |
| 404 returned 200 / hashed cache was short-lived | HTTP status and asset cache policy are fixed. The 404 now has the separate CSP and structure defects below. |

## Findings

### 1. Major — Live 404 emits a CSP console error

`https://gpu-vram-burnin.sociobot.in/not-a-real-route` correctly returns HTTP 404, but its response contains an inline `<style>` element. Its CSP is `style-src 'self'`, so Chromium logs “Applying inline style violates …” and blocks those styles on every 404 load. This violates the no-console-errors quality gate and the CSP contract. Use a same-origin stylesheet for the 404 or authorise only the exact style with an appropriate CSP mechanism.

### 2. Medium — A malformed persisted real receipt leaves the application blank

In a fresh live context, setting the valid JSON value `{"id":"corrupt-but-valid-json"}` at `gpu-vram-burnin:receipt` and reloading produced `Cannot read properties of undefined (reading 'some')`. `#app` then had no text and no `<h1>`. This is an invalid-data recovery path: `loadRun` parses JSON but does not validate the receipt shape before `runPanel` accesses `run.stages`. Validate stored receipts and discard/show a recoverable error for bad data.

### 3. Minor — Client-side route changes do not focus the destination heading

Clicking the live Privacy link navigated to `/privacy` and set the correct title, but `document.activeElement` was `BODY`, not the new `<h1>`. The code calls `focus()` on an h1 without making it focusable. This misses the required route-change focus behavior for keyboard and screen-reader users.

### 4. Major — Two desktop pipeline claims are not actually tested

`desktop-pipeline` and `desktop-local` both point to `claim_desktop_pipeline_attributes_seeded_faults_to_the_right_stage`. That test only calls `expected_word`, `result_for_errors`, and constructs a `Stage` whose name and error count are already supplied by the test. It never runs the shader, injects a buffer mismatch, or observes the allocation/fill/copy/readback/shader pipeline. Therefore the advertised sandbox description “seeds a compute-path mismatch and asserts that Shader sweep alone records the failure” is false, and both public claims are untested. Add a deterministic native pipeline seam/fixture that actually injects the mismatch and asserts the resulting receipt, or remove the claims.

### 5. Minor — The static 404 omits the required shared page structure

The live static 404 has one `<main>` and a return link, but no header, nav, footer, or skip link. The site contract requires the consistent header/footer and skip-to-main structure on every route. Bring the 404 into the same accessible skeleton while preserving its designed fallback.

## Scope notes

This is a static desktop-app landing site with no product backend, tenant store, health endpoint, or product-owned rate-limit route; backend tenant, restart, health, and 429 checks are not applicable. No product code was modified during verification.
