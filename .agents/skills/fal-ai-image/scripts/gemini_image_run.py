#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path
from typing import Any, Sequence

from _gemini_common import (
    coerce_json_object,
    collect_text_outputs,
    gemini_endpoint_for_model,
    inline_data_for_file,
    load_presets,
    now_utc_iso,
    post_json,
    prompt_sha256,
    read_text,
    repo_relative,
    require_gemini_key,
    save_inline_images,
    write_json,
)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Run one Gemini image generation or edit request and write local tracking artifacts.")
    parser.add_argument("--model-alias", default=None, help="Friendly alias from assets/model-presets.json.")
    parser.add_argument("--model", default=None, help="Raw Gemini model id. Overrides preset model when provided.")
    parser.add_argument("--prompt", default=None, help="Prompt text.")
    parser.add_argument("--prompt-file", type=Path, default=None, help="Path to a text file containing the prompt.")
    parser.add_argument("--image-file", type=Path, action="append", default=None, help="Local reference image file. Repeatable.")
    parser.add_argument("--out-dir", type=Path, required=True, help="Directory where manifests and images are written.")
    parser.add_argument("--filename-prefix", default="gemini-image", help="Base filename prefix for output artifacts.")
    parser.add_argument("--task-slug", default="gemini-image-task", help="Stable task slug for tracking.")
    parser.add_argument("--aspect-ratio", default=None, help="Override image_config.aspect_ratio.")
    parser.add_argument("--image-size", default=None, help="Override image_config.image_size.")
    parser.add_argument("--response-modality", action="append", default=None, help="Repeatable output modality override, e.g. Image or Text.")
    parser.add_argument("--extra-json", default=None, help="Extra JSON object merged into generationConfig.")
    parser.add_argument("--timeout", type=int, default=180, help="HTTP timeout in seconds.")
    parser.add_argument("--dry-run", action="store_true", help="Resolve the request and write manifests without calling the API.")
    return parser


def parse_args(argv: Sequence[str] | None = None) -> argparse.Namespace:
    return build_parser().parse_args(argv)


def _prompt_text(args: argparse.Namespace) -> str:
    if bool(args.prompt) == bool(args.prompt_file):
        raise SystemExit("Use exactly one of --prompt or --prompt-file")
    if args.prompt_file is not None:
        return read_text(args.prompt_file)
    return str(args.prompt).strip()


def _resolve_preset(args: argparse.Namespace) -> dict[str, Any]:
    presets = load_presets()
    if args.model_alias is None and args.model is None:
        raise SystemExit("Use --model-alias or --model")
    if args.model_alias is not None:
        preset = presets.get(args.model_alias)
        if preset is None:
            known = ", ".join(sorted(presets))
            raise SystemExit(f"Unknown model alias: {args.model_alias}. Known aliases: {known}")
        return preset
    return {
        "provider": "gemini",
        "family": "custom",
        "model": args.model,
        "defaults": {},
    }


