# Suspension Appeal System Implementation Plan

## Overview
This document outlines the complete implementation of a user suspension appeal system for the AI.ttorney platform. The system allows suspended users to appeal their suspensions, and admins to review and make decisions on those appeals.

---

## Database Schema Changes

### 1. New Table: `user_suspension_appeals`

**Purpose:** Store all suspension appeal requests and their review outcomes.

```sql
CREATE TABLE user_suspension_appeals (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  suspension_id UUID NOT NULL REFERENCES user_suspensions(id) ON DELETE CASCADE,
  
  -- Appeal Details (User-submitted)
  appeal_reason TEXT NOT NULL,              -- Short summary (e.g., "AI misclassified my content")
  appeal_message TEXT NOT NULL,             -- Detailed explanation from user
  evidence_urls TEXT[],                     -- Optional: Links to supporting evidence
  
  -- Status Tracking
  status TEXT DEFAULT 'pending' NOT NULL
    CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  
  -- Admin Review
  reviewed_by UUID REFERENCES users(id),   -- Admin who reviewed the appeal
  reviewed_at TIMESTAMP WITH TIME ZONE,    -- When review was completed
  admin_response TEXT,                      -- Response shown to user
  admin_notes TEXT,                         -- Internal admin notes (not shown to user)
  
  -- Decision Details
  decision TEXT CHECK (decision IN ('lift_suspension', 'reduce_duration', 'reject')),
  original_end_date TIMESTAMP WITH TIME ZONE,  -- Original suspension end
  new_end_date TIMESTAMP WITH TIME ZONE,       -- New end date if reduced
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for performance
CREATE INDEX idx_suspension_appeals_user_id ON user_suspension_appeals(user_id);
CREATE INDEX idx_suspension_appeals_suspension_id ON user_suspension_appeals(suspension_id);
CREATE INDEX idx_suspension_appeals_status ON user_suspension_appeals(status);
CREATE INDEX idx_suspension_appeals_created ON user_suspension_appeals(created_at DESC);

-- Constraint: Only one active appeal per suspension
CREATE UNIQUE INDEX idx_one_appeal_per_suspension 
ON user_suspension_appeals(suspension_id) 
WHERE status IN ('pending', 'under_review');
```

### 2. Update Existing Tables

```sql
-- Add appeal tracking to user_suspensions table
ALTER TABLE user_suspensions
ADD COLUMN has_appeal BOOLEAN DEFAULT FALSE,
ADD COLUMN appeal_id UUID REFERENCES user_suspension_appeals(id);

-- Add appeal notification flag to users table
ALTER TABLE users
ADD COLUMN has_pending_appeal_response BOOLEAN DEFAULT FALSE;
```

---

## Backend Implementation

### File Structure
```
server/
├── routes/
│   ├── user_appeals.py          # NEW: User-facing appeal endpoints
│   └── admin_appeals.py         # NEW: Admin appeal review endpoints
├── services/
│   └── appeal_service.py        # NEW: Appeal business logic
└── models/
    └── appeal_models.py         # NEW: Pydantic models for appeals
```

### 1. Models (`server/models/appeal_models.py`)

```python
from pydantic import BaseModel, Field
from typing import Optional, List, Literal
from datetime import datetime

class SubmitAppealRequest(BaseModel):
    suspension_id: str
    appeal_reason: str = Field(..., min_length=10, max_length=200)
    appeal_message: str = Field(..., min_length=50, max_length=2000)
    evidence_urls: Optional[List[str]] = []

class ReviewAppealRequest(BaseModel):
    decision: Literal["lift_suspension", "reduce_duration", "reject"]
    admin_response: str = Field(..., min_length=20, max_length=1000)
    admin_notes: Optional[str] = Field(None, max_length=1000)
    new_end_date: Optional[datetime] = None

class AppealResponse(BaseModel):
    id: str
    user_id: str
    suspension_id: str
    appeal_reason: str
    appeal_message: str
    status: str
    created_at: datetime
    reviewed_at: Optional[datetime] = None
    admin_response: Optional[str] = None
    decision: Optional[str] = None
```

### 2. Service Layer (`server/services/appeal_service.py`)

**Key Functions:**
- `create_appeal()` - Create new appeal
- `get_user_appeals()` - Get appeals for a user
- `get_pending_appeals()` - Get all pending appeals (admin)
- `review_appeal()` - Process admin decision
- `lift_suspension()` - Lift suspension completely
- `reduce_suspension_duration()` - Reduce suspension time
- `notify_user_of_decision()` - Send notification to user

