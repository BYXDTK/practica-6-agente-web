# Agente BD: conversaciones verificadas

Respuestas del agente conectado a OpenRouter y a Sakila local. Cada pregunta se ejecutó de forma independiente. Las herramientas y sus resultados completos están en [la evidencia JSON](agente-bd-evidencia.json).

## Pregunta 1

Recomiéndame 3 películas de acción que sean largas (más de 2 horas) pero que la gente alquile muy seguido en la tienda.

Herramientas ejecutadas: `recommend_movies`.

Aquí tienes 3 películas de acción que son largas (más de 2 horas) y que la gente alquila con frecuencia en la tienda:

1. **STORY SIDE**  
   - Duración: 163 minutos  
   - Veces alquilada: 28  

2. **EASY GLADIATOR**  
   - Duración: 148 minutos  
   - Veces alquilada: 23  

3. **FOOL MOCKINGBIRD**  
   - Duración: 158 minutos  
   - Veces alquilada: 23  

¡Espero que disfrutes alguna de ellas!

Base de la consulta:
Popularidad = alquileres históricos. Tienda: Todas. Duración estrictamente mayor a 120 minutos. No implica disponibilidad actual.

## Pregunta 2

¿Qué clientes crees que están a punto de dejar el servicio porque llevan mucho tiempo sin alquilar ninguna película?

Herramientas ejecutadas: `customers_at_risk`.

He encontrado información sobre varios clientes que están en riesgo de inactividad, es decir, que no han alquilado ninguna película durante más de 30 días. A continuación, te muestro algunos de ellos:

1. **HERBERT KRUGER** (Tienda 2)
   - Último alquiler: 17 de agosto de 2005
   - Días inactivos: 181
   - Total de alquileres: 20

2. **JOSE ANDREW** (Tienda 1)
   - Último alquiler: 19 de agosto de 2005
   - Días inactivos: 179
   - Total de alquileres: 25

3. **VERNON CHAPA** (Tienda 2)
   - Último alquiler: 19 de agosto de 2005
   - Días inactivos: 179
   - Total de alquileres: 18

4. **CLYDE TOBIAS** (Tienda 1)
   - Último alquiler: 19 de agosto de 2005
   - Días inactivos: 179
   - Total de alquileres: 29

5. **GENE SANBORN** (Tienda 1)
   - Último alquiler: 19 de agosto de 2005
   - Días inactivos: 179
   - Total de alquileres: 27

6. **BYRON BOX** (Tienda 1)
   - Último alquiler: 19 de agosto de 2005
   - Días inactivos: 179
   - Total de alquileres: 29

7. **CAROL GARCIA** (Tienda 2)
   - Último alquiler: 20 de agosto de 2005
   - Días inactivos: 178
   - Total de alquileres: 22

8. **ANNE POWELL** (Tienda 2)
   - Último alquiler: 20 de agosto de 2005
   - Días inactivos: 178
   - Total de alquileres: 23

9. **JOANN GARDNER** (Tienda 2)
   - Último alquiler: 20 de agosto de 2005
   - Días inactivos: 178
   - Total de alquileres: 16

10. **IDA ANDREWS** (Tienda 2)
    - Último alquiler: 20 de agosto de 2005
    - Días inactivos: 178
    - Total de alquileres: 23

Recuerda que estar en riesgo de inactividad es solo una señal descriptiva y no garantiza que abandonarán el servicio.

Base de la consulta:
Fecha de referencia: 2006-02-14; umbral: 30 días o más sin alquilar, o sin alquileres registrados. 430 de 584 clientes activos cumplen el criterio. Es una señal descriptiva de inactividad, no una predicción ni certeza de abandono. Sakila tiene datos históricos discontinuos.

## Pregunta 3

Hazme un análisis rápido de qué día de la semana hay más movimiento en las tiendas y cuánto dinero promedio se recauda en esos días.

Herramientas ejecutadas: `weekday_analysis`.

El análisis del movimiento semanal en las tiendas revela lo siguiente:

### Día con mayor movimiento:
- **Martes**: 
  - Total de alquileres: 2463
  - Ingresos totales: 10,217.37
  - Promedio de ingresos por día: 261.98

### Comparativa de ingresos promedio por día calendario para cada día de la semana:
- **Martes**: 261.98
- **Domingo**: 256.47
- **Sábado**: 261.34
- **Viernes**: 251.72
- **Lunes**: 245.94
- **Miércoles**: 243.83
- **Jueves**: 245.68

### Resumen:
El **martes** se destaca como el día con mayor movimiento en términos de alquileres y ingresos, con un promedio notable de **261.98** en la recaudación. Los días cercanos como sábado y domingo también muestran buenos ingresos promedio, pero ningún otro día supera al martes en términos de volumen de movimiento y recaudación.

Si tienes alguna otra pregunta o necesitas más detalles, ¡estaré encantado de ayudarte!

Base de la consulta:
Período: 2005-05-24 a 2006-02-14. Movimiento = número de alquileres. Importes en unidades monetarias; Sakila no especifica divisa.
Mayor total conjunto: martes, 2463 alquileres. Ingreso medio 261.98 = 10217.37 / 39 días calendario; 928.85 considerando solo sus 11 fechas con pagos.
Mayor movimiento promedio en días con actividad: domingo, 464.00 alquileres por fecha con alquileres. La muestra es discontinua: las fechas sin registros se cuentan como cero únicamente para el promedio calendario; eso no demuestra que la tienda estuviera cerrada.
Tienda 1: mayor total el martes (1222 alquileres); ingreso promedio 130.61 por día calendario y 463.07 por día con pagos. Mayor promedio por día con alquileres: domingo, 230.80 alquileres e ingreso medio 984.89 por día con pagos.
Tienda 2: mayor total el martes (1241 alquileres); ingreso promedio 131.37 por día calendario y 465.78 por día con pagos. Mayor promedio por día con alquileres: domingo, 233.20 alquileres e ingreso medio 964.27 por día con pagos.
