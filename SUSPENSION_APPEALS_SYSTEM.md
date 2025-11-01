# Suspension Appeals System

## Overview

The Suspension Appeals System allows suspended users to appeal their suspensions, and provides admins with tools to review and process these appeals. This creates a fair and transparent moderation system with proper checks and balances.

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SUSPENSION FLOW                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  User Violates Rules → Strike Added → 3 Strikes → Suspended    │
│                                                                  │
│                              ↓                                   │
│                                                                  │
│                    User Can Appeal Suspension                    │
│                                                                  │
│                              ↓                                   │
│                                                                  │
│              ┌───────────────────────────────┐                  │
│              │   SUSPENSION_APPEALS TABLE    │                  │
│              ├───────────────────────────────┤                  │
│              │ • Appeal Reason               │                  │
│              │ • Status (pending/approved)   │                  │
│              │ • Admin Review                │                  │
│              └───────────────────────────────┘                  │
│                              ↓                                   │
│                                                                  │
│                    Admin Reviews Appeal                          │
│                                                                  │
│                    ┌──────────┬──────────┐                      │
│                    │          │          │                      │
│                 APPROVE    REJECT    IGNORE                      │
│                    │          │          │                      │
│                    ↓          ↓          ↓                      │
│              Suspension  Appeal    User Remains                 │
│              Lifted     Rejected   Suspended                    │
│              User Active           Until End Date               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### `suspension_appeals` Table

```sql
CREATE TABLE suspension_appeals (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Foreign Keys
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  suspension_id UUID NOT NULL REFERENCES user_suspensions(id) ON DELETE CASCADE,
  
  -- Appeal Content
  appeal_reason TEXT NOT NULL,       -- 50-2000 characters
  additional_context TEXT,            -- Optional, max 1000 characters
  
  -- Appeal Status
  status TEXT DEFAULT 'pending' NOT NULL
    CHECK (status IN ('pending', 'under_review', 'approved', 'rejected')),
  
  -- Admin Review
  reviewed_by UUID REFERENCES users(id),
  reviewed_at TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,                   -- Internal notes (not shown to user)
  rejection_reason TEXT,              -- User-facing rejection reason
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  
  -- Constraints
  UNIQUE (suspension_id)  -- One appeal per suspension
);
```

### Indexes

```sql
CREATE INDEX idx_suspension_appeals_user_id ON suspension_appeals(user_id);
CREATE INDEX idx_suspension_appeals_suspension_id ON suspension_appeals(suspension_id);
CREATE INDEX idx_suspension_appeals_status ON suspension_appeals(status);
CREATE INDEX idx_suspension_appeals_created ON suspension_appeals(created_at DESC);
```

---

## API Endpoints

### User Endpoints

#### 1. Submit Appeal

**POST** `/api/appeals`

Submit an appeal for an active suspension.

**Requirements:**
- User must be currently suspended
- User can only have one appeal per suspension
- Appeal reason must be 50-2000 characters

**Request Body:**
```json
{
  "appeal_reason": "I believe my suspension was unfair because...",
  "additional_context": "Additional information that may help..."
}
```

**Response:**
```json
{
  "id": "appeal-uuid",
  "user_id": "user-uuid",
  "suspension_id": "suspension-uuid",
  "appeal_reason": "I believe my suspension was unfair because...",
  "additional_context": "Additional information...",
  "status": "pending",
  "reviewed_by": null,
  "reviewed_at": null,
  "rejection_reason": null,
  "created_at": "2025-10-31T10:00:00Z",
  "updated_at": "2025-10-31T10:00:00Z"
}
```

**Error Cases:**
- `400` - User not suspended
- `400` - No active suspension found
- `400` - Appeal already exists for this suspension
- `400` - Appeal reason too short/long

---

#### 2. Get My Appeals

**GET** `/api/appeals/my`

