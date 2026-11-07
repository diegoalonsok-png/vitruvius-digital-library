#!/usr/bin/env python3
"""Local multimodal draft transcription for Vitruvia Papyrologia et Ostraca.

Run on your computer only. NEVER expose GEMINI_API_KEY in a GitHub Pages site.
The output is a *hypothesis* requiring verification against original evidence.
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

MAX_FILE_BYTES = 20 * 1024 * 1024
LANGUAGE_HINTS = {
    "auto": "Determine possible writing systems, not the language from script alone.",
    "grc": "Ancient Greek: compare uncial, papyrological, epigraphic, and lunate sigma shapes.",
    "lat": "Latin: examine capital, cursive, and manuscript forms without forcing one date.",
    "heb": "Hebrew: distinguish square Hebrew from paleo-Hebrew where possible.",
    "paleoheb": "Paleo-Hebrew: do not confuse it automatically with Phoenician.",
    "phn": "Phoenician: check alphabetic direction and shape variants.",
    "arc": "Aramaic: distinguish language from script; Hebrew and Syriac scripts have different histories.",
    "syr": "Syriac-script Aramaic: inspect character variants and direction.",
    "copt": "Coptic: distinguish Coptic graphemes from Greek where necessary.",
}

PROMPT = """
You are assisting an academic papyrologist/epigrapher, NOT certifying a transcription.
Inspect the image itself and propose a diplomatic, line-by-line reading.
Do not hallucinate words to make a fluent narrative. Describe the writing system
and distinguish it from the actual language; either or both can be uncertain.
Respect RTL direction for Semitic scripts. Preserve archaic characters,
diacritics and line breaks; separate visible signs from conjectural restorations.
For EVERY line, supply an ordered list of sign hypotheses. Provide at most 3
alternatives for unclear signs, and mark missing signs as lacunae without guessing
their content. Use "clear"/"uncertain"/"lost" as editorial evidence labels, not
statistical probabilities. If segmentation is uncertain, say so explicitly.
The image may contain no readable characters; an empty reading is acceptable.
Do NOT invent provenance, date, identity, manuscript shelfmark, or stemma.
Your entire answer must be valid JSON with these fields:
{
 "writing_system_candidates": [{"name":"...", "evidence":"...", "certainty":"high|medium|low"}],
 "language_candidates": [{"name":"...", "reason":"...", "certainty":"high|medium|low"}],
 "support_type": "papyrus|ostracon|stone|manuscript|other|unknown",
 "condition_notes": "...",
 "lines": [
  {"line_number":1, "diplomatic_text":"...", "reading_direction":"rtl|ltr|unknown",
   "signs":[{"visible":"...", "suggested":"...", "alternatives":["..."],
             "status":"clear|uncertain|lost", "explanation":"..."}],
   "line_notes":"..."}
 ],
 "tentative_translation_es":"...",
 "uncertainties":["..."],
 "editorial_note":"All readings are machine-generated hypotheses, not an academic edition."
}
The JSON must contain no markdown fences. A sign hypothesis may represent a cluster
when finer segmentation cannot be justified; disclose that in line_notes.
Requested emphasis:
""".strip()


def analyze(args: argparse.Namespace) -> int:
    key = os.environ.get("GEMINI_API_KEY", "").strip()
    if not key:
        print("Falta GEMINI_API_KEY en el entorno local. Nunca la subas a GitHub.", file=sys.stderr)
        return 2

    path = Path(args.image).expanduser().resolve()
    if not path.is_file() or path.stat().st_size > MAX_FILE_BYTES:
        print("Archivo inexistente o demasiado grande (máximo 20 MB).", file=sys.stderr)
        return 2

    suffix = path.suffix.lower()
    if suffix not in (".png", ".jpg", ".jpeg", ".webp"):
        print("Solo se admiten PNG, JPEG y WebP.", file=sys.stderr)
        return 2

    try:
        from google import genai
        from google.genai import types
        from PIL import Image, ImageOps
    except ImportError:
        print("Instala las dependencias: pip install -r tools/papyrology/requirements.txt", file=sys.stderr)
        return 2

    # Re-encode to a clean RGB image, with EXIF orientation applied, and
    # reasonable size limits before the paid request. No EXIF/GPS uploaded.
    try:
        with Image.open(path) as im:
            im = ImageOps.exif_transpose(im)
            if im.width * im.height > 35_000_000:
                print("Imagen de más de 35 megapíxeles; reduce el tamaño.", file=sys.stderr)
                return 2
            im = im.convert("RGB")
            from io import BytesIO
            data = BytesIO()
            im.save(data, "PNG", optimize=True)
            image_bytes = data.getvalue()
    except Exception as exc:
        print(f"No se pudo procesar la imagen: {exc}", file=sys.stderr)
        return 2

    prompt = PROMPT + "\n" + LANGUAGE_HINTS[args.script]
    output = Path(args.output or (str(path.with_suffix("")) + "-lectura-gemini.json"))
    if output.resolve() == path:
        print("La salida no puede reemplazar la fotografía original.", file=sys.stderr)
        return 2
    if output.exists() and not args.overwrite:
        print(f"Ya existe {output}. Usa --overwrite para reemplazarlo.", file=sys.stderr)
        return 2

    try:
        with genai.Client(api_key=key) as client:
            result = client.models.generate_content(
                model=args.model,
                contents=[
                    types.Part.from_bytes(data=image_bytes, mime_type="image/png"),
                    prompt,
                ],
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    temperature=0,
                ),
            )
        raw = result.text or ""
        response = json.loads(raw)
        if not isinstance(response, dict) or not isinstance(response.get("lines"), list):
            raise ValueError("La respuesta del modelo no contiene 'lines' como lista.")
        for line in response["lines"]:
            if not isinstance(line, dict) or not isinstance(line.get("signs", []), list):
                raise ValueError("Alguna línea tiene un formato inesperado.")
        envelope = {
            "schema": "vitruvia-papyrology-multimodal-draft-v1",
            "verified": False,
            "review_status": "pending_human_review",
            "tool": "Google Gemini API",
            "model": args.model,
            "created_utc": datetime.now(timezone.utc).isoformat(),
            "input_filename": path.name,
            "script_hint": args.script,
            "notice": "Análisis automático no verificado: contrastar signo por signo con la imagen y fuente institucional.",
            "analysis": response,
        }
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(json.dumps(envelope, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Lectura tentativa guardada: {output}")
        print("Revisa los signos en Vitruvia Lexicon antes de citar.")
        return 0
    except Exception as exc:
        print(f"No se pudo completar el análisis Gemini: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1


def main() -> int:
    p = argparse.ArgumentParser(description="Análisis multimodal experimental de soportes antiguos")
    p.add_argument("image", help="Foto o imagen procesada PNG, JPEG o WebP")
    p.add_argument("--script", choices=LANGUAGE_HINTS, default="auto", help="Escritura sugerida (no forzada)")
    p.add_argument("--model", default="gemini-2.5-flash", help="Modelo Gemini disponible en tu cuenta")
    p.add_argument("--output", help="Archivo JSON para importar después en Vitruvia Lexicon")
    p.add_argument("--overwrite", action="store_true")
    return analyze(p.parse_args())


if __name__ == "__main__":
    raise SystemExit(main())
