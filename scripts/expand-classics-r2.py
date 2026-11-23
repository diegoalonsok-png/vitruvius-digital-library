#!/usr/bin/env python3
"""Publish eligible original TEI editions to R2 without deleting GitHub sources.

Discovery uses the two existing CTS catalogues, not guessed author/title matches.
Every new source must declare a reusable licence, its own edition URN and language.
Source bytes, editorial metadata and derived text remain separately identifiable.
Publication is two phase: prepare immutable objects, build/verify index, then merge
only successful records into the latest catalogue. No existing version is replaced.
"""
from __future__ import annotations
import argparse
from collections import Counter
from concurrent.futures import ThreadPoolExecutor, as_completed
from datetime import datetime, timezone
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import time
import unicodedata
from urllib.parse import urlparse
from urllib.request import Request, urlopen
from urllib.error import HTTPError, URLError
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
HOST = "https://libros.vitruvius-digital-library.org"
NS = {"t": "http://www.tei-c.org/ns/1.0"}
XLANG = "{http://www.w3.org/XML/1998/namespace}lang"
REPOS = {"PerseusDL/canonical-greekLit", "PerseusDL/canonical-latinLit", "OpenGreekAndLatin/First1KGreek"}
SKIP = {"note", "fw", "figure", "bibl", "ptr", "ref", "del", "rdg", "witDetail", "teiHeader"}
VOID = {"pb", "lb", "cb", "milestone"}
BLOCKS = {"div", "p", "l", "lg", "head", "sp", "speaker", "ab", "item", "list", "table", "row", "cell"}

