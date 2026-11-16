#!/usr/bin/env python3
"""Auditoría de enlaces solo lectura: no modifica GitHub, Cloudflare ni R2.

Uso: python tools/auditar-urls-inventario.py inventario.csv --salida inventario-auditado.csv
Opcional: --columna-url URL --pausa 0.2
La ejecución requiere acceso de red. No confundir un error de red local con 404 real.
"""
import argparse
import csv
import datetime as dt
import time
import urllib.error
import urllib.parse
import urllib.request

CANDIDATAS = ("URL", "Url", "url", "Enlace", "enlace", "Dirección", "Direccion")
AGENTE = "Vitruvius-ReadOnly-LinkAudit/1.0 (+https://vitruvius-digital-library.org/)"
COLUMNAS = ("HTTP", "URL final", "Redirección", "Fecha verificación UTC", "Observaciones")

def comprobar(url, timeout):
    url = url.strip()
    if not url:
        return ("", "", "", "Sin URL")
    if urllib.parse.urlsplit(url).scheme not in ("http", "https"):
        return ("", "", "", "URL inválida: solo HTTP/HTTPS")
    # HEAD is lighter, but some content endpoints only implement GET.
    for metodo in ("HEAD", "GET"):
        try:
            peticion = urllib.request.Request(url, method=metodo, headers={"User-Agent": AGENTE})
            with urllib.request.urlopen(peticion, timeout=timeout) as respuesta:
                codigo = respuesta.status
                final = respuesta.url
                return (str(codigo), final, "Sí" if final != url else "No", "" if codigo == 200 else "Revisar estado HTTP")
        except urllib.error.HTTPError as error:
            if metodo == "HEAD" and error.code in (403, 405, 501):
                continue
            return (str(error.code), error.geturl(), "Indeterminada", "HTTP " + str(error.code))
        except (urllib.error.URLError, TimeoutError, OSError) as error:
            if metodo == "HEAD":
                continue
            return ("", "", "Indeterminada", "No verificado: error de red (" + type(error).__name__ + ")")
    return ("", "", "Indeterminada", "No verificado")

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("csv", help="Inventario CSV de entrada")
    parser.add_argument("--salida", required=True, help="Nuevo archivo CSV, sin sobrescribir el inventario")
    parser.add_argument("--columna-url", default="", help="Nombre exacto de la columna de direcciones")
    parser.add_argument("--pausa", type=float, default=0.25)
    parser.add_argument("--timeout", type=float, default=12.0)
    args = parser.parse_args()
    if args.csv == args.salida:
        parser.error("La salida debe ser distinta del inventario original")
    with open(args.csv, newline="", encoding="utf-8-sig") as entrada:
        lector = csv.DictReader(entrada)
        campos = list(lector.fieldnames or [])
        columna = args.columna_url or next((c for c in CANDIDATAS if c in campos), None)
        if not columna:
            parser.error("No se encontró columna URL; especificar --columna-url")
        registros = list(lector)
    nuevos = campos + [c for c in COLUMNAS if c not in campos]
    ahora = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
    with open(args.salida, "w", newline="", encoding="utf-8") as salida:
        escritor = csv.DictWriter(salida, fieldnames=nuevos)
        escritor.writeheader()
        for fila in registros:
            status, final, redir, nota = comprobar(str(fila.get(columna) or ""), args.timeout)
            fila["HTTP"] = status
            fila["URL final"] = final
            fila["Redirección"] = redir
            fila["Fecha verificación UTC"] = ahora
            # Preserve existing editorial observations; append only a concrete finding.
            anterior = (fila.get("Observaciones") or "").strip()
            fila["Observaciones"] = "; ".join(x for x in (anterior, nota) if x)
            escritor.writerow(fila)
            time.sleep(max(0.0, args.pausa))
    print(f"Escritas {len(registros)} filas en {args.salida}; inventario original intacto.")

if __name__ == "__main__":
    main()
