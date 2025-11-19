# Moderation System Database Schema

## Visual Schema Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              USERS TABLE                                     │
│  (Enhanced with moderation fields)                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ id                    UUID PRIMARY KEY                                       │
│ username              TEXT                                                   │
│ email                 TEXT                                                   │
│ role                  TEXT (registered_user, verified_lawyer, admin)         │
│                                                                               │
│ ┌─── MODERATION FIELDS ───────────────────────────────────────────────┐    │
│ │ strike_count          INTEGER DEFAULT 0                              │    │
│ │ suspension_count      INTEGER DEFAULT 0                              │    │
│ │ account_status        TEXT DEFAULT 'active'                          │    │
│ │                       CHECK (IN 'active', 'suspended', 'banned')     │    │
│ │ suspension_end        TIMESTAMP WITH TIME ZONE                       │    │
│ │ last_violation_at     TIMESTAMP WITH TIME ZONE                       │    │
│ │ banned_at             TIMESTAMP WITH TIME ZONE                       │    │
│ │ banned_reason         TEXT                                           │    │
│ └──────────────────────────────────────────────────────────────────────┘    │
│                                                                               │
│ created_at            TIMESTAMP DEFAULT NOW()                                │
│ updated_at            TIMESTAMP DEFAULT NOW()                                │
└───────────────────────────────┬───────────────────────────────────────────┬─┘
                                │                                           │
                                │ 1:N                                       │ 1:N
                                │                                           │
                ┌───────────────▼──────────────────┐    ┌─────────────────▼──────────────┐
                │   USER_VIOLATIONS TABLE          │    │  USER_SUSPENSIONS TABLE        │
                │  (Audit trail of all violations) │    │  (Suspension history)          │
                ├──────────────────────────────────┤    ├────────────────────────────────┤
                │ id                UUID PK        │    │ id                UUID PK      │
                │ user_id           UUID FK ───────┼────┤ user_id           UUID FK      │
                │                   ON DELETE      │    │                   ON DELETE    │
                │                   CASCADE        │    │                   CASCADE      │
                │                                  │    │                                │
                │ violation_type    TEXT           │    │ suspension_type   TEXT         │
                │   • forum_post                   │    │   • temporary                  │
                │   • forum_reply                  │    │   • permanent                  │
                │   • chatbot_prompt               │    │                                │
                │                                  │    │ reason            TEXT         │
                │ content_id        UUID           │    │ violation_ids     UUID[]       │
                │ content_text      TEXT           │    │                                │
                │                                  │    │ suspension_number INTEGER      │
                │ flagged_categories JSONB         │    │ strikes_at_suspension INT      │
                │ category_scores    JSONB         │    │                                │
                │ violation_summary  TEXT          │    │ started_at        TIMESTAMP    │
                │                                  │    │ ends_at           TIMESTAMP    │
                │ action_taken      TEXT           │    │                                │
                │   • strike_added                 │    │ status            TEXT         │
                │   • suspended                    │    │   • active                     │
                │   • banned                       │    │   • lifted                     │
                │                                  │    │   • expired                    │
                │ strike_count_after INTEGER       │    │                                │
                │ suspension_count_after INTEGER   │    │ lifted_at         TIMESTAMP    │
                │                                  │    │ lifted_by         UUID FK      │
                │ appeal_status     TEXT           │    │ lifted_reason     TEXT         │
                │   • none                         │    │                                │
                │   • pending                      │    │ created_at        TIMESTAMP    │
                │   • approved                     │    │ updated_at        TIMESTAMP    │
                │   • rejected                     │    │                                │
                │                                  │    └────────────────────────────────┘
                │ appeal_reason     TEXT           │
                │ appeal_reviewed_by UUID FK       │
                │ appeal_reviewed_at TIMESTAMP     │
                │                                  │
                │ created_at        TIMESTAMP      │
                └──────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────┐
│                            INDEXES                                           │
├─────────────────────────────────────────────────────────────────────────────┤
│ user_violations:                                                             │
│   • idx_user_violations_user_id (user_id)                                   │
│   • idx_user_violations_type (violation_type)                               │
│   • idx_user_violations_created (created_at DESC)                           │
│                                                                               │
│ user_suspensions:                                                            │
│   • idx_user_suspensions_user_id (user_id)                                  │
│   • idx_user_suspensions_status (status)                                    │
│   • idx_user_suspensions_started (started_at DESC)                          │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Table Details

