# Strike and Suspension System - High-Level Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [Strike and Suspension Logic](#strike-and-suspension-logic)
3. [Database Schema](#database-schema)
4. [Current Integration](#current-integration)
5. [Admin Integration for Reports](#admin-integration-for-reports)
6. [API Endpoints](#api-endpoints)

---

## 🎯 Overview

AI.ttorney implements an **automated moderation system** with progressive enforcement following Discord/Reddit patterns.

### Key Features
- ✅ **AI Moderation** - 3-layer defense (Safety Filter + Filipino Profanity + OpenAI)
- ✅ **Progressive Strikes** - 3 strikes → 7-day suspension
- ✅ **Escalating Suspensions** - 3 suspensions → permanent ban
- ✅ **Auto-Reset** - Strikes reset after suspension
- ✅ **Audit Trail** - Complete violation history
- ✅ **Admin Override** - Manual suspension lifting

### Current Status
- ✅ **ACTIVE**: Forum posts/replies (AI moderation)
- ⚠️ **NOT INTEGRATED**: Admin-reported posts
- ⚠️ **NOT INTEGRATED**: Chatbot prompts

---

## ⚖️ Strike and Suspension Logic

### Progressive Enforcement

```
Violation 1 → Strike 1 (Warning)
              "You have 1 strike. 2 more = suspension"

Violation 2 → Strike 2 (Warning)
              "You have 2 strikes. 1 more = suspension"

Violation 3 → SUSPENSION #1 (7 days)
              • Strikes reset to 0
              • User cannot post for 7 days

After 7 days → Auto-reset, user can post

Violation 4-6 → SUSPENSION #2 (7 days)
                Same process

Violation 7-9 → PERMANENT BAN
                • Account permanently banned
                • Cannot appeal
```

### Constants

```python
STRIKES_FOR_SUSPENSION = 3      # 3 strikes = suspension
SUSPENSIONS_FOR_BAN = 3         # 3 suspensions = ban
SUSPENSION_DURATION_DAYS = 7    # 7-day suspensions
```

---

## 🗄️ Database Schema

### 1. Enhanced `users` Table

```sql
-- Moderation fields added to existing users table
strike_count INTEGER DEFAULT 0,
suspension_count INTEGER DEFAULT 0,
account_status TEXT DEFAULT 'active' CHECK (account_status IN ('active', 'suspended', 'banned')),
suspension_end TIMESTAMP WITH TIME ZONE,
last_violation_at TIMESTAMP WITH TIME ZONE,
banned_at TIMESTAMP WITH TIME ZONE,
banned_reason TEXT
```

**Example States:**

```json
// Active user with 2 strikes
{
  "strike_count": 2,
  "suspension_count": 0,
  "account_status": "active"
}

// Suspended user
{
  "strike_count": 0,  // Reset
  "suspension_count": 1,
  "account_status": "suspended",
  "suspension_end": "2025-11-02T10:30:00Z"
}

// Banned user
{
  "strike_count": 0,
  "suspension_count": 3,
  "account_status": "banned",
  "banned_at": "2025-10-26T10:30:00Z"
}
```

---

### 2. `user_violations` Table

Complete audit trail of all violations.

```sql
CREATE TABLE user_violations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Content Info
  violation_type TEXT CHECK (violation_type IN ('forum_post', 'forum_reply', 'chatbot_prompt')),
  content_id UUID,
  content_text TEXT,
  
  -- Moderation Results
  flagged_categories JSONB,
  category_scores JSONB,
  violation_summary TEXT,
  
  -- Action Taken
  action_taken TEXT CHECK (action_taken IN ('strike_added', 'suspended', 'banned')),
  strike_count_after INTEGER,
  suspension_count_after INTEGER,
  
  -- Appeal System
  appeal_status TEXT DEFAULT 'none',
  appeal_reason TEXT,
  appeal_reviewed_by UUID,
  appeal_reviewed_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_violations_user_id ON user_violations(user_id);
CREATE INDEX idx_user_violations_type ON user_violations(violation_type);
CREATE INDEX idx_user_violations_created ON user_violations(created_at DESC);
```

**Example Record:**

```json
{
  "user_id": "user-123",
  "violation_type": "forum_post",
  "content_text": "I like children when they wear swimsuits",
  "flagged_categories": {"sexual/minors": true, "child_sexualization": true},
  "category_scores": {"sexual/minors": 0.95, "child_sexualization": 0.98},
  "violation_summary": "Content flagged for: child_sexualization (CRITICAL)",
  "action_taken": "strike_added",
  "strike_count_after": 1,
  "suspension_count_after": 0
}
```

---

### 3. `user_suspensions` Table

Detailed suspension history.

```sql
CREATE TABLE user_suspensions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Suspension Details
  suspension_type TEXT CHECK (suspension_type IN ('temporary', 'permanent')),
  reason TEXT,
  violation_ids UUID[],  -- Array of violation IDs
  
  -- Metadata
  suspension_number INTEGER,      -- 1st, 2nd, or 3rd
  strikes_at_suspension INTEGER,  -- Should be 3 for auto-suspensions
  
  -- Timing
  started_at TIMESTAMP DEFAULT NOW(),
  ends_at TIMESTAMP,  -- NULL for permanent bans
  
  -- Admin Override
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'lifted', 'expired')),
  lifted_at TIMESTAMP,
  lifted_by UUID REFERENCES users(id),
  lifted_reason TEXT,
  
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_user_suspensions_user_id ON user_suspensions(user_id);
CREATE INDEX idx_user_suspensions_status ON user_suspensions(status);
```

**Example Records:**

```json
// Temporary Suspension
{
  "suspension_type": "temporary",
  "suspension_number": 1,
  "strikes_at_suspension": 3,
  "started_at": "2025-10-26T10:30:00Z",
  "ends_at": "2025-11-02T10:30:00Z",
  "status": "active"
}

// Permanent Ban
{
  "suspension_type": "permanent",
  "suspension_number": 3,
  "strikes_at_suspension": 3,
  "started_at": "2025-12-15T14:20:00Z",
  "ends_at": null,
  "status": "active"
}

// Admin-Lifted Suspension
{
  "suspension_type": "temporary",
  "suspension_number": 2,
  "status": "lifted",
  "lifted_at": "2025-11-12T10:00:00Z",
  "lifted_by": "admin-uuid",
  "lifted_reason": "User appealed successfully"
}
```

---

### Database Relationships

```
users (1) ──────── (many) user_violations
  │                         │
  │                         │ Contains violation details
  │                         │ and action taken
  │                         │
  └────────── (many) user_suspensions
                    │
                    │ Contains suspension history
                    │ and admin overrides
```

**Cascade Behavior:**
- User deleted → All violations deleted (CASCADE)
- User deleted → All suspensions deleted (CASCADE)

---

## ✅ Current Integration

### Forum Posts

**File:** `/server/routes/forum.py`  
**Endpoint:** `POST /api/forum/posts`

```python
@router.post("/posts")
async def create_post(body: CreatePostRequest, current_user: Dict):
    user_id = current_user["user"]["id"]
    
    # STEP 1: Check user status
    violation_service = get_violation_tracking_service()
    user_status = await violation_service.check_user_status(user_id)
    
    if not user_status["is_allowed"]:
        raise HTTPException(403, detail=user_status["reason"])
    
    # STEP 2: AI Moderation
    moderation_service = get_moderation_service()
    moderation_result = await moderation_service.moderate_content(body.body)
    
    if not moderation_service.is_content_safe(moderation_result):
        # STEP 3: Record violation
        violation_result = await violation_service.record_violation(
            user_id=user_id,
            violation_type=ViolationType.FORUM_POST,
            content_text=body.body,
            moderation_result=moderation_result
        )
        
        raise HTTPException(400, detail={
            "detail": violation_result["message"],
            "action_taken": violation_result["action_taken"],
            "strike_count": violation_result["strike_count"],
            "suspension_end": violation_result.get("suspension_end")
        })
    
    # Content is safe, create post
```

### Forum Replies

**File:** `/server/routes/forum.py`  
**Endpoint:** `POST /api/forum/posts/{post_id}/replies`

Same 3-step process as forum posts.

---

## 🔧 Admin Integration for Reports

### Problem

Currently, when users report posts:
- Reports stored in `forum_reports` table
- Admins can view reports
- **NO WAY to apply strikes/suspensions** to reported users

The moderation system only works for AI-detected violations, not manual admin actions.

### Solution: Admin Action Endpoint

Create endpoint: `POST /api/admin/moderation/apply-action/{user_id}`

**File to modify:** `/server/routes/admin_moderation.py`

```python
from pydantic import BaseModel, Field
from typing import Literal, Optional

class AdminModerationAction(BaseModel):
    violation_type: Literal["forum_post", "forum_reply", "chatbot_prompt"]
    content_id: str  # ID of post/reply
    content_text: str  # The violating content
    admin_reason: str  # Why admin is taking action
    action: Literal["strike", "suspend_7days", "permanent_ban"]
    report_id: Optional[str] = None  # Link to report

@router.post("/apply-action/{user_id}")
async def apply_admin_moderation_action(
    user_id: str,
    body: AdminModerationAction,
    current_user: Dict = Depends(require_role("admin"))
):
    """
    Apply moderation action to a user (admin override).
    Allows admins to manually apply strikes/suspensions when reviewing reports.
    """
    violation_service = get_violation_tracking_service()
    
    # Create moderation result (admin action)
    moderation_result = {
        "flagged": True,
        "categories": {"admin_action": True},
        "violation_summary": f"Admin action: {body.admin_reason}"
    }
    
    if body.action == "strike":
        # Add strike using normal flow
        violation_result = await violation_service.record_violation(
            user_id=user_id,
            violation_type=body.violation_type,
            content_text=body.content_text,
            moderation_result=moderation_result,
            content_id=body.content_id
        )
        
    elif body.action == "suspend_7days":
        # Force 7-day suspension (bypass strike count)
        user_data = await violation_service._get_user_status(user_id)
        suspension_end = datetime.utcnow() + timedelta(days=7)
        
        await violation_service._update_user_status(
            user_id=user_id,
            strike_count=0,
            suspension_count=user_data["suspension_count"] + 1,
            account_status=AccountStatus.SUSPENDED,
            suspension_end=suspension_end
        )
        
        # Record violation and suspension
        # ... (create violation and suspension records)
        
    elif body.action == "permanent_ban":
        # Force permanent ban
        user_data = await violation_service._get_user_status(user_id)
        
        await violation_service._update_user_status(
            user_id=user_id,
            strike_count=0,
            suspension_count=user_data["suspension_count"] + 1,
            account_status=AccountStatus.BANNED,
            suspension_end=None
        )
        
        # Record violation and suspension
        # ... (create violation and suspension records)
    
    # Update report status if report_id provided
    if body.report_id:
        # Mark report as resolved
        # ... (update forum_reports table)
    
    return {"success": True, "message": "Action applied"}
```

---

### Frontend Integration

**Admin Report Review UI should have:**

1. **Report Details**
   - Post content
   - Reporter's reason
   - Timestamp

2. **Action Buttons**
   - ✅ Dismiss (no action)
   - ⚠️ Add Strike
   - 🔒 Suspend 7 Days
   - 🔨 Permanent Ban

3. **API Call Example**

```typescript
async function applyModerationAction(
  userId: string,
  action: 'strike' | 'suspend_7days' | 'permanent_ban',
  reportId: string,
  postContent: string,
  adminReason: string
) {
  const response = await fetch(`/api/admin/moderation/apply-action/${userId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      violation_type: 'forum_post',
      content_id: reportId,
      content_text: postContent,
      admin_reason: adminReason,
      action: action,
      report_id: reportId
    })
  });
  
  return response.json();
}
```

---

## 📡 API Endpoints

### User Status Check

```
GET /api/user/status
Response: {
  "is_allowed": true,
  "account_status": "active",
  "strike_count": 1,
  "suspension_count": 0
}
```

### Admin Endpoints

```
GET /api/admin/moderation/suspended-users
GET /api/admin/moderation/violations?user_id={id}&violation_type={type}
GET /api/admin/moderation/suspensions?user_id={id}
GET /api/admin/moderation/stats
POST /api/admin/moderation/lift-suspension/{user_id}
POST /api/admin/moderation/apply-action/{user_id}  // NEW
```

---

## 🔄 Complete Flow Diagram

```
USER CREATES CONTENT
        │
        ▼
