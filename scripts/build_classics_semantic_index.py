#!/usr/bin/env python3
"""Build a verifiable Conceptus inverted index from existing local classical texts.

Only original JSON passages and structured bilingual files are indexed here.
HTML texts and OCR pages stay in the live search, with their status disclosed.
This never changes editions, translations, or manuscript images.
The automated workflow regenerates only the derived index, never source files.
"""
from __future__ import annotations
from collections import Counter, defaultdict
import json
from pathlib import Path
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "data/classics-corpus/search-registry.json"
CONCEPTS = ROOT / "data/lexicon/conceptus.json"
OUTPUT = ROOT / "data/classics-corpus/semantic-conceptus-postings.json"
LANGUAGES = ("la", "grc", "es", "en", "fr", "it", "de", "pt")
ELIGIBLE = {"json-passages", "structured-bilingual"}


def fold(value: str) -> str:
    s = unicodedata.normalize("NFD", str(value or ""))
    s = "".join(c for c in s if unicodedata.category(c) != "Mn")
    s = s.lower().replace("j", "i").replace("v", "u").replace("ς", "σ")
    return " ".join(re.findall(r"[^\W_]+", s, flags=re.UNICODE))


def tokens(value: str) -> list[str]:
    return fold(value).split()


def dictionary(concepts: list) -> dict:
    out = {language: defaultdict(list) for language in LANGUAGES}
    for concept in concepts:
        for language in LANGUAGES:
            raw = concept.get(language, []) if language in {"la", "grc"} \
                else concept.get("modern", {}).get(language, [])
            for term in set(v for v in raw if isinstance(v, str) and len(v.strip()) > 1):
                words = tokens(term)
                if words:
                    out[language][words[0]].append((concept["id"], term, words))
    return out


def read(entry: dict):
    path = entry["path"]
    if not re.fullmatch(r"data/(?:classics-corpus/[a-z0-9-]+|structured/(?:recensio-es|recensio-fr|theory-en))\.json", path):
        raise ValueError("Unexpected file path " + path)
    doc = json.loads((ROOT / path).read_text(encoding="utf-8"))
    if entry["format"] == "json-passages":
        if doc.get("workId") != entry["workId"] or doc.get("language") != entry["language"]:
            raise ValueError("Metadata mismatch " + path)
        return [(str(p.get("locus", "")), p.get("text", "")) for p in doc["passages"]]
    if doc.get("edition") != entry.get("edition"):
        raise ValueError("Edition mismatch " + path)
    field = "latin" if entry["language"] == "la" else "translation"
    return [(str(p.get("locus", "")), p.get(field, "")) for p in doc["passages"]]


def build():
    registry = json.loads(REGISTRY.read_text(encoding="utf-8"))
    concepts = json.loads(CONCEPTS.read_text(encoding="utf-8"))["concepts"]
    lexicon = dictionary(concepts)
    indexed = []
    errors = []
    for entry in registry["entries"]:
        if entry["format"] not in ELIGIBLE:
            continue
        try:
            passages = read(entry)
            if not passages:
                raise ValueError("No passages")
            by_concept = defaultdict(lambda: {"count": 0, "loci": []})
            words_total = matched_passages = 0
            for locus, content in passages:
                if not isinstance(content, str) or not content.strip():
                    continue
                words = tokens(content)
                words_total += len(words)
                occurrences = Counter()
                for i, word in enumerate(words):
                    for cid, term, phrase in lexicon[entry["language"]].get(word, []):
                        if words[i:i + len(phrase)] == phrase:
                            occurrences[(cid, term)] += 1
                if occurrences:
                    matched_passages += 1
                for (cid, term), n in occurrences.items():
                    by_concept[cid]["count"] += n
                    by_concept[cid]["loci"].append([locus, term, n])
            indexed.append({
                "workId": entry["workId"], "language": entry["language"],
                "format": entry["format"], "source": entry["path"],
                "edition": entry.get("edition"),
                "passages": len(passages), "words": words_total,
                "matchedPassages": matched_passages,
                "concepts": [
                    {"concept": cid, **value} for cid, value in sorted(by_concept.items())
                ],
            })
        except (OSError, KeyError, ValueError, TypeError, json.JSONDecodeError) as exc:
            errors.append({"path": entry.get("path"), "error": str(exc)})
    result = {
        "schema": "vitruvia-classics-semantic-postings-v1",
        "method": (
            "Indexed only attested Conceptus terms in local classical JSON and structured bilingual texts. "
            "Accent/case and Latin i/j u/v normalized. No invented synonyms, embeddings, "
            "morphological lemmatization or verified textual collation. "
            "HTML and historical OCR continue via the existing live search."
        ),
        "dictionaryConcepts": len(concepts),
        "registryEditionCount": len(registry["entries"]),
        "eligibleEditions": sum(e["format"] in ELIGIBLE for e in registry["entries"]),
        "indexedEditions": len(indexed),
        "errors": errors,
        "notIndexedFormats": [
            {"path": e["path"], "format": e["format"]}
            for e in registry["entries"] if e["format"] not in ELIGIBLE
        ],
        "versions": indexed,
    }
    if errors:
        raise RuntimeError("Index not published because of errors: " + repr(errors))
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    print(f"Conceptus terms: {len(concepts)}; editions: {len(indexed)}; "
          f"passages: {sum(v['passages'] for v in indexed)}; "
          f"semantic hits: {sum(sum(c['count'] for c in v['concepts']) for v in indexed)}.")


if __name__ == "__main__":
    build()
