#!/usr/bin/env python3
"""Palabras clave latinas por prefacio y capítulo de De architectura (texto latino de V514).

Método: frecuencia de cada familia léxica en el capítulo frente a su frecuencia en el tratado
(tf-idf sobre ~120 unidades: prefacios y capítulos). Una «familia» agrupa formas por raíz
aproximada (primeras letras tras normalizar u/v, i/j); se muestra la forma más frecuente.
Es un índice de orientación, no un lematizador ni un índice verborum.
Salida: data/vitruvius-chapter-keywords.json
"""
import json, re, math, unicodedata, pathlib
from collections import Counter, defaultdict
ROOT = pathlib.Path(__file__).resolve().parent.parent
P = json.loads((ROOT / "data/structured/recensio-es.json").read_text(encoding="utf8"))["passages"]
STOP = set("""a ab abs ac ad adhuc aliqua aliquae aliqui aliquid aliquis alius alia aliud aliae aliis alii aliorum aliter
ante apud at atque aut autem cum circa contra cuius cui cuiusque de deinde dum e ea eae eam eas ei eis eius eo eorum
eos erant erat eris erit erunt esse esset essent est et etiam ex fieri fit fuerit fuerint fuit habent habet haec has
hac hic hinc his hoc horum hos huic huius iam id idem ideo igitur ii illa illae illi illis illius illo illud illum
in inter ipsa ipse ipsis ipsius ipso ipsum ita itaque item magis maxime me mihi minus modo nam namque ne nec neque
nihil nisi non nos nostra nostri nunc ob omnes omnia omnibus omnis per post postea pro propter quae quaecumque quam
quamquam quando quanto quantum quas quasi qui quia quibus quibusdam quid quidem quo quod quoque quorum quos quoniam
re res rebus sed si sic sicut sint sit sive siue sub sui sunt super supra suis suo sua suae suam suas suum sumus
tam tamen tantum tum tunc ubi uel vel uero vero uti ut utraque unde una unum uno unus uero uerum ve sine tibi te tu
ego nobis uobis vobis eodem eadem eiusdem eaedem easdem earum his hanc hunc quem quem quarum cuius cuique quisque
quaeque quodque singula singulis singulorum ceteris cetera ceterae ceteri reliqua reliquis reliquae primum deinde
autem enim ergo etiam quoque tamen item itemque quemadmodum quidem habeant habeat habere fiunt fiet debent debet
oportet possunt potest posse poterit poterunt sunt erunt esse sint sit uti ut ita sic tantum quantum quantae
quae quorum quibus earum eorum eius ipsius tuum tuis tuam tuae tuus tuo tua meum meis meam meae mea meo solum etiamque dicitur dicunt dicuntur unius duae duas duabus tres tribus quattuor quinque minor maior minus plus""".split())
def norm(w):
    w = unicodedata.normalize("NFD", w).encode("ascii", "ignore").decode().lower()
    return w.replace("j", "i").replace("v", "u")
def unit(p):
    return f"{p['book']}.praef" if ".praef." in p["locus"] else f"{p['book']}.{p['locus'].split('.')[1]}"
units = defaultdict(list)
for p in P: units[unit(p)].append(p)
def family(w): return w[:7] if len(w) > 7 else w
tokens = {}
forms = defaultdict(Counter)
for u, ps in units.items():
    c = Counter()
    for p in ps:
        for raw in re.findall(r"[A-Za-zÀ-ÿ]+", p["latin"]):
            n = norm(raw)
            if len(n) < 4 or n in STOP or re.fullmatch(r'[iuxlcdm]+', n): continue
            f = family(n); c[f] += 1; forms[f][raw.lower()] += 1
    tokens[u] = c
N = len(tokens); df = Counter()
for c in tokens.values():
    for f in c: df[f] += 1
out = []
def key(u):
    b, x = u.split("."); return (int(b), -1 if x == "praef" else int(x))
for u in sorted(tokens, key=key):
    c = tokens[u]; tot = sum(c.values()) or 1
    scored = sorted(((cnt / tot) * math.log(N / df[f]) * (1 + math.log(cnt)), f) for f, cnt in c.items() if cnt >= 1)
    scored.reverse()
    kw = []
    for s, f in scored:
        if df[f] > N * 0.6: continue
        t = forms[f].most_common(1)[0][0]
        if len(t) < 5 and c[f] < 2: continue
        kw.append({"term": t, "count": c[f]})
        if len(kw) >= 20: break
    b, x = u.split(".")
    ps = units[u]
    out.append({"unit": u, "book": int(b), "part": "praefatio" if x == "praef" else "caput", "chapter": None if x == "praef" else int(x),
                "first": ps[0]["locus"], "last": ps[-1]["locus"], "keywords": kw})
doc = {"schema": "vitruvius-chapter-keywords/1", "source": "data/structured/recensio-es.json (latín V514)",
       "method": "tf-idf por familia léxica (raíz aproximada) entre prefacios y capítulos; índice de orientación, no lematización.",
       "units": out}
(ROOT / "data/vitruvius-chapter-keywords.json").write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf8")
print(len(out), "unidades")
for u in out[:3] + [x for x in out if x["unit"] in ("3.1", "10.10", "6.praef")]:
    print(u["unit"], ", ".join(k["term"] for k in u["keywords"]))
