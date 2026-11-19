# Agente BD: respuestas de la tarea

Resultados obtenidos al conectar el agente de IA con la base `sakila` instalada en XAMPP. Se consultaron los datos locales reales, sin modificar los registros. Se consideran ambas tiendas cuando la pregunta no indica una tienda concreta.

## 1. Películas de acción largas y populares

> Recomiéndame 3 películas de acción que sean largas (más de 2 horas) pero que la gente alquile muy seguido en la tienda.

Se recomienda este orden, según el número de alquileres históricos de películas de categoría `Action` con duración estrictamente mayor a 120 minutos:

| Película | Duración | Alquileres |
| --- | ---: | ---: |
| STORY SIDE | 163 min | 28 |
| EASY GLADIATOR | 148 min | 23 |
| FOOL MOCKINGBIRD | 158 min | 23 |

Las películas empatadas se ordenan por título. Popularidad histórica no implica disponibilidad actual de una copia.

## 2. Clientes con mayor inactividad

> ¿Qué clientes crees que están a punto de dejar el servicio porque llevan mucho tiempo sin alquilar ninguna película?

Conviene revisar a estos clientes activos por su inactividad. La fecha de referencia es **2006-02-14**, última fecha de alquiler registrada. El umbral utilizado es **30 días o más sin alquilar**, incluyendo clientes sin alquileres registrados. **430 de 584 clientes activos (73.63 %) cumplen el criterio**. Se muestran los diez primeros por mayor inactividad; los empates se ordenan por ID.

| ID | Cliente | Tienda de registro | Último alquiler | Días sin alquilar |
| ---: | --- | ---: | --- | ---: |
| 428 | HERBERT KRUGER | 2 | 2005-08-17 | 181 |
| 326 | JOSE ANDREW | 1 | 2005-08-19 | 179 |
| 483 | VERNON CHAPA | 2 | 2005-08-19 | 179 |
| 485 | CLYDE TOBIAS | 1 | 2005-08-19 | 179 |
| 498 | GENE SANBORN | 1 | 2005-08-19 | 179 |
| 573 | BYRON BOX | 1 | 2005-08-19 | 179 |
| 18 | CAROL GARCIA | 2 | 2005-08-20 | 178 |
| 85 | ANNE POWELL | 2 | 2005-08-20 | 178 |
| 164 | JOANN GARDNER | 2 | 2005-08-20 | 178 |
| 183 | IDA ANDREWS | 2 | 2005-08-20 | 178 |

**Interpretación:** son candidatos a seguimiento, no clientes de los que pueda afirmarse que van a abandonar. Este criterio no calcula una probabilidad de abandono. Sakila contiene datos históricos y períodos sin registros; usar la fecha actual clasificaría engañosamente a casi todos como inactivos. No se enviaron mensajes a ningún cliente.

## 3. Movimiento e ingresos por día de semana

> Hazme un análisis rápido de qué día de la semana hay más movimiento en las tiendas y cuánto dinero promedio se recauda en esos días.

Período analizado: **2005-05-24 a 2006-02-14**. Movimiento significa número de alquileres; los importes son **unidades monetarias**, ya que Sakila no especifica divisa.

**Por volumen acumulado, el martes es el día con más movimiento en ambas tiendas:**

| Tienda | Día | Alquileres acumulados | Ingreso total ese día de semana | Promedio por fecha calendario | Promedio por fecha con pagos |
| --- | --- | ---: | ---: | ---: | ---: |
| 1 | Martes | 1222 | 5093.80 | 130.61 | 463.07 |
| 2 | Martes | 1241 | 5123.57 | 131.37 | 465.78 |
| Ambas | Martes | 2463 | 10217.37 | 261.98 | 928.85 |

En conjunto, el martes suma **2,463 alquileres** y **10,217.37** de ingresos: **261.98 por martes calendario** (10,217.37 / 39 martes) o **928.85 por martes con pagos registrados** (10,217.37 / 11 fechas). Son promedios distintos y no deben intercambiarse.

**Por actividad promedio en las fechas que sí tienen alquileres, gana el domingo:** **464.00 alquileres por domingo con actividad** entre ambas tiendas (2,320 / 5), frente a 223.91 por martes con actividad (2,463 / 11). En tienda 1 el domingo registra 230.80 alquileres y 984.89 de ingreso medio por fecha con pagos; en tienda 2, 233.20 alquileres y 964.27 de ingreso medio. El ingreso conjunto por domingo con pagos es 1,949.16.

El **sábado** presenta el ingreso medio conjunto más alto si se consideran solo fechas con pagos: **1,986.18**. Por ello, el mayor volumen acumulado, la actividad típica observada y el mayor ingreso medio no tienen por qué coincidir.

### Comparación conjunta de toda la semana

| Día | Alquileres acumulados | Fechas con alquileres | Alquileres por fecha con actividad | Ingreso medio por fecha con pagos | Ingreso medio por fecha calendario |
| --- | ---: | ---: | ---: | ---: | ---: |
| Lunes | 2247 | 5 | 449.40 | 1869.11 | 245.94 |
| Martes | 2463 | 11 | 223.91 | 928.85 | 261.98 |
| Miércoles | 2231 | 5 | 446.20 | 1853.14 | 243.83 |
| Jueves | 2200 | 5 | 440.00 | 1867.20 | 245.68 |
| Viernes | 2272 | 5 | 454.40 | 1913.06 | 251.72 |
| Sábado | 2311 | 5 | 462.20 | 1986.18 | 261.34 |
| Domingo | 2320 | 5 | 464.00 | 1949.16 | 256.47 |

**Cómo se calcularon los promedios:** el promedio calendario divide el ingreso total de cada día de semana entre todas sus apariciones en el período completo: 39 martes y 38 de cada uno de los demás días. Se cuentan como cero las fechas sin pagos registrados. El promedio por fecha con pagos divide entre las fechas de ese día de semana que efectivamente tienen pagos: 11 martes y 5 de cada uno de los demás días. Que falten registros no demuestra que la tienda estuviera cerrada ni que sus ingresos reales fueran cero.

Los alquileres y pagos se agregaron por separado, antes de combinarse por tienda y fecha, para evitar duplicaciones. Se comprobó que los totales semanales coinciden con los totales originales de `rental` y `payment`.

## Evidencia y reproducción

- [Conversaciones del agente con las tres preguntas](docs/conversaciones-agente-bd.md).
- [Resultados de las herramientas y respuestas de OpenRouter](docs/agente-bd-evidencia.json).
- [Consultas SQL equivalentes](sql/consultas-agente-bd.sql).
- [Configuración e instrucciones para iniciar](README.md#agente-bd-conexión-con-sakila).

El agente elige herramientas de consulta parametrizadas y recibe sus resultados reales para responder. El usuario de base de datos tiene únicamente permiso `SELECT`. Para repetir la comprobación: `node scripts/comprobar-agente-bd.js`.
