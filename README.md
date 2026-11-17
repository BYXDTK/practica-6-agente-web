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

El frontend se tomó del código del PDF. Los manejadores de los controles se enlazan desde `app.js` y la URL de la API se adapta al acceso local o remoto. El backend también sirve los archivos del frontend y conserva validación de entradas y manejo de errores. No hay barra lateral, tarjetas de sugerencias ni funciones adicionales en la interfaz.

La revisión remota utiliza un acceso temporal con contraseña, separado de los archivos de la práctica.

Las pruebas del backend se ejecutan con `node --test`.
