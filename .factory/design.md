# VRAM Burn-in Kit — visual system

## Direction: paper-cut diagnostic bench

This is a paper-cut diorama of a GPU test bench: stacked dark cards are the
card, memory chips, thermal shield, and inspection slip. It makes an intense
hardware task feel bounded and legible. The cut edges also explain the product
model: each test stage is a distinct layer that can be inspected and attached
to a support case.

## Palette

* `ink` #17222a — deep blue-black bench background
* `paper` #f7f1df — warm inspection paper
* `paper-shadow` #d7ceb9 — cut-paper edge
* `signal` #db613d — heat / attention orange
* `mint` #177d6a — pass state teal
* `violet` #57509b — compute-path layer
* `slate` #52616a — secondary text
* `danger` #a12e2e — failing stage red

The site uses a warm light treatment and a dark diagnostic-app treatment. Each
has high-contrast ink-on-paper or paper-on-ink text.

## Type, spacing, and shapes

The display face is `Georgia, serif`: it gives report headings the character of
an old lab docket. UI and numbers use `ui-monospace, SFMono-Regular, Menlo,
monospace` so stages, bytes, and temperatures scan precisely. No network fonts
are loaded. Spacing uses an 8px scale. Corners are deliberately clipped into
small notches; shadows are hard, offset paper layers rather than soft SaaS
elevation.

## Interaction and motion

Starting a run unfolds the next paper layer (180ms transform + opacity).
Progress moves only while a test runs; it never loops decoratively. With
reduced motion, stages appear instantly and progress remains a static value.
Focus has a 3px signal-orange outline.

## Art plan and provenance

The hero illustration is an original generated paper-cut GPU diagnostic bench:
an orange heatsink, teal memory tiles, violet test path, and a small report
slip. It contains no text, logos, people, or brands. It is exported as WebP
below 300KB for the site and used to derive the social card. Generated on
2026-08-28 with the factory image deployment using the prompt below.

> Use case: stylized-concept. Asset type: landing page hero and social card.
> Primary request: a paper-cut diorama of a graphics card being checked for
> memory faults on a dark workbench. Scene/backdrop: midnight blue cut paper.
> Subject: stacked GPU board layers, square teal memory chips, orange thermal
> fins, a violet signal trace and a blank cream report slip. Style/medium:
> hand-cut heavyweight paper, crisp cast shadows, editorial technical collage.
> Lighting/mood: calm workbench light. Color palette: ink navy, cream, teal,
> orange, violet. Constraints: no readable text, no watermark, no logos,
> no brands, no people.

The image is original generated artwork for this product. It is decorative;
the task-critical information remains HTML text.
