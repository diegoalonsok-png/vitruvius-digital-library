#!/usr/bin/env python3
"""Build a verifiable Conceptus inverted index from existing local classical texts.

Structured JSON, bilingual editions, and source-anchored HTML texts are indexed.
Historical OCR remains outside the verified semantic postings until reviewed.
This never changes editions, translations, or manuscript images.
The automated workflow regenerates only the derived index, never source files.
"""
from __future__ import annotations
from collections import Counter, defaultdict
from html.parser import HTMLParser
import json
from pathlib import Path
import re
import unicodedata

ROOT = Path(__file__).resolve().parents[1]
REGISTRY = ROOT / "data/classics-corpus/search-registry.json"
CONCEPTS = ROOT / "data/lexicon/conceptus.json"
OUTPUT = ROOT / "data/classics-corpus/semantic-conceptus-postings.json"
LANGUAGES = ("la", "grc", "es", "en", "fr", "it", "de", "pt")
ELIGIBLE = {"json-passages", "structured-bilingual", "html-text"}


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



class SourceHTMLPassages(HTMLParser):
    """Extract only reading text in main, retaining genuine existing HTML anchors.

    A <p> in Cicero and Lucretius belongs to its actual enclosing book.
    Catullus uses an article id and a <pre class="verses"> for its poems.
    No new pseudo-loci are created from paragraph positions.
    """
    BLOCKS = {"p", "pre"}
    IGNORE = {"script", "style", "nav", "header", "footer"}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.in_main = 0
        self.stack = []
        self.reading = None
        self.parts = []
        self.passages = []
        self.current_book = ""
        self.ignore_depth = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "main":
            self.in_main += 1
        if not self.in_main:
            return
        if tag in self.IGNORE:
            self.ignore_depth += 1
        if tag in {"article", "section", "h2", "h3"} and attrs.get("id"):
            self.current_book = attrs["id"]
        if tag in self.BLOCKS and not self.ignore_depth:
            classes = attrs.get("class", "").split()
            if tag == "pre" and "verses" not in classes:
                return
            if self.reading is None:
                self.reading = (tag, attrs.get("id") or self.current_book)
                self.parts = []

    def handle_data(self, data):
        if self.in_main and not self.ignore_depth and self.reading is not None:
            self.parts.append(data)

    def handle_endtag(self, tag):
        if self.in_main and self.reading and self.reading[0] == tag:
            value = " ".join("".join(self.parts).split())
            if len(value) >= 24 and self.reading[1]:
                self.passages.append((self.reading[1], value))
            self.reading = None
            self.parts = []
        if self.in_main and tag in self.IGNORE and self.ignore_depth:
            self.ignore_depth -= 1
        if tag == "main" and self.in_main:
            self.in_main -= 1

def read(entry: dict):
    path = entry["path"]
    if entry["format"] == "html-text":
        if not re.fullmatch(r"corpus/[a-z0-9-]+\.html", path):
            raise ValueError("Unexpected HTML source path " + path)
        parser = SourceHTMLPassages()
        parser.feed((ROOT / path).read_text(encoding="utf-8"))
        if not parser.passages:
            raise ValueError("No anchored text passages in HTML: " + path)
        return parser.passages
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
             "Indexed only attested Conceptus terms in local Greek/Latin/translation JSON, structured bilingual and anchored HTML texts. "
            "Accent/case and Latin i/j u/v normalized. No invented synonyms, embeddings, "
            "morphological lemmatization or verified textual collation. "
            "Historical OCR remains separate from verified transcriptions."
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
