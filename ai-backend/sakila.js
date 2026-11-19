const mysql = require('mysql2/promise');

// Consultas fijas y parametrizadas: el modelo nunca ejecuta SQL libre.
const QUERIES = {
  recommendations: `SELECT f.film_id, f.title, f.length AS duration_minutes,
      COUNT(r.rental_id) AS rental_count, COUNT(DISTINCT i.inventory_id) AS copies
    FROM film f
    JOIN film_category fc ON fc.film_id = f.film_id
    JOIN category c ON c.category_id = fc.category_id
    JOIN inventory i ON i.film_id = f.film_id
    LEFT JOIN rental r ON r.inventory_id = i.inventory_id
    WHERE c.name = ? AND f.length > ? AND (? IS NULL OR i.store_id = ?)
    GROUP BY f.film_id, f.title, f.length
    ORDER BY rental_count DESC, f.title ASC LIMIT ?`,
  riskBase: `WITH reference AS (SELECT DATE(MAX(rental_date)) AS reference_date FROM rental),
    activity AS (
      SELECT c.customer_id, c.first_name, c.last_name, c.store_id,
        DATE(MAX(r.rental_date)) AS last_rental_date, COUNT(r.rental_id) AS rental_count,
        reference.reference_date,
        DATEDIFF(reference.reference_date, DATE(MAX(r.rental_date))) AS days_inactive
      FROM customer c CROSS JOIN reference
      LEFT JOIN rental r ON r.customer_id = c.customer_id
      WHERE c.active = 1 AND (? IS NULL OR c.store_id = ?)
      GROUP BY c.customer_id, c.first_name, c.last_name, c.store_id, reference.reference_date
    )`,
  weekdays: `WITH RECURSIVE bounds AS (
      SELECT LEAST((SELECT DATE(MIN(rental_date)) FROM rental),
                   (SELECT DATE(MIN(payment_date)) FROM payment)) AS start_date,
             GREATEST((SELECT DATE(MAX(rental_date)) FROM rental),
                      (SELECT DATE(MAX(payment_date)) FROM payment)) AS end_date
    ), calendar AS (
      SELECT start_date AS day FROM bounds
      UNION ALL SELECT DATE_ADD(day, INTERVAL 1 DAY) FROM calendar CROSS JOIN bounds
        WHERE day < end_date
    ), stores AS (SELECT store_id FROM store UNION ALL SELECT 0), rental_daily AS (
      SELECT i.store_id, DATE(r.rental_date) AS day, COUNT(*) AS rentals
      FROM rental r JOIN inventory i ON i.inventory_id = r.inventory_id
      GROUP BY i.store_id, DATE(r.rental_date)
      UNION ALL
      SELECT 0, DATE(rental_date), COUNT(*) FROM rental GROUP BY DATE(rental_date)
    ), payment_daily AS (
      SELECT COALESCE(i.store_id, st.store_id) AS store_id, DATE(p.payment_date) AS day,
        SUM(p.amount) AS revenue
      FROM payment p LEFT JOIN rental r ON r.rental_id = p.rental_id
      LEFT JOIN inventory i ON i.inventory_id = r.inventory_id
      JOIN staff st ON st.staff_id = p.staff_id
      GROUP BY COALESCE(i.store_id, st.store_id), DATE(p.payment_date)
      UNION ALL
      SELECT 0, DATE(payment_date), SUM(amount) FROM payment GROUP BY DATE(payment_date)
    )
    SELECT s.store_id, WEEKDAY(cal.day) AS weekday_number,
      COUNT(*) AS calendar_days,
      SUM(COALESCE(rd.rentals, 0)) AS total_rentals,
      ROUND(AVG(COALESCE(rd.rentals, 0)), 2) AS average_daily_rentals,
      ROUND(SUM(COALESCE(pd.revenue, 0)), 2) AS total_revenue,
      ROUND(AVG(COALESCE(pd.revenue, 0)), 2) AS average_daily_revenue,
      SUM(CASE WHEN rd.rentals > 0 THEN 1 ELSE 0 END) AS days_with_rentals,
      SUM(CASE WHEN pd.revenue IS NOT NULL THEN 1 ELSE 0 END) AS days_with_payments,
      ROUND(SUM(COALESCE(pd.revenue, 0)) / NULLIF(SUM(CASE WHEN pd.revenue IS NOT NULL THEN 1 ELSE 0 END), 0), 2) AS average_revenue_on_payment_days,
      (SELECT start_date FROM bounds) AS period_start,
      (SELECT end_date FROM bounds) AS period_end
    FROM stores s CROSS JOIN calendar cal
    LEFT JOIN rental_daily rd ON rd.store_id = s.store_id AND rd.day = cal.day
    LEFT JOIN payment_daily pd ON pd.store_id = s.store_id AND pd.day = cal.day
    GROUP BY s.store_id, WEEKDAY(cal.day)
    ORDER BY s.store_id, total_rentals DESC, weekday_number`,
};