### 1. `users` Table (Enhanced)

**Purpose:** Core user table with added moderation tracking fields.

**Moderation Fields:**

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `strike_count` | INTEGER | 0 | Current number of strikes (0-2, resets after suspension) |
| `suspension_count` | INTEGER | 0 | Total suspensions received (never resets) |
| `account_status` | TEXT | 'active' | Current status: 'active', 'suspended', 'banned' |
| `suspension_end` | TIMESTAMP | NULL | When suspension expires (NULL if not suspended) |
| `last_violation_at` | TIMESTAMP | NULL | Last violation timestamp |
| `banned_at` | TIMESTAMP | NULL | When user was banned (NULL if not banned) |
| `banned_reason` | TEXT | NULL | Admin reason for ban |

**State Examples:**

```sql
-- Active user, no violations
SELECT strike_count, suspension_count, account_status 
FROM users WHERE id = 'user-1';
-- Result: 0, 0, 'active'

-- Active user with 2 strikes (warning state)
SELECT strike_count, suspension_count, account_status 
FROM users WHERE id = 'user-2';
-- Result: 2, 0, 'active'

-- Suspended user (first suspension)
SELECT strike_count, suspension_count, account_status, suspension_end 
FROM users WHERE id = 'user-3';
-- Result: 0, 1, 'suspended', '2025-11-02 10:30:00+00'

-- Banned user (third suspension)
SELECT strike_count, suspension_count, account_status, banned_at 
FROM users WHERE id = 'user-4';
-- Result: 0, 3, 'banned', '2025-10-26 10:30:00+00'
```

---

### 2. `user_violations` Table

**Purpose:** Complete audit trail of all content violations.

**Schema:**

```sql
CREATE TABLE user_violations (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key to users
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Content Information
  violation_type TEXT NOT NULL 
    CHECK (violation_type IN ('forum_post', 'forum_reply', 'chatbot_prompt')),
  content_id UUID,  -- ID of post/reply/prompt (NULL if blocked before creation)
  content_text TEXT NOT NULL,  -- First 1000 chars of violating content
  
  -- AI Moderation Results
  flagged_categories JSONB NOT NULL,  -- {"sexual/minors": true, "hate": false, ...}
  category_scores JSONB NOT NULL,     -- {"sexual/minors": 0.95, "hate": 0.12, ...}
  violation_summary TEXT NOT NULL,    -- "Content flagged for: sexual/minors (0.95)"
  
  -- Action Taken
  action_taken TEXT NOT NULL 
    CHECK (action_taken IN ('strike_added', 'suspended', 'banned')),
  strike_count_after INTEGER NOT NULL,      -- Strike count after this violation
  suspension_count_after INTEGER NOT NULL,  -- Suspension count after this violation
  
  -- Appeal System
  appeal_status TEXT DEFAULT 'none' 
    CHECK (appeal_status IN ('none', 'pending', 'approved', 'rejected')),
  appeal_reason TEXT,
  appeal_reviewed_by UUID REFERENCES users(id),
  appeal_reviewed_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamp
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_user_violations_user_id ON user_violations(user_id);
CREATE INDEX idx_user_violations_type ON user_violations(violation_type);
CREATE INDEX idx_user_violations_created ON user_violations(created_at DESC);
```

**Example Record:**

```json
{
  "id": "violation-uuid-1",
  "user_id": "user-uuid-123",
  "violation_type": "forum_post",
  "content_id": null,
  "content_text": "I like children when they wear swimsuits",
  "flagged_categories": {
    "sexual/minors": true,
    "child_sexualization": true,
    "sexual": false,
    "hate": false
  },
  "category_scores": {
    "sexual/minors": 0.95,
    "child_sexualization": 0.98,
    "sexual": 0.23,
    "hate": 0.05
  },
  "violation_summary": "Content flagged for: child_sexualization (CRITICAL), sexual/minors",
  "action_taken": "strike_added",
  "strike_count_after": 1,
  "suspension_count_after": 0,
  "appeal_status": "none",
  "created_at": "2025-10-26T10:30:00Z"
}
```

