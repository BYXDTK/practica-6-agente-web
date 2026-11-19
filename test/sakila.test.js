const { test } = require('node:test');
const assert = require('node:assert/strict');
const { answerWithSakila } = require('../ai-backend/agent');
const { createSakila } = require('../ai-backend/sakila');

test('agente consulta la herramienta y devuelve sus resultados al modelo antes de responder', async () => {
  const payloads = [];
  const executions = [];
  const provider = { chat: { completions: { create: async payload => {
    // Copia: la conversación se amplía entre llamadas.
    payloads.push(structuredClone(payload));
    return { choices: [{ message: payloads.length === 1
      ? { role: 'assistant', content: null, tool_calls: [{ id: 'query_1', type: 'function', function: { name: 'recommend_movies', arguments: '{"category":"Action","min_minutes":120,"limit":3}' } }] }
      : { role: 'assistant', content: 'Película real: EJEMPLO, 150 minutos, 20 alquileres.' } }] };
  } } } };
  const database = { execute: async (name, args) => {
    executions.push({ name, args });
    return { rows: [{ title: 'EJEMPLO', duration_minutes: 150, rental_count: 20 }] };
  } };
  const reply = await answerWithSakila(provider, 'test-model', [{ role: 'system', content: 'Asistente.' }, { role: 'user', content: 'Recomienda acción larga.' }], database);
  assert.match(reply, /EJEMPLO/);
  assert.deepEqual(executions, [{ name: 'recommend_movies', args: { category: 'Action', min_minutes: 120, limit: 3 } }]);
  assert.equal(payloads.length, 2);
  const tool = payloads[1].messages.at(-1);
  assert.equal(tool.role, 'tool');
  assert.equal(tool.tool_call_id, 'query_1');
  assert.equal(JSON.parse(tool.content).rows[0].title, 'EJEMPLO');
});

test('no ejecuta funciones desconocidas ni SQL generado por el modelo', async () => {
  let calls = 0;
  let executed = false;
  const provider = { chat: { completions: { create: async payload => {
    calls++;
    if (calls === 1) return { choices: [{ message: { role: 'assistant', tool_calls: [{ id: 'bad', type: 'function', function: { name: 'execute_sql', arguments: '{"sql":"DROP TABLE film"}' } }] } }] };
    assert.match(payload.messages.at(-1).content, /no válidos/);
    return { choices: [{ message: { content: 'La consulta no está permitida.' } }] };
  } } } };
  await answerWithSakila(provider, 'test', [{ role: 'system', content: 'Asistente.' }], { execute: async () => { executed = true; } });
  assert.equal(executed, false);
});

test('valida argumentos antes de consultar la base de datos', async () => {
  const database = createSakila();
  try {
    await assert.rejects(database.execute('recommend_movies', { limit: 100 }), /INVALID_TOOL_ARGUMENTS/);
    await assert.rejects(database.execute('customers_at_risk', { inactive_days: -1 }), /INVALID_TOOL_ARGUMENTS/);
    await assert.rejects(database.execute('weekday_analysis', { store_id: '1 OR 1=1' }), /INVALID_TOOL_ARGUMENTS/);
    await assert.rejects(database.execute('execute_sql', {}), /UNKNOWN_TOOL/);
  } finally { await database.close(); }
});

test('Sakila real: resultados conciliados y usuario sin permisos de escritura', { skip: process.env.SAKILA_TEST !== '1' }, async () => {
  require('dotenv').config({ path: require('node:path').join(__dirname, '../ai-backend/.env'), quiet: true });
  const database = createSakila();
  const mysql = require('mysql2/promise');
  const connection = await mysql.createConnection({ host: process.env.DB_HOST, port: Number(process.env.DB_PORT), user: process.env.DB_USER, password: process.env.DB_PASSWORD, database: process.env.DB_NAME });
  try {
    const movies = await database.execute('recommend_movies', {});
    assert.equal(movies.rows.length, 3);
    assert(movies.rows.every(row => row.duration_minutes > 120));
    assert(movies.rows[0].rental_count >= movies.rows[1].rental_count);
    const injection = await database.execute('recommend_movies', { category: "Action' OR 1=1 --" });
    assert.equal(injection.rows.length, 0);
    const risk = await database.execute('customers_at_risk', {});
    assert(risk.rows.every(row => row.last_rental_date === null || row.days_inactive >= 30));
    assert(Number(risk.customers_at_risk) <= Number(risk.active_customers));
    const analysis = await database.execute('weekday_analysis');
    const [[rentals]] = await connection.query('SELECT COUNT(*) AS n FROM rental');
    const [[payments]] = await connection.query('SELECT SUM(amount) AS amount FROM payment');
    assert.equal(analysis.overall.reduce((sum, row) => sum + Number(row.total_rentals), 0), rentals.n);
    assert.equal(Number(analysis.overall.reduce((sum, row) => sum + row.total_revenue, 0).toFixed(2)), Number(payments.amount));
    assert.equal(analysis.rows.reduce((sum, row) => sum + Number(row.total_rentals), 0), rentals.n);
    await assert.rejects(connection.query('UPDATE film SET title = title WHERE 1 = 0'), error => error.code === 'ER_TABLEACCESS_DENIED_ERROR');
  } finally { await connection.end(); await database.close(); }
});
