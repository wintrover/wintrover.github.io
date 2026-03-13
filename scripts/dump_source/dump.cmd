@echo off
setlocal
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0dump_sources.ps1" %*
endlocal
