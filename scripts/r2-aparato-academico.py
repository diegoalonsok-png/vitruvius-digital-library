#!/usr/bin/env python3
"""Auditoría bibliográfica, codicológica y filológica de cada edición R2.
Nunca confunde una impresión moderna con un testimonio manuscrito ni inventa colaciones.
Salida liviana, reproducible y apta para consulta del catálogo.
"""
import json
from pathlib import Path
from datetime import datetime, timezone
ROOT=Path(__file__).resolve().parents[1]
CAT=ROOT/"data/r2/catalogo-clasicos-r2.json"
OUT=ROOT/"data/r2/aparato-academico.json"
META=ROOT/"data/r2/fichas-nuevas-metadatos.json"
def main():
    data=json.loads(CAT.read_text(encoding="utf-8"))
    metadatos=json.loads(META.read_text(encoding="utf-8")).get("obras",{}) if META.exists() else {}
    records=[]
    for o in data.get("items",[]):
        m=metadatos.get(o["id"],{})
        checks={"identificadorFuente":bool(o.get("identificadorIA")),
                "edicionIdentificada":bool(o.get("tituloEdicion") and o.get("anio")),
                "identidadArchivo":bool(o.get("sha256") and o.get("pdf")),
                "proveniencia":bool(o.get("fuente")),
                "derechosDeclarados":bool(o.get("derechos")),
                "testimonioManuscritoVerificado":False,
                "colacionCriticaRealizada":False,
                "ocrRevisado":False}
        records.append({
          "id":o["id"],"schema":"vdl-aparato-academico-1",
          "identificacionObra":{"autor":o.get("autor"),"tituloUniforme":m.get("titulo") or o.get("obra"),
             "tituloOriginal":m.get("tituloOriginal"),"lenguaOriginalDeclarada":o.get("lengua"),
             "genero":m.get("genero"),"datacionComposicion":m.get("datacion"),
             "atribucion":"Por cotejar con autoridad bibliografica independiente",
             "identificadoresAutoridad":{"cts":None,"tlg":None,"phi":None}},
          "edicionMaterial":{"tipo":"facsímil de edición impresa; no constituye por sí mismo un códice medieval",
             "tituloTranscritoCatalogoFuente":o.get("tituloEdicion"),"anioEdicion":o.get("anio"),
             "editorImpresorSegunFuente":o.get("editor"),"volumen":o.get("volumen"),
             "lugarImpresion":None,"formato":None,"signaturasTipograficas":None,
             "colacionBibliografica":None,"ejemplarInstitucion":None,"signaturaEjemplar":None,
             "estadoVerificacion":"Metadatos de repositorio digital; portada y colofón sin cotejo humano"},
          "codicologia":{"aplicable":"solo si se identifica un testimonio manuscrito concreto",
             "institucion":None,"signatura":None,"datacionPaleografica":None,
             "soporte":None,"dimensiones":None,"foliacion":None,"cuadernos":None,
             "reclamos":None,"pautado":None,"escritura":None,"manos":None,
             "decoracion":None,"procedencia":None,"bibliografia":[],
             "estado":"pendiente de identificación y examen de testimonio manuscrito"},
          "ecdotica":{"recensio":None,"testimoniosCotejados":[],"sigla":[],
             "stemmaCodicum":None,"variantesVerificadas":[],
             "emendaciones":[], "lociCritici":[],
             "estado":"sin colación textual; no hay aparato crítico"},
          "filologia":{"transcripcionDiplomatica":False,"normalizacionDocumentada":False,
             "idiomaOCR":o.get("idiomaEdicion"),"indexacion":"OCR sin corregir, localización documental; no cita filológica validada",
             "lemmatizacionVerificada":False,"morfologiaVerificada":False,
             "traduccionIdentificada":bool(o.get("traduccionDe")),
             "nota":"Distinguir lengua de composición, lengua de la edición y traducción incluida"},
          "procedenciaDigital":{"repositorioOrigen":o.get("fuente"),"identificadorIA":o.get("identificadorIA"),
             "objetoR2":o.get("pdf"),"textoOCR":o.get("texto"),"sha256":o.get("sha256"),
             "numeroImagenesPDF":o.get("paginas"),"paginasConCapaTexto":o.get("paginasConTexto"),
             "derechosDeclarados":o.get("derechos"),"licenciaImagenesReproduccionEspecifica":None,
             "nota":"La situación jurídica del texto histórico y los derechos de la digitalización se verifican por separado"},
          "verificaciones":checks,
          "nivelEditorial":"registro_documental_provisional",
          "pendientes":["Cotejo de portada, impresor, lugar, volumen y fecha",
                        "Identificación del ejemplar y su institución de conservación",
                        "Comprobar la licencia de reproducción particular del objeto digital",
                        "Identificación codicológica de testigos manuscritos, si existen",
                        "Collatio, recensio y aparato de variantes documentadas",
                        "Revisión y normalización del OCR para búsqueda filológica fiable"]
        })
    result={"schema":"vdl-aparato-academico-1",
        "actualizado":datetime.now(timezone.utc).date().isoformat(),
        "metodo":"Campos desconocidos explícitamente nulos. La ausencia de cotejo no se presenta como verificación. Nunca se atribuye un siglum, manuscrito, locus o stemma sin fuente.",
        "total":len(records),"registros":records}
    OUT.parent.mkdir(parents=True,exist_ok=True)
    OUT.write_text(json.dumps(result,ensure_ascii=False,indent=1)+"\n",encoding="utf-8")
    print(f"Aparato académico trazable: {len(records)} registros; pendientes de revisión separados de datos comprobables")
if __name__=="__main__":main()
