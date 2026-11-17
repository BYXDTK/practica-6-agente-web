@echo off
setlocal
cd /d "%~dp0"
set "AGENTE_NODE=node"
where node >nul 2>nul
if not errorlevel 1 goto launch
set "AGENTE_NODE=%USERPROFILE%\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe"
if exist "%AGENTE_NODE%" goto launch
echo Instala Node.js 20 o posterior desde https://nodejs.org
pause
exit /b 1
:launch
if exist "node_modules\express\package.json" goto run
echo Faltan dependencias. Ejecuta npm install en esta carpeta.
pause
exit /b 1
:run
echo Abre http://localhost:3000 en tu navegador.
echo Para detener el servidor, presiona Ctrl+C.
"%AGENTE_NODE%" ai-backend/server.js
pause