CHECK USER STATUS
  • Suspended? → Block (403)
  • Banned? → Block (403)
  • Active? → Continue
        │
        ▼
AI MODERATION (3 layers)
  1. Safety Filter
  2. Filipino Profanity
  3. OpenAI Moderation
        │
        ▼
    Is Safe?
    │      │
   YES    NO
    │      │
    │      ▼
    │   RECORD VIOLATION
    │      │
    │      ▼
    │   DETERMINE ACTION
    │      │
    │      ├─ Strikes < 3 → Add Strike
    │      ├─ Strikes = 3, Suspensions < 3 → 7-Day Suspension
    │      └─ Suspensions = 3 → Permanent Ban
    │      │
    │      ▼
    │   UPDATE DATABASE
    │      • users table
    │      • user_violations table
    │      • user_suspensions table
    │      │
    │      ▼
    │   BLOCK CONTENT (400)
    │   Return strike/suspension info
    │
    ▼
ALLOW CONTENT
Save to database
```

---

## 📝 Implementation Checklist

### For Admin Report Integration

- [ ] Add `apply_admin_moderation_action()` endpoint to `/server/routes/admin_moderation.py`
- [ ] Update admin UI to show action buttons on reports
- [ ] Add frontend API call to apply actions
- [ ] Update `forum_reports` table to track resolution
- [ ] Test all three action types (strike, suspend, ban)
- [ ] Add logging for admin actions
- [ ] Create admin action audit trail

### For Chatbot Integration

- [ ] Add status check to `/server/api/chatbot_user.py`
- [ ] Add status check to `/server/api/chatbot_lawyer.py`
- [ ] Integrate with existing guardrails
- [ ] Record violations for failed guardrails
- [ ] Test chatbot moderation flow
- [ ] Update documentation

---

## 🛡️ Compliance

- ✅ **GDPR Article 17** - Right to erasure (CASCADE deletes)
- ✅ **Philippine RA 10173** - Data Privacy Act
- ✅ **COPPA** - Children's Online Privacy Protection
- ✅ **Industry Standards** - Discord, Reddit, Slack patterns

---

## 📚 Related Files

**Core Services:**
- `/server/services/violation_tracking_service.py` - Main service (509 lines)
- `/server/services/content_moderation_service.py` - AI moderation
- `/server/services/safety_filter.py` - Child safety layer
- `/server/services/filipino_profanity_filter.py` - Profanity layer

**Routes:**
- `/server/routes/forum.py` - Forum integration (lines 146-210, 680-739)
- `/server/routes/admin_moderation.py` - Admin endpoints (584 lines)

**Models:**
- `/server/models/violation_types.py` - Enums (ViolationType, SuspensionType, AccountStatus)

**Middleware:**
- `/server/middleware/account_status.py` - Status checking middleware

---

## 🎓 Key Takeaways

1. **AI moderation is ACTIVE** for forum posts/replies
2. **Admin reports are NOT CONNECTED** to strike system yet
3. **Solution**: Add admin action endpoint to manually apply strikes
4. **Database is ready** - just need to wire up admin UI
5. **Chatbot integration** is deferred to chatbot developer

---

**Questions?** Check the service files for detailed implementation or review existing forum integration as a reference.
