@echo off
rem Doble clic: carga los manuales MIR en la app y genera las tarjetas (ver README).
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\windows\preparar-manuales.ps1"
