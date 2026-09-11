@echo off
cd /d "%~dp0"
echo Starting EveryList...
echo.
echo Open http://localhost:4173 in your browser.
echo Keep this window open while you use the app.
echo.
"C:\Program Files\nodejs\node.exe" server.js
pause
