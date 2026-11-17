# Práctica 6: Integrar un agente en aplicativo web

Implementación de la práctica del PDF proporcionado:

- Backend con Node.js, Express, cors, dotenv y el SDK oficial de OpenAI conectado a OpenRouter.
- Clave en `ai-backend/.env` y modelo `openai/gpt-4o-mini`.
- Endpoint `POST /api/chat` que recibe `message` y `history` y devuelve `reply`.
- Frontend del documento: contenedor de 400 × 500 px, fondo claro, mensajes del usuario azules a la derecha y mensajes del asistente grises a la izquierda.
- Campo «Escribe tu mensaje...», botón «Enviar» y envío con Enter.
- Historial de conversación en memoria, tal como en el ejemplo.

## Iniciar

Las dependencias ya están instaladas y la clave ya está configurada en esta computadora.

Haz doble clic en `iniciar.cmd` o ejecuta desde la raíz:

```powershell
node ai-backend/server.js
```

Abre http://localhost:3000 o haz doble clic en `ai-frontend/index.html`, como indica la práctica. Mantén el backend encendido. Para detenerlo, presiona Ctrl+C.

## Probar

Escribe «Me llamo Ana» y envía el mensaje. Después pregunta «¿Cómo me llamo?» para comprobar que mantiene el contexto. Al recargar la página se borra el historial local.

## Archivos

```text
ai-backend/server.js
ai-backend/.env
ai-backend/.env.example
ai-frontend/index.html
ai-frontend/app.js
```

Para instalar en otra computadora con Node.js 20 o posterior, ejecuta `npm install` en la raíz, copia `ai-backend/.env.example` a `ai-backend/.env` y configura tu propia clave.

## Formato del archivo .env

La plantilla está en [`ai-backend/.env.example`](ai-backend/.env.example). El nombre correcto del archivo de configuración es `.env` y debe estar dentro de `ai-backend`, junto a `server.js`.

```dotenv
PORT=3000
HOST=127.0.0.1
OPENROUTER_API_KEY=tu_clave_de_openrouter_aqui
OPENROUTER_MODEL=openai/gpt-4o-mini
APP_URL=http://localhost:3000
```

Para preparar e iniciar el proyecto en Windows, ejecuta desde la raíz:

```powershell
npm install
Copy-Item ai-backend/.env.example ai-backend/.env
notepad ai-backend/.env
npm start
```

Copia la plantilla solo la primera vez, cuando aún no tengas un `.env` configurado. En el Bloc de notas, reemplaza el valor vacío de `OPENROUTER_API_KEY` por tu clave, guarda y cierra antes de iniciar el servidor. Después abre http://localhost:3000. Reinicia el servidor cuando cambies la configuración.

`PORT` y `OPENROUTER_API_KEY` son los valores principales de la práctica. Las otras variables definen la dirección local, el modelo y la URL de la aplicación. Si cambias el puerto, actualiza también `APP_URL` y abre la nueva dirección en el navegador; abrir el HTML como archivo sigue usando el puerto 3000.

El archivo `.env` contiene tu clave privada y está excluido de Git. La plantilla `.env.example` sí se incluye en el repositorio y debe permanecer sin una clave real.

El frontend se tomó del código del PDF. Los manejadores de los controles se enlazan desde `app.js` y la URL de la API se adapta al acceso local o remoto. El backend también sirve los archivos del frontend y conserva validación de entradas y manejo de errores. No hay barra lateral, tarjetas de sugerencias ni funciones adicionales en la interfaz.

La revisión remota utiliza un acceso temporal con contraseña, separado de los archivos de la práctica.

Las pruebas del backend se ejecutan con `node --test`.
