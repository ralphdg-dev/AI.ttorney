# Redis Setup for AI.ttorney Development

This directory contains scripts and configurations to set up Redis for the AI.ttorney project across different development environments.

## 🚀 Quick Start

### Option 1: Docker (Recommended - Works on all platforms)
```bash
# macOS/Linux
chmod +x scripts/setup-redis.sh
./scripts/setup-redis.sh --docker

# Windows (PowerShell - Run as Administrator)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\scripts\setup-redis.ps1 -Docker

# Windows (Command Prompt)
scripts\setup-redis.bat --docker

# Start Redis (all platforms)
docker-compose -f docker-compose.redis.yml up -d
```

### Option 2: Native Installation
```bash
# macOS/Linux (auto-detects package manager)
./scripts/setup-redis.sh --native

# Windows (PowerShell - tries Chocolatey, Scoop, winget)
.\scripts\setup-redis.ps1 -Native

# Windows (Command Prompt - tries Chocolatey, Scoop)
scripts\setup-redis.bat --native
```

### Option 3: Test Existing Setup
```bash
# Test if Redis is working
./scripts/test-redis-setup.sh  # macOS/Linux
```

## 📁 Files Overview

| File | Description |
|------|-------------|
| `setup-redis.sh` | Main setup script for macOS/Linux with fallback support |
| `setup-redis.bat` | Windows batch script with multiple package manager support |
| `setup-redis.ps1` | Windows PowerShell script with enhanced error handling |
| `test-redis-setup.sh` | Test script to verify Redis setup and OTP operations |
| `docker-compose.redis.yml` | Docker Compose configuration with Redis Commander |
| `redis.conf` | Optimized Redis configuration for AI.ttorney OTP services |

## 🐳 Docker Setup (Recommended)

The Docker setup is the most reliable way to run Redis across all platforms:

```bash
# Start Redis with Docker
docker-compose -f docker-compose.redis.yml up -d

# Check Redis status
docker-compose -f docker-compose.redis.yml ps

# View Redis logs
docker-compose -f docker-compose.redis.yml logs redis

# Stop Redis
docker-compose -f docker-compose.redis.yml down
```

### Redis Commander (Optional)
The Docker setup includes Redis Commander for GUI management:

```bash
# Start with Redis Commander
docker-compose -f docker-compose.redis.yml --profile tools up -d

# Access Redis Commander at: http://localhost:8081
# Username: admin
# Password: admin123
```

## 🖥️ Platform-Specific Instructions

### macOS
```bash
# Using the setup script
chmod +x scripts/setup-redis.sh
./scripts/setup-redis.sh --native

# Manual installation with Homebrew
brew install redis
brew services start redis
```

### Linux (Ubuntu/Debian)
```bash
# Using the setup script
chmod +x scripts/setup-redis.sh
./scripts/setup-redis.sh --native

# Manual installation
sudo apt-get update
sudo apt-get install redis-server
sudo systemctl start redis
sudo systemctl enable redis
```

### Windows

#### Option 1: PowerShell (Recommended)
```powershell
# Run as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
.\scripts\setup-redis.ps1 -Docker
```

#### Option 2: Command Prompt
```cmd
# Run as Administrator
scripts\setup-redis.bat
```

#### Option 3: Package Managers
```powershell
# Using Chocolatey
choco install redis-64

# Using Scoop
scoop install redis
```

## ⚙️ Configuration

### Environment Variables
Add to your `.env` file:
```env
REDIS_URL=redis://localhost:6379
```

### Redis Configuration
The `redis.conf` file is optimized for AI.ttorney's OTP services with:
- 256MB memory limit
- LRU eviction policy
- AOF persistence enabled
- Keyspace notifications for expired keys
- Optimized for development use

### Key Features for AI.ttorney
- **OTP Storage**: Secure hash storage with TTL
- **Attempt Tracking**: Failed login attempt monitoring
- **Lockout Management**: Temporary account lockouts
- **Session Management**: User session storage
- **Cache**: Application-level caching

## 🧪 Testing Redis

