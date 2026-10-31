# Scriptorium · servicio HTR experimental

GitHub Pages **no ejecuta Kraken**. Este servicio separado permite que la página pública envíe la imagen de **un folio** a una instalación Kraken administrada por el investigador. **No es un servicio público ya desplegado.**

1. Instalar Python compatible y las dependencias: `pip install -r htr-service/requirements.txt`.
2. Descargar y **validar** un modelo Kraken específico para manuscritos latinos en minúscula carolina (formato `.mlmodel`). No se suministra modelo ni se presupone que uno genérico sea adecuado.
3. Configurar `KRAKEN_MODEL=/ruta/absoluta/modelo.mlmodel`.
4. Ejecutar `uvicorn server:app --app-dir htr-service --host 127.0.0.1 --port 8765`.
5. En Scriptorium indicar la URL del servicio y cargar una imagen de un folio. Pulsar «RECONOCER CON KRAKEN HTR». El latín aparece como borrador editable cuando el servidor responde.

**Seguridad:** por defecto escucha solo en localhost, admite orígenes de GitHub Pages, limita imágenes a 15 MB y no guarda imágenes ni transcripciones. Si se despliega para terceros, agregar HTTPS, autenticación, límites de peticiones y aislamiento de procesos; **no** exponer sin protección este servicio. Algunos navegadores pueden bloquear la conexión desde GitHub Pages a localhost; en ese caso se requiere un servicio HTTPS autorizado. La página informa errores en lugar de atribuir a HTR una lectura generada con otro motor.

**Evaluación filológica:** la salida es automática no revisada; comparar contra imagen y registrar expansiones de abreviaturas antes de publicarla. No sustituye una colación.
