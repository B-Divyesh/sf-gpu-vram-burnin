# Verify GPU memory testing and casefile export — verification 4

**Verdict: FAIL**

- Implementation candidate: `ea169982445c8463e916ec43d1e0042c2452b9a0` (`v0.1.12`)
- Documentation candidate: `55e7c0bc783b19595ec0374fb1853d9b4e238df7`
- Live URL: <https://gpu-vram-burnin.sociobot.in/>
- Verified: 2026-09-06 from a clean checkout
- Findings: **7** (1 blocker, 3 major, 1 medium, 2 minor)
- Untested public claims: **3**

The five findings from verification 3 are fixed. The candidate still fails the
zero-finding acceptance rule because dark mode has serious contrast failures,
the advertised purchase cannot start, legitimate native receipts disagree with
the frontend schema, and the macOS download can select the wrong architecture.

## Job, audience, and first action

Before scrolling in fresh 1440 px desktop and 390 px phone contexts, the page
states the job as **“Test GPU memory before long jobs.”** It names PC builders
and local-AI operators. The first action is **“Try it with sample data,”** with
the adjacent explanation **“See a finished test receipt.”** This passes the
plain-words first-screen check.

The one-click sample opened `/demo`, kept the label **“Demo — sample data,
nothing is saved,”** and showed an RTX 5080 receipt with Allocate, Fill
patterns, Copy path, Readback, and Shader sweep. Reset restored
`SAMPLE-5080-2408`. Start for real removed only
`demo:gpu-vram-burnin:receipt` and preserved a valid real receipt sentinel.

## Clean checkout and declared claims

`npm ci` installed 62 packages with no reported vulnerabilities. The base
worker lacked the documented Tauri Linux libraries, so the exact packages in
the release workflow were installed before native measurement. After that,
every command declared in `.factory/claims.json` passed.

| Claim | Exact declared command | Result |
|---|---|---|
| `sample-offline` | `npm run test:e2e -- --grep @claim:sample-offline` | PASS, 1 browser test |
| `casefile-export` | `npm run test:e2e -- --grep @claim:casefile-export` | PASS, 1 browser test |
| `html-casefile` | `npm run test:e2e -- --grep @claim:html-casefile` | PASS, 1 browser test |
| `basic-free` | `npm run test:e2e -- --grep @claim:basic-free` | PASS, 1 browser test |
| `no-telemetry` | `npm run test:e2e -- --grep @claim:no-telemetry` | PASS, 1 browser test |
| `bounded-desktop-test` | filtered `cargo test` command in the declaration | PASS, 1 native test |
| `desktop-pipeline` | filtered seeded-pipeline `cargo test` command | PASS, 1 native test |
| `desktop-local` | the same filtered seeded-pipeline command, run again | PASS, 1 native test |
| `thermal-guard` | filtered thermal-guard `cargo test` command | PASS, 1 native test |
| `adapter-discovery` | filtered adapter-fixture `cargo test` command | PASS, 1 native test |
| `local-signing` | `npm run test:e2e -- --grep @claim:local-signing` | PASS, 1 browser test |

The broader gates also passed: `npx tsc --noEmit`, `npm test` (6 tests),
`npm run build`, `npm run test:e2e` (18 tests), all five native tests,
`sh -n public/install.sh`, claims JSON parsing, and `git diff --check`.
`dist/site` contains 21.28 KB JavaScript (8.16 KB gzip) and 10.60 KB CSS
(3.13 KB gzip).

## Live browser, accessibility, privacy, and offline checks

- Live HTML, JavaScript, CSS, hero art, `404.html`, and `404.css` byte-match a
  fresh build from the implementation candidate.
- Desktop and real 390 px phone contexts have no horizontal overflow. The
  phone uses a one-column hero. Keyboard Tab first reaches the skip link, and
  its visible focus outline is 3 px orange. Reduced motion changes smooth
  scrolling to `auto`.
- Route titles, one h1, header, nav, main, and footer are correct on `/`,
  `/demo`, `/privacy`, and `/terms`. Client navigation to Privacy focuses its
  h1 and announces “Privacy.” Back/forward uses the same focus path.