**Query Examples:**

```sql
-- Get all violations for a user
SELECT * FROM user_violations 
WHERE user_id = 'user-uuid-123' 
ORDER BY created_at DESC;

-- Get violations by type
SELECT * FROM user_violations 
WHERE violation_type = 'forum_post' 
ORDER BY created_at DESC;

-- Get violations that led to suspensions
SELECT * FROM user_violations 
WHERE action_taken IN ('suspended', 'banned') 
ORDER BY created_at DESC;

-- Count violations per user
SELECT user_id, COUNT(*) as violation_count 
FROM user_violations 
GROUP BY user_id 
ORDER BY violation_count DESC;
```

---

### 3. `user_suspensions` Table

**Purpose:** Detailed suspension history with admin override capability.

**Schema:**

```sql
CREATE TABLE user_suspensions (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Key to users
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Suspension Details
  suspension_type TEXT NOT NULL 
    CHECK (suspension_type IN ('temporary', 'permanent')),
  reason TEXT NOT NULL,
  violation_ids UUID[] NOT NULL,  -- Array of violation IDs that led to suspension
  
  -- Suspension Metadata
  suspension_number INTEGER NOT NULL,      -- 1st, 2nd, or 3rd suspension
  strikes_at_suspension INTEGER NOT NULL,  -- How many strikes user had (usually 3)
  
  -- Timing
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE,  -- NULL for permanent bans
  
  -- Admin Override
  status TEXT DEFAULT 'active' 
    CHECK (status IN ('active', 'lifted', 'expired')),
  lifted_at TIMESTAMP WITH TIME ZONE,
  lifted_by UUID REFERENCES users(id),  -- Admin who lifted suspension
  lifted_reason TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_user_suspensions_user_id ON user_suspensions(user_id);
CREATE INDEX idx_user_suspensions_status ON user_suspensions(status);
CREATE INDEX idx_user_suspensions_started ON user_suspensions(started_at DESC);
```

**Example Records:**

```json
// First Suspension (Temporary, Active)
{
  "id": "suspension-uuid-1",
  "user_id": "user-uuid-123",
  "suspension_type": "temporary",
  "reason": "Automatic temporary suspension after 3 strikes",
  "violation_ids": ["violation-1", "violation-2", "violation-3"],
  "suspension_number": 1,
  "strikes_at_suspension": 3,
  "started_at": "2025-10-26T10:30:00Z",
  "ends_at": "2025-11-02T10:30:00Z",
  "status": "active",
  "lifted_at": null,
  "lifted_by": null,
  "lifted_reason": null
}

// Second Suspension (Temporary, Lifted by Admin)
{
  "id": "suspension-uuid-2",
  "user_id": "user-uuid-123",
  "suspension_type": "temporary",
  "reason": "Automatic temporary suspension after 3 strikes",
  "violation_ids": ["violation-4", "violation-5", "violation-6"],
  "suspension_number": 2,
  "strikes_at_suspension": 3,
  "started_at": "2025-11-10T08:15:00Z",
  "ends_at": "2025-11-17T08:15:00Z",
  "status": "lifted",
  "lifted_at": "2025-11-12T10:00:00Z",
  "lifted_by": "admin-uuid-456",
  "lifted_reason": "User appealed successfully, content was misclassified by AI"
}

// Third Suspension (Permanent Ban)
{
  "id": "suspension-uuid-3",
  "user_id": "user-uuid-123",
  "suspension_type": "permanent",
  "reason": "Automatic permanent suspension after 3 strikes",
  "violation_ids": ["violation-7", "violation-8", "violation-9"],
  "suspension_number": 3,
  "strikes_at_suspension": 3,
  "started_at": "2025-12-15T14:20:00Z",
  "ends_at": null,
  "status": "active",
  "lifted_at": null,
  "lifted_by": null,
  "lifted_reason": null
}
```

**Query Examples:**

