#!/bin/bash

# AI.ttorney Redis Setup Script
# This script sets up Redis for development across different platforms

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REDIS_PORT=6379
REDIS_CONFIG_FILE="redis.conf"
DOCKER_COMPOSE_FILE="docker-compose.redis.yml"

print_header() {
    echo -e "${BLUE}"
    echo "=================================="
    echo "   AI.ttorney Redis Setup"
    echo "=================================="
    echo -e "${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

detect_os() {
    if [[ "$OSTYPE" == "darwin"* ]]; then
        echo "macos"
    elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
        echo "linux"
    elif [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "cygwin" ]]; then
        echo "windows"
    else
        echo "unknown"
    fi
}

check_command() {
    if command -v "$1" &> /dev/null; then
        return 0
    else
        return 1
    fi
}

install_redis_macos() {
    print_info "Installing Redis on macOS..."
    
    if check_command "brew"; then
        print_info "Installing Redis via Homebrew..."
        if brew install redis; then
            print_success "Redis installed via Homebrew"
            return 0
        else
            print_error "Failed to install Redis via Homebrew"
            return 1
        fi
    elif check_command "port"; then
        print_info "Installing Redis via MacPorts..."
        if sudo port install redis; then
            print_success "Redis installed via MacPorts"
            return 0
        else
            print_error "Failed to install Redis via MacPorts"
            return 1
        fi
    else
        print_warning "No package manager found (Homebrew or MacPorts)"
        print_info "Attempting to install Homebrew..."
        if /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"; then
            print_success "Homebrew installed successfully"
            if brew install redis; then
                print_success "Redis installed via Homebrew"
                return 0
            fi
        fi
        print_error "Failed to install Redis. Please install Homebrew manually or use Docker setup"
        return 1
    fi
}

install_redis_linux() {
    print_info "Installing Redis on Linux..."
    
    if check_command "apt-get"; then
        print_info "Installing Redis via apt-get..."
        if sudo apt-get update && sudo apt-get install -y redis-server; then
            print_success "Redis installed via apt-get"
            return 0
        else
            print_error "Failed to install Redis via apt-get"
            return 1
        fi
    elif check_command "yum"; then
        print_info "Installing Redis via yum..."
        if sudo yum install -y redis; then
            print_success "Redis installed via yum"
            return 0
        else
            print_error "Failed to install Redis via yum"
            return 1
        fi
    elif check_command "dnf"; then
        print_info "Installing Redis via dnf..."
        if sudo dnf install -y redis; then
            print_success "Redis installed via dnf"
            return 0
        else
            print_error "Failed to install Redis via dnf"
            return 1
        fi
    elif check_command "pacman"; then
        print_info "Installing Redis via pacman..."
        if sudo pacman -S --noconfirm redis; then
            print_success "Redis installed via pacman"
            return 0
        else
            print_error "Failed to install Redis via pacman"
            return 1
        fi
    elif check_command "zypper"; then
        print_info "Installing Redis via zypper..."
        if sudo zypper install -y redis; then
            print_success "Redis installed via zypper"
            return 0
        else
            print_error "Failed to install Redis via zypper"
            return 1
        fi
    else
        print_error "No supported package manager found (apt-get, yum, dnf, pacman, zypper)"
        print_info "Please install Redis manually or use Docker setup"
        return 1
    fi
}

install_redis_windows() {
    print_info "For Windows, we recommend using Docker or WSL2"
    print_info "Please use the Docker setup option or install WSL2 and run this script in Linux mode"
}

setup_docker_redis() {
    print_info "Setting up Redis with Docker..."
    
    if ! check_command "docker"; then
        print_error "Docker not found. Please install Docker first."
        exit 1
    fi
    
    # Create Docker Compose file
    cat > "$DOCKER_COMPOSE_FILE" << EOF
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
EOF
    
    print_success "Docker Compose file created: $DOCKER_COMPOSE_FILE"
}

create_redis_config() {
    print_info "Creating Redis configuration file..."
    
    cat > "$REDIS_CONFIG_FILE" << EOF
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
EOF
    
    print_success "Redis configuration file created: $REDIS_CONFIG_FILE"
}

test_redis_connection() {
    print_info "Testing Redis connection..."
    
    # Wait a moment for Redis to start
    sleep 2
    
    if redis-cli ping &> /dev/null; then
        print_success "Redis is running and responding to ping"
        
        # Test basic operations
        redis-cli set test_key "AI.ttorney Redis Setup" > /dev/null
        local test_value=$(redis-cli get test_key)
        
        if [[ "$test_value" == "AI.ttorney Redis Setup" ]]; then
            print_success "Redis read/write operations working correctly"
            redis-cli del test_key > /dev/null
        else
            print_warning "Redis ping successful but read/write test failed"
        fi
    else
        print_error "Redis is not responding. Please check the installation."
        return 1
    fi
}

