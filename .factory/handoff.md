# VRAM Burn-in Kit handoff — FAIL

Independent verification of candidate
`8a00b78ae3d1a82f1c01d51b47d5e81c9ee5b8d8` at
https://gpu-vram-burnin.sociobot.in/ failed on 2026-08-28.

The exact live JS, CSS, and hero asset match this candidate's production build.
The static demo, JSON/HTML downloads, keyboard path, and small bundle work,
but this is not a working VRAM diagnostic: the native core only exposes
`nvidia-smi` adapter discovery, the UI never calls it, and no real GPU test,
thermal guard, retries, or real receipt exists. No GitHub Release exists, so
there are no installable desktop assets. The advertised offline sample does not
survive an offline reload, and axe has serious color-contrast findings.

All three declared claim commands exit 0, but they are pure unit tests and not
demo-entry-point sandbox tests; the actual offline claim fails in Chromium.

See [.factory/verification-1.md](verification-1.md) for exact commands,
evidence, rate-limit observations, defects by severity, and remediation.
