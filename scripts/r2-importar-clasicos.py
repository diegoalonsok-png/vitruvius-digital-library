#!/usr/bin/env python3
"""Importa a Cloudflare R2 ediciones clásicas de dominio público (Internet Archive).

* Solo R2: los PDF NO entran al repositorio (GitHub Pages está al límite de 1 GB).
  En el repositorio quedan únicamente el catálogo y el índice semántico (livianos).
* No repite: salta obras ya catalogadas, PDF cuya huella SHA-256 ya está en la
  biblioteca (data/r2/manifiesto-r2.json) y obras que ya están en la biblioteca
  con ficha, facsímil o PDF del repositorio (scripts/r2-duplicados.py). Una
  segunda edición de la misma obra sólo entra si el candidato la justifica como
  edición histórica o académica distinta.
* Comprobaciones por libro: fecha <= 1928 y sin marca de copyright en IA; PDF con
  capa de texto; el autor buscado aparece en las primeras páginas; SHA-256 del
  objeto descargado desde https://libros.vitruvius-digital-library.org idéntico.
* Índice semántico: términos atestiguados del diccionario Conceptus
  (data/lexicon/conceptus.json) buscados página por página en el OCR. Se declara
  como OCR no revisado: localiza páginas, no reemplaza la lectura.
* Nunca borra nada, ni en R2 ni en el repositorio.
"""
import hashlib, io, json, os, re, sys, time, urllib.parse, urllib.request
from collections import defaultdict
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from threading import Lock

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from build_classics_semantic_index import dictionary, tokens  # noqa: E402
from classics_ingestion_bundle import pdf_pages, pdf_bundle, json_bytes

CAND = ROOT / "data/r2/clasicos-candidatos.json"
CATALOGO = ROOT / "data/r2/catalogo-clasicos-r2.json"
CONCEPTUS_OUT = ROOT / "data/r2/conceptus-clasicos-r2.json"
MANIFIESTO = ROOT / "data/r2/manifiesto-r2.json"
CONCEPTS = ROOT / "data/lexicon/conceptus.json"
CUENTA = "4e936bf2c4f185a87075ca506de93e69"
ENDPOINT = f"https://{CUENTA}.r2.cloudflarestorage.com"
BUCKET = "vitruvius-bibliotheca"
PUBLICO = "https://libros.vitruvius-digital-library.org"
UA = {"User-Agent": "VitruviusDigitalLibrary/1.0 (+https://vitruvius-digital-library.org)"}


def get(url, binario=False, intentos=4, timeout=120):
    for i in range(intentos):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=timeout) as r:
                d = r.read()
                return d if binario else json.loads(d)
        except Exception as e:  # noqa: BLE001
            if i == intentos - 1:
                raise RuntimeError(f"{url[:120]}: {e}")
            time.sleep(3 * (i + 1))


def fold(s):
    return " ".join(tokens(s))


def buscar_ia(o, anio_max):
    # Un candidato puede traer ya elegida la edición (por ejemplo, la traducción
    # que localizó scripts/r2-candidatos-traducciones.py): se prueba primero esa.
    preferido = o.get("preferirIdentificador")
    creadores = [c.strip() for c in o["creador"].split("|")]
    cre = " OR ".join(f'"{c}"' if " " in c else c for c in creadores)
    base = f"creator:({cre}) AND mediatype:texts AND date:[1500-01-01 TO {anio_max}-12-31]"
    kw = " AND ".join(f'title:("{t}")' for t in o["titulo"])
    idioma = o.get("idioma") or {"es": "spa", "fr": "fre", "en": "eng"}.get(o.get("lengua"))
    if idioma == "spa":
        consultas = [f"{base} AND {kw} AND language:(spa OR Spanish OR Español)", f"{base} AND {kw}"]
    elif idioma == "fre":
        consultas = [f"{base} AND {kw} AND language:(fre OR French OR Français)", f"{base} AND {kw}"]
    elif idioma == "grc":
        consultas = [f"{base} AND {kw} AND language:(grc OR gre OR Greek)", f"{base} AND {kw}"]
    else:
        consultas = [f'{base} AND {kw} AND title:("english translation")', f"{base} AND {kw}"]
    vistos, out = set(), []
    if preferido:
        vistos.add(preferido)
        out.append({"identifier": preferido, "title": o.get("obra", ""), "date": "",
                    "creator": o.get("autor", ""), "language": o.get("lengua", "")})
    for q in consultas:
        url = ("https://archive.org/advancedsearch.php?" + urllib.parse.urlencode(
            {"q": q, "rows": 30, "output": "json", "sort[]": "downloads desc"}) +
            "&fl[]=identifier&fl[]=title&fl[]=date&fl[]=creator&fl[]=volume&fl[]=language")
        for d in get(url)["response"]["docs"]:
            if d["identifier"] not in vistos:
                vistos.add(d["identifier"])
                out.append(d)
    return out


