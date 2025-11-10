# Reported Replies Handling Guide

## Overview
This guide explains how the admin panel handles reported replies, including the violation tracking system, strike mechanism, and automated enforcement actions.

---

## Table of Contents
1. [Report Lifecycle](#report-lifecycle)
2. [Violation Tracking System](#violation-tracking-system)
3. [Strike System](#strike-system)
4. [Database Schema](#database-schema)
5. [Step-by-Step Process](#step-by-step-process)
6. [Enforcement Actions](#enforcement-actions)

---

## Report Lifecycle

```
User Reports Reply → Report Created (pending) → Admin Reviews → Admin Takes Action
                                                                        ↓
                                                        ┌───────────────┴───────────────┐
                                                        ↓                               ↓
                                                  APPROVE (sanctioned)            DISMISS (dismissed)
                                                        ↓                               ↓
                                        Violation Created + Strike Added         Report Closed
                                        Content Hidden                           No Further Action
                                        Notification Sent
```

---

## Violation Tracking System

### What is a Violation?
A violation is a formal record of a user breaking community guidelines. Each approved report creates a violation record in the `user_violations` table.

### Violation Record Contains:
- **User ID**: Who committed the violation
- **Content**: The violating reply text
- **Violation Type**: Category (forum_reply, forum_post, chatbot_prompt)
- **Reason**: Why it was flagged (spam, harassment, hate_speech, etc.)
- **Action Taken**: What happened (strike_added, suspended, banned)
- **Strike Count**: User's total strikes after this violation
- **Suspension Count**: User's total suspensions after this violation
- **Timestamp**: When the violation was recorded

---

## Strike System

### How Strikes Work

```
Strike Count → Action Taken
─────────────────────────────
0 strikes    → Warning only
1 strike     → Strike added
2 strikes    → Strike added
3 strikes    → 7-day suspension (1st suspension)
4+ strikes   → Strike counter resets to 0 after suspension
3 strikes    → 7-day suspension (2nd suspension)
3 strikes    → Permanent ban (3rd suspension)
```

### Strike Accumulation Rules

1. **Normal Violations**: Each approved report = +1 strike
2. **Strike Reset**: Strikes reset to 0 when user is suspended or banned
3. **Suspension Count**: Never resets, tracks total lifetime suspensions
4. **Progressive Penalties**: Each suspension is more severe

### Thresholds

| Strikes | Suspensions | Action |
|---------|-------------|--------|
| 1-2     | 0           | Strike added, warning notification |
| 3+      | 0           | 1st suspension (7 days), strikes reset to 0 |
| 3+      | 1           | 2nd suspension (7 days), strikes reset to 0 |
| 3+      | 2+          | Permanent ban |

---

## Database Schema

### 1. reported_replies Table
```sql
CREATE TABLE reported_replies (
  id UUID PRIMARY KEY,
  reply_id UUID REFERENCES forum_replies(id),
  reporter_id UUID REFERENCES users(id),
  reason TEXT,                    -- spam, harassment, hate_speech, etc.
  reason_context TEXT,            -- Additional details from reporter
  status TEXT,                    -- pending, sanctioned, dismissed
  submitted_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

### 2. user_violations Table
```sql
CREATE TABLE user_violations (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  content_id UUID,                -- Reference to forum_replies.id
  content_text TEXT,              -- Copy of the violating content
  violation_type TEXT,            -- forum_reply, forum_post, chatbot_prompt
  flagged_categories JSONB,       -- { "spam": true, "harassment": false }
  category_scores JSONB,          -- { "spam": 1.0, "harassment": 0.0 }
  violation_summary TEXT,         -- Human-readable description
  action_taken TEXT,              -- strike_added, suspended, banned
  strike_count_after INTEGER,     -- User's strikes after this violation
  suspension_count_after INTEGER, -- User's suspensions after this violation
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. users Table (Relevant Fields)
```sql
ALTER TABLE users ADD COLUMN strike_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN suspension_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN account_status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN last_violation_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN suspension_end TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN banned_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN banned_reason TEXT;
```

### 4. forum_replies Table (New Field)
```sql
ALTER TABLE forum_replies ADD COLUMN hidden BOOLEAN DEFAULT FALSE;
```

---

## Step-by-Step Process

### When Admin Approves a Report

#### Step 1: Fetch Report Details
```javascript
const report = await supabaseAdmin
  .from("reported_replies")
  .select(`
    id, reply_id, reporter_id, reason, reason_context,
    reply:forum_replies(id, reply_body, user_id, post_id)
  `)
  .eq("id", reportId)
  .single();
```

#### Step 2: Get Current User Status
```javascript
const userData = await supabaseAdmin
  .from("users")
  .select("id, strike_count, suspension_count, account_status")
  .eq("id", report.reply.user_id)
  .single();

const currentStrikes = userData.strike_count || 0;
const currentSuspensions = userData.suspension_count || 0;
const newStrikeCount = currentStrikes + 1;
```

#### Step 3: Determine Action Based on Strikes
```javascript
let actionTaken = "strike_added";
let newSuspensionCount = currentSuspensions;
let accountStatus = "active";

if (newStrikeCount >= 3) {
  if (currentSuspensions >= 2) {
    // 3rd suspension = permanent ban
    actionTaken = "banned";
    accountStatus = "banned";
    newSuspensionCount = currentSuspensions + 1;
  } else {
    // 1st or 2nd suspension = 7 days
    actionTaken = "suspended";
    accountStatus = "suspended";
    suspensionEnd = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    newSuspensionCount = currentSuspensions + 1;
  }
}
```

#### Step 4: Create Violation Record
```javascript
const violationData = {
  user_id: report.reply.user_id,
  content_id: report.reply_id,
  violation_type: "forum_reply",
  content_text: report.reply.reply_body,
  flagged_categories: {
    [report.reason]: true
  },
  category_scores: {
    [report.reason]: 1.0
  },
  violation_summary: `Reply reported for ${report.reason}`,
  action_taken: actionTaken,
  strike_count_after: actionTaken === "banned" || actionTaken === "suspended" ? 0 : newStrikeCount,
  suspension_count_after: newSuspensionCount
};

await supabaseAdmin
  .from("user_violations")
  .insert(violationData);
```

**Key Points:**
- `strike_count_after`: Shows strikes AFTER this violation
  - If suspended/banned: Reset to 0
  - If just strike: Current strikes + 1
- `suspension_count_after`: Always increments when suspended/banned
- `action_taken`: Describes what happened to the user

#### Step 5: Update User Record
```javascript
const userUpdate = {
  strike_count: actionTaken === "banned" || actionTaken === "suspended" ? 0 : newStrikeCount,
  suspension_count: newSuspensionCount,
  account_status: accountStatus,
  last_violation_at: new Date().toISOString()
};

if (actionTaken === "suspended") {
  userUpdate.suspension_end = suspensionEnd;
}

if (actionTaken === "banned") {
  userUpdate.banned_at = new Date().toISOString();
  userUpdate.banned_reason = `Automatic ban after ${newSuspensionCount} suspensions`;
}

await supabaseAdmin
  .from("users")
  .update(userUpdate)
  .eq("id", report.reply.user_id);
```

#### Step 6: Hide the Reply
```javascript
await supabaseAdmin
  .from("forum_replies")
  .update({ hidden: true })
  .eq("id", report.reply_id);
```

#### Step 7: Send Notification
```javascript
const notificationMessage = 
  actionTaken === "banned" 
    ? `Your reply has been removed and your account has been permanently banned for violating community guidelines: ${report.reason}.`
    : actionTaken === "suspended"
    ? `Your reply has been removed and your account has been suspended for 7 days for violating community guidelines: ${report.reason}. This is suspension #${newSuspensionCount}.`
    : `Your reply has been removed for violating community guidelines: ${report.reason}. A strike has been added to your account (${newStrikeCount} total).`;

await supabaseAdmin.from("notifications").insert({
  user_id: report.reply.user_id,
  type: "violation_warning",
  title: actionTaken === "banned" ? "Account Banned" : actionTaken === "suspended" ? "Account Suspended" : "Content Violation Warning",
  message: notificationMessage,
  data: {
    violation_type: report.reason,
    content_id: report.reply_id,
    strike_count: newStrikeCount,
    action_taken: actionTaken
  }
});
```

#### Step 8: Create Suspension Record (if applicable)
```javascript
if (actionTaken === "suspended" || actionTaken === "banned") {
  await supabaseAdmin.from("user_suspensions").insert({
    user_id: report.reply.user_id,
    suspension_type: actionTaken === "banned" ? "permanent" : "temporary",
    reason: `Automatic ${actionTaken} after ${currentStrikes + 1} strikes`,
    violation_ids: [violationId],
    suspension_number: newSuspensionCount,
    strikes_at_suspension: currentStrikes + 1,
    ends_at: suspensionEnd,
    status: "active"
  });
}
```

#### Step 9: Update Report Status
```javascript
await supabaseAdmin
  .from("reported_replies")
  .update({
    status: "sanctioned",
    updated_at: new Date().toISOString()
  })
  .eq("id", reportId);
```

---

## Enforcement Actions

### Action: Strike Added
**When**: User has 1-2 strikes  
**What Happens**:
- ✅ Violation record created
- ✅ Strike count incremented
- ✅ Reply hidden
- ✅ Warning notification sent
- ❌ No suspension
- ❌ Account remains active

**User Can**:
- Continue using the platform normally
- Post new content
- Access all features

---

### Action: Suspended (1st or 2nd)
**When**: User reaches 3+ strikes  
**What Happens**:
- ✅ Violation record created
- ✅ Strike count reset to 0
- ✅ Suspension count incremented
- ✅ Reply hidden
- ✅ Suspension notification sent
- ✅ Account status = "suspended"
- ✅ Suspension end date set (7 days)

**User Cannot**:
- Post new content
- Reply to posts
- Create new posts
- Use chatbot

**User Can**:
- View content (read-only)
- Access their profile
- See suspension notice

---

### Action: Banned (3rd suspension)
**When**: User reaches 3+ strikes AND already has 2 suspensions  
**What Happens**:
- ✅ Violation record created
- ✅ Strike count reset to 0
- ✅ Suspension count incremented
- ✅ Reply hidden
- ✅ Ban notification sent
- ✅ Account status = "banned"
- ✅ Banned timestamp recorded

**User Cannot**:
- Access the platform
- Log in
- Create new account with same email

**Permanent**: No automatic unban

---

## Example Scenarios

### Scenario 1: First-Time Offender
```
User posts spam reply
Admin approves report
─────────────────────────────────────
Before:
  strike_count: 0
  suspension_count: 0
  account_status: active

Action: strike_added

After:
  strike_count: 1
  suspension_count: 0
  account_status: active
  
Violation Record:
  action_taken: "strike_added"
  strike_count_after: 1
  suspension_count_after: 0
```

### Scenario 2: Third Strike
```
User accumulates 2 strikes, then violates again
Admin approves report
─────────────────────────────────────
Before:
  strike_count: 2
  suspension_count: 0
  account_status: active

Action: suspended (1st suspension)

After:
  strike_count: 0 (reset)
  suspension_count: 1
  account_status: suspended
  suspension_end: [7 days from now]
  
Violation Record:
  action_taken: "suspended"
  strike_count_after: 0
  suspension_count_after: 1
```

### Scenario 3: Repeat Offender (Permanent Ban)
```
User has 2 prior suspensions, accumulates 3 strikes again
Admin approves report
─────────────────────────────────────
Before:
  strike_count: 2
  suspension_count: 2
  account_status: active

Action: banned (3rd suspension)

After:
  strike_count: 0 (reset)
  suspension_count: 3
  account_status: banned
  banned_at: [timestamp]
  banned_reason: "Automatic ban after 3 suspensions"
  
Violation Record:
  action_taken: "banned"
  strike_count_after: 0
  suspension_count_after: 3
```

---

## Querying Violations

### Get All Violations for a User
```sql
SELECT 
  v.*,
  u.full_name,
  u.strike_count,
  u.suspension_count,
  u.account_status
FROM user_violations v
JOIN users u ON v.user_id = u.id
WHERE v.user_id = 'user-uuid'
ORDER BY v.created_at DESC;
```

### Get Strike History
```sql
SELECT 
  created_at,
  violation_summary,
  action_taken,
  strike_count_after,
  suspension_count_after
FROM user_violations
WHERE user_id = 'user-uuid'
ORDER BY created_at ASC;
```

### Count Violations by Type
```sql
SELECT 
  violation_type,
  COUNT(*) as total_violations,
  SUM(CASE WHEN action_taken = 'strike_added' THEN 1 ELSE 0 END) as strikes,
  SUM(CASE WHEN action_taken = 'suspended' THEN 1 ELSE 0 END) as suspensions,
  SUM(CASE WHEN action_taken = 'banned' THEN 1 ELSE 0 END) as bans
FROM user_violations
WHERE user_id = 'user-uuid'
GROUP BY violation_type;
```

---

## Admin Dashboard Queries

### Users with Most Violations
```sql
SELECT 
  u.id,
  u.full_name,
  u.email,
  u.strike_count,
  u.suspension_count,
  u.account_status,
  COUNT(v.id) as total_violations
FROM users u
LEFT JOIN user_violations v ON u.id = v.user_id
GROUP BY u.id
ORDER BY total_violations DESC
LIMIT 50;
```

### Recent Violations
```sql
SELECT 
  v.*,
  u.full_name,
  u.email
FROM user_violations v
JOIN users u ON v.user_id = u.id
ORDER BY v.created_at DESC
LIMIT 100;
```

---

## Testing Checklist

- [ ] Report approval creates violation record
- [ ] Strike count increments correctly
- [ ] Strike resets to 0 on suspension/ban
- [ ] Suspension count increments correctly
- [ ] 3 strikes triggers suspension
- [ ] 3rd suspension triggers ban
- [ ] Reply is hidden after approval
- [ ] Notification is sent to user
- [ ] Suspension end date is set correctly (7 days)
- [ ] Banned users cannot log in
- [ ] Suspended users can view but not post
- [ ] Audit log records admin action
- [ ] Report status updates to "sanctioned"

---

## Troubleshooting

### Issue: Strike count not incrementing
**Check**: Verify `action_taken` logic in Step 3
**Solution**: Ensure strikes only reset on suspension/ban

### Issue: User not suspended at 3 strikes
**Check**: Verify threshold logic (`newStrikeCount >= 3`)
**Solution**: Check if `currentStrikes` is being fetched correctly

### Issue: Violation record not created
**Check**: Database permissions and foreign key constraints
**Solution**: Ensure `user_id` and `content_id` are valid UUIDs

### Issue: Notification not sent
**Check**: Notifications table exists and has correct schema
**Solution**: Verify notification service is working

---

## Future Enhancements

1. **Appeal System**: Allow users to appeal violations
2. **Custom Thresholds**: Different strike limits per violation type
3. **Grace Period**: Strikes expire after X months of good behavior
4. **Violation Severity**: Weight strikes based on violation severity
5. **Admin Override**: Allow admins to manually adjust strikes
6. **Bulk Actions**: Process multiple reports at once
7. **Analytics**: Violation trends and patterns dashboard