### 3. User Endpoints (`server/routes/user_appeals.py`)

#### `POST /api/user/suspensions/appeal`
**Purpose:** Submit a suspension appeal

**Request Body:**
```json
{
  "suspension_id": "uuid",
  "appeal_reason": "AI misclassified my content",
  "appeal_message": "I believe my post was wrongly flagged because...",
  "evidence_urls": ["https://example.com/proof"]
}
```

**Validations:**
- User must be currently suspended
- Suspension must belong to the user
- No existing appeal for this suspension
- Appeal reason: 10-200 characters
- Appeal message: 50-2000 characters

**Response:**
```json
{
  "success": true,
  "message": "Appeal submitted successfully",
  "appeal_id": "uuid",
  "status": "pending"
}
```

#### `GET /api/user/suspensions/appeals`
**Purpose:** Get user's appeal history

**Response:**
```json
{
  "success": true,
  "appeals": [
    {
      "id": "uuid",
      "suspension_id": "uuid",
      "appeal_reason": "AI misclassified my content",
      "status": "approved",
      "created_at": "2025-10-31T10:00:00Z",
      "reviewed_at": "2025-10-31T12:00:00Z",
      "admin_response": "Upon review, we agree the content was misclassified.",
      "decision": "lift_suspension"
    }
  ]
}
```

#### `GET /api/user/suspensions/current`
**Purpose:** Get current suspension details (if suspended)

**Response:**
```json
{
  "success": true,
  "suspension": {
    "id": "uuid",
    "started_at": "2025-10-31T10:00:00Z",
    "ends_at": "2025-11-07T10:00:00Z",
    "reason": "Automatic suspension after 3 strikes",
    "suspension_number": 1,
    "has_appeal": false,
    "can_appeal": true
  }
}
```

### 4. Admin Endpoints (`server/routes/admin_appeals.py`)

#### `GET /api/admin/moderation/appeals`
**Purpose:** Get appeals for review

**Query Parameters:**
- `status` - Filter by status (pending, under_review, approved, rejected)
- `page` - Pagination
- `limit` - Items per page

**Response:**
```json
{
  "success": true,
  "appeals": [
    {
      "id": "uuid",
      "user": {
        "id": "uuid",
        "username": "john_doe",
        "email": "john@example.com"
      },
      "suspension": {
        "suspension_number": 1,
        "started_at": "2025-10-31T10:00:00Z",
        "ends_at": "2025-11-07T10:00:00Z",
        "reason": "Automatic suspension after 3 strikes"
      },
      "appeal_reason": "AI misclassified my content",
      "appeal_message": "Detailed explanation...",
      "created_at": "2025-10-31T11:00:00Z",
      "status": "pending"
    }
  ],
  "total": 10,
  "page": 1,
  "limit": 20
}
```

#### `POST /api/admin/moderation/appeals/{appeal_id}/review`
**Purpose:** Review and decide on an appeal

**Request Body:**
```json
{
  "decision": "lift_suspension",
  "admin_response": "Upon review, we agree the content was misclassified. Your suspension has been lifted.",
  "admin_notes": "AI flagged Filipino slang incorrectly"
}
```

**Decision Options:**
1. **`lift_suspension`** - Remove suspension completely
2. **`reduce_duration`** - Shorten suspension (requires `new_end_date`)
3. **`reject`** - Keep suspension as-is

**Response:**
```json
{
  "success": true,
  "message": "Appeal approved",
  "decision": "lift_suspension"
}
```

#### `GET /api/admin/moderation/appeals/stats`
**Purpose:** Get appeal statistics

**Response:**
```json
{
  "success": true,
  "stats": {
    "pending": 5,
    "under_review": 2,
    "approved": 15,
    "rejected": 8,
    "total": 30
  }
}
```

---

## Frontend Implementation

### User Side

#### 1. Suspension Notice Screen
**Location:** `/client/app/suspended.tsx`

**Features:**
- Display suspension details (reason, end date, suspension number)
- Show "Appeal This Suspension" button
- Display appeal status if already submitted
- Show admin response if appeal was reviewed

#### 2. Appeal Submission Form
**Location:** `/client/app/appeal-suspension.tsx`

**Form Fields:**
- Appeal Reason (dropdown + text input)
  - "Content was misclassified"
  - "Context was misunderstood"
  - "Technical error occurred"
  - "Other"
- Detailed Message (textarea, 50-2000 chars)
- Evidence URLs (optional, up to 3 links)

**Validation:**
- Real-time character count
- Required field validation
- URL format validation

