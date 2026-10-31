"""Opt-in HTR bridge for a user-operated Kraken installation.

Set KRAKEN_MODEL to the absolute path of a compatible, validated .mlmodel.
Run: pip install -r htr-service/requirements.txt
     uvicorn htr-service.server:app --host 127.0.0.1 --port 8765

No transcription is synthesized or copied from an edition.
"""
import os
import subprocess
import tempfile
from pathlib import Path
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, UnidentifiedImageError

MODEL = os.environ.get("KRAKEN_MODEL", "")
ALLOWED = os.environ.get("HTR_ALLOWED_ORIGIN", "https://diegoalonsok-png.github.io")
app = FastAPI(title="Vitruvius Scriptorium HTR bridge")
app.add_middleware(CORSMiddleware, allow_origins=[ALLOWED], allow_methods=["GET", "POST"], allow_headers=["*"])

@app.get("/health")
def health():
    return {"ready": bool(MODEL and Path(MODEL).is_file()), "engine": "Kraken", "model_configured": bool(MODEL and Path(MODEL).is_file())}

@app.post("/recognize")
async def recognize(image: UploadFile = File(...)):
    if not MODEL or not Path(MODEL).is_file():
        raise HTTPException(status_code=503, detail="Modelo Kraken no configurado. Definí KRAKEN_MODEL.")
    raw = await image.read(15 * 1024 * 1024 + 1)
    if len(raw) > 15 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Imagen demasiado grande (máximo 15 MB)")
    with tempfile.TemporaryDirectory() as tmp:
        src, out = Path(tmp)/"folio.png", Path(tmp)/"htr.txt"
        try:
            from io import BytesIO
            with Image.open(BytesIO(raw)) as im:
                im.verify()
            with Image.open(BytesIO(raw)) as im:
                im.convert("RGB").save(src)
        except (UnidentifiedImageError, OSError, ValueError):
            raise HTTPException(status_code=400, detail="Imagen ilegible")
        try:
            result = subprocess.run(["kraken", "-i", str(src), str(out), "segment", "-bl", "ocr", "-m", MODEL], capture_output=True, text=True, timeout=240)
        except (OSError, subprocess.TimeoutExpired):
            raise HTTPException(status_code=502, detail="Kraken no pudo ejecutarse o excedió el tiempo límite")
        if result.returncode or not out.is_file():
            raise HTTPException(status_code=422, detail="Falló el reconocimiento: revisá segmentación y compatibilidad del modelo")
        transcript = out.read_text(encoding="utf-8").strip()
        return {"text": transcript, "engine": "Kraken", "status": "automatic_unreviewed", "confidence": None}
