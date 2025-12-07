# AI.ttorney Load Testing Guide - Loader.io

## 🎯 Recommended Test Configuration

### **Basic Settings:**
- **Test Type**: Clients per second (gradual ramp-up)
- **Clients**: Start with 10, gradually increase to 100
- **Duration**: 5 minutes (300 seconds)
- **Protocol**: HTTPS
- **Host**: `aittorney-production.up.railway.app`

---

## 📋 Complete API Endpoints for Testing

### **🔥 Critical Endpoints (Test First)**

#### **1. Health Checks**
```
GET /health
GET /ready
```
**Purpose**: Basic server health monitoring
**Expected**: 200 OK with JSON response

#### **2. Authentication**
```
POST /signin
POST /signup
GET /me
```
**Purpose**: User authentication flow
**Expected**: 200/201 for success, 400/401 for errors

#### **3. Forum Posts (Most Used)**
```
GET /api/forum/posts/recent?page=1&limit=15
GET /api/forum/posts?page=1&limit=15
GET /api/forum/posts/{post_id}
GET /api/forum/posts/{post_id}/replies
```
**Purpose**: Core forum functionality
**Expected**: 200 OK with paginated data

#### **4. Chatbot (Heavy Load)**
```
POST /ask (user chatbot)
POST /ask (lawyer chatbot)
```
**Purpose**: AI chatbot functionality
**Expected**: 200 OK with streaming response

---

### **📊 Secondary Endpoints**

#### **5. Legal Content**
```
GET /api/legal-guides/articles
GET /api/legal-guides/categories
GET /api/legal-terms
```
**Purpose**: Static content serving
**Expected**: 200 OK with legal content

#### **6. Search Functionality**
```
GET /api/forum/search?q=test
GET /search/suggestions?q=test
```
**Purpose**: Search functionality
**Expected**: 200 OK with search results

#### **7. User Profile**
```
GET /profile
PUT /profile
GET /check-username
```
**Purpose**: User management
**Expected**: 200/401 depending on auth

#### **8. Consultations**
```
GET /api/legal-consultations/lawyers
POST /api/consultation-request/
```
**Purpose**: Lawyer consultation system
**Expected**: 200 OK with lawyer data

---

### **🔧 Admin/Internal Endpoints**

#### **9. Internal APIs**
```
GET /api/test/supabase
GET /loaderio-d8aa43148942493d07128d6abe18264b.txt
```
**Purpose**: Internal testing and verification
**Expected**: 200 OK

---

## 🚀 Load Testing Scenarios

### **Scenario 1: Basic Load Test**
```
Name: Basic API Load Test
Clients: 10 clients/sec
Duration: 2 minutes
Endpoints to test:
- GET /health
- GET /api/forum/posts/recent?page=1&limit=15
- GET /api/legal-guides/articles
```

### **Scenario 2: Forum Load Test**
```
Name: Forum Pagination Load Test
Clients: 20 clients/sec
Duration: 3 minutes
Endpoints to test:
- GET /api/forum/posts/recent?page=1&limit=15
- GET /api/forum/posts/recent?page=2&limit=15
- GET /api/forum/posts/recent?page=3&limit=15
- GET /api/forum/posts/{post_id}
```

### **Scenario 3: Auth Load Test**
```
Name: Authentication Load Test
Clients: 15 clients/sec
Duration: 2 minutes
Endpoints to test:
- POST /signin
- POST /signup
- GET /me
```

### **Scenario 4: Chatbot Load Test**
```
Name: AI Chatbot Load Test
Clients: 5 clients/sec (lower due to AI processing)
Duration: 3 minutes
Endpoints to test:
- POST /ask (user chatbot)
- POST /ask (lawyer chatbot)
```

### **Scenario 5: Mixed Load Test**
```
Name: Real-world Mixed Load Test
Clients: 25 clients/sec
Duration: 5 minutes
Endpoints to test (weighted):
- 40% GET /api/forum/posts/recent?page=1&limit=15
- 20% GET /api/legal-guides/articles
- 15% GET /health
- 15% POST /signin
- 10% GET /api/forum/search?q=test
```

---

## 📈 Test Results to Monitor

### **Key Metrics:**
1. **Response Time**: Should be < 500ms for simple endpoints
2. **Error Rate**: Should be < 1% for healthy endpoints
3. **Throughput**: Requests per second handled
4. **CPU/Memory Usage**: Server resource consumption
5. **Database Connections**: Should not exceed pool limits

### **Expected Performance:**
- **Health Checks**: < 100ms response time
- **Forum Posts**: < 300ms response time
- **Authentication**: < 200ms response time
- **Chatbot**: < 2000ms response time (AI processing)

---

## ⚠️ Important Notes

### **Rate Limiting:**
- Some endpoints have rate limiting
- Use different client IPs if possible
- Monitor for 429 Too Many Requests responses

### **Authentication:**
- POST endpoints may require valid tokens
- For load testing, focus on GET endpoints first
- Test with/without authentication headers

### **Database Load:**
- Forum endpoints hit database heavily
- Monitor database connection pool
- Watch for slow queries under load

### **AI Processing:**
- Chatbot endpoints are resource-intensive
- Lower client count for these tests
- Monitor OpenAI API usage limits

---

## 🛠️ Loader.io Test Setup

### **Test Configuration Example:**
```
Name: AI.ttorney Forum Load Test
Test type: Clients per second
Clients: 20
Duration: 300 seconds (5 minutes)
Protocol: HTTPS
Host: aittorney-production.up.railway.app
Path: /api/forum/posts/recent?page=1&limit=15
Method: GET
Notes: Testing forum pagination with infinite scroll
```

### **Multiple Endpoint Test:**
Create separate tests for each endpoint category:
1. Health Check Test
2. Forum Load Test  
3. Auth Load Test
4. Content Load Test
5. Mixed Scenario Test

---

## 🔍 Post-Test Analysis

### **Check These Logs:**
1. **Server Logs**: Look for errors, timeouts, slow queries
2. **Database Logs**: Connection pool usage, query performance
3. **Application Logs**: Memory usage, CPU spikes
4. **Railway Metrics**: Resource utilization, response times

### **Common Issues to Watch:**
- Database connection exhaustion
- Memory leaks under sustained load
- Rate limiting triggers
- Slow database queries
- External API timeouts (OpenAI, Qdrant)

---

## 📞 Emergency Procedures

### **If Server Crashes:**
1. Check Railway deployment logs
2. Verify environment variables
3. Check database connectivity
4. Monitor resource usage
5. Scale up resources if needed

### **Performance Degradation:**
1. Enable debug logging
2. Check database query performance
3. Monitor external API response times
4. Review rate limiting settings
5. Consider caching strategies

---

## ✅ Success Criteria

### **Load Test Passes If:**
- ✅ Error rate < 1% for all endpoints
- ✅ Response time < 500ms (simple endpoints)
- ✅ Response time < 2000ms (AI endpoints)
- ✅ No server crashes or timeouts
- ✅ Database connections stay within limits
- ✅ Memory usage stays stable
- ✅ CPU usage < 80% average

### **Ready for Production If:**
- ✅ All scenarios pass at 2x expected load
- ✅ No memory leaks detected
- ✅ Graceful degradation under heavy load
- ✅ Error handling works correctly
- ✅ Monitoring and alerting functional

---

**🚀 Start with basic tests and gradually increase complexity. Monitor closely and stop tests if performance degrades significantly!**
