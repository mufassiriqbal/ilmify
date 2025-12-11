#!/usr/bin/env python3
"""Merge per-letter Wordset JSON files into a compact dictionary payload."""

from __future__ import annotations

import json
import time
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
DATA_DIR = BASE_DIR / "portal" / "data" / "dictionary"
LETTERS = list("abcdefghijklmnopqrstuvwxyz") + ["misc"]


def normalise_part(part: str | None) -> str | None:
    if not part:
        return None
    part = part.strip()
    return part or None


def build_compact_entry(source_word: str, raw: dict[str, object]) -> dict[str, object] | None:
    word = (raw.get("word") or source_word or "").strip()  # type: ignore[arg-type]
    if not word:
        return None

    meanings_data = raw.get("meanings")
    if not isinstance(meanings_data, list):
        return None

    meanings: list[dict[str, object]] = []
    for meaning in meanings_data:
        if not isinstance(meaning, dict):
            continue
        definition = (meaning.get("def") or meaning.get("definition") or "").strip()  # type: ignore[arg-type]
        if not definition:
            continue
        compact_meaning: dict[str, object] = {"d": definition}

        part = normalise_part(meaning.get("speech_part") or meaning.get("part_of_speech"))  # type: ignore[arg-type]
        if part:
            compact_meaning["p"] = part
        example = (meaning.get("example") or "").strip()  # type: ignore[arg-type]
        if example:
            compact_meaning["e"] = example
        synonyms = meaning.get("synonyms")
        if isinstance(synonyms, list):
            clean_synonyms = [syn.strip() for syn in synonyms if isinstance(syn, str) and syn.strip()]
            if clean_synonyms:
                compact_meaning["s"] = clean_synonyms
        meanings.append(compact_meaning)

    if not meanings:
        return None

    primary_part = normalise_part(raw.get("speech_part") or raw.get("part_of_speech"))  # type: ignore[arg-type]
    if not primary_part:
        for meaning in meanings:
            part = meaning.get("p")
            if isinstance(part, str) and part:
                primary_part = part
                break

    compact_entry: dict[str, object] = {
        "w": word,
        "m": meanings,
    }
    if primary_part:
        compact_entry["p"] = primary_part

    return compact_entry


def merge_dictionary() -> dict[str, object]:
    entries: dict[str, dict[str, object]] = {}

    for letter in LETTERS:
        path = DATA_DIR / f"{letter}.json"
        if not path.exists():
            continue
        with path.open("r", encoding="utf-8") as stream:
            try:
                payload = json.load(stream)
            except json.JSONDecodeError as exc:
                raise RuntimeError(f"Failed to parse {path}: {exc}") from exc

        if not isinstance(payload, dict):
            continue

        for key, raw_entry in payload.items():
            if not isinstance(raw_entry, dict):
                continue
            compact = build_compact_entry(key, raw_entry)
            if not compact:
                continue
            normalized = compact["w"].lower()
            entries.setdefault(normalized, compact)

    ordered_entries = [entries[key] for key in sorted(entries.keys())]

    return {
        "version": 1,
        "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "entryCount": len(ordered_entries),
        "words": ordered_entries,
    }


def main() -> None:
    result = merge_dictionary()
    output_path = DATA_DIR / "dictionary.compact.json"
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with output_path.open("w", encoding="utf-8") as stream:
        json.dump(result, stream, ensure_ascii=False, separators=(",", ":"))
    print(f"Wrote {result['entryCount']} entries to {output_path}")


if __name__ == "__main__":
    main()