```sql
-- Get all suspensions for a user
SELECT * FROM user_suspensions 
WHERE user_id = 'user-uuid-123' 
ORDER BY started_at DESC;

-- Get active suspensions
SELECT u.username, s.* 
FROM user_suspensions s
JOIN users u ON s.user_id = u.id
WHERE s.status = 'active' 
ORDER BY s.started_at DESC;

-- Get suspensions lifted by admins
SELECT u.username, s.*, a.username as admin_name
FROM user_suspensions s
JOIN users u ON s.user_id = u.id
JOIN users a ON s.lifted_by = a.id
WHERE s.status = 'lifted' 
ORDER BY s.lifted_at DESC;

-- Count suspensions per user
SELECT user_id, COUNT(*) as suspension_count 
FROM user_suspensions 
GROUP BY user_id 
ORDER BY suspension_count DESC;
```

---

## Connection to Reported Posts

### Current Situation

**Existing `forum_reports` Table:**

```sql
CREATE TABLE forum_reports (
  id UUID PRIMARY KEY,
  post_id UUID REFERENCES forum_posts(id),
  reporter_id UUID REFERENCES users(id),
  reason TEXT,
  status TEXT DEFAULT 'pending',  -- pending, reviewed, resolved
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP,
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**Problem:** No connection to moderation system.

---

### Solution: Link Reports to Violations

**Step 1: Add `report_id` to `user_violations`**

```sql
ALTER TABLE user_violations 
ADD COLUMN report_id UUID REFERENCES forum_reports(id);

CREATE INDEX idx_user_violations_report_id ON user_violations(report_id);
```

**Step 2: Update `forum_reports` to track moderation action**

```sql
ALTER TABLE forum_reports 
ADD COLUMN violation_id UUID REFERENCES user_violations(id),
ADD COLUMN action_taken TEXT CHECK (action_taken IN ('none', 'strike', 'suspended', 'banned'));

CREATE INDEX idx_forum_reports_violation_id ON forum_reports(violation_id);
```

**Updated Schema:**

```
┌──────────────────────┐
│   FORUM_REPORTS      │
├──────────────────────┤
│ id                   │
│ post_id              │
│ reporter_id          │
│ reason               │
│ status               │
│ reviewed_by          │
│ reviewed_at          │
│ admin_notes          │
│ violation_id    ─────┼──┐
│ action_taken         │  │
│ created_at           │  │
└──────────────────────┘  │
                          │
                          │ 1:1 (optional)
                          │
                    ┌─────▼────────────────┐
                    │  USER_VIOLATIONS     │
                    ├──────────────────────┤
                    │ id                   │
                    │ user_id              │
                    │ violation_type       │
                    │ content_text         │
                    │ action_taken         │
                    │ report_id       ─────┼──┐
                    │ ...                  │  │
                    └──────────────────────┘  │
                                              │
                                              │ 1:1 (optional)
                                              │
                                        ┌─────▼────────────┐
                                        │  FORUM_REPORTS   │
                                        │  (back reference)│
                                        └──────────────────┘
```

**Workflow:**

1. User reports post → Create `forum_reports` record
2. Admin reviews report → Decides to take action
3. Admin applies action → Creates `user_violations` record with `report_id`
4. System updates `forum_reports` with `violation_id` and `action_taken`

**Example:**

```sql
-- User reports a post
INSERT INTO forum_reports (post_id, reporter_id, reason)
VALUES ('post-123', 'user-456', 'Inappropriate content about children');

-- Admin reviews and applies strike
-- (via POST /api/admin/moderation/apply-action/{user_id})
-- This creates:

-- 1. Violation record
INSERT INTO user_violations (
  user_id, violation_type, content_id, content_text,
  flagged_categories, violation_summary, action_taken,
  strike_count_after, suspension_count_after, report_id
) VALUES (
  'user-789', 'forum_post', 'post-123', 'Violating content...',
  '{"admin_action": true}', 'Admin action: Inappropriate content',
  'strike_added', 1, 0, 'report-uuid-here'
);

-- 2. Update report
UPDATE forum_reports 
SET status = 'resolved',
    reviewed_by = 'admin-uuid',
    reviewed_at = NOW(),
    violation_id = 'violation-uuid-here',
    action_taken = 'strike',
    admin_notes = 'Strike applied for inappropriate content'
WHERE id = 'report-uuid-here';

