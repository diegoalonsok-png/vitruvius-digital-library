# Papyrologia et Ostraca — análisis multimodal opcional

El sitio principal **GitHub Pages es estático**. No dispone de servidor para custodiar una clave privada de Google Gemini. Por eso este módulo se ejecuta **en tu propia computadora**, y el resultado JSON se importa manualmente al laboratorio web.

## Instalación

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r tools/papyrology/requirements.txt
```

En Windows, activá el entorno con `.venv\\Scripts\\activate`.

Crea una clave de Gemini para tu propia cuenta, revisando cuotas y tarifas. Configúrala en una variable de entorno; **no la pegues en páginas web, capturas, commits ni archivos de Git**:

```bash
export GEMINI_API_KEY="TU_CLAVE_PRIVADA"
```

## Uso

```bash
python tools/papyrology/lector_antiguo_gemini.py fragmento.png --script grc
python tools/papyrology/lector_antiguo_gemini.py fragmento.png --script phn --output lectura-fenicia.json
```

El modelo predeterminado es `gemini-2.5-flash`, configurable con `--model`. Depende de que esté disponible en tu cuenta. Se genera un JSON con:

- **Candidatos de escritura** y **candidatos de idioma**, campos separados.
- Líneas diplomáticas propuestas y orden de lectura.
- Signos/agrupaciones y alternativas de lectura, incluidos `clear`, `uncertain`, `lost`.
- Condición del soporte, observaciones, traducción tentativa y problemas abiertos.
- Modelo usado y etiqueta inequívoca de **lectura automática pendiente de revisión humana**.

En el [laboratorio](../../papyrologia-ostraca.html), sección «Análisis visual», selecciona **Importar resultado Gemini (.json)**. El sitio leerá el archivo solamente en el navegador y copiará la transcripción tentativa al editor.

## Seguridad, privacidad y rigor

- La imagen se envía a Google **solo al ejecutar explícitamente el programa local**. Antes de hacerlo, confirma permisos, atribución y tratamiento de datos del proveedor.
- No se transmite la imagen desde GitHub Pages ni se almacena una clave de API allí.
- El reconocimiento es una **hipótesis**. No debe citarse como lectura verificada sin examen filológico del soporte y de su procedencia.
- Una grafía no identifica automáticamente el idioma: fenicio y paleohebreo son históricamente próximos; arameo puede aparecer en diversos sistemas gráficos.
- El proyecto GreekHTR de PatristicTextArchive es una alternativa de investigación para **minúscula griega medieval**, no para todos los óstraca helenísticos ni todos los papiros.
- En caso de fallos del API o agotamiento de cuota, el visor gráfico y la transcripción manual siguen funcionando.

Documentación: https://ai.google.dev/gemini-api/docs/api-key y https://googleapis.github.io/python-genai/ .
