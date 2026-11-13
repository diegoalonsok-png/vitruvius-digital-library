#!/usr/bin/env python3
"""Edición primera de Palladio (Venecia, 1570), Getty Research Institute / IA.
Solo R2. Sin viewer externo, ni imágenes en GitHub. No publica índice parcial.
"""
import hashlib,json,os,time,urllib.request
from pathlib import Path
import fitz,boto3
from botocore.config import Config
ROOT=Path(__file__).resolve().parents[1]
ID="palladio-quattro-libri"
SOURCE="https://archive.org/download/qvattrolibridel00pall/qvattrolibridel00pall.pdf"
PUBLIC="https://libros.vitruvius-digital-library.org"
BUCKET="vitruvius-bibliotheca"
DEST=ROOT/"data/r2/folios/palladio-quattro-libri.json"
fuente=json.loads((ROOT/"data/r2/folios-fuentes.json").read_text(encoding="utf-8"))["obras"][ID]
if fuente.get("rehospedar") is not True:raise SystemExit("La licencia no permite la copia")
req=urllib.request.Request(SOURCE,headers={"User-Agent":"VitruviusDigitalLibrary/1.0"})
with urllib.request.urlopen(req,timeout=240) as response: payload=response.read()
if not payload.startswith(b"%PDF"):raise SystemExit("El archivo fuente no es PDF")
doc=fitz.open(stream=payload,filetype="pdf")
if len(doc)<300:raise SystemExit(f"Edición inesperadamente corta: {len(doc)} páginas")
s3=boto3.client("s3",endpoint_url="https://4e936bf2c4f185a87075ca506de93e69.r2.cloudflarestorage.com",region_name="auto",aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],config=Config(retries={"max_attempts":8,"mode":"adaptive"}))
folios=[]
for pos,p in enumerate(doc):
    n=pos+1
    def raster(width):
        pix=p.get_pixmap(matrix=fitz.Matrix(width/max(p.rect.width,1),width/max(p.rect.width,1)),alpha=False,colorspace=fitz.csRGB)
        return pix.tobytes("jpeg",jpg_quality=84)
    full=raster(1600)
    thumb=raster(220)
    name=f"folios/{ID}/f{n:04d}.jpg";tn=f"folios/{ID}/t{n:04d}.jpg"
    s3.put_object(Bucket=BUCKET,Key=name,Body=full,ContentType="image/jpeg",CacheControl="public, max-age=2592000",Metadata={"sha256":hashlib.sha256(full).hexdigest()})
    s3.put_object(Bucket=BUCKET,Key=tn,Body=thumb,ContentType="image/jpeg",CacheControl="public, max-age=2592000")
    obj=s3.head_object(Bucket=BUCKET,Key=name)
    if obj["ContentLength"]!=len(full):raise SystemExit(f"Subida no verificada: {n}")
    folios.append({"imagenDigital":n,"folio":"","paginaImpresa":"","libro":"","etiquetaFuente":f"Imagen PDF {n}","imagen":f"{PUBLIC}/{name}","miniatura":f"{PUBLIC}/{tn}","bytes":len(full),"sha256":hashlib.sha256(full).hexdigest()})
    if n%25==0:print(f"{n}/{len(doc)} folios confirmados R2",flush=True)
registro={"schema":"vdl-folios-obra-1","obra":ID,"titulo":fuente["titulo"],"autor":fuente["autor"],"edicion":fuente["edicion"],"lengua":fuente["lengua"],"fuente":fuente["enlaceFuente"],"derechos":fuente["derechos"],"institucion":fuente.get("institucion"),"signatura":fuente.get("signatura"),"colacion":fuente.get("colacion"),"imagenes":len(folios),"imagenesEnLaFuente":len(folios),"ancho":1600,"base":f"{PUBLIC}/folios/{ID}/","nomenclatura":"Número de imagen digital del PDF del ejemplar Getty de Palladio 1570. No es folio ni página impresa; esos campos quedan sin atribuir hasta su cotejo.","criterioEcdotico":"Sin collatio de variantes ni concordancia textual verificada","soporteDigital":"PDF histórico de Internet Archive del ejemplar Getty Research Institute; primera edición de 1570; re-render a JPEG y miniaturas desde PDF con PyMuPDF; imágenes resultantes en Cloudflare R2","sha256PDFOrigen":hashlib.sha256(payload).hexdigest(),"folios":folios}
encoded=json.dumps(registro,ensure_ascii=False,indent=1)+"\n"
s3.put_object(Bucket=BUCKET,Key=f"folios/{ID}/indice-folios.json",Body=encoded.encode("utf-8"),ContentType="application/json; charset=utf-8",CacheControl="public, max-age=3600")
DEST.write_text(encoded,encoding="utf-8")
print(f"OK: {len(folios)} imágenes alojadas en R2 e índice escrito")
