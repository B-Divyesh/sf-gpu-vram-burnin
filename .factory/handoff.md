# VRAM Burn-in Kit handoff — repair v0.1.10

## Result

This repair addresses every release blocker in independent verification 2
(`3983e344f37a7145dfa8e2910dc4deeb100a7c93`) while preserving the tested demo,
local-first storage, desktop-app architecture, and static landing deployment.

* Playwright now serves `dist/site` in its configured Vite preview, so `/demo`
  is a local, demo-capable route rather than a deployment-only rewrite.
* The native shader stage now binds and checks the copied storage buffer with a
  deterministic per-word pattern, atomically reads back its mismatch count, and
  reports Shader sweep separately from transfer/readback failures.
* Pro casefiles use one non-extractable P-256 private key stored in IndexedDB.
  The signed export includes a stable local key id and public key; a browser
  regression downloads two exports and verifies their signatures. This is
  explicitly local provenance, not a publisher certificate.
* The service worker cache is versioned, deletes old product caches on activate,
  uses network-first navigation with offline fallback, and reloads controlled
  clients after an update.
* The release workflow builds each platform first and publishes once afterward,
  eliminating concurrent release writes. It emits Windows MSI/NSIS, macOS
  arm64/x64 DMGs, Linux AppImage/DEB, `SHA256SUMS`, and `latest.json`.
  The Unix installer now identifies GitHub's real asset filename before its
  checksum comparison.
* Added claim evidence for stage attribution, thermal guard, adapter telemetry
  parsing, local desktop core behavior, persistent signing, and all existing
  browser claims.

## Verification evidence

Run in this clean container on 2026-08-28:

* `npm ci` — pass, 63 packages, 0 vulnerabilities.
* `npm test` — pass, 6 tests. This includes service-worker update policy and
  release/installer contract regressions.
* `npx tsc --noEmit` — pass.
* `npm run build` — pass; `dist/site` contains 20.28 KB JS (7.82 KB gzip),
  10.43 KB CSS (3.11 KB gzip), and a 56.9 KB WebP hero.
* `npm run test:e2e` — pass, 15 Playwright tests: desktop routes, 390px
  keyboard/skip-link flow, no console/page errors, demo isolation, privacy
  request interception, offline reload, JSON/HTML exports, stable local
  signing and signature verification, plus zero axe serious/critical findings
  on `/`, `/demo`, `/privacy`, `/terms`, and `/404.html`.
* Every command in `.factory/claims.json` was run against the local preview or
  native core and passed. Browser claim commands exercise `/demo`; native
  commands cover bounded guardrails, seeded shader-stage attribution, thermal
  cutoff, and adapter telemetry fixtures.
* `cargo test --manifest-path src-tauri/Cargo.toml` — pass, 5 native tests.
  Standard GTK/WebKit Tauri prerequisites were installed first.
* `sh -n public/install.sh`, claims JSON parsing, and `git diff --check` — pass.

The container has no physical GPU, so a real allocation/readback/shader fault
run remains a hardware smoke test for the released desktop app. The actual
shader path is compiled and its deterministic failure attribution is covered
without a GPU fixture.

## Release and deployment

Tag `v0.1.10` is the release trigger. The static site remains `dist/site` and
the factory branch deployment configuration remains unchanged. The GitHub
Actions matrix is the only place platform artifacts are built; once it
finishes, verify each release asset, `SHA256SUMS`, and `latest.json` before
calling the landing buttons live.

## Operator action

Desktop builds are intentionally unsigned. macOS notarization needs
`APPLE_CERTIFICATE`; Windows Authenticode needs `WINDOWS_CERT_PFX`. Add those
repository secrets and signing setup only when certificates are available.