#### 3. Appeal History Page
**Location:** `/client/app/my-appeals.tsx`

**Features:**
- List all submitted appeals
- Status badges (Pending, Under Review, Approved, Rejected)
- View admin responses
- Timeline of events

### Admin Side

#### 1. Appeals Dashboard
**Location:** `/admin/src/pages/moderation/ManageAppeals.js`

**Features:**
- DataTable with sortable columns
- Filter by status (Pending, Under Review, Approved, Rejected)
- Search by username/email
- Pagination
- Quick stats cards (Pending count, etc.)

**Table Columns:**
- User (username, email)
- Suspension Details (number, dates)
- Appeal Reason
- Submitted Date
- Status
- Actions (Review button)

#### 2. Appeal Review Modal
**Location:** `/admin/src/components/moderation/AppealReviewModal.js`

**Sections:**
1. **User Information**
   - Username, email, account status
   - Violation history
   - Previous appeals

2. **Suspension Details**
   - Suspension number (1st, 2nd, 3rd)
   - Start/end dates
   - Violations that led to suspension
   - Strike count at suspension

3. **Appeal Content**
   - Appeal reason
   - Detailed message
   - Evidence links (clickable)

4. **Review Decision Form**
   - Decision radio buttons:
     - ✅ Lift Suspension
     - ⏱️ Reduce Duration (shows date picker)
     - ❌ Reject Appeal
   - Admin Response (textarea, shown to user)
   - Internal Notes (textarea, admin-only)
   - Submit/Cancel buttons

#### 3. Appeal Statistics Widget
**Location:** `/admin/src/components/moderation/AppealStats.js`

**Displays:**
- Pending appeals count (with alert if > 5)
- Average review time
- Approval rate
- Rejection rate

---

## User Experience Flow

### User Submits Appeal

1. **User gets suspended** → Sees suspension notice
2. **Clicks "Appeal"** → Redirected to appeal form
3. **Fills out form** → Provides reason and explanation
4. **Submits appeal** → Confirmation message shown
5. **Waits for review** → Can check status in "My Appeals"
6. **Gets notification** → When admin reviews appeal
7. **Views decision** → Sees admin response

### Admin Reviews Appeal

1. **Admin logs in** → Sees pending appeals count
2. **Opens Appeals page** → Views list of pending appeals
3. **Clicks "Review"** → Opens appeal review modal
4. **Reviews details** → Checks user history, violations, appeal message
5. **Makes decision** → Chooses lift/reduce/reject
6. **Writes response** → Explains decision to user
7. **Submits review** → User is notified automatically

---

## Business Rules

### Appeal Eligibility
- ✅ User must be currently suspended
- ✅ Only one appeal per suspension
- ✅ Cannot appeal permanent bans (3rd suspension)
- ✅ Cannot submit new appeal if previous is pending

### Admin Decision Impact

#### Lift Suspension
- User's `account_status` → `active`
- User's `suspension_end` → `NULL`
- Suspension's `status` → `lifted`
- User can immediately access platform

#### Reduce Duration
- Suspension's `ends_at` → new date
- User's `suspension_end` → new date
- User still suspended but for shorter time
- Strike count remains unchanged

#### Reject Appeal
- No changes to suspension
- User remains suspended until original end date
- User can see admin's explanation

### Notifications
- User notified when appeal is reviewed
- Admin notified when new appeal is submitted
- Email notifications (optional)

---

## Security & Validation

### User Endpoint Security
- ✅ JWT authentication required
- ✅ User can only appeal their own suspensions
- ✅ Rate limiting: 1 appeal per suspension
- ✅ Input validation (length, format)

### Admin Endpoint Security
- ✅ Admin/Superadmin role required
- ✅ Audit logging of all decisions
- ✅ Cannot review own appeals (if admin is suspended)

### Data Integrity
- ✅ Foreign key constraints
- ✅ Unique constraint on active appeals
- ✅ Cascade delete (user deleted → appeals deleted)
- ✅ Timestamp tracking for audit trail

---

## Migration Files

### Migration 1: Create Appeals Table
**File:** `001_create_user_suspension_appeals.sql`
- Creates `user_suspension_appeals` table
- Creates indexes
- Creates unique constraint

### Migration 2: Update Existing Tables
**File:** `002_add_appeal_tracking_fields.sql`
- Adds `has_appeal` to `user_suspensions`
- Adds `appeal_id` to `user_suspensions`
- Adds `has_pending_appeal_response` to `users`

---

## Testing Checklist

