#!/usr/bin/env python3
"""Comprobación pública de Bibliotheca y objetos R2; falla si no puede validarlos.
No confunde catálogo actualizado en GitHub con despliegue disponible en línea.
"""
import json, urllib.request, urllib.error, sys
BASE="https://vitruvius-digital-library.org/"
R2="https://libros.vitruvius-digital-library.org/"
UA={"User-Agent":"Vitruvius-Bibliotheca-Smoke/1.0"}
def get(url, maximum=1500000):
    req=urllib.request.Request(url,headers=UA)
    with urllib.request.urlopen(req,timeout=25) as r:
        status=r.status
        data=r.read(maximum)
        return status,data,r.headers
def main():
    failures=[]
    for path in ("bibliotheca-ampliada.html","classics-r2-parallel.html","buscador-facsimiles-clasicos.html","taccola-de-machinis.html"):
        url=BASE+path
        try:
            code,body,h=get(url)
            if code!=200 or b"<html" not in body.lower():raise ValueError("sin HTML válido")
            print("PASS",url)
        except Exception as e:
            failures.append((url,str(e)));print("FAIL",url,str(e))
    try:
        _,raw,_=get(BASE+"data/r2/catalogo-clasicos-r2.json",maximum=5000000)
        cat=json.loads(raw);items=cat.get("items",[])
        if not items:raise ValueError("sin ediciones")
        print("PASS catálogo público:",len(items),"ediciones")
    except Exception as e:
        failures.append(("catalogo",str(e)));items=[]
    if items:
        for item in items[:3]:
            url=item.get("pdf","")
            if not url.startswith(R2):continue
            try:
                req=urllib.request.Request(url,headers={**UA,"Range":"bytes=0-1023"})
                with urllib.request.urlopen(req,timeout=30) as r:
                    data=r.read(1024)
                    if not data.startswith(b"%PDF-"):raise ValueError("objeto no responde como PDF")
                print("PASS PDF en R2:",item["id"])
            except Exception as e:
                failures.append((item["id"],str(e)));print("FAIL PDF",item["id"],str(e))
    try:
        code,body,_=get(BASE+"data/r2/indice-semantico-manifest.json")
        manifest=json.loads(body)
        if not manifest.get("base"):raise ValueError("manifiesto sin base de fragmentos")
        print("PASS manifiesto semántico:",manifest["base"])
    except Exception as e:failures.append(("índice semántico",str(e)))
    # La fuente editorial pública real es academic-integrity.json. La ruta
    # /data/r2/aparato-academico.json no existe en el repositorio y Cloudflare
    # devuelve el HTML de la portada: jamás tratarlo como aparato crítico.
    try:
        url=BASE+"data/academic-integrity.json"
        code,body,headers=get(url,maximum=1600000)
        if code!=200 or not body.lstrip().startswith(b"{"):
            raise ValueError("el servidor devolvió HTML u otro contenido, no JSON")
        integrity=json.loads(body)
        if integrity.get("schema")!=2 or not integrity.get("sourceFingerprint"):
            raise ValueError("registro editorial sin esquema o huella de fuentes")
        if integrity.get("canonicalLoci",0)<700 or len(integrity.get("editions",[]))!=3:
            raise ValueError("sin concordancia reproducible de los tres textos")
        cod=integrity.get("codicology",{})
        if not cod.get("registeredWitnessRecords") or (
            cod.get("filledFieldSlots",0)+cod.get("pendingFieldSlots",0)
        )!=cod.get("fieldSlots"):
            raise ValueError("recuento codicológico incompleto o contradictorio")
        print("PASS integridad académica pública: 3 ediciones,",
              integrity["canonicalLoci"],"loci; datos codicológicos trazables")
    except Exception as e:
        failures.append(("integridad académica pública",str(e)))
        print("FAIL integridad académica pública",str(e))
    print("RESULTADO",len(failures),"fallos")
    for url,error in failures:print("PENDIENTE",url,error)
    return 1 if failures else 0
if __name__=="__main__":sys.exit(main())
