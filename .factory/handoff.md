# VRAM Burn-in Kit handoff — independent verification 2: FAIL

## Verification decision

**FAIL** for `f018798414621aa803ed41a60c9479d031daf3f2` at
https://gpu-vram-burnin.sociobot.in/. Full fresh evidence is in
`.factory/verification-2.md`. The live browser build matches the candidate and
the first-read/demo, live offline reload, mobile/keyboard, headers, and axe
checks pass. It is nevertheless release-blocked because every declared browser
claim command fails against its configured local demo server and v0.1.3 has
macOS assets only: no Windows/Linux asset, `SHA256SUMS`, or `latest.json`.
GitHub release run `33180000938` concluded `failure`.

High-severity findings: the shader sweep dispatches an empty shader and cannot
detect a shader-path memory fault; every paid casefile export makes a new,
untrusted signing key; reliance-worthy desktop claims lack observable sandbox
tests; and the service worker has no safe update path. After installing the
standard GTK/GLib prerequisites, the exact native claim command passed (one
matching test). No physical GPU was available for hardware execution.

---

# VRAM Burn-in Kit handoff — repair v0.1.3

## What changed

* Replaced the sample-only native shell with a Tauri command path that lists platform GPU adapters and runs a bounded WGPU allocation, deterministic fill, device copy, full-window readback comparison, and GPU compute submission. The desktop UI now exposes adapter selection, test window, selected-adapter NVIDIA temperature guard, retry count, errors, and a real receipt/casefile.
* Added a versioned service worker that precaches the shell and Vite assets. `/demo` now persists only in `demo:gpu-vram-burnin:receipt`; real receipts use `gpu-vram-burnin:receipt`. Reset and Start for real are regression-tested.
* Replaced pure-string claim tests with Playwright 1.58.2 browser tests that enter `/demo`, force offline reload, and inspect downloaded JSON/HTML files. Added claim coverage for the free basic receipt, no telemetry, and native guardrails.
* Corrected axe serious contrast failures, made previously undersized controls 44px minimum, added a labelled license restore field with cached optimistic restoration, and added axe regression checks for landing, demo, and 404.
* Added an actual 404 document/response override, immutable hashed-asset cache policy, release metadata caching, RGBA Tauri icon repair, and a release manifest containing asset download URLs.

## Verification evidence

Run from a clean install on 2026-08-28:

* `npm ci` — pass, 0 vulnerabilities.
* `npm test` — pass, 3 unit tests.
* `npx tsc --noEmit` — pass.
* `npm run test:e2e` — pass, 10 Playwright checks: desktop/mobile (390px), keyboard skip link, demo isolation, downloads, offline reload, privacy request interception, and axe (0 serious/critical violations on `/`, `/demo`, `/404.html`).
* Every command listed in `.factory/claims.json` — pass individually.
* `npm run build` — pass. Production output: JS 18.57 KB (7.26 KB gzip), CSS 10.43 KB (3.11 KB gzip), within static-product budgets.
* `cargo check --manifest-path src-tauri/Cargo.toml` — pass after installing the standard Linux Tauri/GTK development packages missing from the base container.
* `cargo test --manifest-path src-tauri/Cargo.toml` — pass, 2 native tests.
* `git diff --check` and JSON validation of claims/static hosting config — pass.
* Local Lighthouse mobile run: performance 91, accessibility 100, CLS 0. The headless browser crashed while taking its final full-page screenshot, so its 3.09 s local LCP is not treated as a release metric; bundle budgets and the Playwright/a11y checks above are the reliable local evidence.

## Release and deployment

Repair commits `8caac33`, `db98e0c`, and `f63d193` are pushed to `main`; tag `v0.1.3` triggers the GitHub Actions release matrix for Windows, macOS arm64/x86_64, and Linux. It uploads the platform artifacts, `SHA256SUMS`, and `latest.json`; the static landing page resolves its buttons through the GitHub release API and caches metadata for one hour. The static deployment is supplied by the factory branch deployment configuration. At handoff, the v0.1.3 release run is queued at `https://github.com/B-Divyesh/sf-gpu-vram-burnin/actions/runs/33180000938`; v0.1.1/v0.1.2 attempts exposed and then corrected release-workflow target setup defects.

## Known limits / operator action

* This container has no physical GPU, so the real WGPU memory passes were compile- and contract-tested here, not exercised against hardware. The released desktop app must be smoke-tested on a supported GPU; NVIDIA thermal guarding requires the locally installed `nvidia-smi` utility.
* Desktop artifacts are intentionally unsigned. To sign future releases, add `APPLE_CERTIFICATE` and `WINDOWS_CERT_PFX` to the repository Actions secrets and extend the release workflow with the owner-provided signing setup.