start_redis_service() {
    local os_type=$(detect_os)
    
    print_info "Starting Redis service..."
    
    case $os_type in
        "macos")
            if check_command "brew"; then
                brew services start redis
                print_success "Redis service started via Homebrew"
            else
                redis-server "$REDIS_CONFIG_FILE" &
                print_success "Redis server started manually"
            fi
            ;;
        "linux")
            if systemctl is-active --quiet redis; then
                print_info "Redis service is already running"
            else
                sudo systemctl start redis
                sudo systemctl enable redis
                print_success "Redis service started and enabled"
            fi
            ;;
        *)
            redis-server "$REDIS_CONFIG_FILE" &
            print_success "Redis server started manually"
            ;;
    esac
}

show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --docker     Use Docker setup (recommended for cross-platform)"
    echo "  --native     Install Redis natively on the system"
    echo "  --config     Only create configuration files"
    echo "  --test       Test existing Redis installation"
    echo "  --help       Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --docker    # Setup Redis with Docker"
    echo "  $0 --native    # Install Redis natively"
    echo "  $0 --test      # Test Redis connection"
}

main() {
    print_header
    
    local setup_type=""
    
    # Parse command line arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            --docker)
                setup_type="docker"
                shift
                ;;
            --native)
                setup_type="native"
                shift
                ;;
            --config)
                setup_type="config"
                shift
                ;;
            --test)
                setup_type="test"
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done
    
    # If no setup type specified, ask user
    if [[ -z "$setup_type" ]]; then
        echo "Choose Redis setup method:"
        echo "1) Docker (recommended for cross-platform development)"
        echo "2) Native installation"
        echo "3) Configuration files only"
        echo "4) Test existing installation"
        read -p "Enter choice (1-4): " choice
        
        case $choice in
            1) setup_type="docker" ;;
            2) setup_type="native" ;;
            3) setup_type="config" ;;
            4) setup_type="test" ;;
            *) print_error "Invalid choice"; exit 1 ;;
        esac
    fi
    
    case $setup_type in
        "docker")
            create_redis_config
            setup_docker_redis
            print_info "To start Redis with Docker, run:"
            echo "  docker-compose -f $DOCKER_COMPOSE_FILE up -d"
            print_info "To stop Redis:"
            echo "  docker-compose -f $DOCKER_COMPOSE_FILE down"
            ;;
        "native")
            local os_type=$(detect_os)
            print_info "Detected OS: $os_type"
            
            create_redis_config
            
            case $os_type in
                "macos")
                    if install_redis_macos; then
                        start_redis_service
                        test_redis_connection
                    else
                        print_warning "Native installation failed. Falling back to Docker setup..."
                        create_redis_config
                        setup_docker_redis
                        print_info "To start Redis with Docker, run:"
                        echo "  docker-compose -f $DOCKER_COMPOSE_FILE up -d"
                        return
                    fi
                    ;;
                "linux")
                    if install_redis_linux; then
                        start_redis_service
                        test_redis_connection
                    else
                        print_warning "Native installation failed. Falling back to Docker setup..."
                        create_redis_config
                        setup_docker_redis
                        print_info "To start Redis with Docker, run:"
                        echo "  docker-compose -f $DOCKER_COMPOSE_FILE up -d"
                        return
                    fi
                    ;;
                "windows")
                    print_warning "Windows detected. Use PowerShell or batch script for Windows setup."
                    print_info "Run: scripts\\setup-redis.ps1 or scripts\\setup-redis.bat"
                    exit 1
                    ;;
                *)
                    print_error "Unsupported operating system: $os_type"
                    print_info "Falling back to Docker setup..."
                    create_redis_config
                    setup_docker_redis
                    ;;
            esac
            ;;
        "config")
            create_redis_config
            setup_docker_redis
            print_success "Configuration files created successfully"
            ;;
        "test")
            test_redis_connection
            ;;
    esac
    
    print_success "Redis setup completed successfully!"
    
    # Show connection information
    echo ""
    print_info "Redis Connection Information:"
    echo "  Host: localhost"
    echo "  Port: 6379"
    echo "  URL: redis://localhost:6379"
    echo ""
    print_info "For your .env file, add:"
    echo "  REDIS_URL=redis://localhost:6379"
}

# Run main function with all arguments
main "$@"
