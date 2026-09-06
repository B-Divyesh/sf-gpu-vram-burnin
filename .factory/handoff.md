# VRAM Burn-in Kit handoff — repair v0.1.12

## Status

The repaired implementation is `ea169982445c8463e916ec43d1e0042c2452b9a0`
(`v0.1.12`). It contains the functional repair commit
`574c10b9e6be7defe85827dfc1ef5214a60ef196`. The preceding independent
verification documentation is `4bc4c80d1c255a0db6faab22370e86754a5a5c33`.
The static site built from v0.1.12 was deployed to
<https://gpu-vram-burnin.sociobot.in/> on 2026-09-06.

The job is to run bounded GPU memory pattern checks and make a support-ready
casefile. It is for PC builders and local-AI operators. On first screen, the
first action is **Try it with sample data**.

## Repairs

* Replaced the standalone inline-styled 404 with a same-origin stylesheet and
  the shared skip link, header/navigation, main, and footer. It still returns
  a deliberate HTTP 404.
* Validated persisted receipts before rendering. Invalid or incomplete stored
  data is discarded and a visible recovery notice leaves the app usable.
* Client-side route changes now set focus on the destination h1 and announce
  the route through a polite live region.
* Replaced the claimed seeded-fault placeholder with a deterministic native
  pipeline fixture. It allocates, fills, copies, and reads a local buffer,
  injects one mismatch only before compute inspection, and observes a lone
  Shader sweep failure in the resulting receipt.
* Reworded the 404 in plain language and bumped the desktop/static version to
  v0.1.12 so the installed app receives the frontend repairs.

## Verification

From a clean dependency install:

* `npm ci`, `npx tsc --noEmit`, `npm test`, and `npm run build` passed.
  The built site has 21.28 KB JavaScript (8.16 KB gzip) and 10.60 KB CSS
  (3.13 KB gzip).
* `npm run test:e2e` passed all 18 browser checks. They include the new stored
  receipt recovery, destination-heading focus/live announcement, and static
  404 under the production `style-src 'self'` policy, plus axe serious/critical
  checks across landing, demo, legal pages, and 404.
* `cargo test --manifest-path src-tauri/Cargo.toml` passed all five native
  tests after installing the documented Linux Tauri prerequisites. Every exact
  command in `.factory/claims.json` was then run; all eleven declarations
  passed, including both repeated pipeline claim declarations.
* `sh -n public/install.sh`, claims JSON parsing, and `git diff --check`
  passed.
* `verify-url.sh` against the deployed HTTPS root reported no console errors,
  one h1, `lang=en`, a main landmark, and no missing image alt text or unnamed
  buttons. A final mobile Lighthouse run reports performance 100 and
  accessibility 100; the JSON evidence is
  `/work/.evidence/lighthouse.json`.
* Fresh live desktop and 390 px phone contexts confirmed the first screen,
  one-click RTX 5080 sample receipt, persistent demo label, reset, preservation
  of a valid real receipt, offline demo reload, recovery from malformed saved
  data, privacy-route focus, and no mobile horizontal overflow. The static
  fallback has its shared shell and stylesheet with no CSP violation. Chromium
  logs the expected network error for the deliberate 404 document status; this
  is not an application or CSP error.

## Release and deployment

`v0.1.12` completed GitHub Actions run
[34014415915](https://github.com/B-Divyesh/sf-gpu-vram-burnin/actions/runs/34014415915).
Its release contains six installable artifacts (two DMGs, AppImage, DEB, MSI,
and NSIS EXE), a six-asset `latest.json`, and a six-line `SHA256SUMS`. The
downloaded AMD64 DEB verified against the published checksum, reports version
0.1.12, and stayed open for a 12-second isolated Xvfb/DBus consumer launch
smoke test. The static deployment is already complete and is independent of
the artifact build.

The current Pro offer remains a one-time $19 local-signing license. Public
offer metadata is in `/work/.evidence/billing-offer.json`. The live Sociobot
checkout endpoint currently returns HTTP 404, so billing registration is an
external dependency; the free basic test and exports continue to work.

## Known limits and operator action

No physical GPU is available in this worker. The deterministic native fixture
proves stage attribution, but a real allocation/readback/shader hardware run
still needs a supported GPU smoke test. Desktop builds remain unsigned:
macOS notarization needs `APPLE_CERTIFICATE` and Windows signing needs
`WINDOWS_CERT_PFX` when those certificates are available.