- Malformed stored JSON recovers with a visible message and leaves the app
  usable. The separate legitimate native-receipt case is Finding 3.
- A controlled service-worker context reloaded `/demo` offline. A seeded old
  `gpu-vram-burnin-v2` cache was deleted and replaced by
  `gpu-vram-burnin-v3`; navigations remain network-first.
- Demo load and export made only same-origin requests. Invalid license restore
  stored the token, stripped it from the URL, received `{valid:false}`, and
  announced “License no longer active.” No analytics or third-party scripts
  ran.
- The designed arbitrary-route response is an intentional HTTP 404. It has the
  shared skip link, header/nav, main, footer, and same-origin stylesheet. Its
  sole Chromium console message is the expected failed-resource message for
  the document's deliberate 404 status, not an application or CSP error.
- The worker `verify-url.sh` passed with no console errors, one h1, `lang=en`,
  a main landmark, no missing alt text, and no unnamed buttons. Playwright axe
  found no serious/critical issue in the light treatment. The required dark
  treatment fails as described in Finding 1.
- Mobile Lighthouse completed with performance 100, accessibility 100, best
  practices 100, SEO 100, LCP 1.2 s, CLS 0, and TBT 10 ms. Lighthouse's default
  light theme does not cover Finding 1.

Screenshots and machine-readable output are under `/work/.evidence/`, including
`live-phone-landing.png`, `live-phone-demo.png`, `live-phone-dark.png`,
`live-404.png`, `verify.json`, and `lighthouse.json`.

## Release and installed artifact

GitHub's latest release is `v0.1.12`, whose tag resolves to the implementation
candidate. It has two DMGs, AppImage, DEB, MSI, NSIS EXE, `latest.json`, and
`SHA256SUMS`. The manifest lists all six installers and the checksum file has
six corresponding lines.

The AMD64 DEB downloaded into the evidence directory and matched SHA-256
`86edf25496b8d72c380e141628f6d42da2ca7a9b401011b20a399c77dae736cd`.
Its metadata reports version 0.1.12 and AMD64. It was extracted into a new
temporary consumer root and launched with new XDG state under Xvfb and D-Bus.
The executable stayed open for the 12-second smoke window. No physical GPU is
available, so real hardware allocation, transfer, thermal, and shader behavior
remains an external test limit rather than evidence from this worker.

All three live platform buttons start real release downloads. Windows selects
the x64 setup EXE and Linux selects the AMD64 AppImage. The macOS result exposes
Finding 4.

## Earlier findings

| Earlier finding | Current disposition |
|---|---|
| No real diagnostic controls or stages | Fixed in source and released artifact; hardware smoke remains unavailable here. |
| No complete desktop release or checksums | Fixed; six installers and both metadata files are published. |
| Offline sample and local `/demo` claim commands failed | Fixed; exact commands and live offline reload pass. |
| Light-theme contrast and short-height controls | Light contrast and 44 px heights are fixed. Dark contrast and two narrow targets remain new findings. |
| Demo isolation and labelled license restore | Fixed and independently exercised. |
| Shader did not inspect VRAM; signing identity changed per export | Fixed in source and deterministic tests; signing is stable and verifiable. |
| Stale service-worker cache | Fixed; live update cleanup and offline reload pass. |
| 404 returned 200 or lacked the shared shell; hashed caching was short | Fixed; arbitrary routes return 404, use the shared shell, and hashed assets are immutable. |
| 404 inline style violated CSP | Fixed; the static page loads `/404.css` with no CSP violation. |
| Malformed saved receipt blanked the app | Fixed for malformed and incomplete data. Finding 3 is a separate valid native schema mismatch. |
| Route changes did not focus or announce the h1 | Fixed. |
| Seeded pipeline claim constructed results without running a fixture | Fixed; the fixture now allocates, fills, copies, reads, injects one mismatch, and observes only Shader sweep fail. |

## Findings

### 1. Blocker — dark mode has serious contrast failures

