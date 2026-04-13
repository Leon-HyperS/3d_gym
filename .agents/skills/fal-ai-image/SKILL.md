---
name: gemini-image
description: "Use Gemini image generation (Nano Banana 2 / Nano Banana Pro) with the repo-local GEMINI_API_KEY in .env. Use when Codex needs to generate or edit sprite sheets, full-character animation strips, move or FX sheets, prop sheets, environment concepts, or other bitmap game assets with Google's Gemini image models."
---

# Gemini Image

Use this skill for repo-local Gemini image generation. This replaces the old fal.ai workflow in this repo.

## Defaults

- Default sprite model: `gemini-3.1-flash-image-preview` (`Nano Banana 2`)
- Higher-fidelity asset model: `gemini-3-pro-image-preview` (`Nano Banana Pro`)
- Fast low-latency comp model: `gemini-2.5-flash-image`

## Critical Constraints

- Load `GEMINI_API_KEY` from the repo `.env` before making requests.
- Use one output sheet per request. Do not ask for N separate frame files.
- For animations, ask for one fixed-layout strip or sheet, then slice locally.
- Treat transparency as unsupported for shipping sprites. Request a flat keyed background such as `#00FF00`, then remove it downstream.
- Keep reference count low and intentional. Use only the images that preserve identity or the object contract.
- Keep one action per request. Do not combine idle, run, hurt, and attack in one strip.

## Sprite Workflow

1. Approve a seed frame first for any character or environment family that must stay consistent.
2. Generate one sheet per move or state: `idle`, `run`, `attack-1`, `hurt`, `death`, `cast`, and so on.
3. Lock the layout in the prompt:
   - row count
   - slot count
   - facing direction
   - full-body framing
   - background color
4. Keep the same aspect ratio and image size across comparable sheets so normalization is predictable.
5. Save prompts and manifests under `experiments/gemini-image/...` before promoting outputs.

## Environment And Prop Workflow

- Use `gemini-3-pro-image-preview` for higher-fidelity concept paintovers or polished prop sheets.
- Use `gemini-3.1-flash-image-preview` for iterative asset ideation, sprite-like layouts, and character consistency passes.
- For tiles or atlases, treat Gemini output as source material. Do not trust it to produce a perfect grid-safe atlas without cleanup.

## Prompt Invariants For Sprite Sheets

Always specify:

- same character identity
- same costume and silhouette
- same facing direction
- exact frame count and row layout
- full body visibility in every slot
- flat keyed background (`#00FF00`)
- no text, labels, borders, scenery, or poster composition

For pixel work also specify:

- crisp pixel clusters
- no painterly texture
- no motion blur
- readable at game scale

## Scripts

- `scripts/gemini_image_run.py`
  - Run one Gemini image generation or edit request through the REST API.
  - Load `GEMINI_API_KEY` from the repo `.env`.
  - Save request and response manifests plus output images.
- `scripts/gemini_image_experiment_matrix.py`
  - Run the same task across multiple preset Gemini models and append a local ledger.

## Presets

See `assets/model-presets.json` for repo-local aliases.

## References

- `references/gemini-api-notes.md`
- `references/gemini-image-models.md`

## Remember

Gemini is strongest when the request is a single explicit composition. For sprites, define one sheet, one action, one layout, one background, and one identity contract.