def elegir_pdf(ident, anio_max, max_bytes):
    meta = get(f"https://archive.org/metadata/{ident}")
    m = meta.get("metadata", {})
    anio = str(m.get("date", ""))[:4]
    if not anio.isdigit() or int(anio) > anio_max:
        raise ValueError(f"fecha {anio!r} fuera de dominio público")
    estado = m.get("possible-copyright-status") or ""
    if estado and estado != "NOT_IN_COPYRIGHT":
        raise ValueError("estado de derechos: " + estado)
    pdfs = [f for f in meta.get("files", []) if f.get("name", "").lower().endswith(".pdf") and f.get("size")
            and int(f["size"]) <= max_bytes]
    pdfs.sort(key=lambda f: (f.get("format") != "Text PDF", int(f["size"])))
    if not pdfs:
        raise ValueError("sin PDF dentro del límite de tamaño")
    return m, pdfs[0], anio


def es_castellano(doc):
    l = doc.get("language") or ""
    l = " ".join(l) if isinstance(l, list) else l
    return any(w in fold(l) for w in ("spa", "spanish", "espanol", "castellano"))


def es_loeb(titulo, editor, anio):
    ed = " ".join(editor) if isinstance(editor, list) else (editor or "")
    return ("english translation" in fold(titulo) and anio >= 1911
            and any(w in fold(ed) for w in ("heinemann", "putnam", "harvard")))


def credito_traductor(paginas, idioma):
    """No publicar como traducción reconocida un PDF con idioma pero sin traductor acreditado.

    Solo un crédito explícito en los primeros folios; no inventar atribuciones,
    ni deducir que toda edición titulada 'translation' es una traducción humana.
    """
    portada = re.sub(r"\s+", " ", " ".join(paginas[:20]))
    pautas = {
        "en": r"\b(?:translated(?:\s+into\s+english|\s+from\s+(?:the\s+)?(?:greek|latin))?|translation|english\s+version)\s+by\s+",
        "fr": r"\b(?:traduit(?:e)?|traduction)\s+(?:du\s+grec\s+|du\s+latin\s+)?par\s+",
        "es": r"\b(?:traducido|traducida|traducci[oó]n|versi[oó]n\s+castellana)\s+(?:del\s+griego\s+|del\s+lat[ií]n\s+)?(?:por|de)\s+",
    }
    match = re.search(pautas.get(idioma, r"(?!)"), portada, flags=re.IGNORECASE)
    if not match:
        return None
    # Guardar solo una indicación legible: las separaciones OCR pueden ser
    # imperfectas. Esto NO certifica prestigio académico ni cotejo filológico.
    secuencia = portada[match.end():match.end()+95].strip(" ,.;:-")
    nombre = re.match(r"([A-ZÀ-Ý][A-Za-zÀ-ÿ.'’-]+(?:\s+(?:[A-ZÀ-Ý][A-Za-zÀ-ÿ.'’-]+|[A-ZÀ-Ý]\.)){1,5})", secuencia)
    if not nombre:
        return None
    return nombre.group(1)


