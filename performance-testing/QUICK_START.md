# 🚀 AI.ttorney Stress Testing - Quick Start

## ⚡ 5-Minute Quick Start

### **1. Navigate to Performance Testing**
```bash
cd performance-testing
```

### **2. Run Basic Health Check Test**
```bash
./run-stress-test.sh light
```

### **3. View Results**
```bash
# Results will be shown in terminal
# HTML report opens automatically
```

---

## 🎯 Common Test Commands

### **Quick Tests (5-15 minutes)**
```bash
./run-stress-test.sh light    # 10 users, 5 min
./run-stress-test.sh medium   # 50 users, 10 min
```

### **Comprehensive Tests (20-60 minutes)**
```bash
./run-stress-test.sh heavy    # 100 users, 15 min
./run-stress-test.sh stress   # 200 users, 20 min
./run-stress-test.sh all      # All scenarios, 30+ min
```

### **Custom Test**
```bash
# Edit config file
nano stress-test-config.properties

# Run with custom settings
./run-stress-test.sh
```

---

## 📊 What to Look For

### ✅ **Good Results:**
- Error rate: < 1%
- Response time: < 500ms (health checks)
- Response time: < 2000ms (forum posts)
- No server crashes

### ⚠️ **Warning Signs:**
- Error rate: 1-5%
- Response time: 2-5 seconds
- CPU usage: > 80%

### ❌ **Stop Test If:**
- Error rate: > 5%
- Server crashes
- Response time: > 10 seconds

---

## 🔧 Configuration

### **Edit Target Server:**
```bash
nano stress-test-config.properties
# Change: BASE_URL=https://your-server.com
```

### **Adjust Load:**
```bash
# In stress-test-config.properties:
LIGHT_USERS=10      # Start with this
MEDIUM_USERS=50     # Normal traffic
HEAVY_USERS=100     # Peak traffic
STRESS_USERS=200    # Maximum load
```

---

## 📈 Test Scenarios Explained

| Scenario | Users | Duration | Purpose |
|----------|-------|----------|---------|
| **Light** | 10 | 5 min | Basic functionality |
| **Medium** | 50 | 10 min | Normal traffic |
| **Heavy** | 100 | 15 min | Peak traffic |
| **Stress** | 200 | 20 min | Maximum capacity |

---

## 🎯 Recommended Testing Flow

### **1. Start Small**
```bash
./run-stress-test.sh light
```

### **2. Check Results**
- Look at error rate and response times
- Verify server is stable

### **3. Scale Up**
```bash
./run-stress-test.sh medium
./run-stress-test.sh heavy
```

### **4. Stress Test**
```bash
./run-stress-test.sh stress
```

### **5. Full Suite**
```bash
./run-stress-test.sh all
```

---

## 📱 Monitoring During Tests

### **Railway Dashboard:**
- Watch CPU and memory usage
- Check for deployment restarts
- Monitor database connections

### **Terminal Output:**
- Real-time metrics
- Error counts
- Response time statistics

---

## 🆘 Troubleshooting

### **Test Won't Start:**
```bash
# Check JMeter installation
jmeter --version

# Check server connectivity
curl https://aittorney-production.up.railway.app/health
```

### **High Error Rate:**
```bash
# Reduce users and try again
./run-stress-test.sh light
```

### **Connection Issues:**
```bash
# Check server is running
curl -I https://aittorney-production.up.railway.app/health
```

---

## 📊 Understanding Results

### **Key Metrics:**
- **Throughput**: Requests per second
- **Average Response**: How fast responses are
- **Error Rate**: Percentage of failed requests
- **90% Line**: 90th percentile response time

### **Success Criteria:**
- ✅ Error rate < 1%
- ✅ Average response < 1 second
- ✅ 90% line < 2 seconds
- ✅ No server crashes

---

## 🎯 Production Readiness

### **Before Going Live:**
1. ✅ Pass stress test at 2x expected traffic
2. ✅ Error rate < 1% under heavy load
3. ✅ Response times stable
4. ✅ No memory leaks
5. ✅ Database performs well

### **Expected Traffic Levels:**
- **Normal**: 50 concurrent users
- **Peak**: 100 concurrent users
- **Marketing Campaign**: 200+ concurrent users

---

## 🚀 Ready to Test?

```bash
cd performance-testing
./run-stress-test.sh light
```

**That's it!** The script will handle everything automatically and show you results when it's done.

---

## 📞 Need Help?

1. **Check the full guide**: `STRESS_TESTING_README.md`
2. **Review configuration**: `stress-test-config.properties`
3. **Check logs**: `stress-test-results/*.log`
4. **Monitor server**: Railway dashboard

**Happy stress testing!** 🎯
