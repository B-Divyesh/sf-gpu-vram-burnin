# VRAM Burn-in Kit handoff

## Delivered

* A Tauri 2 shell with a static Vite UI and a Rust `nvidia-smi` adapter-discovery
  command. The core does not modify power, clocks, or drivers.
* A working one-click `/demo` sandbox with a completed, realistic five-stage
  RTX 5080 memory receipt. It offers reset, safe exit, JSON casefile, printable
  HTML casefile, and a locally signed JSON option after a valid Pro license.
* Landing, demo, privacy, terms, and designed 404 routes with address-bar
  routing, keyboard focus management, reduced-motion styling, offline state,
  and an original 56 KB WebP paper-cut GPU illustration.
* Sociobot paid-unlock flow: checkout link, return-token storage, daily
  verification cache, optimistic offline restoration, and a paste-license path.
* GitHub Actions desktop release workflow for Windows, macOS arm64/x86_64, and
  Linux. It produces release assets plus `SHA256SUMS` and `latest.json`.

## Verify

```sh
npm install
npm test
npm run build
npm test -- -t @claim:sample-offline
npm test -- -t @claim:casefile-export
npm test -- -t @claim:html-casefile
```

Verified in this worker on 2026-08-28:

* `npm test` — 3 passed.
* `npm run build` — passed; deploy artifact is `dist/site/index.html`.
* `npx tsc --noEmit` — passed.
* `git diff --check` — passed.
* Initial production JavaScript: 5.83 KB gzip. CSS: 2.89 KB gzip. Hero WebP:
  56 KB. No third-party runtime scripts or fonts.
* HTTP smoke check at `http://localhost:4173/` confirmed title, `lang`,
  description, canonical URL, and OG metadata.

## Known gaps / operator action

* The worker image lacks GTK/GLib development packages, so local `cargo check`
  stops in `glib-sys` before compiling the Tauri crate. The release workflow
  installs all required Linux desktop packages before its Tauri build.
* A browser binary is not present in this worker, so Lighthouse and axe could
  not run locally. The static bundle is well under the performance budget;
  run Lighthouse mobile and axe in CI/release verification before publishing.
* The desktop Rust bridge currently provides supported NVIDIA adapter discovery
  and thermal telemetry. The shipped sample demonstrates the full diagnostic
  receipt flow. A production compute backend for actual fill/copy/readback
  shader execution remains the next engineering step; do not describe this v1
  as a hardware-health certification.
* macOS and Windows releases are unsigned. To sign them, set
  `APPLE_CERTIFICATE`, the matching keychain credentials, and `WINDOWS_CERT_PFX`
  as GitHub repository secrets, then extend the release workflow with the
  owner’s certificate signing commands.

## Key files

* `.factory/design.md` — visual system and generated-art provenance.
* `.factory/claims.json` — sandbox claim tests.
* `.factory/demo.md` — sandbox behavior and namespace.
* `.github/workflows/release.yml` — release matrix and checksums.
