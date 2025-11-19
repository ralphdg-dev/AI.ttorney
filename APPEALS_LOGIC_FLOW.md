# Suspension Appeals System - Logic Flow

## Overview
This document explains the complete logic flow of the suspension appeals system, from user submission to admin review.

---

## 1. User Suspension Flow

### When User Gets Suspended
```
User violates community guidelines
    ↓
AI moderation flags content
    ↓
Strike added to user account
    ↓
Strike count reaches 3
    ↓
AUTOMATIC SUSPENSION TRIGGERED
    ↓
Database Updates:
- users.account_status = 'suspended'
- users.suspension_end = NOW() + 7 days
- users.strike_count = 0 (reset)
- users.suspension_count += 1
    ↓
user_suspensions record created:
- suspension_type = 'temporary' or 'permanent'
- status = 'active'
- started_at = NOW()
- ends_at = NOW() + 7 days (or NULL for permanent)
```

### User Login Check
```
User attempts to login
    ↓
AuthContext.handleAuthStateChange()
    ↓
Check user.account_status
    ↓
IF account_status === 'suspended'
    ↓
Redirect to /suspended screen
    ↓
User sees suspension details + Appeal button
```

---

## 2. Appeal Submission Logic

### Frontend Flow (suspended.tsx)

```javascript
// Step 1: Check for existing appeal on page load
useEffect(() => {
  if (session?.access_token) {
    fetchSuspensionInfo();
    checkExistingAppeal(); // ← Checks if user already appealed
  }
}, [session]);

// Step 2: User clicks "Appeal This Suspension"
setShowAppealForm(true);

// Step 3: User fills form
- appealReason (50-2000 chars) ← REQUIRED
- additionalContext (0-1000 chars) ← OPTIONAL

// Step 4: Validation
if (appealReason.length < 50) {
  Alert: "Please provide at least 50 characters"
  return;
}

if (appealReason.length > 2000) {
  Alert: "Please keep under 2000 characters"
  return;
}

// Step 5: Submit appeal
handleSubmitAppeal() {
  POST /api/appeals
  Body: {
    appeal_reason: appealReason,
    additional_context: additionalContext
  }
}
```

### Backend Logic (suspension_appeals.py)

```python
# POST /api/appeals endpoint

# Step 1: Verify user is suspended
user = get_user(user_id)
if user.account_status != 'suspended':
    return 400 "You can only appeal an active suspension"

# Step 2: Get active suspension
suspension = get_active_suspension(user_id)
if not suspension:
    return 400 "No active suspension found"

# Step 3: Check for existing appeal
existing_appeal = get_appeal_by_suspension(suspension.id)
if existing_appeal and existing_appeal.status in ['pending', 'under_review']:
    return 400 "You already have a pending appeal"

# Step 4: Create appeal record
appeal = {
    user_id: user_id,
    suspension_id: suspension.id,
    appeal_reason: request.appeal_reason,
    additional_context: request.additional_context,
    status: 'pending',
    created_at: NOW()
}

# Step 5: Insert into database
INSERT INTO suspension_appeals VALUES (appeal)

# Step 6: Return appeal to user
return 200 appeal
```

### Database State After Submission

```sql
-- suspension_appeals table
id: uuid
user_id: user-123
suspension_id: suspension-456
appeal_reason: "I believe this was unfair because..."
additional_context: "Additional context here"
status: 'pending' ← Initial status
reviewed_by: NULL
reviewed_at: NULL
admin_notes: NULL
rejection_reason: NULL
created_at: 2025-10-31 18:00:00
```

---

## 3. Admin Review Flow

### Admin Dashboard (ManageAppeals.js)

```javascript
// Step 1: Load appeals on page mount
useEffect(() => {
  loadAppeals(); // GET /api/admin/appeals?status_filter=pending
  loadStats();   // GET /api/admin/appeals/stats
}, [statusFilter]);

// Step 2: Display appeals table
appeals.map(appeal => {
  - User info (email, username)
  - Suspension type & number
  - Appeal reason (truncated)
  - Status badge
  - Review button
})

// Step 3: Admin clicks "Review"
handleReview(appeal) {
  setSelectedAppeal(appeal);
  setShowReviewModal(true);
}
```

### Review Modal Logic (ReviewAppealModal.js)