Get all appeals submitted by the current user.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "appeal-uuid",
      "user_id": "user-uuid",
      "suspension_id": "suspension-uuid",
      "appeal_reason": "...",
      "status": "pending",
      "suspension_type": "temporary",
      "suspension_number": 1,
      "created_at": "2025-10-31T10:00:00Z"
    }
  ],
  "total": 1
}
```

---

#### 3. Get Appeal Details

**GET** `/api/appeals/{appeal_id}`

Get details of a specific appeal (user can only view their own).

**Response:**
```json
{
  "id": "appeal-uuid",
  "user_id": "user-uuid",
  "suspension_id": "suspension-uuid",
  "appeal_reason": "...",
  "additional_context": "...",
  "status": "rejected",
  "reviewed_by": "admin-uuid",
  "reviewed_at": "2025-10-31T12:00:00Z",
  "rejection_reason": "Appeal does not provide sufficient evidence...",
  "created_at": "2025-10-31T10:00:00Z",
  "updated_at": "2025-10-31T12:00:00Z"
}
```

---

### Admin Endpoints

#### 1. Get All Appeals

**GET** `/api/admin/appeals`

Get all appeals with optional filters.

**Query Parameters:**
- `status_filter` - Filter by status: `pending`, `under_review`, `approved`, `rejected`
- `limit` - Results per page (1-100, default: 50)
- `offset` - Pagination offset (default: 0)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "appeal-uuid",
      "user_id": "user-uuid",
      "user_email": "user@example.com",
      "user_username": "username",
      "suspension_id": "suspension-uuid",
      "suspension_type": "temporary",
      "suspension_number": 1,
      "appeal_reason": "...",
      "status": "pending",
      "created_at": "2025-10-31T10:00:00Z"
    }
  ],
  "total": 15
}
```

---

#### 2. Review Appeal

**PATCH** `/api/admin/appeals/{appeal_id}/review`

Approve or reject an appeal.

**Request Body:**
```json
{
  "decision": "approve",  // or "reject"
  "admin_notes": "Internal notes about the decision",
  "rejection_reason": "Required if decision is 'reject'"
}
```

**Approve Effect:**
- Appeal status → `approved`
- Suspension status → `lifted`
- User account_status → `active`
- User strike_count → `0`
- Suspension end → `null`

**Reject Effect:**
- Appeal status → `rejected`
- User remains suspended
- Rejection reason shown to user

**Response:**
```json
{
  "id": "appeal-uuid",
  "user_id": "user-uuid",
  "suspension_id": "suspension-uuid",
  "status": "approved",
  "reviewed_by": "admin-uuid",
  "reviewed_at": "2025-10-31T12:00:00Z",
  "admin_notes": "Appeal approved, content was misclassified",
  "created_at": "2025-10-31T10:00:00Z",
  "updated_at": "2025-10-31T12:00:00Z"
}
```

**Error Cases:**
- `404` - Appeal not found
- `400` - Appeal already reviewed
- `400` - Missing rejection_reason when rejecting

---

#### 3. Get Appeal Statistics

**GET** `/api/admin/appeals/stats`

Get appeal statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "pending": 5,
    "under_review": 2,
    "approved": 12,
    "rejected": 8,
    "total": 27
  }
}
```

---

## User Flow

### 1. User Gets Suspended

```
User violates community guidelines
  ↓
Strike count reaches 3
  ↓
User automatically suspended for 7 days
  ↓
User sees suspension screen
```

### 2. User Submits Appeal

```
User navigates to suspension screen
  ↓
Clicks "Appeal Suspension" button
  ↓
Fills out appeal form:
  - Appeal reason (50-2000 chars)
  - Additional context (optional)
  ↓
Submits appeal
  ↓
Appeal status: "pending"
```

### 3. Admin Reviews Appeal

```
Admin opens appeals dashboard
  ↓
Filters by "pending" appeals
  ↓
Reviews appeal details:
  - User information
  - Suspension details
  - Violation history
  - Appeal reason
  ↓
Makes decision:
  - Approve → User unsuspended
  - Reject → User stays suspended
```

### 4. User Receives Decision

```
If Approved:
  - Account reactivated immediately
  - Strike count reset to 0
  - Can post/interact normally
  - Notification: "Your appeal was approved"

If Rejected:
  - Remains suspended
  - Can see rejection reason
  - Must wait until suspension ends
  - Notification: "Your appeal was rejected: [reason]"
```

---

## Frontend Implementation Guide

### User Interface (Client App)

#### 1. Suspended Screen Enhancement

Update `client/app/suspended.tsx` to include appeal functionality:

```typescript
import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';

