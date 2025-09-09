# AI.ttorney Redis Setup Script for Windows PowerShell
# This script sets up Redis for development on Windows using PowerShell

param(
    [switch]$Docker,
    [switch]$Native,
    [switch]$Config,
    [switch]$Test,
    [switch]$Help
)

# Configuration
$RedisPort = 6379
$DockerComposeFile = "docker-compose.redis.yml"
$RedisConfigFile = "redis.conf"

function Write-Header {
    Write-Host "====================================" -ForegroundColor Blue
    Write-Host "   AI.ttorney Redis Setup (PowerShell)" -ForegroundColor Blue
    Write-Host "====================================" -ForegroundColor Blue
    Write-Host ""
}

function Write-Success {
    param($Message)
    Write-Host "✅ $Message" -ForegroundColor Green
}

function Write-Warning {
    param($Message)
    Write-Host "⚠️  $Message" -ForegroundColor Yellow
}

function Write-Error {
    param($Message)
    Write-Host "❌ $Message" -ForegroundColor Red
}

function Write-Info {
    param($Message)
    Write-Host "ℹ️  $Message" -ForegroundColor Blue
}

function Test-Command {
    param($CommandName)
    try {
        Get-Command $CommandName -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Install-RedisNative {
    Write-Info "Installing Redis natively on Windows..."
    
    if (Test-Command "choco") {
        Write-Info "Installing Redis via Chocolatey..."
        choco install redis-64 -y
        Write-Success "Redis installed via Chocolatey"
    }
    elseif (Test-Command "scoop") {
        Write-Info "Installing Redis via Scoop..."
        scoop install redis
        Write-Success "Redis installed via Scoop"
    }
    else {
        Write-Warning "No package manager found (Chocolatey or Scoop)"
        Write-Info "Please install Redis manually or use Docker setup"
        Write-Info "Chocolatey: https://chocolatey.org/install"
        Write-Info "Scoop: https://scoop.sh/"
        return $false
    }
    return $true
}

function Setup-DockerRedis {
    Write-Info "Setting up Redis with Docker..."
    
    if (-not (Test-Command "docker")) {
        Write-Error "Docker not found. Please install Docker Desktop first."
        Write-Info "Download from: https://www.docker.com/products/docker-desktop"
        return $false
    }
    
    # Create Docker Compose file
    $dockerComposeContent = @"
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    container_name: ai-ttorney-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
      - ./redis.conf:/usr/local/etc/redis/redis.conf
    command: redis-server /usr/local/etc/redis/redis.conf
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 3

volumes:
  redis_data:
    driver: local
"@
    
    $dockerComposeContent | Out-File -FilePath $DockerComposeFile -Encoding UTF8
    Write-Success "Docker Compose file created: $DockerComposeFile"
    return $true
}

function Create-RedisConfig {
    Write-Info "Creating Redis configuration file..."
    
    $redisConfigContent = @"
# AI.ttorney Redis Configuration for Development

# Network
bind 127.0.0.1
port 6379
timeout 0
tcp-keepalive 300

# General
daemonize no
supervised no
pidfile /var/run/redis_6379.pid
loglevel notice
logfile ""
databases 16

# Snapshotting
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir ./

# Security
# requirepass your_password_here  # Uncomment and set password for production

# Memory Management
maxmemory-policy allkeys-lru
maxmemory 256mb

# Append Only File
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Slow Log
slowlog-log-slower-than 10000
slowlog-max-len 128

# Client Output Buffer Limits
client-output-buffer-limit normal 0 0 0
client-output-buffer-limit replica 256mb 64mb 60
client-output-buffer-limit pubsub 32mb 8mb 60
"@
    
    $redisConfigContent | Out-File -FilePath $RedisConfigFile -Encoding UTF8
    Write-Success "Redis configuration file created: $RedisConfigFile"
}

function Test-RedisConnection {
    Write-Info "Testing Redis connection..."
    
    # Wait a moment for Redis to start
    Start-Sleep -Seconds 2
    
    try {
        if (Test-Command "redis-cli") {
            $pingResult = redis-cli ping 2>$null
            if ($pingResult -eq "PONG") {
                Write-Success "Redis is running and responding to ping"
                
                # Test basic operations
                redis-cli set test_key "AI.ttorney Redis Setup" | Out-Null
                $testValue = redis-cli get test_key
                
                if ($testValue -eq "AI.ttorney Redis Setup") {
                    Write-Success "Redis read/write operations working correctly"
                    redis-cli del test_key | Out-Null
                }
                else {
                    Write-Warning "Redis ping successful but read/write test failed"
                }
                return $true
            }
        }
        elseif (Test-Command "docker") {
            $pingResult = docker exec ai-ttorney-redis redis-cli ping 2>$null
            if ($pingResult -eq "PONG") {
                Write-Success "Redis (Docker) is running and responding to ping"
                
                # Test basic operations
                docker exec ai-ttorney-redis redis-cli set test_key "AI.ttorney Redis Setup" | Out-Null
                $testValue = docker exec ai-ttorney-redis redis-cli get test_key
                
                if ($testValue -eq "AI.ttorney Redis Setup") {
                    Write-Success "Redis read/write operations working correctly"
                    docker exec ai-ttorney-redis redis-cli del test_key | Out-Null
                }
                else {
                    Write-Warning "Redis ping successful but read/write test failed"
                }
                return $true
            }
        }
        
        Write-Error "Redis is not responding. Please check the installation."
        return $false
    }
    catch {
        Write-Error "Error testing Redis connection: $($_.Exception.Message)"
        return $false
    }
}

function Start-RedisService {
    Write-Info "Starting Redis service..."
    
    if (Test-Command "redis-server") {
        Start-Process -FilePath "redis-server" -ArgumentList $RedisConfigFile -NoNewWindow
        Write-Success "Redis server started"
    }
    else {
        Write-Warning "redis-server command not found. Using Docker instead."
        if (Test-Path $DockerComposeFile) {
            docker-compose -f $DockerComposeFile up -d
            Write-Success "Redis started with Docker"
        }
        else {
            Write-Error "No Redis installation or Docker Compose file found"
            return $false
        }
    }
    return $true
}

function Show-Usage {
    Write-Host "Usage: .\setup-redis.ps1 [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Docker     Use Docker setup (recommended for cross-platform)"
    Write-Host "  -Native     Install Redis natively on the system"
    Write-Host "  -Config     Only create configuration files"
    Write-Host "  -Test       Test existing Redis installation"
    Write-Host "  -Help       Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\setup-redis.ps1 -Docker    # Setup Redis with Docker"
    Write-Host "  .\setup-redis.ps1 -Native    # Install Redis natively"
    Write-Host "  .\setup-redis.ps1 -Test      # Test Redis connection"
}

function Main {
    Write-Header
    
    if ($Help) {
        Show-Usage
        return
    }
    
    $setupType = ""
    
    if ($Docker) { $setupType = "docker" }
    elseif ($Native) { $setupType = "native" }
    elseif ($Config) { $setupType = "config" }
    elseif ($Test) { $setupType = "test" }
    
    # If no setup type specified, ask user
    if (-not $setupType) {
        Write-Host "Choose Redis setup method:"
        Write-Host "1) Docker (recommended for cross-platform development)"
        Write-Host "2) Native installation"
        Write-Host "3) Configuration files only"
        Write-Host "4) Test existing installation"
        $choice = Read-Host "Enter choice (1-4)"
        
        switch ($choice) {
            "1" { $setupType = "docker" }
            "2" { $setupType = "native" }
            "3" { $setupType = "config" }
            "4" { $setupType = "test" }
            default { 
                Write-Error "Invalid choice"
                return
            }
        }
    }
    
    switch ($setupType) {
        "docker" {
            Create-RedisConfig
            if (Setup-DockerRedis) {
                Write-Info "To start Redis with Docker, run:"
                Write-Host "  docker-compose -f $DockerComposeFile up -d"
                Write-Info "To stop Redis:"
                Write-Host "  docker-compose -f $DockerComposeFile down"
            }
        }
        "native" {
            Create-RedisConfig
            if (Install-RedisNative) {
                if (Start-RedisService) {
                    Test-RedisConnection
                }
            }
        }
        "config" {
            Create-RedisConfig
            Setup-DockerRedis
            Write-Success "Configuration files created successfully"
        }
        "test" {
            Test-RedisConnection
        }
    }
    
    Write-Success "Redis setup completed successfully!"
    
    # Show connection information
    Write-Host ""
    Write-Info "Redis Connection Information:"
    Write-Host "  Host: localhost"
    Write-Host "  Port: 6379"
    Write-Host "  URL: redis://localhost:6379"
    Write-Host ""
    Write-Info "For your .env file, add:"
    Write-Host "  REDIS_URL=redis://localhost:6379"
}

# Run main function
Main
