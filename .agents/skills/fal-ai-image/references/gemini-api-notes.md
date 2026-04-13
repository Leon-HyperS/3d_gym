# Gemini API Notes

## Auth

- This repo keeps the API key in the root `.env` file as `GEMINI_API_KEY=...`.
- The runner loads `.env` before making requests.

## Endpoint

- REST base: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- Header: `x-goog-api-key: $GEMINI_API_KEY`

## Request Shape

- Build one `contents` entry with:
  - a text prompt part
  - optional inline image parts for edit or reference workflows
- Put output controls in `generationConfig`:
  - `responseModalities`
  - `imageConfig.aspectRatio`
  - `imageConfig.imageSize`

## Output Handling

- The response can contain text parts and inline image parts.
- Save every image part as a local file and preserve the raw JSON response.
- For sprite work, inspect the image manually before normalizing or shipping it.

## Sprite-Specific Rules

- Ask for one strip or one sheet, not multiple separate frame files.
- Lock slot count, row count, framing, and facing direction in the prompt.
- Prefer a flat keyed background over transparency assumptions.