```javascript
// Step 1: Display appeal details
- User information
- Suspension details
- Appeal reason (full text)
- Additional context

// Step 2: Admin makes decision
decision: 'approve' | 'reject'
adminNotes: string (internal, not shown to user)
rejectionReason: string (shown to user if rejected)

// Step 3: Validation
if (!decision) {
  error: "Please select a decision"
  return;
}

if (decision === 'reject' && !rejectionReason) {
  error: "Rejection reason is required"
  return;
}

// Step 4: Submit review
handleSubmit() {
  PATCH /api/admin/appeals/{appeal_id}/review
  Body: {
    decision: 'approve' | 'reject',
    admin_notes: adminNotes,
    rejection_reason: rejectionReason (if reject)
  }
}
```

### Backend Review Logic (suspension_appeals.py)

```python
# PATCH /api/admin/appeals/{appeal_id}/review

# Step 1: Get appeal
appeal = get_appeal(appeal_id)
if not appeal:
    return 404 "Appeal not found"

# Step 2: Verify can review
if appeal.status not in ['pending', 'under_review']:
    return 400 "Cannot review already processed appeal"

# Step 3: Validate request
if decision == 'reject' and not rejection_reason:
    return 400 "Rejection reason required"

# Step 4: Update appeal
appeal.status = 'approved' if decision == 'approve' else 'rejected'
appeal.reviewed_by = admin_id
appeal.reviewed_at = NOW()
appeal.admin_notes = admin_notes
if decision == 'reject':
    appeal.rejection_reason = rejection_reason

UPDATE suspension_appeals SET ... WHERE id = appeal_id

# Step 5: If APPROVED, lift suspension
if decision == 'approve':
    # Update suspension
    UPDATE user_suspensions SET
        status = 'lifted',
        lifted_at = NOW(),
        lifted_by = admin_id,
        lifted_reason = 'Appeal approved'
    WHERE id = appeal.suspension_id
    
    # Update user
    UPDATE users SET
        account_status = 'active',
        strike_count = 0,
        suspension_end = NULL
    WHERE id = appeal.user_id

# Step 6: Return updated appeal
return 200 appeal
```

---

## 4. Appeal Status States

### State Diagram

```
┌─────────┐
│ PENDING │ ← Initial state when user submits
└────┬────┘
     │
     ├─→ Admin clicks review
     │
     ▼
┌──────────────┐
│ UNDER_REVIEW │ ← Optional intermediate state
└──────┬───────┘
       │
       ├─→ Admin approves
       │   ↓
       │   ┌──────────┐
       │   │ APPROVED │ → Suspension lifted
       │   └──────────┘
       │
       └─→ Admin rejects
           ↓
           ┌──────────┐
           │ REJECTED │ → User stays suspended
           └──────────┘
```

### Status Meanings

**pending**
- User submitted appeal
- Waiting for admin review
- User sees: "Pending Review"

**under_review**
- Admin opened the appeal
- Currently reviewing
- User sees: "Under Review"

**approved**
- Admin approved the appeal
- Suspension lifted immediately
- User can access app
- User sees: "Approved - Your suspension has been lifted"

**rejected**
- Admin rejected the appeal
- User stays suspended
- User sees rejection reason
- User sees: "Rejected - [reason]"

---

## 5. Database Constraints & Rules

### One Appeal Per Suspension
```sql
-- Unique constraint prevents multiple appeals
CREATE UNIQUE INDEX idx_one_appeal_per_suspension 
ON suspension_appeals(suspension_id);

-- If user tries to submit another appeal:
ERROR: duplicate key value violates unique constraint
```

### Appeal Validation Rules

```javascript
// Frontend validation
appealReason.length >= 50 && appealReason.length <= 2000
additionalContext.length <= 1000

// Backend validation
- User must be suspended
- User must have active suspension
- No existing pending/under_review appeal
- Appeal reason required
- Rejection reason required when rejecting
```

---

## 6. User Experience Flows

### Scenario 1: Appeal Approved

```
1. User suspended → Sees suspended screen
2. User clicks "Appeal This Suspension"
3. User writes appeal (100 chars): "This was a mistake..."
4. User submits → Status: "Pending"
5. Admin reviews → Clicks "Approve"
6. Backend:
   - appeal.status = 'approved'
   - suspension.status = 'lifted'
   - user.account_status = 'active'
7. User refreshes → Redirected to home
8. User can post/interact normally
```

### Scenario 2: Appeal Rejected