def _resolved_generation_config(args: argparse.Namespace, preset: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    defaults = dict(preset.get("defaults", {}))
    overrides: dict[str, Any] = {}
    if args.response_modality:
        overrides["response_modalities"] = list(args.response_modality)
    if args.aspect_ratio is not None:
        overrides["aspect_ratio"] = args.aspect_ratio
    if args.image_size is not None:
        overrides["image_size"] = args.image_size

    resolved = {**defaults, **overrides}
    extra = coerce_json_object(args.extra_json)
    resolved.update(extra)
    return resolved, overrides


def _build_request_payload(prompt_text: str, image_files: list[Path], generation_config: dict[str, Any]) -> tuple[dict[str, Any], dict[str, Any]]:
    parts: list[dict[str, Any]] = [{"text": prompt_text}]
    for image_file in image_files:
        parts.append(inline_data_for_file(image_file))

    request_payload: dict[str, Any] = {"contents": [{"parts": parts}]}
    image_config: dict[str, Any] = {}

    response_modalities = generation_config.pop("response_modalities", None)
    aspect_ratio = generation_config.pop("aspect_ratio", None)
    image_size = generation_config.pop("image_size", None)

    generation_config_payload: dict[str, Any] = {}
    if response_modalities is not None:
        generation_config_payload["responseModalities"] = response_modalities
    if aspect_ratio is not None:
        image_config["aspectRatio"] = aspect_ratio
    if image_size is not None:
        image_config["imageSize"] = image_size
    if image_config:
        generation_config_payload["imageConfig"] = image_config
    generation_config_payload.update(generation_config)
    if generation_config_payload:
        request_payload["generationConfig"] = generation_config_payload

    redacted_payload = {
        "contents": [
            {
                "parts": [{"text": prompt_text}] + [
                    {
                        "inline_data": {
                            "mime_type": "file-reference",
                            "source_file": repo_relative(image_file),
                        }
                    }
                    for image_file in image_files
                ]
            }
        ],
        "generationConfig": generation_config_payload,
    }
    return request_payload, redacted_payload


def run_image_job(args: argparse.Namespace) -> dict[str, Any]:
    preset = _resolve_preset(args)
    prompt_text = _prompt_text(args)
    generation_config, overrides = _resolved_generation_config(args, preset)
    model = str(args.model or preset["model"])
    image_files = [path.resolve() for path in (args.image_file or [])]
    out_dir = args.out_dir.resolve()
    out_dir.mkdir(parents=True, exist_ok=True)

    request_payload, redacted_payload = _build_request_payload(prompt_text, image_files, dict(generation_config))
    endpoint = gemini_endpoint_for_model(model)

    manifest: dict[str, Any] = {
        "timestamp": now_utc_iso(),
        "task_slug": args.task_slug,
        "provider": preset.get("provider", "gemini"),
        "model_alias": args.model_alias,
        "family": preset.get("family"),
        "model": model,
        "endpoint": endpoint,
        "status": "dry_run" if args.dry_run else "pending",
        "prompt_text": prompt_text,
        "prompt_hash": prompt_sha256(prompt_text),
        "input_files": [repo_relative(path) for path in image_files],
        "resolved_generation_config": generation_config,
        "preset_defaults": preset.get("defaults", {}),
        "explicit_overrides": overrides,
        "output_files": [],
        "output_images": [],
        "output_texts": [],
        "raw_files": {},
    }

    request_path = out_dir / f"{args.filename_prefix}-request.json"
    manifest_path = out_dir / f"{args.filename_prefix}-run.json"
    write_json(request_path, redacted_payload)
    manifest["raw_files"]["request_json"] = repo_relative(request_path)
    write_json(manifest_path, manifest)

    if args.dry_run:
        return manifest

    api_key = require_gemini_key()
    response = post_json(endpoint, api_key, request_payload, timeout=args.timeout)

    response_path = out_dir / f"{args.filename_prefix}-response.json"
    response_meta_path = out_dir / f"{args.filename_prefix}-response-meta.json"
    write_json(response_path, response.payload)
    write_json(response_meta_path, {"status_code": response.status_code, "headers": response.headers})

    manifest["raw_files"]["response_json"] = repo_relative(response_path)
    manifest["raw_files"]["response_meta_json"] = repo_relative(response_meta_path)
    manifest["status"] = "completed" if 200 <= response.status_code < 300 else "failed"
    manifest["output_texts"] = collect_text_outputs(response.payload)

    saved_images = save_inline_images(response.payload, out_dir, args.filename_prefix)
    manifest["output_images"] = saved_images
    manifest["output_files"] = [item["path"] for item in saved_images]

    if not saved_images and manifest["status"] == "completed":
        manifest["status"] = "completed_no_image"

    if manifest["output_texts"]:
        text_path = out_dir / f"{args.filename_prefix}-text-output.txt"
        text_path.write_text("\n\n".join(manifest["output_texts"]) + "\n", encoding="utf-8")
        manifest["raw_files"]["text_output"] = repo_relative(text_path)

    write_json(manifest_path, manifest)
    return manifest


def main() -> None:
    args = parse_args()
    run_image_job(args)


if __name__ == "__main__":
    main()
