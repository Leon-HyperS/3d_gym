#!/usr/bin/env python3
from __future__ import annotations

import base64
import csv
import hashlib
import json
import mimetypes
import os
import struct
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_ROOT = SCRIPT_DIR.parent
REPO_ROOT = SKILL_ROOT.parents[2]
PRESETS_PATH = SKILL_ROOT / "assets" / "model-presets.json"
ENV_PATH = REPO_ROOT / ".env"


@dataclass
class HttpResponse:
    status_code: int
    headers: dict[str, str]
    payload: Any


def now_utc_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def read_text(path: Path) -> str:
    return path.read_text(encoding="utf-8").strip()


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def append_jsonl(path: Path, row: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8", newline="") as handle:
        handle.write(json.dumps(row, ensure_ascii=True) + "\n")


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    if not path.exists():
        return []
    rows: list[dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        payload = json.loads(line)
        if isinstance(payload, dict):
            rows.append(payload)
    return rows


def write_csv(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow({field: row.get(field) for field in fieldnames})


def repo_relative(path: Path) -> str:
    try:
        return str(path.resolve().relative_to(REPO_ROOT.resolve())).replace("\\", "/")
    except ValueError:
        return str(path.resolve())


def prompt_sha256(prompt_text: str) -> str:
    return hashlib.sha256(prompt_text.encode("utf-8")).hexdigest()


def load_presets() -> dict[str, Any]:
    payload = json.loads(PRESETS_PATH.read_text(encoding="utf-8"))
    if not isinstance(payload, dict):
        raise SystemExit(f"Preset file is not a JSON object: {PRESETS_PATH}")
    return payload


def load_repo_env(path: Path = ENV_PATH) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("\"'"))


def require_gemini_key() -> str:
    load_repo_env()
    value = os.environ.get("GEMINI_API_KEY", "").strip()
    if not value:
        raise SystemExit("Missing GEMINI_API_KEY. Add it to the repo .env or export it before running.")
    return value


def coerce_json_object(raw: str | None) -> dict[str, Any]:
    if raw is None:
        return {}
    payload = json.loads(raw)
    if not isinstance(payload, dict):
        raise SystemExit("Expected a JSON object")
    return payload


def infer_mime_type(path: Path) -> str:
    mime_type, _ = mimetypes.guess_type(str(path))
    return mime_type or "application/octet-stream"


def inline_data_for_file(path: Path) -> dict[str, Any]:
    return {
        "inline_data": {
            "mime_type": infer_mime_type(path),
            "data": base64.b64encode(path.read_bytes()).decode("ascii"),
        }
    }


def gemini_endpoint_for_model(model: str) -> str:
    return f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def post_json(url: str, api_key: str, payload: dict[str, Any], timeout: int) -> HttpResponse:
    request = urllib.request.Request(
        url=url,
        headers={
            "Content-Type": "application/json",
            "x-goog-api-key": api_key,
        },
        data=json.dumps(payload).encode("utf-8"),
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read()
            parsed = json.loads(body.decode("utf-8")) if body else {}
            return HttpResponse(
                status_code=response.getcode(),
                headers={key.lower(): value for key, value in response.headers.items()},
                payload=parsed,
            )
    except urllib.error.HTTPError as exc:
        body = exc.read().decode("utf-8", errors="replace")
        try:
            parsed = json.loads(body) if body else {}
        except json.JSONDecodeError:
            parsed = {"raw_error": body}
        return HttpResponse(
            status_code=exc.code,
            headers={key.lower(): value for key, value in exc.headers.items()},
            payload=parsed,
        )


def _part_inline_data(part: dict[str, Any]) -> dict[str, Any] | None:
    value = part.get("inlineData")
    if isinstance(value, dict):
        return value
    value = part.get("inline_data")
    if isinstance(value, dict):
        return value
    return None


def collect_response_parts(payload: Any) -> list[dict[str, Any]]:
    parts: list[dict[str, Any]] = []
    if not isinstance(payload, dict):
        return parts
    candidates = payload.get("candidates")
    if not isinstance(candidates, list):
        return parts
    for candidate in candidates:
        if not isinstance(candidate, dict):
            continue
        content = candidate.get("content")
        if not isinstance(content, dict):
            continue
        candidate_parts = content.get("parts")
        if not isinstance(candidate_parts, list):
            continue
        for part in candidate_parts:
            if isinstance(part, dict):
                parts.append(part)
    return parts


def collect_text_outputs(payload: Any) -> list[str]:
    texts: list[str] = []
    for part in collect_response_parts(payload):
        value = part.get("text")
        if isinstance(value, str) and value.strip():
            texts.append(value.strip())
    return texts


def mime_extension(mime_type: str) -> str:
    mapping = {
        "image/png": ".png",
        "image/jpeg": ".jpg",
        "image/webp": ".webp",
    }
    return mapping.get(mime_type.lower(), ".bin")


def inspect_image_bytes(data: bytes, mime_type: str) -> dict[str, Any]:
    info: dict[str, Any] = {"mime_type": mime_type, "byte_length": len(data)}
    if mime_type == "image/png" and len(data) >= 24 and data[:8] == b"\x89PNG\r\n\x1a\n":
        info["width"], info["height"] = struct.unpack(">II", data[16:24])
        return info
    if mime_type == "image/webp" and len(data) >= 30 and data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        chunk = data[12:16]
        if chunk == b"VP8X" and len(data) >= 30:
            width_minus_one = int.from_bytes(data[24:27], "little")
            height_minus_one = int.from_bytes(data[27:30], "little")
            info["width"] = width_minus_one + 1
            info["height"] = height_minus_one + 1
        return info
    if mime_type == "image/jpeg":
        index = 2
        while index + 9 < len(data):
            if data[index] != 0xFF:
                index += 1
                continue
            marker = data[index + 1]
            index += 2
            if marker in {0xD8, 0xD9}:
                continue
            if index + 2 > len(data):
                break
            segment_length = int.from_bytes(data[index:index + 2], "big")
            if marker in {0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7, 0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF}:
                if index + 7 <= len(data):
                    info["height"] = int.from_bytes(data[index + 3:index + 5], "big")
                    info["width"] = int.from_bytes(data[index + 5:index + 7], "big")
                break
            index += segment_length
        return info
    return info


def save_inline_images(payload: Any, out_dir: Path, filename_prefix: str) -> list[dict[str, Any]]:
    saved: list[dict[str, Any]] = []
    out_dir.mkdir(parents=True, exist_ok=True)
    image_index = 0
    for part in collect_response_parts(payload):
        inline = _part_inline_data(part)
        if not inline:
            continue
        mime_type = str(inline.get("mimeType") or inline.get("mime_type") or "application/octet-stream")
        data_b64 = inline.get("data")
        if not isinstance(data_b64, str):
            continue
        image_index += 1
        data = base64.b64decode(data_b64)
        output_path = out_dir / f"{filename_prefix}-output-{image_index:02d}{mime_extension(mime_type)}"
        output_path.write_bytes(data)
        saved.append(
            {
                "path": repo_relative(output_path),
                "image_info": inspect_image_bytes(data, mime_type),
            }
        )
    return saved
