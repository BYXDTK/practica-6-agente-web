-- Consultas equivalentes a las herramientas del agente. Solo lectura.
USE sakila;

-- 1. Acción, más de 120 minutos, tres películas más alquiladas.
SELECT f.film_id, f.title, f.length AS duration_minutes,
      COUNT(r.rental_id) AS rental_count, COUNT(DISTINCT i.inventory_id) AS copies
    FROM film f
    JOIN film_category fc ON fc.film_id = f.film_id
    JOIN category c ON c.category_id = fc.category_id
    JOIN inventory i ON i.film_id = f.film_id
    LEFT JOIN rental r ON r.inventory_id = i.inventory_id
    WHERE c.name = 'Action' AND f.length > 120 AND (NULL IS NULL OR i.store_id = NULL)
    GROUP BY f.film_id, f.title, f.length
    ORDER BY rental_count DESC, f.title ASC LIMIT 3;

-- 2. Clientes activos con 30 días o más de inactividad histórica.
WITH reference AS (SELECT DATE(MAX(rental_date)) AS reference_date FROM rental),
    activity AS (
      SELECT c.customer_id, c.first_name, c.last_name, c.store_id,
        DATE(MAX(r.rental_date)) AS last_rental_date, COUNT(r.rental_id) AS rental_count,
        reference.reference_date,
        DATEDIFF(reference.reference_date, DATE(MAX(r.rental_date))) AS days_inactive
      FROM customer c CROSS JOIN reference
      LEFT JOIN rental r ON r.customer_id = c.customer_id
      WHERE c.active = 1 AND (NULL IS NULL OR c.store_id = NULL)
      GROUP BY c.customer_id, c.first_name, c.last_name, c.store_id, reference.reference_date
    )
SELECT * FROM activity WHERE days_inactive >= 30 OR last_rental_date IS NULL
ORDER BY last_rental_date IS NOT NULL, days_inactive DESC, customer_id ASC LIMIT 10;

-- 3. Alquileres e ingresos agregados por separado, calendario completo.
-- store_id = 0 representa el total de todas las tiendas.
WITH RECURSIVE bounds AS (
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
    ORDER BY s.store_id, total_rentals DESC, weekday_number;
