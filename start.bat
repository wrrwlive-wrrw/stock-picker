@echo off
chcp 65001 >nul
title 智能选股指导系统
echo ========================================
echo   智能选股指导系统 - 本地服务器
echo ========================================
echo.
cd /d "%~dp0"
echo 正在启动本地服务器...
echo 请在浏览器中访问: http://localhost:8888
echo.
echo 按 Ctrl+C 可停止服务器
echo ========================================
start "" "http://localhost:8888/index.html"
python -m http.server 8888
pause
