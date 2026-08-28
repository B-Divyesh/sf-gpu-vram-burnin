# VRAM Burn-in Kit

VRAM Burn-in Kit is a local desktop utility for PC builders and local-AI
operators. It runs bounded GPU memory checks and exports a small casefile that
separates allocation, fill, copy, readback, and shader-path results.

It is for a card you do not yet trust with an overnight render or inference
job. It is not an overclocking tool, repair tool, or hardware certification.

## Try the safe sample

Run the site and open `/demo`, or use `/?demo=1`. The bundled RTX 5080 sample
has five completed test stages. It uses the isolated `demo:gpu-vram-burnin`
storage namespace. **Reset demo** restores it. **Start for real** discards it.
See [.factory/demo.md](.factory/demo.md) for the verifier path.

## Develop and verify

```sh
npm install
npm run dev
npm test
npm run build:site  # creates dist/site/index.html
```

`npm run build` is the factory build command and also creates `dist/site`.
The static site contains the landing experience and can be deployed as-is.

For the native shell, install the [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/), then run:

```sh
npm run tauri dev
npm run tauri build
```

The Rust core discovers NVIDIA adapters with the vendor-supported `nvidia-smi`
telemetry command. It does not change clocks, power limits, or driver settings.

## Install

GitHub Actions builds unsigned Windows, macOS, and Linux releases on tags.
The landing page gets release metadata from the GitHub API and chooses a
platform asset. Before release assets exist, it sends people to the release
page without a browser console error.

After a release, Linux/macOS users can use:

```sh
curl -fsSL https://gpu-vram-burnin.sociobot.in/install.sh | sh
```

Windows users can use:

```powershell
irm https://gpu-vram-burnin.sociobot.in/install.ps1 | iex
```

Both scripts verify SHA256 before proceeding. Unsigned macOS apps may need
right-click → Open. See the workflow in `.github/workflows/release.yml`.

## Privacy and license

Diagnostics and exported casefiles stay local. The only optional network call
is a Pro license verification with Sociobot. The free sample, basic receipt,
and export work without it. The site includes `/privacy` and `/terms` routes.

Pro is a one-time $19 license. Checkout and verification use Sociobot; no
payment credentials are embedded in the product.

## Project notes

The visual direction, tokens, and original-art provenance are in
[.factory/design.md](.factory/design.md). Testable visitor claims are listed
in [.factory/claims.json](.factory/claims.json). This project is MIT licensed.