export default function SuspendedScreen() {
  const { user } = useAuth();
  const [appealReason, setAppealReason] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [appealStatus, setAppealStatus] = useState<string | null>(null);

  const handleSubmitAppeal = async () => {
    if (appealReason.length < 50) {
      alert('Appeal reason must be at least 50 characters');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/appeals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          appeal_reason: appealReason,
          additional_context: additionalContext
        })
      });

      if (response.ok) {
        setAppealStatus('submitted');
        alert('Appeal submitted successfully');
      } else {
        const error = await response.json();
        alert(error.detail || 'Failed to submit appeal');
      }
    } catch (error) {
      alert('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View>
      <Text>Your account is suspended</Text>
      <Text>Suspension ends: {user?.suspension_end}</Text>
      
      {appealStatus !== 'submitted' && (
        <View>
          <Text>Appeal Your Suspension</Text>
          <TextInput
            placeholder="Explain why you believe this suspension is unfair (min 50 characters)"
            value={appealReason}
            onChangeText={setAppealReason}
            multiline
            maxLength={2000}
          />
          <TextInput
            placeholder="Additional context (optional)"
            value={additionalContext}
            onChangeText={setAdditionalContext}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity 
            onPress={handleSubmitAppeal}
            disabled={submitting || appealReason.length < 50}
          >
            <Text>Submit Appeal</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {appealStatus === 'submitted' && (
        <Text>Your appeal has been submitted and is pending review.</Text>
      )}
    </View>
  );
}
```

#### 2. Appeal Service

Create `client/services/appealService.ts`:

```typescript
import { API_URL } from '@/config/api';

export interface Appeal {
  id: string;
  user_id: string;
  suspension_id: string;
  appeal_reason: string;
  additional_context?: string;
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  reviewed_by?: string;
  reviewed_at?: string;
  rejection_reason?: string;
  created_at: string;
  updated_at: string;
}

export const appealService = {
  async submitAppeal(appealReason: string, additionalContext?: string): Promise<Appeal> {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/api/appeals`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        appeal_reason: appealReason,
        additional_context: additionalContext
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to submit appeal');
    }

    return response.json();
  },

  async getMyAppeals(): Promise<{ data: Appeal[]; total: number }> {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/api/appeals/my`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch appeals');
    }

    return response.json();
  },

  async getAppeal(appealId: string): Promise<Appeal> {
    const token = await getAuthToken();
    const response = await fetch(`${API_URL}/api/appeals/${appealId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to fetch appeal');
    }

    return response.json();
  }
};
```

---

### Admin Panel Implementation

#### 1. Appeals Management Page

Create `admin/src/pages/moderation/ManageAppeals.js`:

```javascript
import React, { useState, useEffect } from 'react';
import { appealAdminService } from '../../services/appealAdminService';

export default function ManageAppeals() {
  const [appeals, setAppeals] = useState([]);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [loading, setLoading] = useState(true);
  const [selectedAppeal, setSelectedAppeal] = useState(null);

  useEffect(() => {
    loadAppeals();
  }, [statusFilter]);

  const loadAppeals = async () => {
    setLoading(true);
    try {
      const response = await appealAdminService.getAppeals(statusFilter);
      setAppeals(response.data);
    } catch (error) {
      console.error('Failed to load appeals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReview = async (appealId, decision, adminNotes, rejectionReason) => {
    try {
      await appealAdminService.reviewAppeal(appealId, {
        decision,
        admin_notes: adminNotes,
        rejection_reason: rejectionReason
      });
      
      alert(`Appeal ${decision === 'approve' ? 'approved' : 'rejected'} successfully`);
      loadAppeals();
      setSelectedAppeal(null);
    } catch (error) {
      alert('Failed to review appeal: ' + error.message);
    }
  };

  return (
    <div>
      <h1>Suspension Appeals</h1>
      
      {/* Filter Tabs */}
      <div>
        <button onClick={() => setStatusFilter('pending')}>
          Pending
        </button>
        <button onClick={() => setStatusFilter('under_review')}>
          Under Review
        </button>
        <button onClick={() => setStatusFilter('approved')}>
          Approved
        </button>
        <button onClick={() => setStatusFilter('rejected')}>
          Rejected
        </button>
      </div>

      {/* Appeals List */}
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Suspension Type</th>
            <th>Appeal Reason</th>
            <th>Status</th>
            <th>Submitted</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {appeals.map(appeal => (
            <tr key={appeal.id}>
              <td>{appeal.user_email}</td>
              <td>{appeal.suspension_type}</td>
              <td>{appeal.appeal_reason.substring(0, 100)}...</td>
              <td>{appeal.status}</td>
              <td>{new Date(appeal.created_at).toLocaleDateString()}</td>
              <td>
                <button onClick={() => setSelectedAppeal(appeal)}>
                  Review
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Review Modal */}
      {selectedAppeal && (
        <ReviewAppealModal
          appeal={selectedAppeal}
          onClose={() => setSelectedAppeal(null)}
          onReview={handleReview}
        />
      )}
    </div>
  );
}
```

#### 2. Admin Appeal Service

Create `admin/src/services/appealAdminService.js`:

```javascript
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export const appealAdminService = {
  async getAppeals(statusFilter, limit = 50, offset = 0) {
    const token = localStorage.getItem('adminToken');
    const params = { limit, offset };
    if (statusFilter) params.status_filter = statusFilter;

    const response = await axios.get(`${API_URL}/api/admin/appeals`, {
      headers: { Authorization: `Bearer ${token}` },
      params
    });
    return response.data;
  },

  async reviewAppeal(appealId, reviewData) {
    const token = localStorage.getItem('adminToken');
    const response = await axios.patch(
      `${API_URL}/api/admin/appeals/${appealId}/review`,
      reviewData,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },

  async getStats() {
    const token = localStorage.getItem('adminToken');
    const response = await axios.get(`${API_URL}/api/admin/appeals/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data;
  }
};
```

---

## Security Considerations

### 1. Rate Limiting

Implement rate limiting to prevent appeal spam:

```python
# In suspension_appeals.py
from fastapi_limiter.depends import RateLimiter

@user_router.post("", dependencies=[Depends(RateLimiter(times=3, hours=24))])
async def submit_appeal(...):
    # User can only submit 3 appeals per 24 hours
    pass
```

### 2. Input Validation

- Appeal reason: 50-2000 characters
- Additional context: max 1000 characters
- Sanitize all user input to prevent XSS

### 3. Authorization

- Users can only view/submit their own appeals
- Only admins can review appeals
- Admins cannot review their own appeals (future enhancement)

### 4. Audit Trail

All appeal actions are logged:
- Appeal submission
- Admin review (approve/reject)
- Suspension lift

---

## Testing Checklist

### User Flow
- [ ] Suspended user can submit appeal
- [ ] Appeal requires minimum 50 characters
- [ ] User cannot submit multiple appeals for same suspension
- [ ] User can view their appeal status
- [ ] User sees rejection reason if appeal rejected

### Admin Flow
- [ ] Admin can view all appeals
- [ ] Admin can filter by status
- [ ] Admin can approve appeal (suspension lifted)
- [ ] Admin can reject appeal with reason
- [ ] Admin cannot review already-reviewed appeals

### Edge Cases
- [ ] Non-suspended user cannot submit appeal
- [ ] Appeal for expired suspension handled correctly
- [ ] Concurrent appeal reviews handled properly
- [ ] Database constraints enforced (one appeal per suspension)

---

## Future Enhancements

1. **Email Notifications**
   - Notify user when appeal is reviewed
   - Notify admins of new appeals

2. **Appeal Evidence**
   - Allow users to attach screenshots/evidence
   - Store evidence in Supabase Storage

3. **Multi-Admin Review**
   - Require 2+ admins to approve appeal
   - Prevent single admin bias

4. **Appeal History**
   - Track all appeals across all suspensions
   - Show appeal success rate to admins

5. **Automated Appeals**
   - Auto-approve appeals for certain violation types
   - ML model to flag suspicious appeals

---

## Migration Instructions

### 1. Run Database Migration

```bash
# Connect to Supabase and run:
psql -h your-supabase-host -U postgres -d postgres -f admin/migrations/005_create_suspension_appeals_table.sql
```

### 2. Deploy Backend

```bash
cd server
# Backend routes already registered in main.py
python main.py
```

### 3. Test API

```bash
# Test user appeal submission
curl -X POST http://localhost:8000/api/appeals \
  -H "Authorization: Bearer USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "appeal_reason": "I believe this suspension was unfair because the content was taken out of context...",
    "additional_context": "I was discussing legal precedents"
  }'

# Test admin review
curl -X PATCH http://localhost:8000/api/admin/appeals/APPEAL_ID/review \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "decision": "approve",
    "admin_notes": "Content was indeed discussing legal matters"
  }'
```

---

## Summary

The Suspension Appeals System provides:

✅ **Fair Process** - Users can contest unfair suspensions  
✅ **Admin Control** - Admins review and decide on appeals  
✅ **Transparency** - Clear reasons for decisions  
✅ **Audit Trail** - Complete history of all appeals  
✅ **One Appeal Per Suspension** - Prevents spam  
✅ **Automatic Unsuspension** - Approved appeals lift suspension immediately  

This creates a balanced moderation system that protects the community while giving users recourse for unfair actions.
