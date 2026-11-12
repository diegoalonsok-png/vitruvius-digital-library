# -*- coding: utf-8 -*-
"""Localiza las líneas de escritura de un folio de H sobre la imagen digital.

Perfil horizontal de tinta: cada fila cuenta los píxeles oscuros dentro de la
caja de escritura; las líneas son los tramos donde el perfil supera un umbral.
Si se pide un número esperado de líneas (el de la lectura), se ajusta el umbral
hasta obtenerlo. Devuelve cajas en coordenadas relativas (0-1) para que el
visor las dibuje a cualquier tamaño. Sirve para subrayar en el facsímil la
línea donde la lectura sitúa una palabra; la posición horizontal dentro de la
línea es proporcional al número de letras, por tanto aproximada.
"""
import sys, json
import numpy as np
from PIL import Image

def lineas(ruta, esperadas=None):
    im = np.asarray(Image.open(ruta).convert("RGB")).astype(float)
    h, w, _ = im.shape
    gris = im.mean(axis=2)
    # 1. Pergamino: zona clara. Se descartan el fondo gris de la fotografía,
    #    el lomo y los bordes, que el perfil confundiría con tinta.
    claro = gris > 150
    filas_p = np.where(claro.mean(axis=1) > 0.55)[0]
    cols_p = np.where(claro.mean(axis=0) > 0.55)[0]
    py0, py1 = filas_p[0], filas_p[-1]
    px0, px1 = cols_p[0], cols_p[-1]
    m = int(0.02 * w)
    py0, py1, px0, px1 = py0 + m, py1 - m, px0 + m, px1 - m
    # 2. Tinta: más oscura que el pergamino que la rodea, dentro de esa zona.
    fondo = np.median(gris[py0:py1, px0:px1])
    tinta = np.zeros_like(gris, dtype=bool)
    tinta[py0:py1, px0:px1] = gris[py0:py1, px0:px1] < fondo - 45
    # 2b. Sombras del lomo y bordes: franjas verticales oscuras en casi todas
    #     las filas. La escritura nunca ocupa así una columna; se descartan.
    sombra = tinta[py0:py1].mean(axis=0) > 0.40
    sombra = np.convolve(sombra.astype(float), np.ones(7), mode="same") > 0
    tinta[:, sombra] = False
    # 3. Columna de escritura: donde la tinta es sostenida.
    col = tinta[py0:py1].mean(axis=0)
    xs = np.where(col > 0.015)[0]
    x0, x1 = int(np.percentile(xs, 2)), int(np.percentile(xs, 98))
    prof = tinta[:, x0:x1].mean(axis=1)
    prof = np.convolve(prof, np.ones(3) / 3, mode="same")

    # 4. Líneas: picos del perfil. El códice tiene interlineado regular, así
    #    que con el número de líneas de la lectura se estima el interlineado y
    #    se toman los N picos más fuertes separados al menos por 0,6 de él. Así
    #    se separan líneas que se tocan (ascendentes y descendentes).
    filas = np.where(prof > 0.02)[0]
    ty0, ty1 = filas[0], filas[-1]
    n = esperadas or max(1, int(round((ty1 - ty0) / 26)))
    paso = (ty1 - ty0) / max(1, n - 0.5)
    sep = int(paso * 0.6)
    orden = np.argsort(prof)[::-1]
    picos = []
    for y in orden:
        if prof[y] <= 0.02:
            break
        if all(abs(int(y) - q) >= sep for q in picos):
            picos.append(int(y))
        if len(picos) == n:
            break
    picos.sort()
    cajas = []
    for k, y in enumerate(picos):
        a = int((picos[k - 1] + y) / 2) if k else int(y - paso / 2)
        b = int((y + picos[k + 1]) / 2) if k + 1 < len(picos) else int(y + paso / 2)
        a, b = max(0, a), min(h, b)
        # Extensión del renglón por masa de tinta: del 2 % al 98 % acumulado.
        # Manchas y glosas marginales pesan poco y quedan fuera.
        masa = tinta[a:b, x0:x1].sum(axis=0).astype(float)
        if masa.sum() > 0:
            acum = np.cumsum(masa) / masa.sum()
            lx0 = x0 + int(np.searchsorted(acum, 0.02))
            lx1 = x0 + int(np.searchsorted(acum, 0.98))
        else:
            lx0, lx1 = x0, x1
        cajas.append({"y": round(a / h, 4), "h": round((b - a) / h, 4),
                      "x": round(lx0 / w, 4), "w": round((lx1 - lx0) / w, 4)})
    return cajas

if __name__ == "__main__":
    ruta = sys.argv[1]
    esp = int(sys.argv[2]) if len(sys.argv) > 2 else None
    c = lineas(ruta, esp)
    print(json.dumps({"n": len(c), "lineas": c}))
