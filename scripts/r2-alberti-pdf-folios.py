#!/usr/bin/env python3
"""Recuperación de Alberti (Sevilla, 1582) desde PDF público de Internet Archive.
Solo R2. Sin viewer externo, ni imágenes en GitHub. No publica índice parcial.
"""
import hashlib,json,os,time,urllib.request
from pathlib import Path
import fitz,boto3
from botocore.config import Config
ROOT=Path(__file__).resolve().parents[1]
ID="alberti-diez-libros-1582"
SOURCE="https://archive.org/download/ARes12403/ARes12403.pdf"
PUBLIC="https://libros.vitruvius-digital-library.org"
BUCKET="vitruvius-bibliotheca"
DEST=ROOT/"data/r2/folios/alberti-diez-libros-1582.json"
fuente=json.loads((ROOT/"data/r2/folios-fuentes.json").read_text(encoding="utf-8"))["obras"][ID]
if fuente.get("rehospedar") is not True:raise SystemExit("La licencia no permite la copia")
# El servidor principal de Archive.org puede dar 503/timeout pese a que
# el PDF original sigue disponible en sus servidores de almacenamiento.
# Usar servidores anunciados por su propia API, sin cambiar de ejemplar.
candidates=[SOURCE]
try:
    with urllib.request.urlopen(urllib.request.Request(
        "https://archive.org/metadata/ARes12403",
        headers={"User-Agent":"VitruviusDigitalLibrary/1.0"}),timeout=45) as response:
        metadata=json.load(response)
    filename="ARes12403.pdf"
    for host in [metadata.get("d1"),metadata.get("d2")]:
        if host and metadata.get("dir"):
            candidates.append("https://"+host+metadata["dir"]+"/"+filename)
    for location in metadata.get("alternate_locations",{}).get("workable",[]):
        if location.get("server") and location.get("dir"):
            candidates.append("https://"+location["server"]+location["dir"]+"/"+filename)
except Exception as exc:
    print("No se pudo consultar la API de espejos:",exc,flush=True)
payload=None
for address in dict.fromkeys(candidates):
    for attempt in range(1,4):
        try:
            print("Descargando PDF de",address,"intento",attempt,flush=True)
            req=urllib.request.Request(address,headers={"User-Agent":"Mozilla/5.0 VitruviusDigitalLibrary/1.0"})
            with urllib.request.urlopen(req,timeout=150) as response:
                data=response.read()
            if not data.startswith(b"%PDF") or len(data)<1000000:
                raise ValueError("Contenido PDF vacío o inválido")
            payload=data
            break
        except Exception as exc:
            print("Error de origen:",str(exc),flush=True)
            time.sleep(min(8*attempt,20))
    if payload is not None:break
if payload is None:raise SystemExit("Sin PDF válido de Alberti: fallaron todos los servidores Archive.org")
doc=fitz.open(stream=payload,filetype="pdf")
if len(doc)<350:raise SystemExit(f"Edición inesperadamente corta: {len(doc)} páginas")
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
registro={"schema":"vdl-folios-obra-1","obra":ID,"titulo":fuente["titulo"],"autor":fuente["autor"],"edicion":fuente["edicion"],"lengua":fuente["lengua"],"fuente":fuente["enlaceFuente"],"derechos":fuente["derechos"],"institucion":fuente.get("institucion"),"signatura":fuente.get("signatura"),"colacion":fuente.get("colacion"),"imagenes":len(folios),"imagenesEnLaFuente":len(folios),"ancho":1600,"base":f"{PUBLIC}/folios/{ID}/","nomenclatura":"Número de imagen digital del PDF de A Res.12/4/03. No es folio ni página impresa; esos campos quedan sin atribuir hasta su cotejo.","criterioEcdotico":"Sin collatio de variantes ni concordancia textual verificada","soporteDigital":"PDF de dominio público de Internet Archive digitalizado por Biblioteca de la Universidad de Sevilla; re-render a JPEG y miniaturas desde PDF con PyMuPDF; imágenes resultantes en Cloudflare R2","sha256PDFOrigen":hashlib.sha256(payload).hexdigest(),"folios":folios}
encoded=json.dumps(registro,ensure_ascii=False,indent=1)+"\n"
s3.put_object(Bucket=BUCKET,Key=f"folios/{ID}/indice-folios.json",Body=encoded.encode("utf-8"),ContentType="application/json; charset=utf-8",CacheControl="public, max-age=3600")
DEST.write_text(encoded,encoding="utf-8")
print(f"OK: {len(folios)} imágenes alojadas en R2 e índice escrito")
