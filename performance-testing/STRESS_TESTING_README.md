# AI.ttorney Stress Testing with JMeter

## 🚀 Overview

This comprehensive stress testing suite is designed to test the AI.ttorney application under various load conditions using Apache JMeter. It includes multiple test scenarios, automated scripts, and detailed reporting to ensure your application can handle production traffic.

## 📋 Prerequisites

### **Required Software:**
- **Apache JMeter 5.6+** - Download from [jmeter.apache.org](https://jmeter.apache.org/)
- **Java 11+** - Required for JMeter
- **curl** - For server connectivity checks
- **bc** - For calculations (macOS/Linux)

### **Installation:**
```bash
# macOS (using Homebrew)
brew install jmeter

# Ubuntu/Debian
sudo apt-get install jmeter

# Verify installation
jmeter --version
```

## 🎯 Test Scenarios

### **1. Light Load Test**
- **Purpose**: Basic functionality verification
- **Users**: 10 concurrent users
- **Duration**: 5 minutes
- **Endpoints**: Health checks, basic content

### **2. Medium Load Test**
- **Purpose**: Normal traffic simulation
- **Users**: 50 concurrent users
- **Duration**: 10 minutes
- **Endpoints**: All main endpoints

### **3. Heavy Load Test**
- **Purpose**: Peak traffic handling
- **Users**: 100 concurrent users
- **Duration**: 15 minutes
- **Endpoints**: Full application functionality

### **4. Stress Test**
- **Purpose**: Maximum capacity testing
- **Users**: 200 concurrent users
- **Duration**: 20 minutes
- **Endpoints**: All endpoints including AI chatbot

### **5. Soak Test**
- **Purpose**: Sustained load testing
- **Users**: 75 concurrent users
- **Duration**: 1 hour
- **Endpoints**: Core functionality

## 🛠️ Quick Start

### **1. Basic Stress Test**
```bash
cd performance-testing
./run-stress-test.sh
```

### **2. Specific Scenario**
```bash
# Light load test only
./run-stress-test.sh light

# Heavy load test only
./run-stress-test.sh heavy

# Stress test only
./run-stress-test.sh stress
```

### **3. Custom Configuration**
```bash
# Edit configuration
nano stress-test-config.properties

# Run with custom settings
./run-stress-test.sh
```

## 📊 Test Endpoints

### **Critical Endpoints:**
- `GET /health` - Server health monitoring
- `GET /api/forum/posts/recent` - Forum pagination (infinite scroll)
- `POST /signin` - User authentication
- `GET /api/legal-guides/articles` - Legal content serving

### **Secondary Endpoints:**
- `GET /api/forum/search` - Search functionality
- `GET /api/legal-terms` - Legal terms
- `POST /api/consultation-request/` - Consultation booking
- `GET /api/legal-consultations/lawyers` - Lawyer directory

### **AI Endpoints (Resource Intensive):**
- `POST /ask` - User chatbot
- `POST /ask` - Lawyer chatbot

## ⚙️ Configuration

### **Edit `stress-test-config.properties`:**
```properties
# Server Configuration
BASE_URL=https://aittorney-production.up.railway.app

# Test Scenarios
LIGHT_USERS=10
MEDIUM_USERS=50
HEAVY_USERS=100
STRESS_USERS=200

# Performance Targets
MAX_RESPONSE_TIME=5000
MAX_ERROR_RATE=5.0

# Timeouts (milliseconds)
CONNECT_TIMEOUT=10000
RESPONSE_TIMEOUT=30000
```

### **JMeter Test Plans:**
- `ai-attorney-stress-test.jmx` - Main stress test plan
- `ai-attorney-comprehensive-test.jmx` - Full endpoint coverage
- `ai-attorney-simple-test.jmx` - Quick health checks

## 📈 Performance Targets

### **Success Criteria:**
- ✅ **Error Rate**: < 1% for all endpoints
- ✅ **Response Time**: < 500ms (simple endpoints)
- ✅ **Response Time**: < 2000ms (AI endpoints)
- ✅ **Throughput**: Maintain stable requests per second
- ✅ **Resource Usage**: CPU < 80%, Memory stable

### **Warning Thresholds:**
- ⚠️ **Error Rate**: 1-5% - Monitor closely
- ⚠️ **Response Time**: 500ms-2s - Performance degradation
- ⚠️ **CPU Usage**: 80-90% - Resource pressure

### **Failure Conditions:**
- ❌ **Error Rate**: > 5% - Service instability
- ❌ **Response Time**: > 5s - Performance failure
- ❌ **Server Crashes**: Any service downtime

## 📊 Results and Reporting

### **Generated Reports:**
1. **HTML Dashboard** - Interactive web report
2. **CSV Data** - Raw test results
3. **Summary Report** - Key metrics overview
4. **Error Analysis** - Detailed error breakdown

### **Key Metrics:**
- **Throughput**: Requests per second
- **Response Time**: Average, min, max, percentiles
- **Error Rate**: Percentage of failed requests
- **Active Users**: Concurrent user count
- **CPU/Memory**: Server resource usage

### **View Results:**
```bash
# Open HTML report
open stress-test-results/light_report_20231207_143022/index.html

# View summary
cat stress-test-results/stress_test_summary_20231207_143022.html
```

## 🔍 Monitoring During Tests

### **Server Metrics to Watch:**
1. **CPU Usage** - Should stay < 80%
2. **Memory Usage** - Watch for memory leaks
3. **Database Connections** - Monitor pool exhaustion
4. **Response Times** - Track degradation
5. **Error Rates** - Spike detection

### **Railway Dashboard:**
- Monitor CPU and memory metrics
- Check database connection pool
- Watch for deployment restarts
- Review application logs

### **Application Logs:**
```bash
# Check for errors during test
tail -f server/logs/app.log | grep ERROR

# Monitor database queries
tail -f server/logs/db.log | grep SLOW
```

## 🚨 Troubleshooting

### **Common Issues:**

#### **1. Connection Timeouts**
```
Error: Connection timeout
Solution: Increase CONNECT_TIMEOUT in config
```

#### **2. High Error Rate**
```
Error: > 5% failure rate
Causes: Server overload, database issues, rate limiting
Solution: Reduce concurrent users or check server health
```

#### **3. Memory Issues**
```
Error: OutOfMemoryError
Solution: Increase JVM heap size:
jmeter -Jheap=4g -n -t test.jmx
```

#### **4. SSL Certificate Issues**
```
Error: SSLHandshakeException
Solution: Update Java certificates or use HTTP for testing
```

### **Performance Bottlenecks:**

#### **Database Issues:**
- Slow queries under load
- Connection pool exhaustion
- Database server overload

#### **AI Processing Issues:**
- OpenAI API rate limits
- High CPU usage for AI responses
- Vector database slow queries

#### **Network Issues:**
- Bandwidth limitations
- CDN performance
- Geographic latency

## 📝 Test Execution Examples

### **Quick Health Check:**
```bash
# 5-minute basic test
./run-stress-test.sh light
```

### **Production Readiness Test:**
```bash
# Full test suite (30+ minutes)
./run-stress-test.sh all
```

### **Custom Load Test:**
```bash
# Edit config for custom parameters
nano stress-test-config.properties

# Run with custom settings
./run-stress-test.sh
```

### **Manual JMeter Execution:**
```bash
# Run specific test plan
jmeter -n -t ai-attorney-stress-test.jmx \
       -JBASE_URL=https://aittorney-production.up.railway.app \
       -JTHREADS=100 \
       -JRAMP_TIME=60 \
       -l results.jtl \
       -j test.log

# Generate HTML report
jmeter -g results.jtl -o report/
```

## 🎯 Best Practices

### **Before Testing:**
1. **Warm up** the server with light load
2. **Clear caches** to ensure consistent results
3. **Verify endpoints** are working correctly
4. **Monitor baseline** performance metrics

### **During Testing:**
1. **Monitor server** resources in real-time
2. **Watch error rates** for sudden spikes
3. **Check database** performance
4. **Log everything** for post-analysis

### **After Testing:**
1. **Analyze results** thoroughly
2. **Identify bottlenecks** and root causes
3. **Document findings** and recommendations
4. **Plan optimizations** based on data

## 📞 Emergency Procedures

### **If Server Crashes:**
1. **Stop test immediately**
2. **Check Railway logs** for errors
3. **Restart deployment** if needed
4. **Reduce load** and retry gradually

### **Performance Degradation:**
1. **Monitor closely** for continued degradation
2. **Reduce concurrent users** by 50%
3. **Check external services** (OpenAI, database)
4. **Consider scaling** resources

## 📈 Scaling Recommendations

### **Based on Test Results:**

#### **< 50 Concurrent Users:**
- Standard deployment should handle well
- Monitor for optimization opportunities

#### **50-100 Concurrent Users:**
- Consider database connection pool optimization
- Enable caching for static content
- Monitor CPU usage closely

#### **100+ Concurrent Users:**
- Scale up server resources
- Implement load balancing
- Consider CDN for static assets
- Optimize database queries

#### **200+ Concurrent Users:**
- Horizontal scaling required
- Database read replicas
- Advanced caching strategies
- AI processing optimization

## ✅ Success Checklist

### **Before Production:**
- [ ] All stress test scenarios pass
- [ ] Error rate < 1% at 2x expected load
- [ ] Response times within acceptable limits
- [ ] No memory leaks detected
- [ ] Database performs under load
- [ ] External API limits understood
- [ ] Monitoring and alerting configured
- [ ] Emergency procedures documented

### **Ongoing Monitoring:**
- [ ] Regular stress tests scheduled
- [ ] Performance benchmarks established
- [ ] Alert thresholds configured
- [ ] Capacity planning documented
- [ ] Load testing in CI/CD pipeline

---

## 🚀 Get Started Now!

```bash
cd performance-testing
./run-stress-test.sh light
```

This will run a quick 5-minute stress test to verify everything is working, then you can scale up to more comprehensive testing.

**Remember**: Start small, monitor closely, and scale up gradually. Happy stress testing! 🎯
