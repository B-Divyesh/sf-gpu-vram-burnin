# Independent verification 2 — FAIL

Candidate: `f018798414621aa803ed41a60c9479d031daf3f2`  
Live URL: https://gpu-vram-burnin.sociobot.in/  
Verified: 2026-08-28 from a clean checkout. Product source was not changed.

## Decision

**FAIL.** The live browser bundle byte-matches a fresh candidate build and its
landing/demo is usable, but mandatory local claim-test commands fail and the
desktop release is incomplete. Both are release blockers.

## First read and live product evidence

Cold load plainly said “Test GPU memory before long jobs,” named “PC builders
and local-AI operators,” and offered **Try it with sample data** with “See a
finished test receipt.” One click opened `/demo`, displayed “Demo — sample
data, nothing is saved,” and exposed Reset demo / Start for real.

In a fresh Chromium context, live `/demo` downloaded `SAMPLE-5080-2408.json`,
used only `demo:gpu-vram-burnin:receipt`, reset correctly, and discarded that
key on Start for real. After service-worker activation, forced offline reload
rendered the receipt and its offline status. JSON and printable HTML downloads
were observed.

## Required claims: release-blocking failure

`.factory/claims.json` exists. `npm ci` completed first (63 packages, zero
reported vulnerabilities). The five browser commands below were then run
exactly as declared; each left Playwright in a failed run state
(`test-results/.last-run.json` is `{"status":"failed","failedTests":[]}`).

| Claim | Exact command | Result |
|---|---|---|
| sample-offline | `npm run test:e2e -- --grep @claim:sample-offline` | FAIL |
| casefile-export | `npm run test:e2e -- --grep @claim:casefile-export` | FAIL |
| html-casefile | `npm run test:e2e -- --grep @claim:html-casefile` | FAIL |
| basic-free | `npm run test:e2e -- --grep @claim:basic-free` | FAIL |
| no-telemetry | `npm run test:e2e -- --grep @claim:no-telemetry` | FAIL |
| bounded-desktop-test | `cargo test --manifest-path src-tauri/Cargo.toml diagnostic_contract_rejects_unsafe_windows_and_guards` | PASS — 1 matching native test passed after standard Linux Tauri prerequisites were installed. |

Cause is reproducible through the test’s configured demo entry point:
Playwright starts `vite preview`, and `curl http://127.0.0.1:4173/demo`
returns HTTP 404. Production rewrites in `staticwebapp.config.json` are not
honored by Vite preview. The live deployment works, but the claims rule makes
any declared test that fails locally a release blocker.

## Other checks

| Check | Result |
|---|---|
| `npm test` | PASS — 3/3 Vitest tests |
| `npx tsc --noEmit` | PASS |
| `git diff --check` | PASS |
| `npm run build` | PASS; `dist/site/` produced |
| Bundle budget | PASS — JS 18.57 KB / 7.26 KB gzip; CSS 10.43 KB / 3.11 KB gzip; hero 56.9 KB |
| Candidate/live identity | PASS — JS SHA-256 `827d7df08864717b…c2a62e1f2fe2`; CSS `834295744affba80…c0f2d64e246b` match fresh output |
| Browser errors | PASS — no console/page errors on landing, demo, privacy, terms, or 404 |
| axe-core | PASS — zero serious/critical on `/`, `/demo`, `/privacy`, `/terms`, `/404.html` |
| 390px / keyboard / reduced motion | PASS — scrollWidth 390; Tab reaches all primary controls with solid visible focus; reduced-motion active |
| privacy/CSP | PASS — demo/export requests were same-origin; no analytics/third-party scripts; restrictive CSP, HSTS, nosniff, and strict referrer policy present |
| 404 | PASS — arbitrary live route returned HTTP 404 with designed fallback |

The product’s only server-side call is license verification. A 50-request
concurrent burst returned 20 × 200 and 30 × 429 with `Retry-After: 2` or `3`.
Rate limiting is present; throttling began at roughly 20 requests in this
burst.

## Desktop release evidence

GitHub latest release is `v0.1.3`, target `f63d193` (the candidate changes
only handoff documentation). It contains exactly four macOS files: two DMGs
and two app tarballs. It has no Windows or Linux artifact, `SHA256SUMS`, or
`latest.json`; the public SHA256SUMS URL returns 404. Release Actions run
`33180000938` concluded `failure`. The downloaded x64 DMG did match GitHub’s
asset digest (`4c9a557637e2a3e13229f904da9d578fb87d2edd2cda3a3ddf6793315e5d3db0`),
but this cannot meet the multi-platform installer contract.

## Defects

### Blocker — declared browser claim tests fail

Make the exact local Playwright commands use a demo-capable route server, then
run every claim green from a clean checkout. Keep the observable live
offline/export behavior asserted in those tests.

### Blocker — desktop release is not shippable

Repair the failed workflow; publish real Windows, macOS, and Linux artifacts,
valid `SHA256SUMS`, and `latest.json`; verify each landing button resolves a
real asset and a downloaded artifact checks against its manifest.

### High — shader “sweep” does not test VRAM through a shader

`src-tauri/src/lib.rs` dispatches `@compute @workgroup_size(1) fn main() {}`
once. It does not access the tested buffer and is always recorded pass. This
does not satisfy the brief’s shader-pattern pass or distinguish compute-path
faults. Implement actual shader patterns with readback and seeded-fault stage
attribution tests.

### High — paid casefile signature has no auditable identity

Each export creates a new ECDSA key and embeds its public key beside the
signature. Anyone can mint an indistinguishable casefile. Define a persistent
local signing identity and verifier/test, or stop marketing this as a signed
support casefile.

### High — unlisted/inadequately proved claims

The desktop allocation/fill/copy/readback/compute behavior, thermal guard,
adapter discovery, and locally signed JSON are reliance-worthy UI/README
claims without individual observable sandbox tests. The native claim validates
only numeric bounds, not “Desktop tests run locally.” Add hardware-fault
fixtures/simulation and tests, or remove the statements.

### Medium — service-worker update path is stale

`public/sw.js` has fixed cache name `gpu-vram-burnin-v2`, cache-first
navigation, and no old-cache cleanup. Existing users can retain stale shell
content indefinitely. Version cache assets, refresh on update, purge old
caches, and regression-test update plus offline reload.

## Native-test note

The base image initially lacked GTK/GLib Tauri prerequisites. I installed the
standard Linux packages listed by the release workflow, then the exact native
claim passed (one matching test). This container has no physical GPU, so
hardware scan/fault execution is not verifiable here.