def digest(raw): return hashlib.sha256(raw).hexdigest()
def read(p): return json.loads(Path(p).read_text(encoding="utf-8"))
def save(p, value):
    p = Path(p); p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(value, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
def packed(value): return json.dumps(value, ensure_ascii=False, separators=(",", ":")).encode()
def tag(e): return e.tag.rsplit("}", 1)[-1]
def flat(e): return " ".join("".join(e.itertext()).split()) if e is not None else ""

def source_url(url):
    u = urlparse(url)
    pieces = u.path.strip("/").split("/")
    if u.scheme != "https" or u.netloc != "raw.githubusercontent.com" or len(pieces) < 7 or "/".join(pieces[:2]) not in REPOS:
        raise ValueError("Fuente fuera de los repositorios TEI declarados")
    if not u.path.endswith(".xml"): raise ValueError("La fuente no es XML")
    return url

def download(url):
    source_url(url)
    error = None
    for attempt in range(3):
        try:
            with urlopen(Request(url, headers={"User-Agent": "VitruviusAcademicCorpus/2.0"}), timeout=45) as r:
                raw = r.read(50_000_001)
            if len(raw) > 50_000_000: raise ValueError("Fuente superior a 50 MB; conservar para revisión")
            return raw
        except Exception as exc:
            error = exc
            if attempt < 2: time.sleep(attempt + 1)
    raise error

def body_text(e):
    """Read one editorial branch; never index notes or apparatus as authorial text."""
    name = tag(e)
    if name in SKIP: return ""
    if name in VOID: return " "
    if name == "gap": return " […] "
    if name == "app":
        lemma = next((c for c in e if tag(c) == "lem"), None)
        return body_text(lemma) if lemma is not None else " […] "
    if name == "choice":
        chosen = next((c for kind in ("corr", "reg", "expan", "orig", "sic", "abbr") for c in e if tag(c) == kind), None)
        return body_text(chosen) if chosen is not None else ""
    return (e.text or "") + "".join((" " if tag(c) in BLOCKS else "") + body_text(c) + (" " if tag(c) in BLOCKS else "") + (c.tail or "") for c in e)

def clean(e): return " ".join(body_text(e).split())

def extract(raw, candidate):
    # No network DTD/entity resolution and no silent repairs of unknown entities.
    if b"<!ENTITY" in raw: raise ValueError("Declaraciones ENTITY requieren conversión revisada")
    root = ET.fromstring(raw)
    if tag(root) != "TEI": raise ValueError("Fuente no TEI P5")
    body = root.find(".//t:text/t:body", NS)
    header = root.find("t:teiHeader", NS)
    if body is None or header is None: raise ValueError("Falta body o cabecera TEI")
    edition = next((e for e in body.iter() if tag(e) == "div" and e.get("type") == "edition"), None)
    if edition is None: raise ValueError("Sin división de edición original acreditada")
    language = edition.get(XLANG) or root.find("t:text", NS).get(XLANG)
    language = {"lat": "la", "greek": "grc"}.get(language, language)
    if language != candidate["language"]: raise ValueError("Lengua TEI discrepante o sin acreditar: " + str(language))
    urn = edition.get("n") or body.get("{http://www.w3.org/XML/1998/namespace}base")
    if not urn:
        urn = next((e.get("{http://www.w3.org/XML/1998/namespace}base") for e in edition.iter() if e.get("{http://www.w3.org/XML/1998/namespace}base")), "")
    expected_code = candidate["id"]
    if not urn or not re.fullmatch(r"urn:cts:(?:greekLit|latinLit):" + re.escape(expected_code) + r"\.[A-Za-z0-9_-]+", urn):
        raise ValueError("URN de edición ausente o discordante")
    licences = []
    for node in header.findall(".//t:availability/t:licence", NS):
        target = node.get("target", "").replace("http://", "https://").rstrip("/") + "/"
        if re.fullmatch(r"https://creativecommons.org/(?:licenses/by(?:-sa)?/[1-4]\.0|publicdomain/(?:zero/1\.0|mark/1\.0))/", target):
            licences.append({"url": target, "statement": flat(node)})
    if not licences: raise ValueError("Sin licencia abierta explícita admisible en la cabecera TEI")
    stmt = header.find("t:fileDesc/t:titleStmt", NS)
    bibl = header.find("t:fileDesc/t:sourceDesc", NS)
    if stmt is None or bibl is None: raise ValueError("Sin identificación bibliográfica de la edición")
    metadata = {
        "title": flat(stmt.find("t:title", NS)) or candidate["title"],
        "titleLanguage": (stmt.find("t:title", NS).get(XLANG) if stmt.find("t:title", NS) is not None else "") or "und",
        "author": flat(stmt.find("t:author", NS)) or candidate["author"],
        "editors": list(dict.fromkeys(flat(e) for e in bibl.findall(".//t:editor", NS) + stmt.findall("t:editor", NS) if flat(e))),
        "bibliography": flat(bibl), "licences": licences,
        "editionUrn": urn, "sourceUrl": candidate["original"], "sourceSha256": digest(raw),
        "sourceReferences": [e.get("target") for e in bibl.findall(".//t:ref", NS) if e.get("target", "").startswith("https://")],
        "publicationYear": flat(bibl.find(".//t:imprint/t:date", NS)),
        "publisher": flat(bibl.find(".//t:imprint/t:publisher", NS)),
        "publicationPlace": flat(bibl.find(".//t:imprint/t:pubPlace", NS)),
    }
    parents = {c: p for p in edition.iter() for c in p}
    # Partition terminal structural divisions and direct content in their parents.
    # This retains mixed prose/verse, headings and short fragments exactly once.
    units = []
    def walk(node, refs):
        if node.text and node.text.strip(): units.append((".".join(refs), "", "raw", node.text.strip()))
        for child in node:
            name = tag(child)
            if name == "div":
                n = child.get("n", "")
                walk(child, refs + ([n] if n and not n.startswith("urn:") else []))
            elif name not in SKIP and name not in VOID:
                text = clean(child)
                if text: units.append((".".join(refs), child.get("n", ""), name, text))
            if child.tail and child.tail.strip(): units.append((".".join(refs), "", "raw", child.tail.strip()))
    walk(edition, [])
    passages = []
    counts = Counter()
    for ref, number, kind, text in units:
        counts[ref] += 1
        suffix = f".{number}" if number else ""
        locus = urn + ":" + (ref + suffix if ref or number else "text")
        # Labels explicitly distinguish genuine @n from source-order blocks.
        locator_kind = "TEI @n; verificar sistema de cita en la fuente"
        if not number:
            locus += "~bloque-" + str(counts[ref])
            locator_kind = "Orden documental dentro de la división TEI; no locus canónico"
        passages.append({"locus": locus, "text": text, "locusKind": locator_kind})
    # Preserve every short line; don't discard short fragmentary works by length.
    if not passages: raise ValueError("Sin texto legible")
    if len({p["locus"] for p in passages}) != len(passages):
        seen = Counter()
        for p in passages:
            seen[p["locus"]] += 1
            if seen[p["locus"]] > 1:
                p["locus"] += "~ocurrencia-" + str(seen[p["locus"]])
                p["locusKind"] += "; unidad con numeración repetida, desambiguada por orden documental"
    expected = re.sub(r"\s", "", clean(edition))
    actual = re.sub(r"\s", "", "".join(p["text"] for p in passages))
    # For whitespace/formatting differences compare characters. Div text/tails
    # outside structural blocks require explicit review, not optimistic truncation.
    if expected != actual:
        raise ValueError(f"Cobertura textual discordante: {len(actual)}/{len(expected)} caracteres")
    if len(actual) < 12: raise ValueError("Fragmento demasiado corto para validar identidad")
    return metadata, passages

# Curatorial import priority, not a claim that literature can be ranked objectively.
# 1: foundational authors; 2: major historical/technical/philosophical traditions;
# 3: other eligible editions. Availability, source licence and completeness are
# always checked separately; no work is omitted solely for lower priority.
FOUNDATIONAL_AUTHORS = (
    "homer", "homero", "hesiod", "hesiodo", "aeschyl", "esquilo",
    "sophocl", "sofocles", "euripid", "aristophan", "aristofanes",
    "herodot", "herodoto", "thucydid", "tucidid",
    "plato", "platon", "aristotl", "aristotel",
    "demosthen", "demosten", "xenophon", "jenofonte",
    "cicero", "ciceron", "vergil", "virgil", "virgilio",
    "horace", "horacio", "ovid", "ovidio", "livy", "livio",
    "tacitus", "tacito", "caesar", "cesar", "lucreti", "lucrecio",
    "seneca", "seneca", "plutarch", "plutarco",
)
MAJOR_AUTHORS = (
    "apollonius", "apolonio", "callimachus", "calimaco",
    "polybius", "polibio", "strabo", "estrabon", "diodorus",
    "dio cassius", "cassius dio", "dion casio", "quintilian",
    "quintiliano", "pliny", "plinio", "suetoni", "suetonio",
    "sallust", "salustio", "vitruvi", "vitruvio",
    "frontinus", "frontino", "columella", "varro", "varron",
    "apollonius", "apolonio", "pappus", "papo de alejandria",
    "aristarchus", "aristarco", "geminus", "gemino",
    "isidore", "isidoro de sevilla",
    "galen", "galeno", "hippocrat", "hipocrat",
    "euclid", "euclides", "archimed", "arquimed",
    "ptolemy", "ptolomeo", "theophrast", "teofrasto",
    "plotin", "plotino", "epictet", "epicteto", "marcus aurelius",
    "marco aurelio", "lucian", "luciano",
)
def normalize_author(value):
    normalized = unicodedata.normalize("NFKD", str(value or "").casefold())
    return "".join(c for c in normalized if not unicodedata.combining(c))

def editorial_priority(group):
    author = normalize_author(group.get("author"))
    # Existing bibliographic dossiers are completed first *within* each tier.
    tier = 1 if any(k in author for k in FOUNDATIONAL_AUTHORS) else (
        2 if any(k in author for k in MAJOR_AUTHORS) else 3
    )
    return tier

def choose_priority_batch(groups, limit, sequence):
    """Reserve most slots for high-priority authors but prevent hard failures
    on individual sources from permanently blocking other eligible editions.
    Stable round-robin within each tier; no edition is skipped from the corpus.
    """
    ranked = {tier: sorted((g for g in groups if editorial_priority(g)==tier),
                          key=lambda g: (not g.get("existing", False),g["workId"]))
              for tier in (1,2,3)}
    # Allocate 8/3/1 slots per twelve (remainder is filled by top priority).
    budgets = {1: (limit*2)//3, 2: limit//4, 3: max(1,limit//12)}
    selected = []
    used = set()
    for tier in (1,2,3):
        bucket = ranked[tier]
        if not bucket: continue
        offset = (sequence * max(1,budgets[tier])) % len(bucket)
        rotated = bucket[offset:] + bucket[:offset]
        count = min(budgets[tier],len(bucket))
        for g in rotated[:count]:
            if g["workId"] not in used:
                selected.append(g); used.add(g["workId"])
    for tier in (1,2,3):
        bucket = ranked[tier]
        if not bucket: continue
        offset = (sequence * max(1,budgets[tier])) % len(bucket)
        for g in bucket[offset:]+bucket[:offset]:
            if len(selected)>=limit: break
            if g["workId"] not in used:
                selected.append(g);used.add(g["workId"])
    return selected[:limit]

def discover(root=ROOT):
    cat = read(root / "data/bibliotheca-graeca-latina-I-bce-I-ce.json")
    reg = read(root / "data/classics-corpus/search-registry.json")
    links = read(root / "data/bibliotheca-perseus.json")["links"]
    works_by_id = {w["id"]: w for w in cat["works"]}
    catalogue_ids = set(works_by_id)
    registered_urls = {e.get("path") for e in reg["entries"]}
    prior_path = root / "data/r2/classics-expansion-manifest.json"
    previous = read(prior_path).get("editions", []) if prior_path.is_file() else []
    known_source_urls, known_urns = set(), set()
    existing_by_code = {}
    for record in previous:
        for source in record.get("sources", []):
            urn = source.get("editionUrn") or ""
            if urn: known_urns.add(urn)
            matched = re.search(r"urn:cts:(?:greekLit|latinLit):([A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+)\\.", urn)
            if matched: existing_by_code.setdefault(matched.group(1).lower(), record["workId"])
            if source.get("sourceUrl"): known_source_urls.add(source["sourceUrl"])
    for work in cat["works"]:
        for alias in work.get("aliases", []):
            matched = re.search(r"urn:cts:(?:greekLit|latinLit):([A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+)\\.", str(alias))
            if matched: existing_by_code.setdefault(matched.group(1).lower(), work["id"])
            if str(alias).startswith("urn:cts:"): known_urns.add(str(alias))
        for source in (work.get("indexedEdition") or {}).get("sources", []):
            if source.get("sourceUrl"): known_source_urls.add(source["sourceUrl"])
            if source.get("editionUrn"): known_urns.add(source["editionUrn"])
    # Edition suffixes identify versions; a CTS work code identifies the work.
    # A second TEI for the same code is NOT a duplicate work and NOT a replacement.
    candidates = {}
    for name in ("clasicos-perseus.json", "clasicos-perseus-extra.json"):
        for c in read(root / "data" / name)["works"]:
            if c.get("language") not in ("la", "grc") or not c.get("original"): continue
            try: source_url(c["original"])
            except ValueError: continue
            if c["original"] in known_source_urls: continue
            file_stem = Path(c["original"]).name.removesuffix(".xml")
            namespace = "greekLit" if c["language"] == "grc" else "latinLit"
            candidate_urn = "urn:cts:" + namespace + ":" + file_stem
            if candidate_urn in known_urns: continue
            candidates.setdefault(c["id"], {})[c["original"]] = c
    owners = {}
    for work_id, rows in links.items():
        for row in rows: owners.setdefault(row["obra"], []).append(work_id)
    groups, used_codes, skipped = [], set(), []
    for work in cat["works"]:
        codes = [e["obra"] for e in links.get(work["id"], [])]
        eligible = [c for code in codes for c in candidates.get(code, {}).values()
                    if c["language"] == work["language"]]
        if eligible:
            groups.append({"workId": work["id"], "author": work["author"], "title": work["title"],
                           "language": work["language"], "sources": eligible, "existing": True})
            used_codes.update(codes)
        else:
            skipped.append(work["id"])
    def normalize_label(value):
        value = unicodedata.normalize("NFKD", str(value or "")).casefold()
        return " ".join(re.sub(r"[^a-z0-9]+", " ", "".join(ch for ch in value if not unicodedata.combining(ch))).split())
    known_bibliography = {
        (normalize_label(w["author"]), normalize_label(w["title"])): w["id"]
        for w in cat["works"] if w.get("author") and w.get("title")
    }
    grouped = {}
    for code in sorted(candidates):
        if code in used_codes: continue
        for candidate in candidates[code].values():
            wid = existing_by_code.get(code.lower())
            if not wid:
                wid = next((w for w in owners.get(code, [])
                            if w in works_by_id and works_by_id[w]["language"] == candidate["language"]), None)
            if not wid:
                wid = known_bibliography.get((normalize_label(candidate["author"]), normalize_label(candidate["title"])))
                if wid in works_by_id and works_by_id[wid]["language"] != candidate["language"]:
                    wid = None
            if not wid:
                wid = "cts-" + re.sub(r"[^a-z0-9]+", "-", code.lower()).strip("-")
            if wid in works_by_id and works_by_id[wid]["language"] != candidate["language"]:
                # Do not merge different original languages under an unverified ID.
                continue
            group = grouped.setdefault(wid, {
                "workId": wid,
                "author": works_by_id[wid]["author"] if wid in works_by_id else candidate["author"],
                "title": works_by_id[wid]["title"] if wid in works_by_id else candidate["title"],
                "language": candidate["language"], "dating": candidate.get("dates", ""),
                "sources": [], "existing": wid in catalogue_ids,
                "relatedWorkIds": owners.get(code, [])
            })
            if candidate["original"] not in {x["original"] for x in group["sources"]}:
                group["sources"].append(candidate)
    groups.extend(grouped.values())
    return groups, {
        "sourceRecords": sum(len(x) for x in candidates.values()),
        "alreadyIndexedCatalogueWorks": len(skipped),
        "pendingGroups": len(groups),
        "policy": "Una obra bibliográfica, múltiples ediciones identificadas por URN y hash; sin sustituir ni duplicar archivos"
    }

def prepare(group, folder):
    sources, passages = [], []
    for candidate in group["sources"]:
        raw = download(candidate["original"])
        meta, units = extract(raw, candidate)
        xmlfile = folder / "sources" / (meta["sourceSha256"] + ".xml")
        xmlfile.parent.mkdir(parents=True, exist_ok=True)
        if not xmlfile.exists(): xmlfile.write_bytes(raw)
        meta["archivedSource"] = HOST + "/corpus/fuentes/" + xmlfile.name
        sources.append(meta); passages.extend(units)
    if len({p["locus"] for p in passages}) != len(passages): raise ValueError("Localizadores repetidos entre fuentes; colección no publicada")
    doc = {"workId": group["workId"], "language": group["language"], "title": group["title"],
           "sourceType": "edited-greek-tei" if group["language"] == "grc" else "edited-latin-tei",
           "editorialStatus": "Texto de edición TEI; control técnico de cobertura y procedencia, sin colación ecdótica independiente",
           "alignment": "Se conserva la división TEI y se distinguen bloques documentales. No se presume alineación con códices ni traducciones.",
           "source": sources[0]["sourceUrl"], "sourceUrn": sources[0]["editionUrn"],
           "sourceSha256": sources[0]["sourceSha256"], "sources": sources,
           "attribution": " · ".join(s["author"] + ", " + s["title"] + ("; ed. " + ", ".join(s["editors"]) if s["editors"] else "") for s in sources) + "; digitalización PerseusDL / OpenGreekAndLatin; adaptación técnica Vitruvius Digital Library",
           "license": " · ".join(dict.fromkeys(l["url"] for s in sources for l in s["licences"])),
           "passages": passages}
    raw = packed(doc); h = digest(raw)
    # Digest in flat filename is accepted by both existing public readers.
    filename = f"{group['workId']}-{group['language']}-{h[:16]}.json"
    (folder / "corpus").mkdir(parents=True, exist_ok=True)
    (folder / "corpus" / filename).write_bytes(raw)
    return {**group, "sources": sources, "filename": filename, "sha256": h, "passages": len(passages), "characters": sum(len(p["text"]) for p in passages), "bytes": len(raw), "url": HOST + "/corpus/" + filename}

def client():
    for key in ("R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY"):
        if not os.getenv(key): raise RuntimeError("Faltan credenciales R2; no se declara ninguna publicación")
    import boto3
    from botocore.config import Config
    return boto3.client("s3", endpoint_url=f"https://{os.getenv('R2_ACCOUNT_ID') or '4e936bf2c4f185a87075ca506de93e69'}.r2.cloudflarestorage.com", region_name="auto", aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"], aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"], config=Config(retries={"max_attempts": 6, "mode": "adaptive"})), os.getenv("R2_BUCKET") or "vitruvius-bibliotheca"

def put_verified(s3, bucket, key, raw, mime):
    # Content-addressed keys; reruns reuse identical objects and never replace bytes.
    try:
        existing = s3.get_object(Bucket=bucket, Key=key)["Body"].read()
    except s3.exceptions.NoSuchKey:
        existing = None
    if existing is not None:
        if digest(existing) != digest(raw): raise ValueError("Objeto preexistente discordante: " + key)
    else:
        s3.put_object(Bucket=bucket, Key=key, Body=raw, ContentType=mime, CacheControl="public,max-age=31536000,immutable", Metadata={"sha256": digest(raw)})
    verified = s3.get_object(Bucket=bucket, Key=key)["Body"].read()
    if digest(verified) != digest(raw): raise ValueError("SHA256 de R2 discordante: " + key)
    # The public route used by readers must deliver the exact same bytes.
    # Transient Cloudflare 503/429/5xx responses must not strand an otherwise
    # verified R2 edition. Never retry or accept a SHA256 mismatch.
    public_url = HOST + "/" + key
    for attempt in range(6):
        try:
            with urlopen(Request(public_url, headers={"User-Agent": "VitruviusAcademicCorpus/2.0"}), timeout=60) as response:
                public = response.read(len(raw) + 1)
        except HTTPError as exc:
            if exc.code not in (404, 408, 425, 429, 500, 502, 503, 504) or attempt == 5:
                raise
            time.sleep(min(2 ** (attempt + 1), 20))
            continue
        except (URLError, TimeoutError, ConnectionError) as exc:
            if attempt == 5:
                raise
            time.sleep(min(2 ** (attempt + 1), 20))
            continue
        if digest(public) != digest(raw):
            raise ValueError("SHA256 público discordante: " + key)
        break

def local_inventory(root=ROOT):
    reg = read(root / "data/classics-corpus/search-registry.json")
    registered = {e["path"] for e in reg["entries"] if not e["path"].startswith("https://")}
    files = set()
    for path in (root / "data/classics-corpus").glob("*.json"):
        try:
            d = read(path)
            if isinstance(d, dict) and isinstance(d.get("passages"), list) and d.get("workId") and d.get("language"): files.add(path)
        except (ValueError, OSError): continue
    for path in (root / "corpus").glob("*.html"): files.add(path)
    cat = read(root / "data/bibliotheca-graeca-latina-I-bce-I-ce.json")
    for w in cat["works"]:
        for name in [w.get("pdf", {}).get("url"), *[v.get("path") for v in w.get("localVersions", [])], *w.get("corpusFiles", {}).values()]:
            if name and not name.startswith(("https://", "http://")):
                p = root / name
                if p.is_file(): files.add(p)
    result = []
    for p in sorted(files):
        raw = p.read_bytes(); rel = str(p.relative_to(root))
        result.append({"path": rel, "sha256": digest(raw), "bytes": len(raw), "registered": rel in registered, "r2Key": "preserved/github/" + digest(raw) + p.suffix})
    return result

def finalize(folder, root=ROOT):
    report = read(folder / "prepared.json")
    completed = report.get("published", [])
    if not completed: raise ValueError("No hay publicaciones verificadas para incorporar")
    descriptor = read(folder / "index-descriptor.json")
    catpath = root / "data/bibliotheca-graeca-latina-I-bce-I-ce.json"
    regpath = root / "data/classics-corpus/search-registry.json"
    cat, reg = read(catpath), read(regpath)
    byid = {w["id"]: w for w in cat["works"]}
    entries = {(e["workId"], e["language"], e["path"]): e for e in reg["entries"]}
    for row in completed:
        wid, lang = row["workId"], row["language"]
        if (wid, lang, row["url"]) in entries: continue
        # An existing author/title is ONE work with multiple distinct versions.
        # Use the established bibliographic ID instead of creating a duplicate.
        if wid not in byid:
            normalize = lambda x: "".join(ch for ch in unicodedata.normalize("NFKD", str(x or "").casefold()) if not unicodedata.combining(ch)).strip()
            matching = [w["id"] for w in byid.values()
                        if normalize(w.get("author")) == normalize(row["author"])
                        and normalize(w.get("title")) == normalize(row["title"])
                        and w.get("language") == lang]
            if matching: wid = matching[0]
        if (wid, lang, row["url"]) in entries: continue
        reader = f"classics-text-reader.html?work={wid}&lang={lang}&edition={row['sha256'][:16]}"
        summary = {k: row[k] for k in ("sources", "sha256", "passages", "characters", "bytes", "url")}
        if wid not in byid:
            byid[wid] = {"id": wid, "author": row["author"], "title": row["title"], "language": lang,
              "genre": "Corpus clásico ampliado", "dating": row.get("dating") or "Datación no consignada en la fuente de catálogo",
              "reading": {"url": reader, "status": "Edición TEI alojada en R2 con búsqueda y traducción automática por pasaje"},
              "manuscript": {"status": "Sin testimonio manuscrito individual asignado; la edición TEI se identifica por separado"},
              "pdf": {"url": None, "status": "No consta PDF ni facsímil individual verificado para esta edición"},
              "translation": {"status": "Traducción automática de consulta por pasaje; no se atribuye a un traductor académico"},
              "links": {"scaife": "https://scaife.perseus.org/library/" + row["sources"][0]["editionUrn"] + "/"},
              "aliases": [s["editionUrn"] for s in row["sources"]], "relatedWorkIds": row.get("relatedWorkIds", []),
              "catalogueProvenance": "Título y autor de los catálogos CTS del sitio; edición contrastada con su cabecera TEI. No se retrotraduce el título."}
        w = byid[wid]
        # Preserve every pre-existing bibliography, PDF, version and witness.
        previous = w.setdefault("corpusFiles", {}).get(lang)
        if previous and previous != row["url"] and not any(v.get("path") == previous for v in w.get("localVersions", [])):
            w.setdefault("localVersions", []).append({"language": lang, "path": previous, "label": "Versión conservada antes de la ampliación R2"})
        w["corpusFiles"][lang] = row["url"]
        w.setdefault("localVersions", []).append({"language": lang, "path": row["url"], "label": "Original " + lang + " · edición TEI en R2", "reader": reader})
        w["publicStatus"] = "lectura-local-parcial"
        w.setdefault("indexedEdition", summary)
        entries[(wid, lang, row["url"])] = {"workId": wid, "author": w["author"], "title": w["title"], "language": lang, "format": "json-passages", "path": row["url"], "reader": reader,
            "sourceDescription": "Edición TEI con licencia, URN, SHA256 y cobertura técnica comprobados; sin colación independiente", "sourceUrn": row["sources"][0]["editionUrn"], "sha256": row["sha256"], "passages": row["passages"]}
    cat["works"] = list(byid.values())
    reg["entries"] = sorted(entries.values(), key=lambda e: (e["workId"], e["language"], e["path"]))
    reg["count"] = len(entries); reg["works"] = len({e["workId"] for e in entries.values()}); reg["updated"] = datetime.now(timezone.utc).date().isoformat()
    save(catpath, cat); save(regpath, reg)
    save(root / "data/r2/classics-expansion-index.json", descriptor)
    # Keep expansion manifest separate from the original 32-version R2 manifest.
    oldpath = root / "data/r2/classics-expansion-manifest.json"
    old = read(oldpath) if oldpath.exists() else {"editions": [], "githubPreserved": []}
    prior = {r["url"]: r for r in old["editions"]}
    for row in completed:
        if row["url"] in prior and prior[row["url"]].get("sha256") != row["sha256"]:
            raise ValueError("La versión R2 existente no puede cambiar de contenido")
        prior.setdefault(row["url"], row)
    preserved = {r["path"] + "|" + r["sha256"]: r for r in old.get("githubPreserved", [])}
    for row in report.get("githubPreserved", []): preserved[row["path"] + "|" + row["sha256"]] = row
    save(oldpath, {"schema": "vdl-classics-expansion-manifest-v1", "generated": report["generated"], "discovery": report["discovery"], "editions": list(prior.values()), "githubPreserved": list(preserved.values()), "deferred": report["deferred"], "policy": "No se borran ni reemplazan originales de GitHub, PDFs, traducciones o códices. Cobertura relativa a los catálogos CTS inventariados, no a toda la literatura antigua."})
    print(json.dumps({"catalogueWorks": len(byid), "searchVersions": len(entries), "newVerifiedEditions": len(completed), "githubFilesPreserved": len(preserved), "deferred": len(report["deferred"])}))

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--folder", default="/tmp/vdl-classics-expansion"); ap.add_argument("--limit", type=int, default=0); ap.add_argument("--workers", type=int, default=6); ap.add_argument("--publish", action="store_true"); ap.add_argument("--finalize", action="store_true"); ap.add_argument("--discover", action="store_true")
    args = ap.parse_args(); folder = Path(args.folder); folder.mkdir(parents=True, exist_ok=True)
    if args.finalize: finalize(folder); return
    groups, info = discover()
    inventory = local_inventory()
    info["githubTextFiles"] = len(inventory); info["githubUnregisteredFiles"] = sum(not e["registered"] for e in inventory)
    if args.discover:
        save(folder / "discovery.json", {"counts": info, "groups": groups, "githubInventory": inventory})
        print(json.dumps(info)); return
    if args.limit:
        sequence = int(os.environ.get("GITHUB_RUN_NUMBER") or datetime.now(timezone.utc).date().toordinal())
        groups = choose_priority_batch(groups,args.limit,sequence)
        info["selectionPolicy"] = "fundamentales > grandes tradiciones > especializados; rotación intra-grupo"
        info["selectedGroups"] = len(groups)
        info["selectedByPriority"] = dict(Counter(str(editorial_priority(g)) for g in groups))
    report = {"generated": datetime.now(timezone.utc).isoformat(), "discovery": info, "prepared": [], "published": [], "deferred": [], "githubPreserved": []}
    s3, bucket = client() if args.publish else (None, None)
    def process(group):
        row = prepare(group, folder)
        if s3:
            for s in row["sources"]:
                name = s["sourceSha256"] + ".xml"
                put_verified(s3, bucket, "corpus/fuentes/" + name, (folder / "sources" / name).read_bytes(), "application/xml;charset=utf-8")
            put_verified(s3, bucket, "corpus/" + row["filename"], (folder / "corpus" / row["filename"]).read_bytes(), "application/json;charset=utf-8")
        return row
    with ThreadPoolExecutor(max_workers=max(1, min(args.workers, 12))) as pool:
        futures = {pool.submit(process, g): g for g in groups}
        for future in as_completed(futures):
            group = futures[future]
            try:
                row = future.result(); report["prepared"].append(row)
                if s3: report["published"].append(row)
                print("VERIFIED" if s3 else "PREPARED", row["workId"], row["passages"], flush=True)
            except Exception as exc:
                report["deferred"].append({"workId": group["workId"], "sources": [s["original"] for s in group["sources"]], "reason": str(exc)[:400]})
                print("DEFERRED", group["workId"], str(exc)[:180], flush=True)
            save(folder / "prepared.json", report)
    if s3:
        # Rebuild a cumulative index on reruns; prior immutable editions remain
        # searchable even when this run only adds a few previously deferred works.
        previous_manifest = ROOT / "data/r2/classics-expansion-manifest.json"
        if previous_manifest.exists():
            urls = {r["url"] for r in report["published"]}
            for row in read(previous_manifest).get("editions", []):
                if row["url"] in urls: continue
                raw = s3.get_object(Bucket=bucket, Key="corpus/" + row["filename"])["Body"].read()
                if digest(raw) != row["sha256"]: raise ValueError("Edición anterior R2 discordante")
                (folder / "corpus").mkdir(parents=True, exist_ok=True)
                (folder / "corpus" / row["filename"]).write_bytes(raw)
                report["published"].append(row)
        # Previously verified immutable, content-addressed preservation objects
        # are not reuploaded on every run. Changes always receive a new R2 key;
        # this is safe because put_verified validated SHA256 via S3 and public CDN
        # before the earlier record entered the committed manifest.
        prior_preserved = {
            (x.get("path"), x.get("sha256"), x.get("r2Key")): x
            for x in (read(previous_manifest).get("githubPreserved", []) if previous_manifest.exists() else [])
        }
        preserved_reused = 0
        for row in inventory:
            identity = (row["path"], row["sha256"], row["r2Key"])
            if identity in prior_preserved:
                report["githubPreserved"].append(row)
                preserved_reused += 1
                continue
            p = ROOT / row["path"]
            mime = "application/json;charset=utf-8" if p.suffix == ".json" else "text/html;charset=utf-8" if p.suffix == ".html" else "application/pdf"
            try:
                put_verified(s3, bucket, row["r2Key"], p.read_bytes(), mime)
                report["githubPreserved"].append(row)
            except Exception as exc:
                report["deferred"].append({"path": row["path"], "reason": "Copia de preservación pendiente: " + str(exc)[:300]})
        info["unchangedGithubPreservationReused"] = preserved_reused
        save(folder / "prepared.json", report)
    print(json.dumps({"prepared": len(report["prepared"]), "published": len(report["published"]), "deferred": len(report["deferred"]), "githubPreserved": len(report["githubPreserved"])}))
    if not report["prepared"] and not report["published"]: raise SystemExit("No se recuperó ninguna edición publicable")

if __name__ == "__main__": main()
