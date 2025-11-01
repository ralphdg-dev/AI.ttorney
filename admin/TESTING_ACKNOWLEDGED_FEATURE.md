# Testing the Lifted Suspension Acknowledgment Feature

## 🧪 **Complete Testing Guide**

### **Prerequisites**
1. Admin server running on `http://localhost:5001`
2. Admin panel accessible at `http://localhost:3000`
3. Database with `user_suspensions` table including `lifted_acknowledged` column
4. Admin account with proper permissions

---

## **Step 1: Create Test User with Suspension**

### **Option A: Using Admin Panel (Recommended)**
1. **Navigate to User Sanctions**: Go to admin panel → User Sanctions
2. **Find Active User**: Look for a user with "Active" status
3. **Suspend User**:
   - Click the dropdown (⋮) next to an active user
   - Select "Suspend User"
   - Enter reason: "Testing acknowledgment feature"
   - Click "Suspend User (7 Days)"

### **Option B: Using API Directly**
```bash
# Replace USER_ID and ADMIN_TOKEN with actual values
curl -X POST "http://localhost:5001/api/admin/moderation/apply-action/USER_ID" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "violation_type": "forum_post",
    "content_id": "test-content-123",
    "content_text": "Test content for suspension",
    "admin_reason": "Testing acknowledgment feature",
    "action": "suspend_7days"
  }'
```

---

## **Step 2: Lift the Suspension**

### **Using Admin Panel**:
1. **Refresh User List**: The user should now show "Suspended" status
2. **Lift Suspension**:
   - Click dropdown (⋮) next to the suspended user
   - Select "Lift Suspension"
   - Enter reason: "Testing acknowledgment workflow"
   - Click "Lift Suspension"

### **Expected Result**:
- User status changes to "Active"
- `lifted_acknowledged` is automatically set to `false`

---

## **Step 3: Verify Acknowledgment Status**

### **Check in Admin Panel**:
1. **View User Details**:
   - Click dropdown (⋮) next to the user
   - Select "View Details"
   - Look at "Suspensions History" section
   - Check the "Ack" column

### **Expected Display**:
- **Status**: "lifted"
- **Ack Column**: 🟡 Yellow dot + ⏳ (Awaiting acknowledgment)
- **Tooltip**: "Awaiting user acknowledgment"

---

## **Step 4: Test API Endpoints**

### **A. Get Unacknowledged Lifts**
```bash
curl -X GET "http://localhost:5001/api/admin/moderation/unacknowledged-lifts/USER_ID" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "suspension-uuid",
      "suspension_type": "temporary",
      "reason": "Automatic temporary suspension after 3 strikes",
      "lifted_at": "2024-11-01T11:28:00.000Z",
      "lifted_reason": "Testing acknowledgment workflow",
      "lifted_by": "admin-uuid",
      "lifted_acknowledged": false
    }
  ]
}
```

### **B. Mark as Acknowledged**
```bash
curl -X POST "http://localhost:5001/api/admin/moderation/acknowledge-lift/USER_ID/SUSPENSION_ID" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "message": "Suspension lift acknowledged successfully"
}
```

---

## **Step 5: Verify Acknowledgment**

### **Check Updated Status**:
1. **Refresh User Details** in admin panel
2. **Check Ack Column**: Should now show 🟢 Green dot + ✓
3. **Tooltip**: Should say "User acknowledged lift"

### **Verify API Response**:
```bash
# Should return empty array now
curl -X GET "http://localhost:5001/api/admin/moderation/unacknowledged-lifts/USER_ID" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Expected Response**:
```json
{
  "success": true,
  "data": []
}
```

---

## **Step 6: Test Edge Cases**

### **A. Double Acknowledgment**
Try to acknowledge the same suspension again:
```bash
curl -X POST "http://localhost:5001/api/admin/moderation/acknowledge-lift/USER_ID/SUSPENSION_ID" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Suspension lift has already been acknowledged"
}
```

### **B. Invalid Suspension ID**
```bash
curl -X POST "http://localhost:5001/api/admin/moderation/acknowledge-lift/USER_ID/invalid-id" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Suspension record not found"
}
```

### **C. Non-lifted Suspension**
Create another suspension but don't lift it, then try to acknowledge:
```bash
curl -X POST "http://localhost:5001/api/admin/moderation/acknowledge-lift/USER_ID/ACTIVE_SUSPENSION_ID" \
  -H "Authorization: Bearer ADMIN_TOKEN"
```

**Expected Response**:
```json
{
  "success": false,
  "error": "Suspension is not in lifted status"
}
```

---

## **Step 7: Test Ban Acknowledgment**

### **Create and Lift Ban**:
1. **Ban User**: Use admin panel to permanently ban a user
2. **Lift Ban**: Use "Lift Ban" option with reason
3. **Verify**: Same acknowledgment workflow should work for bans

---

## **Step 8: Database Verification**

### **Check Database Directly**:
```sql
-- Check suspension record
SELECT 
  id,
  user_id,
  suspension_type,
  status,
  lifted_at,
  lifted_by,
  lifted_reason,
  lifted_acknowledged,
  created_at,
  updated_at
FROM user_suspensions 
WHERE user_id = 'USER_ID' 
ORDER BY created_at DESC;

-- Check audit logs
SELECT 
  admin_id,
  action,
  target_type,
  target_id,
  details,
  created_at
FROM admin_audit_logs 
WHERE action IN ('admin_lift_suspension', 'admin_lift_ban', 'admin_acknowledge_lift')
ORDER BY created_at DESC;
```

---

## **🎯 Expected Test Results**

### **Successful Test Indicators**:
- ✅ Suspension created with proper violation record
- ✅ Lift sets `lifted_acknowledged = false` automatically
- ✅ Admin UI shows yellow dot + ⏳ for unacknowledged
- ✅ API returns unacknowledged lifts correctly
- ✅ Acknowledgment API works and updates status
- ✅ Admin UI shows green dot + ✓ after acknowledgment
- ✅ Audit logs record all actions properly
- ✅ Edge cases return appropriate error messages

### **Visual Confirmation**:
1. **Before Acknowledgment**: 🟡 ⏳ "Awaiting user acknowledgment"
2. **After Acknowledgment**: 🟢 ✓ "User acknowledged lift"
3. **No Acknowledgment Data**: ⚪ - "No acknowledgment data"

---

## **🚀 Next Steps for User-Facing Implementation**

Once admin testing is complete, implement user-facing notifications:

1. **Login Check**: Check for unacknowledged lifts on user login
2. **Notification Modal**: Display lift notification to user
3. **Acknowledgment Button**: Allow user to acknowledge
4. **API Integration**: Call acknowledgment endpoint from client app
5. **State Management**: Update user session after acknowledgment

This testing workflow ensures the complete acknowledgment system works properly before implementing the user-facing notification system.
