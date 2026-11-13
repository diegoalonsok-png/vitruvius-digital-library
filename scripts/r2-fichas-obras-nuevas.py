#!/usr/bin/env python3
"""Da ficha de repertorio a las obras que entran por un facsímil alojado en R2.

Hasta ahora una obra clásica que llegaba como facsímil quedaba fuera del
repertorio: el sitio contaba 222 fichas y las obras nuevas aparecían sólo como
«nuevas en facsímil». Este guion crea su ficha con lo que es dato —la edición,
sus derechos, el facsímil alojado y el visor del sitio— y deja explícitamente
pendiente lo que exige investigación: códice, colación y autoridad textual.

No inventa nada. El título original, el género y la datación se toman de
data/r2/fichas-nuevas-metadatos.json, que se redacta a mano; lo que no esté ahí
queda consignado como pendiente de consignar, no completado por inferencia.
Tampoco toca una ficha existente ni ningún original.

Es idempotente: una obra que ya tiene ficha se omite.

Uso: python3 scripts/r2-fichas-obras-nuevas.py [--check]
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CATALOGO_MAESTRO = ROOT / "data/bibliotheca-graeca-latina-I-bce-I-ce.json"
CATALOGO_R2 = ROOT / "data/r2/catalogo-clasicos-r2.json"
VINCULOS = ROOT / "data/r2/vinculos-repertorio.json"
METADATOS = ROOT / "data/r2/fichas-nuevas-metadatos.json"
TRIAGE = ROOT / "data/classics-corpus/quality-triage-222.json"
AUTORIDADES = ROOT / "data/classics-corpus/critical-authorities-222.json"
CODICES = ROOT / "data/classics-corpus/manuscript-coverage-222-20261110.json"
ESTANDAR = ROOT / "data/classics-corpus/vitruvius-standard-222.json"
TRADUCCIONES = ROOT / "data/classics-corpus/translation-availability-222.json"
PROVENIENCIA = ROOT / "data/perseus-provenance-audit.json"
COBERTURA = ROOT / "data/classics-corpus/coverage-audit.json"
PENDIENTE = "Pendiente de consignar: no se deduce del facsímil."


def leer(ruta):
    return json.loads(ruta.read_text(encoding="utf-8"))


def escribir(ruta, datos, sangria=None):
    texto = json.dumps(datos, ensure_ascii=False, indent=sangria) if sangria else json.dumps(datos, ensure_ascii=False)
    ruta.write_text(texto + ("\n" if sangria else ""), encoding="utf-8")


def ficha(obra, meta, total_catalogo):
    """Ficha de repertorio para una obra cuyo testimonio en el sitio es un facsímil."""
    edicion = f'{obra["tituloEdicion"]} ({obra["anio"]}' + (f', vol. {obra["volumen"]}' if obra.get("volumen") else "") + ")"
    responsable = f'. {obra["editor"]}' if obra.get("editor") else ""
    alcance = meta.get("alcance") or obra.get("alcance")
    lectura = (
        f"Facsímil de dominio público alojado por la biblioteca en Cloudflare R2: {edicion}{responsable}. "
        f"{obra['derechos']}. "
        + ("Volumen bilingüe: original y traducción inglesa enfrentadas. " if obra.get("bilingueLoeb")
           else "Volumen en lengua original; sin traducción en el mismo volumen. ")
        + (f"Alcance de la edición: {alcance} " if alcance else "")
        + "Se lee página a página en el visor del sitio. El texto por página proviene del OCR de Internet "
          "Archive y no está revisado: localiza la página del facsímil, no constituye locus verificado ni "
          "edición crítica."
    )
    return {
        "id": obra["id"],
        "author": obra["autor"],
        "title": meta.get("titulo") or obra["obra"],
        "language": obra["lengua"],
        "genre": meta.get("genero") or PENDIENTE,
        "dating": meta.get("datacion") or PENDIENTE,
        "aliases": meta.get("aliases") or [obra["obra"]],
        "reading": {"url": obra["pdf"], "status": lectura},
        "manuscript": {
            "manifest": None,
            "record": None,
            "status": "Códice pendiente de identificación y cotejo. El facsímil es una edición impresa moderna, no un testimonio manuscrito.",
            "researchStatus": "requires_source_verification",
            "witnessCount": 0,
            "witnessWithViewerCount": 0,
            "needsAdditionalWitnesses": True,
            "automatedAudit": {
                "type": "metadata_only",
                "catalogueCount": total_catalogo,
                "reviewRequiredBeforePublication": True,
                "pipeline": "scripts/r2-fichas-obras-nuevas.py",
                "status": "automated_check_configured_not_autoptically_collated",
            },
        },
        "pdf": {"url": obra["pdf"], "status": "Alojado en libros.vitruvius-digital-library.org (Cloudflare R2); no se copia al repositorio."},
        "translation": {"status": "Traducción inglesa enfrentada en la propia edición (Loeb)." if obra.get("bilingueLoeb")
                        else "Sin traducción alojada en el sitio para esta obra."},
        "links": {
            "scaife": "https://scaife.perseus.org/library/",
            "archive": obra["fuente"],
            "facsimil": obra["pdf"],
            "texto": obra["texto"],
        },
        "publicStatus": "fuente-externa-identificada",
        "localReader": None,
        "addedBy": "facsímil alojado en R2 · scripts/r2-fichas-obras-nuevas.py",
        "sourceRegistration": {
            "origin": "internet_archive",
            "identifier": obra["identificadorIA"],
            "sha256": obra["sha256"],
            "hostedAt": "cloudflare_r2",
            "reader": f"buscador-facsimiles-clasicos.html?obra={obra['id']}",
            "pages": obra["paginas"],
            "pagesWithTextLayer": obra["paginasConTexto"],
            "ocrReviewed": False,
            "evidenceStatus": "catalogue_inventory_only",
            "reviewStatus": "not_externally_verified",
        },
    }


def registro_triage(obra, meta):
    return {
        "id": obra["id"],
        "author": obra["autor"],
        "title": meta.get("titulo") or obra["obra"],
        "language": obra["lengua"],
        "sourceReadiness": "facsimil_alojado_sin_transcripcion",
        "originalIndexed": False,
        "hasLocalTranslation": False,
        "localVersionCount": 0,
        "originalPaths": [],
        "candidateWorkCodes": [],
        "issues": ["original_not_indexed", "no_work_identifier_candidate", "edition_details_need_review"],
        "evidenceStatus": "facsimile_inventory_only",
        "reviewStatus": "not_externally_verified",
    }


def registro_autoridad(obra, meta):
    return {
        "workId": obra["id"],
        "authority": {
            "author": obra["autor"],
            "normalizedAuthor": obra["autor"],
            "uniformTitle": meta.get("titulo") or obra["obra"],
            "displayTitle": f'{obra["autor"]} · {meta.get("titulo") or obra["obra"]}',
            "originalLanguage": obra["lengua"],
            "genre": meta.get("genero") or PENDIENTE,
            "dating": meta.get("datacion") or PENDIENTE,
            "aliases": meta.get("aliases") or [obra["obra"]],
            "nomenclatureNote": "Título uniforme catalográfico tomado de data/r2/fichas-nuevas-metadatos.json; rúbrica manuscrita y atribución sin comprobar.",
            "candidateWorkCodes": [],
            "ctsEditionUrn": None,
            "ctsEditionStatus": "not_verified",
        },
        "integrity": {
            "status": "facsimile_only",
            "description": "La biblioteca aloja el facsímil de una edición impresa de dominio público; no hay transcripción indexada ni cotejo contra edición de control.",
            "indexed": False,
            "storage": "cloudflare_r2",
        },
    }


def registro_estandar(obra, meta):
    return {
        "workId": obra["id"],
        "work": {
            "author": obra["autor"],
            "title": meta.get("titulo") or obra["obra"],
            "originalLanguage": obra["lengua"],
            "compositionDating": meta.get("datacion") or PENDIENTE,
            "genre": meta.get("genero") or PENDIENTE,
            "datingStatus": "catalogued_not_reverified",
        },
        "authority": {
            "system": "PHI/Stoa",
            "candidateWorkCodes": [],
            "codesStatus": "candidates_require_individual_authority_match",
            "ctsWorkUrn": None,
            "ctsEditionUrn": None,
            "ctsStatus": "edition_urn_not_verified",
        },
        "witnesses": [],
        "editorialControl": {
            "chicago18References": [],
            "criticalEditionStatus": "facsimile_of_public_domain_printed_edition_only",
            "methodology": "Do not infer editio princeps, siglum, earliest codex, or CTS edition URN from a hosted facsimile.",
        },
    }


def registro_traducciones(obra, meta):
    return {
        "id": obra["id"],
        "author": obra["autor"],
        "title": meta.get("titulo") or obra["obra"],
        "originalLanguage": obra["lengua"],
        "originalIndexed": False,
        "translationLanguages": [],
        "localEditionLanguages": [],
        "externalTranslationUnverified": [],
        "readingStatus": "fuente-externa-identificada",
        "translationSourceDescription": (
            "Facsímil de dominio público alojado en R2. "
            + ("El volumen trae la traducción inglesa enfrentada (Loeb), que no está indexada como texto aparte."
               if obra.get("bilingueLoeb")
               else "Sin traducción alojada; pendiente de localizar una traducción de dominio público.")),
    }


def registro_proveniencia(obra, meta):
    return {
        "workId": obra["id"],
        "author": obra["autor"],
        "title": meta.get("titulo") or obra["obra"],
        "originalLanguage": obra["lengua"],
        "sourceReadiness": "facsimil_alojado_sin_transcripcion",
        "originalIndexed": False,
        "translationHosted": False,
        "candidateWorkCodes": [],
        "versions": [],
        "perseusSourceClaim": False,
        "verifiedEditionUrn": None,
        "note": "La biblioteca aloja el facsímil de una edición impresa de dominio público; no hay texto TEI ni atribución a Perseus.",
    }


def registro_cobertura(obra, meta):
    return {
        "id": obra["id"],
        "author": obra["autor"],
        "title": meta.get("titulo") or obra["obra"],
        "originalLanguage": obra["lengua"],
        "genre": meta.get("genero") or PENDIENTE,
        "dating": meta.get("datacion") or PENDIENTE,
        "catalogueStatus": "fuente-externa-identificada",
        "indexedTextLanguages": [],
        "indexedTextFiles": [],
        "localPDF": None,
        "hasStructuredVitruviusReader": False,
        "hasDedicatedReader": True,
        "hasManuscriptRecord": False,
        "manuscriptRecords": [],
        "hasDeclaredExternalReading": True,
        "notes": ("Facsímil alojado en Cloudflare R2, legible página a página en el visor del sitio "
                  "(buscador-facsimiles-clasicos.html). El texto por página es OCR sin revisar: no es "
                  "transcripción indexada ni cotejo filológico."),
    }


def completar(ruta, clave_registros, id_de, construir, pendientes, metadatos, por_id, sangria=1):
    """Añade a un dataset derivado los registros que le falten, sin tocar los existentes."""
    datos = leer(ruta)
    presentes = {id_de(r) for r in datos[clave_registros]}
    faltan = [i for i in pendientes if i not in presentes]
    if not faltan:
        return 0, datos
    datos[clave_registros].extend(construir(por_id[i], metadatos.get(i, {})) for i in faltan)
    escribir(ruta, datos, sangria=sangria)
    return len(faltan), datos


def main():
    check = "--check" in sys.argv
    maestro = leer(CATALOGO_MAESTRO)
    r2 = leer(CATALOGO_R2)
    metadatos = leer(METADATOS)["obras"]
    por_id = {o["id"]: o for o in r2["items"]}
    existentes = {w["id"] for w in maestro["works"]}
    # Una traducción de una obra ya alojada no crea ficha: se cuelga de la del original.
    nuevas = [o for o in r2["items"] if o["id"] not in existentes and not o.get("traduccionDe")]
    if VINCULOS.exists():
        con_ficha = {k for k, v in (leer(VINCULOS).get("mapa") or {}).items() if v}
        nuevas = [o for o in nuevas if o["id"] not in con_ficha]

    # Fichas que existen en el repertorio y provienen de un facsímil alojado: sus
    # registros derivados deben existir también, y se reponen si falta alguno.
    de_facsimil = [w["id"] for w in maestro["works"]
                   if (w.get("sourceRegistration") or {}).get("hostedAt") == "cloudflare_r2"]
    total = len(maestro["works"]) + len(nuevas)

    if nuevas:
        print(f"{len(nuevas)} obras sin ficha · repertorio {len(maestro['works'])} → {total}")
        for o in nuevas:
            marca = "" if o["id"] in metadatos else "  (sin metadatos: género y datación quedan pendientes)"
            print(f"  + {o['id']}: {o['autor']} — {o['obra']}{marca}")
    else:
        print(f"Repertorio: {len(maestro['works'])} fichas; todas las ediciones alojadas tienen la suya.")
    if check:
        print("--check: no se escribió nada.")
        return

    if nuevas:
        maestro["works"].extend(ficha(o, metadatos.get(o["id"], {}), total) for o in nuevas)
        for w in maestro["works"]:
            auditoria = (w.get("manuscript") or {}).get("automatedAudit")
            if isinstance(auditoria, dict) and "catalogueCount" in auditoria:
                auditoria["catalogueCount"] = total
        escribir(CATALOGO_MAESTRO, maestro)
        de_facsimil = [o["id"] for o in nuevas] + de_facsimil

    sumados, triage = completar(TRIAGE, "works", lambda r: r["id"], registro_triage, de_facsimil, metadatos, por_id)
    if sumados:
        c = triage["counts"]
        c["works"] = c["unverifiedWorks"] = len(triage["works"])
        c["missingOriginals"] += sumados
        c["noLocalTranslation"] += sumados
        for clave in ("original_not_indexed", "no_work_identifier_candidate",
                      "edition_details_need_review", "no_local_translation"):
            c["issues"][clave] = c["issues"].get(clave, 0) + sumados
        escribir(TRIAGE, triage, sangria=1)

    sumados, autoridades = completar(AUTORIDADES, "records", lambda r: r["workId"], registro_autoridad,
                                     de_facsimil, metadatos, por_id)
    if sumados:
        c = autoridades["counts"]
        c["total"] = c["automatedAuditWorks"] = len(autoridades["records"])
        c["withoutOriginalIndex"] += sumados
        c["worksPendingManuscript"] += sumados
        escribir(AUTORIDADES, autoridades, sangria=1)

    sumados, codices = completar(CODICES, "records", lambda r: r["workId"],
                                 lambda o, m: {"workId": o["id"], "witnessCount": 0,
                                               "verifiedInstitutionalCount": 0, "scholarlySourceCount": 0,
                                               "witnessIds": [], "status": "individual_witness_pending",
                                               "oldestGlobalClaimVerified": False},
                                 de_facsimil, metadatos, por_id)
    if sumados:
        codices["counts"]["catalogued"] = len(codices["records"])
        codices["counts"]["worksWithoutWitnesses"] += sumados
        escribir(CODICES, codices, sangria=1)

    sumados, estandar = completar(ESTANDAR, "records", lambda r: r["workId"], registro_estandar,
                                  de_facsimil, metadatos, por_id)
    if sumados:
        estandar["recordCount"] = len(estandar["records"])
        escribir(ESTANDAR, estandar, sangria=1)

    sumados, traducciones = completar(TRADUCCIONES, "works", lambda r: r["id"], registro_traducciones,
                                      de_facsimil, metadatos, por_id)
    if sumados:
        tt = traducciones["totals"]
        tt["cataloguedWorks"] = len(traducciones["works"])
        tt["worksWithoutHostedTranslation"] += sumados
        tt["originalTextNotIndexed"] += sumados
        escribir(TRADUCCIONES, traducciones, sangria=1)

    sumados, proveniencia = completar(PROVENIENCIA, "records", lambda r: r["workId"], registro_proveniencia,
                                      de_facsimil, metadatos, por_id, sangria=2)
    if sumados:
        proveniencia["counts"]["works"] = len(proveniencia["records"])
        escribir(PROVENIENCIA, proveniencia, sangria=2)

    sumados, cobertura = completar(COBERTURA, "works", lambda r: r["id"], registro_cobertura,
                                   de_facsimil, metadatos, por_id)
    if sumados:
        cc = cobertura["counts"]
        cc["cataloguedWorks"] = len(cobertura["works"])
        estados = cc.get("catalogueStatuses") or {}
        estados["fuente-externa-identificada"] = estados.get("fuente-externa-identificada", 0) + sumados
        cc["catalogueStatuses"] = estados
        escribir(COBERTURA, cobertura, sangria=1)

    print(f"Repertorio: {len(maestro['works'])} obras · datos derivados al día.")
    sin_metadatos = [i for i in de_facsimil if i not in metadatos]
    if sin_metadatos:
        print("Redactar en data/r2/fichas-nuevas-metadatos.json: " + ", ".join(sin_metadatos))


if __name__ == "__main__":
    main()