def procesar(o, ctx):
    import fitz
    rechazos = []
    for doc in buscar_ia(o, ctx["anio_max"])[:12]:
        ident = doc["identifier"]
        if ident in o.get("excluir", []):
            continue
        try:
            titulo = doc.get("title") or ""
            if isinstance(titulo, list):
                titulo = titulo[0]
            if not all(fold(t) in fold(titulo) for t in o["titulo"]):
                raise ValueError("título no coincide")
            if o.get("idioma") == "spa" and not es_castellano(doc):
                raise ValueError("la edición no figura en castellano")
            m, f, anio = elegir_pdf(ident, ctx["anio_max"], ctx["max_bytes"])
            if o.get("traduccionDe"):
                # No asumir que "English" en una búsqueda o en el título asegura
                # que el documento seleccionado realmente esté en inglés.
                declared = m.get("language") or []
                declared = declared if isinstance(declared, list) else [declared]
                language = fold(" ".join(str(value) for value in declared))
                labels = {"en": ("english", "eng"),
                          "fr": ("french", "fre", "fra"),
                          "es": ("spanish", "spa", "espanol", "castellano")}
                if not any(tag in language.split() for tag in labels.get(o["lengua"], ())):
                    raise ValueError("El idioma de la traducción no está acreditado en los metadatos de la edición")
            datos = get(f"https://archive.org/download/{ident}/{urllib.parse.quote(f['name'])}", binario=True,
                        timeout=600)
            sha = hashlib.sha256(datos).hexdigest()
            with ctx["sha_lock"]:
                if sha in ctx["shas"]:
                    raise ValueError("PDF idéntico ya presente o reservado en esta tanda")
            pdf = fitz.open(stream=datos, filetype="pdf")
            paginas, methods = pdf_pages(pdf, o["lengua"], o.get("idioma", ""))
            if len(paginas) < 20:
                raise ValueError(f"solo {len(paginas)} páginas")
            con_texto = sum(1 for t in paginas if len(t.strip()) > 200)
            if con_texto < len(paginas) * 0.4:
                raise ValueError("Texto insuficiente después de extracción y OCR; requiere revisión antes de declararlo indexable")
            portada = fold(" ".join(paginas[:20]))
            if not any(fold(c).split()[0] in portada for c in o["creador"].split("|")):
                raise ValueError("el autor no aparece en las primeras páginas")
            traductor = credito_traductor(paginas, o["lengua"]) if o.get("traduccionDe") else None
            if o.get("traduccionDe") and not traductor:
                raise ValueError("Traducción sin nombre de traductor acreditado en la portada del volumen; requiere revisión")
            clave_pdf = f"clasicos/pdf/{o['id']}.pdf"
            clave_txt = f"clasicos/texto/{o['id']}.json"
            digital, indice = pdf_bundle(o["id"], paginas, methods, sha, ctx["concepts"], ident)
            texto = json_bytes(digital)
            index_data = json_bytes(indice)
            clave_indice = f"clasicos/indice-obras/{o['id']}.json"
            # Reservar la huella tras validar la edición, justo antes de escribir
            # en R2. Evita que dos trabajadores admitan simultáneamente el mismo
            # PDF bajo identificadores distintos. Una reserva fallida se podrá
            # reconsiderar en la próxima tanda, sin arriesgar otra copia ahora.
            with ctx["sha_lock"]:
                if sha in ctx["shas"]:
                    raise ValueError("PDF idéntico ya presente o reservado en esta tanda")
                ctx["shas"].add(sha)
            s3 = ctx["s3"]
            # Reanudar una ingesta cuyo PDF/texto/índice sí quedaron en R2
            # pero cuyo catálogo no llegó a GitHub por un fallo posterior.
            # Nunca volver a subir ni sobrescribir esos objetos.
            from botocore.exceptions import ClientError
            claves = (clave_pdf, clave_txt, clave_indice)
            existentes = {}
            for key in claves:
                try:
                    existentes[key] = s3.head_object(Bucket=BUCKET, Key=key)
                except ClientError as exc:
                    code = str(exc.response.get("Error", {}).get("Code", ""))
                    if code not in ("404", "NotFound", "NoSuchKey"):
                        raise RuntimeError("No se pudo comprobar el objeto R2: " + key) from exc
                    existentes[key] = None
            recuperada = any(existentes.values())
            completa = all(existentes.values())
            if completa:
                esperado = existentes[clave_pdf].get("Metadata", {}).get("sha256")
                if esperado != sha:
                    raise ValueError("El PDF existente en R2 no coincide con SHA-256 de la edición: " + o["id"])
                # Validación cruzada de los objetos existentes; el índice debe
                # corresponder al texto exacto ya almacenado y a este mismo PDF.
                texto = get(PUBLICO + "/" + clave_txt, binario=True)
                index_data = get(PUBLICO + "/" + clave_indice, binario=True)
                recuperado = json.loads(texto)
                indice_guardado = json.loads(index_data)
                if (recuperado.get("obra") != o["id"] or
                    recuperado.get("sourceSha256") != sha or
                    recuperado.get("fuente") != ident or
                    not isinstance(recuperado.get("paginas"), list) or
                    len(recuperado["paginas"]) != len(paginas) or
                    indice_guardado.get("workId") != o["id"] or
                    indice_guardado.get("sourceSha256") != sha or
                    indice_guardado.get("textSha256") != hashlib.sha256(texto).hexdigest() or
                    indice_guardado.get("units") != len(paginas) or
                    not indice_guardado.get("literal")):
                    raise ValueError("Texto/índice R2 existente no corresponde al PDF acreditado: " + o["id"])
                paginas = recuperado["paginas"]
                methods = recuperado.get("metodosPagina") or methods
                con_texto = sum(1 for t in paginas if len(t.strip()) > 200)
            else:
                # Completar una tanda interrumpida únicamente cuando los objetos
                # existentes coinciden byte por byte con la edición regenerada.
                # Verificar todos los presentes antes de escribir cualquier faltante.
                objetos = (
                    (clave_pdf, datos, "application/pdf", "public, max-age=31536000", {"sha256": sha, "ia": ident}),
                    (clave_txt, texto, "application/json; charset=utf-8", "public, max-age=86400", {}),
                    (clave_indice, index_data, "application/json; charset=utf-8", "public, max-age=86400", {}),
                )
                for key, payload, _, _, _ in objetos:
                    if existentes[key]:
                        anterior = get(PUBLICO + "/" + key, binario=True, timeout=600)
                        if hashlib.sha256(anterior).digest() != hashlib.sha256(payload).digest():
                            raise ValueError("Ingesta parcial incompatible; conservar objeto existente: " + key)
                for key, payload, mime, cache, metadata in objetos:
                    if not existentes[key]:
                        # La precondición impide sobrescrituras incluso si otro
                        # proceso crea el objeto entre HEAD y PUT.
                        s3.put_object(Bucket=BUCKET, Key=key, Body=payload, ContentType=mime,
                                      CacheControl=cache, Metadata=metadata, IfNoneMatch="*")
            # Verificar los tres objetos públicos antes de incorporar su ficha.
            for key, payload in ((clave_txt, texto), (clave_indice, index_data)):
                verified = get(PUBLICO + "/" + key, binario=True)
                if hashlib.sha256(verified).digest() != hashlib.sha256(payload).digest():
                    raise ValueError("SHA-256 del texto/índice público distinto: " + key)
            publico = get(PUBLICO + "/" + clave_pdf, binario=True, timeout=600)
            if hashlib.sha256(publico).hexdigest() != sha:
                raise ValueError("SHA-256 del PDF público distinto")
            ficha = {
                "id": o["id"], "autor": o["autor"], "obra": o["obra"], "lengua": o["lengua"],
                **({"traduccionDe": o["traduccionDe"]} if o.get("traduccionDe") else {}),
                **({"traductor": traductor,
                    "acreditacionTraduccion": "Crédito de traductor en portada OCR; requiere cotejo editorial independiente"}
                   if traductor else {}),
                **({"coleccion": o["coleccion"]} if o.get("coleccion") else {}),
                "idiomaEdicion": o.get("idioma") or ("bilingue-en" if "english translation" in fold(titulo) else "s/d"),
                "tanda": o.get("tanda", 1),
                "tituloEdicion": titulo, "anio": int(anio), "volumen": m.get("volume") or doc.get("volume"),
                "editor": m.get("publisher"), "creadorIA": m.get("creator"),
                "bilingueLoeb": es_loeb(titulo, m.get("publisher"), int(anio)),
                "fuente": f"https://archive.org/details/{ident}", "identificadorIA": ident,
                "derechos": "Dominio público (publicación anterior a 1929); verificado en metadatos de Internet Archive",
                "pdf": PUBLICO + "/" + clave_pdf, "texto": PUBLICO + "/" + clave_txt,
                "bytes": len(datos), "sha256": sha, "paginas": len(paginas), "paginasConTexto": con_texto,
                "indiceLectura": PUBLICO + "/" + clave_indice,
                "indexacion": {"estado": "texto-e-indices-verificados", "literal": True, "semantica": "Conceptus multilingüe por página",
                               "textSha256": hashlib.sha256(texto).hexdigest(), "indexSha256": hashlib.sha256(index_data).hexdigest(),
                               "paginasOCR": sum("Tesseract OCR" in m["method"] for m in methods),
                               "paginasSinTexto": sum(not p.strip() for p in paginas),
                               "incidenciasOCR": sum(bool(m.get("issue")) for m in methods)},
                "verificado": "SHA-256 del objeto público idéntico; autor presente en las primeras páginas",
                **({"recuperadaSinSobrescritura": True} if recuperada else {}),
            }
            return ficha, paginas, rechazos
        except Exception as e:  # noqa: BLE001
            rechazos.append(f"{ident}: {str(e)[:120]}")
    return None, None, rechazos