### Backend Tests
- [ ] User can submit appeal when suspended
- [ ] User cannot submit appeal when not suspended
- [ ] User cannot submit duplicate appeals
- [ ] Admin can view pending appeals
- [ ] Admin can lift suspension
- [ ] Admin can reduce suspension duration
- [ ] Admin can reject appeal
- [ ] Notifications sent correctly

### Frontend Tests
- [ ] Appeal form validation works
- [ ] Character count displays correctly
- [ ] Appeal submission shows success message
- [ ] Appeal history displays correctly
- [ ] Admin can filter appeals by status
- [ ] Admin review modal displays all info
- [ ] Decision buttons work correctly

---

## Implementation Order

1. **Phase 1: Database** (Day 1)
   - Create migration files
   - Run migrations
   - Verify schema

2. **Phase 2: Backend** (Day 2-3)
   - Create models
   - Implement service layer
   - Create user endpoints
   - Create admin endpoints
   - Add tests

3. **Phase 3: Frontend - User** (Day 4)
   - Suspension notice screen
   - Appeal submission form
   - Appeal history page

4. **Phase 4: Frontend - Admin** (Day 5)
   - Appeals dashboard
   - Review modal
   - Statistics widget

5. **Phase 5: Testing & Polish** (Day 6)
   - Integration testing
   - UI/UX refinements
   - Documentation

---

## Success Metrics

- Users can successfully submit appeals
- Admins can review appeals within 24 hours
- Appeal approval rate tracked
- User satisfaction with appeal process
- Reduction in support tickets about suspensions

---

## Visual Schema Diagram

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              USERS TABLE                                 │
│  (Enhanced with appeal notification)                                     │
├─────────────────────────────────────────────────────────────────────────┤
│ id                           UUID PRIMARY KEY                            │
│ account_status               TEXT (active, suspended, banned)            │
│ suspension_end               TIMESTAMP                                   │
│ has_pending_appeal_response  BOOLEAN DEFAULT FALSE  ← NEW               │
└────────────────────────┬────────────────────────────────────────────────┘
                         │
                         │ 1:N
                         │
        ┌────────────────▼─────────────────────────────────────────────┐
        │              USER_SUSPENSIONS TABLE                          │
        │  (Enhanced with appeal tracking)                             │
        ├──────────────────────────────────────────────────────────────┤
        │ id                 UUID PRIMARY KEY                          │
        │ user_id            UUID FK → users(id)                       │
        │ suspension_type    TEXT (temporary, permanent)               │
        │ started_at         TIMESTAMP                                 │
        │ ends_at            TIMESTAMP                                 │
        │ status             TEXT (active, lifted, expired)            │
        │ has_appeal         BOOLEAN DEFAULT FALSE  ← NEW              │
        │ appeal_id          UUID FK → user_suspension_appeals(id)     │
        └────────────────┬───────────────────────────────────────────┬─┘
                         │                                           │
                         │ 1:1                                       │ 1:N
                         │                                           │
        ┌────────────────▼───────────────────────────────────────────▼─┐
        │           USER_SUSPENSION_APPEALS TABLE (NEW)                │
        ├──────────────────────────────────────────────────────────────┤
        │ id                    UUID PRIMARY KEY                       │
        │ user_id               UUID FK → users(id)                    │
        │ suspension_id         UUID FK → user_suspensions(id)         │
        │                                                               │
        │ -- User Submission                                           │
        │ appeal_reason         TEXT NOT NULL                          │
        │ appeal_message        TEXT NOT NULL                          │
        │ evidence_urls         TEXT[]                                 │
        │                                                               │
        │ -- Status                                                    │
        │ status                TEXT (pending, under_review,           │
        │                            approved, rejected)               │
        │                                                               │
        │ -- Admin Review                                              │
        │ reviewed_by           UUID FK → users(id)                    │
        │ reviewed_at           TIMESTAMP                              │
        │ admin_response        TEXT                                   │
        │ admin_notes           TEXT                                   │
        │                                                               │
        │ -- Decision                                                  │
        │ decision              TEXT (lift_suspension,                 │
        │                            reduce_duration, reject)          │
        │ original_end_date     TIMESTAMP                              │
        │ new_end_date          TIMESTAMP                              │
        │                                                               │
        │ created_at            TIMESTAMP                              │
        │ updated_at            TIMESTAMP                              │
        └──────────────────────────────────────────────────────────────┘
```

---

This system provides a fair, transparent, and efficient way for users to appeal suspensions while giving admins the tools to make informed decisions.
