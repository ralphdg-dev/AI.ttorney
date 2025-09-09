@echo off
REM AI.ttorney Redis Setup Script for Windows
REM This script sets up Redis for development on Windows

setlocal enabledelayedexpansion

REM Configuration
set REDIS_PORT=6379
set DOCKER_COMPOSE_FILE=docker-compose.redis.yml
set REDIS_CONFIG_FILE=redis.conf

echo ====================================
echo    AI.ttorney Redis Setup (Windows)
echo ====================================
echo.

REM Parse command line arguments
set SETUP_TYPE=
if "%1"=="--docker" set SETUP_TYPE=docker
if "%1"=="--native" set SETUP_TYPE=native
if "%1"=="--config" set SETUP_TYPE=config
if "%1"=="--test" set SETUP_TYPE=test
if "%1"=="--help" goto :show_usage

REM If no argument provided, show menu
if "%SETUP_TYPE%"=="" (
    echo Choose Redis setup method:
    echo 1) Docker recommended for cross-platform
    echo 2) Native installation try Chocolatey/Scoop
    echo 3) Configuration files only
    echo 4) Test existing installation
    set /p choice="Enter choice (1-4): "
    
    if "!choice!"=="1" set SETUP_TYPE=docker
    if "!choice!"=="2" set SETUP_TYPE=native
    if "!choice!"=="3" set SETUP_TYPE=config
    if "!choice!"=="4" set SETUP_TYPE=test
    
    if "!SETUP_TYPE!"=="" (
        echo [ERROR] Invalid choice
        pause
        exit /b 1
    )
)

REM Execute based on setup type
if "%SETUP_TYPE%"=="docker" goto :setup_docker
if "%SETUP_TYPE%"=="native" goto :setup_native
if "%SETUP_TYPE%"=="config" goto :setup_config
if "%SETUP_TYPE%"=="test" goto :test_redis

:setup_docker
echo [INFO] Setting up Redis with Docker...

REM Check if Docker is available
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Docker not found. Please install Docker Desktop first.
    echo Download from: https://www.docker.com/products/docker-desktop
    echo.
    echo Falling back to native installation...
    goto :setup_native
)

call :create_redis_config
call :create_docker_compose

echo [INFO] Starting Redis with Docker...
docker-compose -f %DOCKER_COMPOSE_FILE% up -d

REM Wait for Redis to start
echo [INFO] Waiting for Redis to start...
timeout /t 5 /nobreak >nul

call :test_redis_connection
goto :success

:setup_native
echo [INFO] Setting up Redis natively on Windows...

REM Check for Chocolatey
choco --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Installing Redis via Chocolatey...
    choco install redis-64 -y
    if %errorlevel% equ 0 (
        echo [SUCCESS] Redis installed via Chocolatey
        call :create_redis_config
        call :start_redis_native
        call :test_redis_connection
        goto :success
    ) else (
        echo [ERROR] Failed to install Redis via Chocolatey
    )
)

REM Check for Scoop
scoop --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Installing Redis via Scoop...
    scoop install redis
    if %errorlevel% equ 0 (
        echo [SUCCESS] Redis installed via Scoop
        call :create_redis_config
        call :start_redis_native
        call :test_redis_connection
        goto :success
    ) else (
        echo [ERROR] Failed to install Redis via Scoop
    )
)

REM Check for existing Redis installation
redis-server --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [INFO] Redis already installed, using existing installation
    call :create_redis_config
    call :start_redis_native
    call :test_redis_connection
    goto :success
)

echo [WARNING] No package manager found and Redis not installed
echo [INFO] Please install one of the following:
echo   - Chocolatey: https://chocolatey.org/install
echo   - Scoop: https://scoop.sh/
echo   - Docker Desktop: https://www.docker.com/products/docker-desktop
echo.
echo [INFO] Falling back to Docker setup...
goto :setup_docker

:setup_config
echo [INFO] Creating configuration files only...
call :create_redis_config
call :create_docker_compose
echo [SUCCESS] Configuration files created successfully
goto :success

:test_redis
echo [INFO] Testing existing Redis installation...
call :test_redis_connection
goto :success

:create_docker_compose
echo [INFO] Creating Docker Compose file...
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
goto :eof

:start_redis_native
echo [INFO] Starting Redis server...
start /B redis-server %REDIS_CONFIG_FILE%
timeout /t 3 /nobreak >nul
goto :eof

:test_redis_connection
echo [INFO] Testing Redis connection...

REM Try Docker Redis first
docker exec ai-ttorney-redis redis-cli ping >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Redis Docker is running and responding to ping
    
    REM Test basic operations
    docker exec ai-ttorney-redis redis-cli set test_key "AI.ttorney Redis Setup" >nul
    for /f "delims=" %%i in ('docker exec ai-ttorney-redis redis-cli get test_key 2^>nul') do set test_value=%%i
    
    if "!test_value!"=="AI.ttorney Redis Setup" (
        echo [SUCCESS] Redis read/write operations working correctly
        docker exec ai-ttorney-redis redis-cli del test_key >nul
    ) else (
        echo [WARNING] Redis ping successful but read/write test failed
    )
    goto :eof
)

REM Try native Redis
redis-cli ping >nul 2>&1
if %errorlevel% equ 0 (
    echo [SUCCESS] Redis native is running and responding to ping
    
    REM Test basic operations
    redis-cli set test_key "AI.ttorney Redis Setup" >nul
    for /f "delims=" %%i in ('redis-cli get test_key 2^>nul') do set test_value=%%i
    
    if "!test_value!"=="AI.ttorney Redis Setup" (
        echo [SUCCESS] Redis read/write operations working correctly
        redis-cli del test_key >nul
    ) else (
        echo [WARNING] Redis ping successful but read/write test failed
    )
    goto :eof
)

echo [ERROR] Redis is not responding. Please check the installation.
goto :eof

:success
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
if "%SETUP_TYPE%"=="docker" (
    echo To stop Redis:
    echo   docker-compose -f %DOCKER_COMPOSE_FILE% down
)
echo.
pause
goto :eof

:show_usage
echo Usage: %0 [OPTIONS]
echo.
echo Options:
echo   --docker     Use Docker setup recommended for cross-platform
echo   --native     Install Redis natively on the system
echo   --config     Only create configuration files
echo   --test       Test existing Redis installation
echo   --help       Show this help message
echo.
echo Examples:
echo   %0 --docker    # Setup Redis with Docker
echo   %0 --native    # Install Redis natively
echo   %0 --test      # Test Redis connection
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