```
1. User suspended → Sees suspended screen
2. User clicks "Appeal This Suspension"
3. User writes appeal (80 chars): "I didn't do anything wrong"
4. User submits → Status: "Pending"
5. Admin reviews → Clicks "Reject"
6. Admin writes reason: "Appeal does not provide sufficient evidence"
7. Backend:
   - appeal.status = 'rejected'
   - appeal.rejection_reason = "Appeal does not..."
   - suspension remains active
8. User refreshes → Still on suspended screen
9. User sees rejection reason
10. User must wait until suspension_end date
```

### Scenario 3: User Already Has Pending Appeal

```
1. User suspended → Sees suspended screen
2. User already submitted appeal yesterday
3. checkExistingAppeal() finds pending appeal
4. UI shows:
   - Appeal status card
   - "Pending Review" badge
   - Appeal text user submitted
   - "Submitted: Oct 30, 2025"
5. No "Appeal" button shown
6. User cannot submit another appeal
```

---

## 7. Admin Dashboard Logic

### Statistics Calculation

```javascript
// GET /api/admin/appeals/stats

stats = {
  pending: COUNT(*) WHERE status = 'pending',
  under_review: COUNT(*) WHERE status = 'under_review',
  approved: COUNT(*) WHERE status = 'approved',
  rejected: COUNT(*) WHERE status = 'rejected',
  total: COUNT(*)
}

// Displayed as cards:
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Pending: 5  │ │ Approved: 12│ │ Rejected: 8 │
└─────────────┘ └─────────────┘ └─────────────┘
```

### Filter Logic

```javascript
// Filter tabs change statusFilter state
onClick={() => setStatusFilter('pending')}

// Triggers useEffect
useEffect(() => {
  loadAppeals(); // Fetches with new filter
}, [statusFilter]);

// API call
GET /api/admin/appeals?status_filter=pending&limit=50&offset=0
```

---

## 8. Error Handling

### User Errors

```javascript
// Not suspended
if (user.account_status !== 'suspended') {
  return 400 "You can only appeal an active suspension"
}

// Appeal too short
if (appealReason.length < 50) {
  Alert: "Please provide at least 50 characters"
}

// Already has appeal
if (existingAppeal && existingAppeal.status === 'pending') {
  return 400 "You already have a pending appeal"
}
```

### Admin Errors

```javascript
// No decision selected
if (!decision) {
  error: "Please select a decision"
}

// Reject without reason
if (decision === 'reject' && !rejectionReason) {
  error: "Rejection reason is required"
}

// Appeal not found
if (!appeal) {
  return 404 "Appeal not found"
}

// Already reviewed
if (appeal.status === 'approved' || appeal.status === 'rejected') {
  return 400 "Cannot review already processed appeal"
}
```

---

## 9. Security & Authorization

### User Endpoints

```python
# Requires authentication
@router.post("/appeals")
async def submit_appeal(
    current_user: Dict = Depends(get_current_user)  # ← JWT required
):
    user_id = current_user["user"]["id"]
    # User can only submit for themselves
```

### Admin Endpoints

```python
# Requires admin role
@router.get("/admin/appeals")
async def get_appeals(
    current_user: Dict = Depends(require_role("admin"))  # ← Admin only
):
    # Only admins can view all appeals
```

### Data Access Rules

```
Users can:
- Submit appeal for their own suspension
- View their own appeals only
- See rejection reasons for their appeals

Admins can:
- View all appeals from all users
- Approve/reject any appeal
- See internal admin notes
- Access appeal statistics
```

---

## 10. Performance Considerations

### Database Indexes

```sql
-- Fast lookups by user
CREATE INDEX idx_suspension_appeals_user_id 
ON suspension_appeals(user_id);

-- Fast lookups by suspension
CREATE INDEX idx_suspension_appeals_suspension_id 
ON suspension_appeals(suspension_id);

-- Fast filtering by status
CREATE INDEX idx_suspension_appeals_status 
ON suspension_appeals(status);

-- Fast sorting by date
CREATE INDEX idx_suspension_appeals_created 
ON suspension_appeals(created_at DESC);
```

### Query Optimization

```python
# Efficient pagination
GET /api/admin/appeals?limit=50&offset=0

# Filtered queries use indexes
WHERE status = 'pending'  # Uses idx_suspension_appeals_status

# Sorted queries use indexes
ORDER BY created_at DESC  # Uses idx_suspension_appeals_created
```

---

## Summary

The appeals system provides a complete workflow:

1. **User submits appeal** → Creates pending record
2. **Admin reviews** → Approves or rejects
3. **If approved** → Suspension lifted, user active
4. **If rejected** → User sees reason, stays suspended

All actions are logged, validated, and secured with proper authorization.