With `prefers-color-scheme: dark`, axe reports serious `color-contrast`
violations on 11 landing-page nodes and 5 demo nodes. The limits section is the
clearest failure: cream text (`#f7f1df`) remains on a cream background
(`#e7dfcc`) at 1.17:1. Violet eyebrows on the dark background are 2.25:1 and
muted slate text is 2.23:1. The demo lead also becomes pale text on cream at
1.32:1. `live-phone-dark.png` shows the limits copy becoming nearly invisible.
This fails the non-negotiable 4.5:1 text requirement and zero-serious axe gate.

### 2. Major — the advertised $19 purchase cannot start

The visible **Buy Pro** link points to the required Sociobot checkout URL, but
that URL returns HTTP 404 with `{"error":"enabled factory product"}`. This is
not the site's deliberate designed 404; it is a failed paid user path. License
verification itself returns a valid HTTP 200 response for an invalid token.
The checkout registration is external to this repository, but the live offer
cannot be accepted while it remains unregistered.

### 3. Major — legitimate native receipts do not match the frontend schema

The Rust command returns `temperature: Option<u64>` and explicitly accepts
missing NVIDIA telemetry. A successful AMD, Intel, or NVIDIA-without-telemetry
receipt therefore serializes `temperature: null`. The frontend requires a
finite number, renders the immediate result as `null°C`, then treats that
receipt as corrupt on reload and deletes it. A live recovery test using the
exact legitimate shape confirmed removal.

The same native receipt writes `startedAt` as `Unix timestamp <seconds>`, while
the frontend passes it to `new Date(...)`; that produces **Invalid Date** on
every real receipt. Align the native and TypeScript receipt schema, preserve
valid no-telemetry results, and add a native-to-frontend round-trip test.

### 4. Major — macOS download selects the ARM build on Intel Macs

The release correctly contains both `aarch64.dmg` and `x64.dmg`, but the live
button and `install.sh` select the first `.dmg` without checking CPU
architecture. In the current GitHub API order, the live macOS button downloads
`VRAM.Burn-in.Kit_0.1.12_aarch64.dmg`. The shell installer uses the same
first-match behavior. Intel Mac users therefore receive an incompatible ARM
installer despite a valid x64 asset being available.

### 5. Medium — three public claims lack adequate declared tests

Untested public claim count: **3**.

1. The sample says an 8 GiB run performs walking bits, checkerboard, and
   address patterns and reports 24 GiB for Fill patterns. The production native
   path writes one `expected_word` address pattern once and reports the selected
   window size. No declared claim test proves the three named passes, so the
   populated sample is not representative of production output.
2. The landing/README safety statement says the app does not change clocks,
   power limits, or driver settings. There is no claim entry or regression test
   for this reliance-worthy safety promise.
3. README says both one-line installers verify SHA-256 before proceeding. This
   is absent from `claims.json`; the existing unit test only searches the Unix
   script text, and no test executes the PowerShell verification/rejection
   path.

Add observable claim tests or narrow the public wording. The declared eleven
claims themselves all pass.

### 6. Minor — “How it works” is dead outside the home route

The shared SPA header always renders `href="#how"` and prevents normal link
navigation. On `/demo`, `/privacy`, and `/terms`, no `#how` element exists.
Clicking the link on Privacy leaves the URL, focus, and content unchanged.
Link to `/#how` from non-home routes or route home before scrolling.

### 7. Minor — two visible links are narrower than 44 px

At 390 px, the header Demo link is 28.8 × 44 px and the footer Terms link is
36 × 44 px. Desktop widths are 33.6 px and 36 px. The height repair is present,
but the attached accessibility and design contracts require at least 44 × 44
CSS px touch targets.

## Scope and result

This is a static landing site plus local Tauri desktop app. It has no
product-owned backend, tenant database, health route, restart-persistence
service, or rate-limit route, so those backend checks are not applicable.
Sociobot billing was treated as an external dependency and checked only through
the product's documented checkout and verification URLs.

No product code was changed. With 7 findings and 3 untested public claims, the
unambiguous result is **FAIL**.
