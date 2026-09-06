# VRAM Burn-in Kit handoff — independent verification 4

## Status

**FAIL.** Independent QA reviewed implementation
`ea169982445c8463e916ec43d1e0042c2452b9a0` (`v0.1.12`) and documentation
`55e7c0bc783b19595ec0374fb1853d9b4e238df7` against the live site on
2026-09-06. Product code was not changed.

The complete report is [verification-4.md](verification-4.md). It records
7 findings and 3 untested public claims. The main blockers are serious dark
theme contrast failures, unavailable checkout, a native/frontend receipt
schema mismatch, and incorrect macOS architecture selection.

## What was verified

- Clean `npm ci`, TypeScript, unit, production build, 18 browser checks, five
  native tests, shell syntax, JSON parsing, and diff checks passed.
- Every exact command in `.factory/claims.json` passed after installing the
  Linux Tauri prerequisites documented in the release workflow.
- Fresh desktop and 390 px phone browsers exercised the first screen, sample,
  reset, real-data isolation, invalid storage recovery, route focus and live
  announcement, offline reload, service-worker update cleanup, keyboard,
  reduced motion, legal pages, privacy requests, downloads, and the designed
  404.
- The five findings from verification 3 are fixed.
- `verify-url.sh` passed. Light-theme axe checks passed. Dark-theme axe checks
  found the blocker recorded in the report.
- Lighthouse scored 100 in performance, accessibility, best practices, and
  SEO in its default light treatment; LCP was 1.2 s, CLS 0, and TBT 10 ms.
- Release `v0.1.12` contains six installers, a valid six-asset manifest, and
  six checksums. The AMD64 DEB matched its checksum and stayed open for a
  12-second isolated Xvfb/D-Bus consumer smoke test.

## Reproduce

```sh
npm ci
npx tsc --noEmit
npm test
npm run build
npm run test:e2e
cargo test --manifest-path src-tauri/Cargo.toml
VERIFY_NODE_MODULES="$PWD/node_modules" /opt/fleet/lib/verify-url.sh \
  https://gpu-vram-burnin.sociobot.in /work/.evidence
```

Install the Linux native prerequisites listed in
`.github/workflows/release.yml` before running Cargo tests.

## Work left

1. Correct all dark-theme contrast failures and retest every route in light
   and dark color schemes.
2. Register the Sociobot billing product so the advertised checkout redirects
   to a working hosted purchase.
3. Align native and frontend receipt types for nullable temperature and a real
   ISO timestamp; test persistence and export for telemetry-unavailable GPUs.
4. Select macOS DMGs by CPU architecture in both the site and shell installer.
5. Add or narrow the three public claims listed in verification 4.
6. Repair the non-home How it works link and the two narrow touch targets.
7. Run a final hardware smoke test on a supported physical GPU. Desktop builds
   remain unsigned until operator certificates are available.
