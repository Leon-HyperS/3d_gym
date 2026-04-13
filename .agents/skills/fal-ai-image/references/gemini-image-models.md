# Gemini Image Models

## Recommended Defaults

- `gemini-3.1-flash-image-preview`
  - Use as the default sprite-sheet model.
  - Supports wide aspect ratios such as `4:1` and `8:1`.
  - Strong default for iterative animation strips and reference-driven edits.
- `gemini-3-pro-image-preview`
  - Use for more polished asset ideation and richer environment or prop renders.
  - Prefer this when instruction-following quality matters more than latency.
- `gemini-2.5-flash-image`
  - Use for fast, lower-cost image comps.
  - Good for lightweight exploration, not the first choice for wide sprite strips.

## Practical Selection Rules

- Character or move strip: start with `gemini-3.1-flash-image-preview`
- Polished concept asset: try `gemini-3-pro-image-preview`
- Fast thumbnail or rough ideation: try `gemini-2.5-flash-image`

## Limitation Reminder

- Do not assume the model will produce exact frame separation perfectly on the first pass.
- Keep the task narrow and iterate on a single action until the layout is stable.