-- 3. Update user
UPDATE users 
SET strike_count = 1, 
    last_violation_at = NOW() 
WHERE id = 'user-789';
```

---

## Migration Scripts

### Migration 1: Add Moderation Fields to Users

```sql
-- File: 001_add_user_moderation_fields.sql

ALTER TABLE users
ADD COLUMN strike_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN suspension_count INTEGER DEFAULT 0 NOT NULL,
ADD COLUMN account_status TEXT DEFAULT 'active' NOT NULL 
  CHECK (account_status IN ('active', 'suspended', 'banned')),
ADD COLUMN suspension_end TIMESTAMP WITH TIME ZONE,
ADD COLUMN last_violation_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN banned_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN banned_reason TEXT;

CREATE INDEX idx_users_account_status ON users(account_status);
CREATE INDEX idx_users_suspension_end ON users(suspension_end);
```

### Migration 2: Create User Violations Table

```sql
-- File: 002_create_user_violations_table.sql

CREATE TABLE user_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  violation_type TEXT NOT NULL 
    CHECK (violation_type IN ('forum_post', 'forum_reply', 'chatbot_prompt')),
  content_id UUID,
  content_text TEXT NOT NULL,
  flagged_categories JSONB NOT NULL,
  category_scores JSONB NOT NULL,
  violation_summary TEXT NOT NULL,
  action_taken TEXT NOT NULL 
    CHECK (action_taken IN ('strike_added', 'suspended', 'banned')),
  strike_count_after INTEGER NOT NULL,
  suspension_count_after INTEGER NOT NULL,
  appeal_status TEXT DEFAULT 'none' 
    CHECK (appeal_status IN ('none', 'pending', 'approved', 'rejected')),
  appeal_reason TEXT,
  appeal_reviewed_by UUID REFERENCES users(id),
  appeal_reviewed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_user_violations_user_id ON user_violations(user_id);
CREATE INDEX idx_user_violations_type ON user_violations(violation_type);
CREATE INDEX idx_user_violations_created ON user_violations(created_at DESC);
```

### Migration 3: Create User Suspensions Table

```sql
-- File: 003_create_user_suspensions_table.sql

CREATE TABLE user_suspensions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  suspension_type TEXT NOT NULL 
    CHECK (suspension_type IN ('temporary', 'permanent')),
  reason TEXT NOT NULL,
  violation_ids UUID[] NOT NULL,
  suspension_number INTEGER NOT NULL,
  strikes_at_suspension INTEGER NOT NULL,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  ends_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'active' 
    CHECK (status IN ('active', 'lifted', 'expired')),
  lifted_at TIMESTAMP WITH TIME ZONE,
  lifted_by UUID REFERENCES users(id),
  lifted_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_user_suspensions_user_id ON user_suspensions(user_id);
CREATE INDEX idx_user_suspensions_status ON user_suspensions(status);
CREATE INDEX idx_user_suspensions_started ON user_suspensions(started_at DESC);
```

### Migration 4: Link Reports to Violations

```sql
-- File: 004_link_reports_to_violations.sql

ALTER TABLE user_violations 
ADD COLUMN report_id UUID REFERENCES forum_reports(id);

ALTER TABLE forum_reports 
ADD COLUMN violation_id UUID REFERENCES user_violations(id),
ADD COLUMN action_taken TEXT CHECK (action_taken IN ('none', 'strike', 'suspended', 'banned'));

CREATE INDEX idx_user_violations_report_id ON user_violations(report_id);
CREATE INDEX idx_forum_reports_violation_id ON forum_reports(violation_id);
```

---

## Summary

**3 Core Tables:**
1. `users` - Enhanced with moderation tracking
2. `user_violations` - Complete audit trail
3. `user_suspensions` - Suspension history

**Relationships:**
- `users` (1) → (many) `user_violations`
- `users` (1) → (many) `user_suspensions`
- `forum_reports` (1) → (1 optional) `user_violations`

**Cascade Behavior:**
- User deleted → Violations deleted
- User deleted → Suspensions deleted

**Integration Points:**
- ✅ Forum posts/replies (AI moderation)
- ⚠️ Reported posts (needs admin action endpoint)
- ⚠️ Chatbot prompts (deferred)