const TOOLS = [
  { type: 'function', function: {
    name: 'recommend_movies',
    description: 'Consulta Sakila para recomendar películas de una categoría, con duración estrictamente mayor al mínimo, ordenadas por alquileres históricos reales. Si no se indica tienda usa todas.',
    parameters: { type: 'object', properties: {
      category: { type: 'string', description: 'Categoría Sakila en inglés. Acción = Action.' },
      min_minutes: { type: 'integer', description: 'Duración estrictamente mayor a estos minutos. Más de 2 horas = 120.' },
      limit: { type: 'integer', description: 'Número de películas, entre 1 y 10.' },
      store_id: { type: 'integer', description: 'Opcional: 1 o 2. Omitir para todas.' },
    }, required: ['category', 'min_minutes', 'limit'], additionalProperties: false },
  } },
  { type: 'function', function: {
    name: 'customers_at_risk',
    description: 'Detecta clientes activos con inactividad histórica en Sakila. Es una señal descriptiva, no una predicción de abandono. Usa por defecto 30 días y la última fecha de alquiler registrada, no la fecha actual.',
    parameters: { type: 'object', properties: {
      inactive_days: { type: 'integer', description: 'Umbral inclusivo de días sin alquilar. Por defecto 30.' },
      limit: { type: 'integer', description: 'Clientes a mostrar, máximo 50. Por defecto 10.' },
      store_id: { type: 'integer', description: 'Opcional: tienda de registro del cliente, 1 o 2.' },
    }, additionalProperties: false },
  } },
  { type: 'function', function: {
    name: 'weekday_analysis',
    description: 'Analiza alquileres (movimiento) e ingresos por día de la semana, por tienda y en total, usando todo el período disponible. Promedio principal por día calendario incluyendo ceros; también devuelve promedio en días con pagos. Los pagos se agrupan por su fecha real, sin multiplicarlos por joins.',
    parameters: { type: 'object', properties: {}, additionalProperties: false },
  } },
];

function integer(value, fallback, min, max) {
  if (value === undefined) return fallback;
  if (!Number.isInteger(value) || value < min || value > max) throw new Error('INVALID_TOOL_ARGUMENTS');
  return value;
}

function createSakila(config = {}) {
  const pool = mysql.createPool({
    host: process.env.DB_HOST || '127.0.0.1', port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'sakila_agent', password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'sakila', connectionLimit: 3,
    dateStrings: true, decimalNumbers: true, multipleStatements: false,
    connectTimeout: 5000, ...config,
  });
  async function query(sql, values = []) {
    const [rows] = await pool.query({ sql, values, timeout: 10000 });
    return rows;
  }
  return {
    async execute(name, args = {}) {
      if (!args || typeof args !== 'object' || Array.isArray(args)) throw new Error('INVALID_TOOL_ARGUMENTS');
      const store = args.store_id === undefined ? null : integer(args.store_id, null, 1, 2);
      if (name === 'recommend_movies') {
        const category = args.category === undefined ? 'Action' : args.category;
        if (typeof category !== 'string' || category.length > 25) throw new Error('INVALID_TOOL_ARGUMENTS');
        const minutes = integer(args.min_minutes, 120, 0, 300);
        const limit = integer(args.limit, 3, 1, 10);
        const rows = await query(QUERIES.recommendations, [category, minutes, store, store, limit]);
        return { category, duration_strictly_greater_than: minutes, store: store || 'Todas', ranking: 'Alquileres históricos, no disponibilidad actual', rows };
      }
      if (name === 'customers_at_risk') {
        const days = integer(args.inactive_days, 30, 1, 3650);
        const limit = integer(args.limit, 10, 1, 50);
        const summary = await query(`${QUERIES.riskBase}
          SELECT MAX(reference_date) AS reference_date, COUNT(*) AS active_customers,
            SUM(CASE WHEN days_inactive >= ? OR last_rental_date IS NULL THEN 1 ELSE 0 END) AS customers_at_risk
          FROM activity`, [store, store, days]);
        const rows = await query(`${QUERIES.riskBase}
          SELECT * FROM activity WHERE days_inactive >= ? OR last_rental_date IS NULL
          ORDER BY last_rental_date IS NOT NULL, days_inactive DESC, customer_id ASC LIMIT ?`, [store, store, days, limit]);
        return { ...summary[0], inactive_days_threshold: days, criterion: 'Solo clientes activos. Inactividad >= umbral o sin alquileres. Señal descriptiva, no probabilidad de abandono.', store: store || 'Todas', rows };
      }
      if (name === 'weekday_analysis') {
        const names = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
        const rows = (await query(QUERIES.weekdays)).map(row => ({ ...row, weekday: names[row.weekday_number] }));
        const overall = rows.filter(row => row.store_id === 0);
        return { period_start: rows[0]?.period_start, period_end: rows[0]?.period_end,
          average_definition: 'Importe total / número de fechas de ese día de la semana en TODO el período, incluyendo fechas sin pagos. Importes en unidades monetarias de Sakila, sin asumir divisa.',
          movement_definition: 'Número de alquileres, no devoluciones ni visitas. Los datos son discontinuos: compara también alquileres / días con alquileres antes de concluir qué día suele estar más concurrido.',
          rows: rows.filter(row => row.store_id !== 0), overall };
      }
      throw new Error('UNKNOWN_TOOL');
    },
    close: () => pool.end(),
  };
}

module.exports = { createSakila, TOOLS, QUERIES };
