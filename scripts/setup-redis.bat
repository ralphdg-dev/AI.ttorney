@echo off
REM AI.ttorney Redis Setup Script for Windows
REM This script sets up Redis for development on Windows

setlocal enabledelayedexpansion

REM Configuration
set REDIS_PORT=6379
set DOCKER_COMPOSE_FILE=docker-compose.redis.yml

echo ====================================
echo    AI.ttorney Redis Setup (Windows)
echo ====================================
echo.

REM Check if Docker is available
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker not found. Please install Docker Desktop first.
    echo Download from: https://www.docker.com/products/docker-desktop
    pause
    exit /b 1
)

echo [INFO] Docker found. Setting up Redis with Docker...

REM Create Docker Compose file
(
echo version: '3.8'
echo.
echo services:
echo   redis:
echo     image: redis:7-alpine
echo     container_name: ai-ttorney-redis
echo     ports:
echo       - "6379:6379"
echo     volumes:
echo       - redis_data:/data
echo       - ./redis.conf:/usr/local/etc/redis/redis.conf
echo     command: redis-server /usr/local/etc/redis/redis.conf
echo     restart: unless-stopped
echo     healthcheck:
echo       test: ["CMD", "redis-cli", "ping"]
echo       interval: 10s
echo       timeout: 3s
echo       retries: 3
echo.
echo volumes:
echo   redis_data:
echo     driver: local
) > %DOCKER_COMPOSE_FILE%

echo [SUCCESS] Docker Compose file created: %DOCKER_COMPOSE_FILE%

REM Create Redis configuration
call :create_redis_config

echo [INFO] Starting Redis with Docker...
docker-compose -f %DOCKER_COMPOSE_FILE% up -d

REM Wait for Redis to start
echo [INFO] Waiting for Redis to start...
timeout /t 5 /nobreak >nul

REM Test Redis connection
echo [INFO] Testing Redis connection...
docker exec ai-ttorney-redis redis-cli ping >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Redis is running and responding to ping
    
    REM Test basic operations
    docker exec ai-ttorney-redis redis-cli set test_key "AI.ttorney Redis Setup" >nul
    for /f "delims=" %%i in ('docker exec ai-ttorney-redis redis-cli get test_key') do set test_value=%%i
    
    if "!test_value!"=="AI.ttorney Redis Setup" (
        echo [SUCCESS] Redis read/write operations working correctly
        docker exec ai-ttorney-redis redis-cli del test_key >nul
    ) else (
        echo [WARNING] Redis ping successful but read/write test failed
    )
) else (
    echo [ERROR] Redis is not responding. Please check the installation.
    pause
    exit /b 1
)

echo.
echo [SUCCESS] Redis setup completed successfully!
echo.
echo Redis Connection Information:
echo   Host: localhost
echo   Port: 6379
echo   URL: redis://localhost:6379
echo.
echo For your .env file, add:
echo   REDIS_URL=redis://localhost:6379
echo.
echo To stop Redis:
echo   docker-compose -f %DOCKER_COMPOSE_FILE% down
echo.
pause
goto :eof

:create_redis_config
echo [INFO] Creating Redis configuration file...
(
echo # AI.ttorney Redis Configuration for Development
echo.
echo # Network
echo bind 127.0.0.1
echo port 6379
echo timeout 0
echo tcp-keepalive 300
echo.
echo # General
echo daemonize no
echo supervised no
echo pidfile /var/run/redis_6379.pid
echo loglevel notice
echo logfile ""
echo databases 16
echo.
echo # Snapshotting
echo save 900 1
echo save 300 10
echo save 60 10000
echo stop-writes-on-bgsave-error yes
echo rdbcompression yes
echo rdbchecksum yes
echo dbfilename dump.rdb
echo dir ./
echo.
echo # Security
echo # requirepass your_password_here  # Uncomment and set password for production
echo.
echo # Memory Management
echo maxmemory-policy allkeys-lru
echo maxmemory 256mb
echo.
echo # Append Only File
echo appendonly yes
echo appendfilename "appendonly.aof"
echo appendfsync everysec
echo no-appendfsync-on-rewrite no
echo auto-aof-rewrite-percentage 100
echo auto-aof-rewrite-min-size 64mb
echo.
echo # Slow Log
echo slowlog-log-slower-than 10000
echo slowlog-max-len 128
echo.
echo # Client Output Buffer Limits
echo client-output-buffer-limit normal 0 0 0
echo client-output-buffer-limit replica 256mb 64mb 60
echo client-output-buffer-limit pubsub 32mb 8mb 60
) > redis.conf

echo [SUCCESS] Redis configuration file created: redis.conf
goto :eof
