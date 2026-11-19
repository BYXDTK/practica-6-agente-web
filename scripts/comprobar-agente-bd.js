// Ejecuta las tres preguntas de la tarea contra OpenRouter y Sakila reales.
// Guarda evidencia reproducible sin incluir credenciales.
const fs = require('node:fs');
const path = require('node:path');
const { once } = require('node:events');
const { createApp } = require('../ai-backend/server');
const { createSakila } = require('../ai-backend/sakila');

const questions = [
  ['recommend_movies', 'Recomiéndame 3 películas de acción que sean largas (más de 2 horas) pero que la gente alquile muy seguido en la tienda.'],
  ['customers_at_risk', '¿Qué clientes crees que están a punto de dejar el servicio porque llevan mucho tiempo sin alquilar ninguna película?'],
  ['weekday_analysis', 'Hazme un análisis rápido de qué día de la semana hay más movimiento en las tiendas y cuánto dinero promedio se recauda en esos días.'],
];

async function main() {
  if (process.env.DB_ENABLED !== 'true') throw new Error('Activa DB_ENABLED=true en ai-backend/.env.');
  const database = createSakila();
  const calls = [];
  const audited = { execute: async (name, args) => {
    const result = await database.execute(name, args);
    calls.push({ name, args, result });
    return result;
  } };
  const server = createApp({ database: audited }).listen(0, '127.0.0.1');
  await once(server, 'listening');
  const evidence = [];
  try {
    for (const [expectedTool, question] of questions) {
      const start = calls.length;
      const response = await fetch(`http://127.0.0.1:${server.address().port}/api/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: question, history: [] }), signal: AbortSignal.timeout(180000),
      });
      const body = await response.json();
      if (!response.ok || !body.reply) throw new Error(body.error || 'Sin respuesta de texto.');
      const toolCalls = calls.slice(start);
      if (!toolCalls.some(call => call.name === expectedTool)) throw new Error(`El agente no consultó ${expectedTool}.`);
      evidence.push({ question, reply: body.reply, tools: toolCalls });
      console.log(`Verificado: ${expectedTool}, HTTP ${response.status}.`);
    }
    const directory = path.join(__dirname, '../docs');
    fs.mkdirSync(directory, { recursive: true });
    fs.writeFileSync(path.join(directory, 'agente-bd-evidencia.json'), JSON.stringify({ model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini', evidence }, null, 2) + '\n');
    fs.writeFileSync(path.join(directory, 'conversaciones-agente-bd.md'), '# Agente BD: conversaciones verificadas\n\nRespuestas del agente conectado a OpenRouter y a Sakila local. Cada pregunta se ejecutó de forma independiente. Las herramientas y sus resultados completos están en [la evidencia JSON](agente-bd-evidencia.json).\n\n' + evidence.map((item, index) => `## Pregunta ${index + 1}\n\n${item.question}\n\nHerramientas ejecutadas: ${item.tools.map(call => '`' + call.name + '`').join(', ')}.\n\n${item.reply}\n`).join('\n'));
  } finally {
    await new Promise(resolve => server.close(resolve));
    await database.close();
  }
}

main().catch(error => { console.error(error.message); process.exitCode = 1; });