def postings(ficha, paginas, lex):
    out = defaultdict(list)
    langs = {ficha["lengua"], "en", "la", "grc", "fr", "es"}
    for n, texto in enumerate(paginas, 1):
        tk = tokens(texto)
        hall = set()
        for i, w in enumerate(tk):
            for lang in langs:
                for cid, term, words in lex.get(lang, {}).get(w, []):
                    if tk[i:i + len(words)] == words:
                        hall.add(cid)
        for cid in hall:
            out[cid].append(n)
    return out


def main():
    cand = json.loads(CAND.read_text(encoding="utf-8"))
    cat = json.loads(CATALOGO.read_text(encoding="utf-8")) if CATALOGO.exists() else {"items": []}
    hechos = {x["id"] for x in cat["items"]}
    shas = {x["sha256"] for x in json.loads(MANIFIESTO.read_text(encoding="utf-8"))["items"]}
    shas |= {x["sha256"] for x in cat["items"]}
    concepts = json.loads(CONCEPTS.read_text(encoding="utf-8"))["concepts"]
    lex = dictionary(concepts)
    con = json.loads(CONCEPTUS_OUT.read_text(encoding="utf-8")) if CONCEPTUS_OUT.exists() else {"postings": {}}

    import boto3
    from botocore.config import Config
    s3 = boto3.client("s3", endpoint_url=ENDPOINT, region_name="auto",
                      aws_access_key_id=os.environ["R2_ACCESS_KEY_ID"],
                      aws_secret_access_key=os.environ["R2_SECRET_ACCESS_KEY"],
                      config=Config(retries={"max_attempts": 8, "mode": "adaptive"},
                                    request_checksum_calculation="when_required",
                                    response_checksum_validation="when_required"))
    ctx = {"s3": s3, "shas": shas, "sha_lock": Lock(), "concepts": concepts, "anio_max": cand["limites"]["anioMaximo"],
           "max_bytes": cand["limites"]["maxMiB"] * 1048576}
    pendientes = [o for o in cand["obras"] if o["id"] not in hechos]
    # No confundir la digitalización de un volumen colectivo con una edición
    # íntegra de un solo autor: sin rango de páginas verificado se pospone.
    sin_delimitar = [o["id"] for o in pendientes if o.get("requiereDelimitacionEditorial")]
    for candidate_id in sin_delimitar:
        print(f"POSPONE VOLUMEN COLECTIVO SIN DELIMITAR: {candidate_id}")
    pendientes = [o for o in pendientes if not o.get("requiereDelimitacionEditorial")]
    # Una cola corrupta no debe lanzar dos subidas concurrentes bajo la misma clave R2.
    seen_pending = set()
    unique_pending = []
    for candidate in pendientes:
        if candidate["id"] in seen_pending:
            print(f"SALTA ID REPETIDO EN COLA: {candidate['id']}")
            continue
        seen_pending.add(candidate["id"])
        unique_pending.append(candidate)
    pendientes = unique_pending

    # Regla de no repetición: una obra que ya está en la biblioteca —ficha,
    # facsímil alojado o PDF del repositorio— no se vuelve a subir. Sólo se
    # admite otra edición de la misma obra cuando el candidato la justifica
    # como edición histórica o académica distinta.
    import importlib.util
    spec = importlib.util.spec_from_file_location("r2_duplicados", ROOT / "scripts/r2-duplicados.py")
    dup = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(dup)
    inventario = dup.inventario()
    repetidas = []
    admitidas = []
    for o in pendientes:
        repetida, motivo = dup.ya_esta(o, inventario)
        (repetidas if repetida else admitidas).append((o, motivo))
        if repetida:
            print(f"SALTA {o['id']}: {motivo}")
        elif motivo:
            print(f"ADMITE {o['id']}: {motivo}")
    pendientes = [o for o, _ in admitidas]
    # Una traducción nunca se ingresa como obra independiente si aún no está
    # almacenado en R2 el original al que debe quedar vinculada.
    sin_original = [o["id"] for o in pendientes
                    if o.get("traduccionDe") and o["traduccionDe"] not in hechos]
    for candidate_id in sin_original:
        print(f"POSPONE TRADUCCIÓN SIN ORIGINAL R2: {candidate_id}")
    pendientes = [o for o in pendientes
                  if not o.get("traduccionDe") or o["traduccionDe"] in hechos]
    # Cada tanda debe incorporar ORIGINALES nuevos además de traducciones;
    # reservar cupos para ambos evita que las búsquedas de traducción agoten
    # indefinidamente el límite antes de llegar a un clásico nuevo.
    priority = {"en": 0, "fr": 1, "es": 2}
    traducciones = sorted((o for o in pendientes if o.get("traduccionDe")),
                          key=lambda o: priority.get(o.get("lengua"), 3))
    originales = [o for o in pendientes if not o.get("traduccionDe")]

    limite = int(os.environ.get("LIMITE", "0") or 0)
    solo_traducciones = os.environ.get("SOLO_TRADUCCIONES") == "1"
    if os.environ.get("SOLO_ORIGINALES") == "1":
        pendientes = originales[:limite] if limite else originales
    elif solo_traducciones:
        pendientes = traducciones[:limite] if limite else traducciones
    elif limite:
        cupo_original = max(1, (limite * 2 + 1) // 3)
        cupo_traduccion = limite - cupo_original
        pendientes = originales[:cupo_original] + traducciones[:cupo_traduccion]
        elegidos = {o["id"] for o in pendientes}
        if len(pendientes) < limite:
            pendientes.extend([o for o in [*originales, *traducciones]
                               if o["id"] not in elegidos][:limite - len(pendientes)])
    else:
        pendientes = [*originales, *traducciones]
    print(f"pendientes: {len(pendientes)} (ya catalogadas: {len(hechos)}; repetidas omitidas: {len(repetidas)})")
    informe = {"incorporadas": [], "no_encontradas": {}}
    with ThreadPoolExecutor(max_workers=3) as ex:
        futures = {ex.submit(procesar, o, ctx): o for o in pendientes}
        for future in as_completed(futures):
            o = futures[future]
            try:
                ficha, paginas, rech = future.result()
            except Exception as exc:
                ficha, paginas, rech = None, None, [str(exc)[:300]]
            if ficha:
                cat["items"].append(ficha)
                for cid, pags in postings(ficha, paginas, lex).items():
                    con["postings"].setdefault(cid, {})[ficha["id"]] = {"paginas": pags[:60], "total": len(pags)}
                informe["incorporadas"].append(ficha["id"])
                if ficha.get("recuperadaSinSobrescritura"):
                    informe.setdefault("recuperadas", []).append(ficha["id"])
                print(f"{'RECUPERADO' if ficha.get('recuperadaSinSobrescritura') else 'OK'}  {o['id']}: {ficha['identificadorIA']} ({ficha['anio']}, {ficha['paginas']} págs, "
                      f"{ficha['bytes']/1048576:.1f} MB)", flush=True)
                guardar(cat, con, informe)  # guardado incremental: un corte no pierde lo ya subido
            else:
                informe["no_encontradas"][o["id"]] = rech[:6]
                print(f"--  {o['id']}: sin edición que pase los controles ({len(rech)} descartes)", flush=True)
    guardar(cat, con, informe)
    print(f"incorporadas: {len(informe['incorporadas'])} · sin edición: {len(informe['no_encontradas'])} · "
          f"catálogo: {cat['total']} obras, {cat['bytes']/1048576:.0f} MB")


def guardar(cat, con, informe):
    cat.update({"schema": "vdl-r2-catalogo-clasicos-1", "actualizado": time.strftime("%Y-%m-%d"),
                "descripcion": "Ediciones clásicas de dominio público alojadas en Cloudflare R2 "
                               "(libros.vitruvius-digital-library.org). No duplican los PDF del repositorio.",
                "total": len(cat["items"]), "bytes": sum(x["bytes"] for x in cat["items"])})
    cat["items"].sort(key=lambda x: (x["lengua"], x["autor"], x["obra"]))
    CATALOGO.write_text(json.dumps(cat, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    con.update({"schema": "vdl-r2-conceptus-1",
                "metodo": "Términos atestiguados del diccionario Conceptus (latín, griego, inglés y lengua de la "
                          "obra) buscados página por página en el OCR de Internet Archive; normalización de "
                          "acentos, mayúsculas e i/j u/v como en el índice semántico del corpus. OCR no revisado: "
                          "las páginas son localizaciones para leer, no citas verificadas. Hasta 60 páginas por "
                          "concepto y obra; 'total' da el número completo.",
                "obras": len(cat["items"])})
    CONCEPTUS_OUT.write_text(json.dumps(con, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    Path("r2-clasicos-informe.json").write_text(json.dumps(informe, ensure_ascii=False, indent=1), encoding="utf-8")


if __name__ == "__main__":
    main()
