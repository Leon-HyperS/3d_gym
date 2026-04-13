#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from _gemini_common import append_jsonl, load_jsonl, now_utc_iso, repo_relative, write_csv, write_json
from gemini_image_run import parse_args as parse_runner_args
from gemini_image_run import run_image_job


LEDGER_FIELDS = [
    "timestamp",
    "task_slug",
    "model_alias",
    "model",
    "status",
    "output_files",
    "output_texts",
    "run_manifest",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run one Gemini image task across a configured model matrix.")
    parser.add_argument("--config", type=Path, required=True, help="Path to the experiment config JSON file.")
    parser.add_argument("--timestamp", default=None, help="Optional fixed batch timestamp.")
    parser.add_argument("--dry-run", action="store_true", help="Resolve runs without calling the API.")
    return parser.parse_args()


def _load_config(path: Path) -> dict[str, Any]:
    payload = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise SystemExit("Config must be a JSON object")
    return payload


def _prompt_spec(config: dict[str, Any]) -> tuple[str, str]:
    if bool(config.get("prompt")) == bool(config.get("prompt_file")):
        raise SystemExit("Config must include exactly one of prompt or prompt_file")
    if config.get("prompt"):
        return "prompt", str(config["prompt"])
    return "prompt_file", str(config["prompt_file"])


def main() -> None:
    args = parse_args()
    config = _load_config(args.config)
    batch_timestamp = args.timestamp or now_utc_iso().replace(":", "").replace("-", "")

    batch_dir = Path("experiments/gemini-image") / f"{batch_timestamp}-{config['task_slug']}"
    batch_dir.mkdir(parents=True, exist_ok=True)

    tracking = config.get("tracking", {})
    ledger_jsonl = Path(tracking.get("ledger_jsonl", "experiments/gemini-image/ledger.jsonl"))
    ledger_csv = Path(tracking.get("ledger_csv", "experiments/gemini-image/ledger.csv"))
    prompt_key, prompt_value = _prompt_spec(config)

    batch_payload = {
        "timestamp": batch_timestamp,
        "task_slug": config["task_slug"],
        "created_at": now_utc_iso(),
        "prompt": config.get("prompt"),
        "prompt_file": config.get("prompt_file"),
        "input_images": config.get("input_images", []),
        "models": config["models"],
        "output_root": config["output_root"],
        "config_path": repo_relative(args.config),
    }
    write_json(batch_dir / "batch.json", batch_payload)

    results: list[dict[str, Any]] = []
    for model_alias in config["models"]:
        runner_args = [
            "--model-alias",
            str(model_alias),
            "--task-slug",
            str(config["task_slug"]),
            "--out-dir",
            str(Path(config["output_root"]) / f"{batch_timestamp}-{config['task_slug']}-{model_alias}"),
            "--filename-prefix",
            f"{batch_timestamp}-{config['task_slug']}-{model_alias}",
            f"--{prompt_key.replace('_', '-')}",
            prompt_value,
        ]

        for item in config.get("input_images", []) or []:
            runner_args.extend(["--image-file", str(item)])

        model_overrides = (config.get("model_overrides") or {}).get(model_alias, {})
        for key, value in model_overrides.items():
            flag = f"--{key.replace('_', '-')}"
            runner_args.extend([flag, str(value)])
        if args.dry_run:
            runner_args.append("--dry-run")

        runner_namespace = parse_runner_args(runner_args)
        manifest = run_image_job(runner_namespace)
        manifest_path = Path(runner_namespace.out_dir) / f"{runner_namespace.filename_prefix}-run.json"
        ledger_row = {
            "timestamp": manifest.get("timestamp"),
            "task_slug": manifest.get("task_slug"),
            "model_alias": manifest.get("model_alias"),
            "model": manifest.get("model"),
            "status": manifest.get("status"),
            "output_files": "|".join(manifest.get("output_files", [])),
            "output_texts": " | ".join(manifest.get("output_texts", [])),
            "run_manifest": repo_relative(manifest_path),
        }
        append_jsonl(ledger_jsonl, ledger_row)
        results.append(ledger_row)

    existing_rows = load_jsonl(ledger_jsonl)
    write_csv(ledger_csv, existing_rows, LEDGER_FIELDS)
    write_json(batch_dir / "results.json", {"rows": results})


if __name__ == "__main__":
    main()