### Basic Connection Test
```bash
# Test Redis connection
./scripts/setup-redis.sh --test

# Manual test
redis-cli ping
# Expected output: PONG
```

### OTP Service Test
```bash
# Connect to Redis CLI
redis-cli

# Test OTP-like operations
127.0.0.1:6379> SET otp:email_verification:test@example.com "hashed_otp_value" EX 120
127.0.0.1:6379> GET otp:email_verification:test@example.com
127.0.0.1:6379> TTL otp:email_verification:test@example.com
127.0.0.1:6379> DEL otp:email_verification:test@example.com
```

## 🔧 Troubleshooting

### Common Issues

#### Redis Connection Failed
```bash
# Check if Redis is running
redis-cli ping

# Check Redis process
ps aux | grep redis

# Check Redis logs (Docker)
docker-compose -f docker-compose.redis.yml logs redis
```

#### Port Already in Use
```bash
# Check what's using port 6379
lsof -i :6379

# Kill process using the port
sudo kill -9 <PID>
```

#### Permission Denied (Linux/macOS)
```bash
# Make script executable
chmod +x scripts/setup-redis.sh

# Run with sudo if needed
sudo ./scripts/setup-redis.sh --native
```

#### Docker Issues
```bash
# Restart Docker service
sudo systemctl restart docker  # Linux
# or restart Docker Desktop

# Clean up Docker containers
docker-compose -f docker-compose.redis.yml down -v
docker system prune -f
```

### Memory Issues
If Redis uses too much memory:
```bash
# Check Redis memory usage
redis-cli info memory

# Flush all data (development only!)
redis-cli flushall

# Restart Redis with clean state
docker-compose -f docker-compose.redis.yml restart redis
```

## 🔒 Security Notes

### Development vs Production
- **Development**: No password required, localhost only
- **Production**: Enable password authentication in `redis.conf`

### Production Security Checklist
- [ ] Enable `requirepass` in redis.conf
- [ ] Bind to specific IP addresses only
- [ ] Enable TLS/SSL encryption
- [ ] Disable dangerous commands (FLUSHALL, CONFIG, etc.)
- [ ] Set up firewall rules
- [ ] Use Redis ACLs for user management

## 📊 Monitoring

### Redis CLI Commands
```bash
# Server information
redis-cli info

# Memory usage
redis-cli info memory

# Connected clients
redis-cli info clients

# Keyspace information
redis-cli info keyspace

# Monitor real-time commands
redis-cli monitor
```

### Key Patterns Used by AI.ttorney
```
otp:email_verification:<email>     # Email verification OTPs
otp:password_reset:<email>         # Password reset OTPs
otp_attempts:email_verification:<email>  # Failed attempt tracking
otp_lockout:email_verification:<email>   # Lockout status
session:<session_id>               # User sessions
cache:<cache_key>                  # Application cache
```

## 🤝 Team Development

### Shared Development Environment
1. All developers should use the same Redis configuration
2. Use Docker for consistency across platforms
3. Document any Redis schema changes
4. Test OTP flows after Redis updates

### Git Integration
The following files are tracked in git:
- `scripts/setup-redis.sh`
- `scripts/setup-redis.bat`
- `scripts/setup-redis.ps1`
- `docker-compose.redis.yml`
- `redis.conf`
- `scripts/README-Redis-Setup.md`

Redis data files are gitignored:
- `dump.rdb`
- `appendonly.aof`
- `redis.log`

## 📞 Support

If you encounter issues:
1. Check this README for troubleshooting steps
2. Verify your platform-specific requirements
3. Test with Docker setup as a fallback
4. Check Redis logs for error messages
5. Consult the team for environment-specific issues

## 🔄 Updates

To update Redis:
```bash
# Docker (recommended)
docker-compose -f docker-compose.redis.yml pull
docker-compose -f docker-compose.redis.yml up -d

# Native installations
# macOS: brew upgrade redis
# Linux: sudo apt update && sudo apt upgrade redis-server
# Windows: Update via package manager used for installation
```
