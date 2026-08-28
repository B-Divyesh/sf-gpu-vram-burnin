# Independent verification — FAIL

**Candidate:** `8a00b78ae3d1a82f1c01d51b47d5e81c9ee5b8d8`  
**Live URL:** https://gpu-vram-burnin.sociobot.in/  
**Verified:** 2026-08-28 (fresh checkout; no product-code changes)

## Decision

**FAIL.** The static landing/demo deploys, but the promised desktop VRAM
diagnostic does not exist: there is no real adapter selection, test-window
configuration, temperature guard, retry, fill/copy/readback/shader execution,
or real receipt. There are also no released desktop artifacts, the advertised
offline sample fails an offline reload, and axe reports serious contrast
failures.

## Mandatory first checks

`.factory/claims.json` exists and declares three tests. From the clean clone,
after `npm ci`, all of its exact commands exited 0:

| Claim | Exact command | Result |
|---|---|---|
| `sample-offline` | `npm test -- -t @claim:sample-offline` | pass (1 test) |
| `casefile-export` | `npm test -- -t @claim:casefile-export` | pass (1 test) |
| `html-casefile` | `npm test -- -t @claim:html-casefile` | pass (1 test) |

Those are not valid sandbox tests. All three import pure functions from
`src/diagnostic.ts`; they never start a browser/app, load `/demo`, force
offline, or observe a download. A fresh Chromium 1.58.2 context loaded
`/demo`, was set offline, then reloaded. Reload failed with
`net::ERR_INTERNET_DISCONNECTED`; the page did not render the demo banner and
there is no service worker. Therefore the visitor claim **“Sample works
offline” is false**, notwithstanding the unit test's green status. The export
tests likewise only parse generated strings rather than downloaded files.

Cold first read of the live page **passed**: it says “Test GPU memory before
long jobs,” names PC builders and local-AI operators, and presents “Try it with
sample data — See a finished test receipt” on the first screen. One click
opened `/demo`, showed the persistent “Demo — sample data, nothing is saved”
banner, and produced a five-stage RTX 5080 sample receipt.

## Build and deployment evidence

| Check | Result |
|---|---|
| `npm ci` | pass; 0 vulnerabilities reported |
| `npm test` | pass; 3/3 tests |
| `npx tsc --noEmit` | pass |
| `npm run build` | pass; `dist/site/` produced |
| `git diff --check` | pass |
| Native `cargo check --manifest-path src-tauri/Cargo.toml` | could not run in this container: missing system `glib-2.0` development package. This is an environment prerequisite, not the release decision. |
| Candidate/live identity | exact: SHA-256 JS `0958e79c…4a7d8859`, CSS `d0e7ca91…ca6fd445`, and hero WebP `62f50488…f132db2e` match the deployed assets. |

The production bundle is small: JS 14,393 B / 5,906 B gzip, CSS 9,379 B /
2,892 B gzip, and hero WebP 56,898 B. The live site had no console or page
errors in normal landing/demo/legal/404 checks. `/demo` downloaded a 1,196 B
JSON casefile with the five named stages and a 1,118 B printable HTML casefile
with a table.

## End-to-end, security, and accessibility evidence

* Desktop and 390 px mobile were exercised. Mobile had no horizontal overflow
  (`scrollWidth = 390`). Keyboard Tab reached skip link, header/navigation,
  primary actions, download controls, and the visible focus outline. Reduced
  motion made `scroll-behavior` `auto`.
* The demo’s initial network requests were same-origin only. Live CSP is
  restrictive and permits only same-origin assets plus the explicit GitHub
  release API and Sociobot billing API. Headers include HSTS, `nosniff`, and a
  strict referrer policy.
* `npx`-isolated Playwright 1.58.2 + axe-core 4.10.3 found serious
  `color-contrast` issues: 4 nodes on `/`, 7 on `/demo`, and 1 on the rendered
  404 page. Examples: signal buttons are 4.45:1 rather than 4.5:1; the demo
  “Sample data” eyebrow is 1.77:1; the `pass` labels are 4.45:1.
