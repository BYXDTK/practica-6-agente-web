# Práctica 6: Integrar un agente en aplicativo web

La tarea **Agente BD** está implementada sobre este chat. Consulta la [entrega con las tres respuestas](ENTREGA-AGENTE-BD.md), las [conversaciones reales del agente](docs/conversaciones-agente-bd.md) y las [consultas SQL](sql/consultas-agente-bd.sql).

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

## Agente BD: conexión con Sakila

El agente usa herramientas para consultar películas, clientes con inactividad y movimiento semanal. OpenRouter elige la herramienta, el servidor ejecuta SQL fijo y parametrizado en MySQL y devuelve los resultados al modelo para redactar la respuesta. La información metodológica se agrega directamente desde los resultados para conservar los criterios y denominadores.

El frontend sigue siendo el de la práctica original. Escribe en el chat las tres preguntas de [la entrega](ENTREGA-AGENTE-BD.md).

### Configuración en otra computadora

1. Instala las dependencias con `npm install` y prepara `ai-backend/.env` como se explicó arriba.
2. Inicia MySQL/MariaDB. Si usas XAMPP, inicia su módulo MySQL.
3. Si aún no existe, instala la [base de ejemplo Sakila de MySQL](https://dev.mysql.com/doc/sakila/en/sakila-installation.html). No importes el esquema sobre una base existente con datos que quieras conservar.
4. Con una cuenta administradora, crea un usuario exclusivo de lectura. Puedes adaptar este SQL en tu cliente MySQL; reemplaza la contraseña de ejemplo:

```sql
CREATE USER 'sakila_agent'@'127.0.0.1' IDENTIFIED BY 'reemplaza_esta_contrasena';
GRANT SELECT ON sakila.* TO 'sakila_agent'@'127.0.0.1';
```

5. Configura en `ai-backend/.env`:

```dotenv
DB_ENABLED=true
DB_HOST=127.0.0.1
DB_PORT=3306
DB_NAME=sakila
DB_USER=sakila_agent
DB_PASSWORD=reemplaza_esta_contrasena
```

En esta computadora ya se configuró un usuario de lectura con credenciales exclusivas en el `.env` privado. La plantilla no incluye ninguna contraseña real.

6. Reinicia el backend con `npm start` y abre http://localhost:3000. `DB_ENABLED=false` permite usar el chat general de la práctica original sin conectar la base.

### Verificar la tarea

```powershell
node --test
$env:SAKILA_TEST='1'
node --test test/sakila.test.js
node scripts/comprobar-agente-bd.js
```

La segunda ejecución comprueba la base real, conciliación de totales, consultas parametrizadas y rechazo de escrituras. La última ejecuta las tres preguntas contra el agente con OpenRouter real y regenera las conversaciones y evidencia JSON dentro de `docs/`; requiere conexión y consume la API configurada. Los resultados de la entrega son una captura de la Sakila local y pueden variar si cambias sus datos.

### Criterios del análisis

- Popularidad: número de alquileres históricos. Acción corresponde a `Action` y más de dos horas significa `length > 120`. Por defecto se suman todas las tiendas; puede pedirse tienda 1 o 2.
- Inactividad: clientes activos con al menos 30 días sin alquilar o sin alquileres. Se usa `MAX(rental.rental_date)` como referencia histórica; no se confunde una base antigua con abandono actual. Es una señal descriptiva, no un modelo predictivo.
- Movimiento: número de alquileres, por la tienda del inventario. Los ingresos se calculan por la fecha de cada pago y su tienda de alquiler; si un pago no tiene alquiler se usa la tienda del empleado. Ambas agregaciones se hacen por separado para evitar duplicar importes.
- Promedio calendario: ingreso dividido por todas las fechas de ese día de semana entre el primer y el último registro, con cero en fechas sin pagos registrados. También se muestra el promedio solo en días con pagos y el promedio de alquileres en días con alquileres, porque los registros de Sakila son discontinuos.
- Los importes se expresan en unidades monetarias; la base no especifica la divisa.

Referencias técnicas: [estructura de Sakila](https://dev.mysql.com/doc/sakila/en/sakila-structure-tables.html) y [herramientas en OpenRouter](https://openrouter.ai/docs/guides/features/tool-calling).
