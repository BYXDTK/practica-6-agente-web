const path = require('node:path');
const express = require('express');
const cors = require('cors');
const { OpenAI } = require('openai');
require('dotenv').config({ path: path.join(__dirname, '.env'), quiet: true });

const MAX_MESSAGE = 8000;
const MAX_HISTORY = 40;
const SYSTEM_PROMPT = 'Eres un asistente útil, claro y amable. Responde en español salvo que el usuario solicite otro idioma. Conserva el contexto de la conversación y reconoce cuando no sabes algo.';

function createApp({ apiKey = process.env.OPENROUTER_API_KEY, model = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini', client } = {}) {
  const app = express();
  const configured = typeof apiKey === 'string' && apiKey.trim().length > 0;
  const provider = client || (configured ? new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: apiKey.trim(),
    defaultHeaders: {
      'HTTP-Referer': process.env.APP_URL || 'http://localhost:3000',
      'X-Title': 'Agente Web - Practica 6',
    },
    timeout: 45000,
    maxRetries: 0,
  }) : null);

  app.disable('x-powered-by');
  app.use(cors({ origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'null', process.env.APP_URL].filter(Boolean) }));
  app.use(express.json({ limit: '512kb' }));
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'none'; frame-ancestors 'none'");
    next();
  });

  app.get('/api/health', (req, res) => res.json({ status: 'ok', configured: Boolean(provider), model, maxMessage: MAX_MESSAGE, maxHistory: MAX_HISTORY }));

  app.post('/api/chat', async (req, res) => {
    const { message, history = [] } = req.body || {};
    if (typeof message !== 'string' || !message.trim() || message.length > MAX_MESSAGE) {
      return res.status(400).json({ error: `Escribe un mensaje de 1 a ${MAX_MESSAGE} caracteres.` });
    }
    if (!Array.isArray(history) || history.length > MAX_HISTORY || history.some(item =>
      !item || !['user', 'assistant'].includes(item.role) || typeof item.content !== 'string' ||
      !item.content.trim() || item.content.length > MAX_MESSAGE)) {
      return res.status(400).json({ error: 'El historial de la conversación no es válido.' });
    }
    if (!provider) {
      return res.status(503).json({ error: 'Falta configurar OPENROUTER_API_KEY en ai-backend/.env. Guarda tu clave y reinicia el servidor.' });
    }
    try {
      const completion = await provider.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          ...history.map(({ role, content }) => ({ role, content })),
          { role: 'user', content: message.trim() },
        ],
        max_tokens: 1500,
      });
      const reply = completion.choices?.[0]?.message?.content;
      if (typeof reply !== 'string' || !reply.trim()) {
        return res.status(502).json({ error: 'El proveedor no devolvió una respuesta de texto. Intenta de nuevo.' });
      }
      res.json({ reply });
    } catch (error) {
      const status = error.status;
      const errors = {
        401: [502, 'OpenRouter rechazó la clave. Revisa OPENROUTER_API_KEY y reinicia el servidor.'],
        402: [502, 'La cuenta de OpenRouter no tiene saldo suficiente para este modelo.'],
        403: [502, 'OpenRouter no permite acceder al modelo configurado.'],
        404: [502, 'El modelo configurado no está disponible en OpenRouter.'],
        429: [429, 'Se alcanzó el límite de solicitudes. Espera un momento y vuelve a intentar.'],
      };
      const [code, message] = errors[status] || (error.name === 'APIConnectionTimeoutError'
        ? [504, 'El modelo tardó demasiado en responder. Vuelve a intentar.']
        : [502, 'No se pudo contactar con OpenRouter. Revisa tu conexión y vuelve a intentar.']);
      // No registrar claves, mensajes ni el objeto de error del proveedor.
      console.error('Solicitud a OpenRouter fallida:', status || error.name || 'error');
      res.status(code).json({ error: message });
    }
  });

  app.use(express.static(path.join(__dirname, '..', 'ai-frontend')));
  app.use('/api', (req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
  app.use((error, req, res, next) => {
    if (error.type === 'entity.too.large') return res.status(413).json({ error: 'La solicitud es demasiado grande.' });
    if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'El cuerpo debe ser JSON válido.' });
    console.error('Error del servidor:', error.name || 'error');
    res.status(500).json({ error: 'Error interno del servidor.' });
  });
  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  const host = process.env.HOST || '127.0.0.1';
  const server = createApp().listen(port, host, () => {
    console.log(`Chat disponible en http://localhost:${port}`);
    if (!process.env.OPENROUTER_API_KEY) console.log('Pendiente: configura OPENROUTER_API_KEY en ai-backend/.env y reinicia.');
  });
  server.on('error', error => {
    console.error(error.code === 'EADDRINUSE' ? `El puerto ${port} ya está en uso. Cambia PORT en ai-backend/.env.` : 'No se pudo iniciar el servidor.');
    process.exitCode = 1;
  });
}

module.exports = { createApp };
