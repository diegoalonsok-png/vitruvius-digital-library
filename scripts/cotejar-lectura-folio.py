# -*- coding: utf-8 -*-
"""Coteja una lectura semidiplomática de un folio de H con el latín editorial V514.

Entrada: un fichero de texto con las líneas del folio tal como se leen en la
imagen (abreviaturas marcadas: & = et, q; = que, (er) etc. restituido).
Salida: el tramo de loci que el folio contiene, con la palabra de entrada y de
salida, y la lista de discrepancias palabra a palabra entre H y V514.

Una discrepancia NO es una variante: puede ser error de lectura. Se publica
como «lectura a revisar» hasta que se compruebe sobre la imagen.
"""
import json, re, sys, unicodedata, difflib, os

RAIZ = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")

def plegar(s):
    s = unicodedata.normalize("NFD", s)
    s = "".join(c for c in s if not unicodedata.combining(c))
    return s.lower().replace("j", "i").replace("v", "u")

def tokens_h(lineas):
    t = " ".join(lineas)
    # Corte de palabra a final de línea: la línea siguiente continúa la palabra.
    juntas = []
    for i, l in enumerate(lineas):
        juntas.append(l.rstrip())
    texto = ""
    for l in juntas:
        if texto and re.search(r"[a-z]$", texto) and not re.search(r"[;:·.,]\s*$", texto) and l[:1].islower() and texto_corte(texto, l):
            texto += l.lstrip()
        else:
            texto += " " + l
    # El nexo & dentro de palabra es la sílaba et (perp&uo = perpetuo, lic& = licet);
    # aislado es la conjunción.
    texto = re.sub(r"(?<=[A-Za-z])&|&(?=[A-Za-z])", "et", texto)
    texto = texto.replace("&", " et ").replace("q;", "que").replace("q:", "que")
    texto = re.sub(r"\(([^)]*)\)", r"\1", texto)
    return [plegar(w) for w in re.findall(r"[A-Za-zÀ-ÿ]+", texto)]

CORTES = None
def texto_corte(prev, sig):
    # Se decide el corte por diccionario: si la unión forma una palabra de V514
    # y las dos mitades no lo son las dos, es una palabra partida.
    a = plegar(re.findall(r"[A-Za-z]+$", prev)[0])
    b = plegar(re.findall(r"^[A-Za-z]+", sig.lstrip())[0]) if re.match(r"\s*[A-Za-z]", sig) else ""
    return (a + b) in CORTES and not (a in CORTES and b in CORTES)

def main(folio, ruta):
    global CORTES
    txt = json.load(open(os.path.join(RAIZ, "data/structured/recensio-es.json")))["passages"]
    V = []
    for p in txt:
        for w in re.findall(r"[A-Za-zÀ-ÿ]+", p["latin"]):
            V.append((plegar(w), p["locus"]))
    CORTES = {w for w, _ in V}
    lineas = [l for l in open(ruta, encoding="utf-8").read().splitlines() if l.strip()]
    H = tokens_h(lineas)
    vs = [w for w, _ in V]
    # Ancla: la ventana de V514 con más trigramas comunes.
    tri = {}
    for i in range(len(vs) - 2):
        tri.setdefault(tuple(vs[i:i+3]), []).append(i)
    votos = {}
    for i in range(len(H) - 2):
        for j in tri.get(tuple(H[i:i+3]), []):
            votos[j - i] = votos.get(j - i, 0) + 1
    desfase = max(votos, key=votos.get)
    ini = max(0, desfase - 20); fin = min(len(vs), desfase + len(H) + 20)
    sm = difflib.SequenceMatcher(None, H, vs[ini:fin], autojunk=False)
    bloques = [b for b in sm.get_matching_blocks() if b.size]
    v0 = ini + bloques[0].b; v1 = ini + bloques[-1].b + bloques[-1].size - 1
    difs = []
    for op, a1, a2, b1, b2 in sm.get_opcodes():
        if op == "equal":
            continue
        if b1 + ini < v0 or b2 + ini - 1 > v1:
            if op == "insert":
                continue
        difs.append({"op": {"replace": "H difiere", "delete": "sólo en H", "insert": "omitido en H"}[op],
                     "H": " ".join(H[a1:a2]), "V514": " ".join(vs[ini+b1:ini+b2]),
                     "locus": V[ini+b1][1] if ini+b1 < len(V) else V[ini+b2-1][1]})
    loci = []
    for k in range(v0, v1 + 1):
        if not loci or loci[-1] != V[k][1]:
            loci.append(V[k][1])
    iguales = sum(b.size for b in bloques)
    res = {"folio": folio, "lineas": len(lineas), "palabrasLeidas": len(H),
           "coincidenciaConV514": round(iguales / max(1, len(H)), 3),
           "entrada": {"locus": V[v0][1], "palabra": V[v0][0]},
           "salida": {"locus": V[v1][1], "palabra": V[v1][0]},
           "loci": loci, "discrepancias": difs}
    return res

if __name__ == "__main__":
    r = main(sys.argv[1], sys.argv[2])
    print(json.dumps(r, ensure_ascii=False, indent=1))