* At 390 px, Reset demo, Start for real, Have a license, wordmark, and footer
  links measure 14–34 px high, below the 44 px target requirement.
* A made-up route renders the designed fallback but returns HTTP 200 rather
  than an actual 404 status. Hashed assets are served with only
  `cache-control: public, must-revalidate, max-age=30`, not immutable caching.
* Rate-limit check against the product’s Sociobot license-verify endpoint with
  an invalid token: a 30-request concurrent burst returned 200; the immediate
  following 120-request burst returned 120 × 429 with `Retry-After: 1`.
  After a 3-second cooldown, two sequential requests returned 200 and request
  three returned 429 with `Retry-After: 2`. Thus rate limiting is present;
  observed acceptance before throttling was at least 30 in the initial burst
  (the later low threshold reflects the shared cooldown).

## Release-blocking defects

### Blocker — no functional VRAM diagnostic

The product contract requires a bounded, real GPU-memory test distinguishing
allocation, transfer, and compute-path failures, with temperature-aware
retries and a casefile. `src-tauri/src/lib.rs` implements only
`scan_adapters()` via `nvidia-smi`. The UI never invokes that command. In
`src/main.ts`, the only non-demo bench action is `Load sample run`; `run` is
otherwise always `null`. There is no GPU picker, test-window input, start/run
action, temperature guard, retry, Vulkan/CUDA compute work, or real receipt.
The page statements that it lists adapters and stops at a temperature guard are
therefore untrue. This is a demo/marketing shell, not the smallest useful
product in the researched brief.

### Blocker — no installable desktop release

`GET https://api.github.com/repos/B-Divyesh/sf-gpu-vram-burnin/releases/latest`
returned HTTP 404. All Windows/macOS/Linux buttons consequently display
“Downloads are being published”; no binary or SHA256SUMS can be downloaded and
verified. This violates the desktop-app release requirement.

### Blocker — false offline claim and invalid claim coverage

See mandatory checks above. The stated offline reload behavior fails in a
fresh browser. The claim tests do not use the required demo entry point or
assert the observable promise. Additional page/README promises have no claim
entries, including “Runs locally,” “Basic pass is free,” “the desktop app lists
its supported GPU adapters,” the temperature guard, and “No telemetry runs.”

### Blocker — accessibility quality gate

Serious axe contrast findings remain on the landing, demo, and 404 routes.
The attached accessibility acceptance criteria requires zero serious/critical
findings and 4.5:1 text contrast.

### Major — demo isolation is not implemented

`.factory/demo.md` promises a `demo:gpu-vram-burnin` storage namespace. The
application never creates or uses it; it only calls
`localStorage.removeItem('demo:gpu-vram-burnin')` when leaving demo. The sample
is in-memory, so there is no demonstrated namespace separation or reset of
persisted demo state.

### Major — paid restore does not meet the specified flow

“Have a license? Paste it” opens a browser `prompt`, not a labelled restore
field. Cached license status is not verified on load, and an existing stored
license token is not used for optimistic offline restoration. These diverge
from the paid-unlock contract.

## Required remediation before re-verification

1. Implement and test actual vendor-supported bounded GPU memory passes in the
   native app, including adapter selection, window and temperature settings,
   bounded/thermal abort behavior, retries, stage-specific results, and real
   exported casefiles. Do not claim these capabilities until they work.
2. Publish and verify Windows, macOS, and Linux release assets plus
   `SHA256SUMS` and `latest.json`; then make the live detected-platform links
   resolve to real assets.
3. Add a service worker/offline caching strategy or remove the offline claim;
   replace all claims with browser/app sandbox tests that enter `/demo` and
   observe offline reloads/downloads. Add coverage for every user-reliant
   promise or remove that promise.
4. Correct contrast and all sub-44-px interactive targets; re-run axe with no
   serious/critical findings. Return a true 404 and immutable-cache hashed
   assets.
