# Demo sandbox

Open `/demo` or `/?demo=1` to load a realistic completed sample run for an
NVIDIA GeForce RTX 5080. It contains five stages: allocation, fill patterns,
copy, readback, and shader sweep. The sample is bundled with the app and does
not need a network connection.

Demo state is kept separate from real state in localStorage key
`demo:gpu-vram-burnin:receipt`; real receipts use
`gpu-vram-burnin:receipt`. It never reads or writes a real diagnostic receipt.
**Reset demo** restores the bundled sample. **Start for real** discards the
demo namespace and returns to the real bench.
