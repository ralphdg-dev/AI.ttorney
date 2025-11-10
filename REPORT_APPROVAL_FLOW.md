# Report Approval Flow

## Overview
When an admin approves a report for a forum reply, the system executes a comprehensive moderation workflow that includes status updates, violation tracking, content removal, and user notifications.

---

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                     ADMIN APPROVES REPORT                            │
│                  (Clicks "Approve Report")                           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                  CONFIRMATION MODAL APPEARS                          │
│              "Are you sure you want to approve?"                     │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│              ADMIN CONFIRMS APPROVAL ACTION                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 API CALL TO BACKEND                                  │
│     PUT /reports/replies/{report_id}/resolve                         │
│     Body: { "action": "sanctioned" }                                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 1: FETCH REPORT DETAILS                                        │
│  ─────────────────────────────────────────────────────────────────  │
│  • Query: reported_replies table                                     │
│  • Include: reply data, user data, reporter data                     │
│  • Validate: report exists and reply exists                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 2: UPDATE REPORT STATUS                                        │
│  ─────────────────────────────────────────────────────────────────  │
│  • Table: reported_replies                                           │
│  • Update: status = 'sanctioned'                                     │
│  • Update: updated_at = now()                                        │
│  • Result: Report marked as approved                                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 3: CREATE USER VIOLATION RECORD                                │
│  ─────────────────────────────────────────────────────────────────  │
│  • Table: user_violations                                            │
│  • Insert new record:                                                │
│    - user_id: violating user's ID                                    │
│    - content_text: reply body                                        │
│    - content_id: reply ID                                            │
│    - violation_type: mapped from report reason                       │
│      (spam, harassment, hate_speech, etc.)                           │
│    - violation_summary: "Reply reported for {reason}"                │
│    - action_taken: 'strike_added'                                    │
│    - strike_count_after: current strikes + 1                         │
│    - created_at: now()                                               │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 4: ADD STRIKE TO USER                                          │
│  ─────────────────────────────────────────────────────────────────  │
│  • Service: violation_tracking_service                               │
│  • Action: Increment user's strike count                             │
│  • Check: If strikes >= threshold, trigger suspension/ban            │
│  • Result: User penalty applied                                      │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 5: HIDE THE REPLY                                              │
│  ─────────────────────────────────────────────────────────────────  │
│  • Table: forum_replies                                              │
│  • Update: hidden = TRUE                                             │
│  • Result: Reply no longer visible to users                          │
│  • Note: Reply still exists in database for audit purposes           │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 6: SEND NOTIFICATION TO VIOLATING USER                         │
│  ─────────────────────────────────────────────────────────────────  │
│  • Service: notification_service                                     │
│  • Type: 'violation_warning'                                         │
│  • Title: "Content Violation Warning"                                │
│  • Message: "Your reply has been removed for violating              │
│              community guidelines: {reason}.                         │
│              A strike has been added to your account."               │
│  • Data: violation_type, content_id, strike_count                    │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 7: CREATE AUDIT LOG ENTRY                                      │
│  ─────────────────────────────────────────────────────────────────  │
│  • Action: "Report approved"                                         │
│  • Performed by: Admin user                                          │
│  • Timestamp: now()                                                  │
│  • Details: report_id, reply_id, user_id                             │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  STEP 8: RETURN SUCCESS RESPONSE                                     │
│  ─────────────────────────────────────────────────────────────────  │
│  • Response:                                                         │
│    {                                                                 │
│      "success": true,                                                │
│      "message": "Report approved successfully",                      │
│      "data": {                                                       │
│        "violation_recorded": true,                                   │
│        "content_hidden": true,                                       │
│        "strike_count": 1,                                            │
│        "notification_sent": true                                     │
│      }                                                               │
│    }                                                                 │
└────────────────────────────┬────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│  FRONTEND: REFRESH TABLE & SHOW SUCCESS                              │
│  ─────────────────────────────────────────────────────────────────  │
│  • Close modal                                                       │
│  • Refresh reports table                                             │
│  • Report status badge changes to "Sanctioned" (green)               │
│  • Audit trail shows "Report approved" entry                         │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Database Changes

### 1. reported_replies Table
```sql
UPDATE reported_replies
SET status = 'sanctioned',
    updated_at = NOW()
WHERE id = {report_id};
```

### 2. user_violations Table (NEW RECORD)
```sql
INSERT INTO user_violations (
    user_id,
    content_text,
    content_id,
    violation_type,
    violation_summary,
    action_taken,
    strike_count_after,
    created_at
) VALUES (
    {violating_user_id},
    {reply_body},
    {reply_id},
    'forum_reply',
    'Reply reported for {reason} and approved by admin',
    'strike_added',
    {current_strikes + 1},
    NOW()
);
```

### 3. forum_replies Table
```sql
UPDATE forum_replies
SET hidden = TRUE
WHERE id = {reply_id};
```

---

## Violation Type Mapping

| Report Reason    | Violation Type           |
|------------------|--------------------------|
| spam             | SPAM                     |
| harassment       | HARASSMENT               |
| hate_speech      | HATE_SPEECH              |
| misinformation   | MISINFORMATION           |
| inappropriate    | INAPPROPRIATE_CONTENT    |
| other            | OTHER                    |

---

## Strike System

- **Strike Added**: Each approved report adds 1 strike to the violating user
- **Strike Tracking**: Stored in `user_violations.strike_count_after`
- **Thresholds** (configurable):
  - 3 strikes → Temporary suspension
  - 5 strikes → Permanent ban

---

## Notification Details

**Notification Type**: `violation_warning`

**Sent To**: User who posted the violating reply

**Content**:
- **Title**: "Content Violation Warning"
- **Message**: "Your reply has been removed for violating community guidelines: {reason}. A strike has been added to your account."
- **Data**:
  ```json
  {
    "violation_type": "spam",
    "content_id": "reply-uuid",
    "strike_count": 1
  }
  ```

---

## Content Visibility

### Hidden Reply Behavior
- **Frontend**: Replies with `hidden = TRUE` are filtered out from queries
- **Database**: Reply data is preserved for audit and appeal purposes
- **User View**: Reply appears as "[This content has been removed]"
- **Admin View**: Admins can still view hidden content in moderation panel

---

## Error Handling

| Error Scenario | HTTP Status | Action |
|----------------|-------------|--------|
| Report not found | 404 | Return error, no changes made |
| Reply not found | 404 | Return error, no changes made |
| Violating user not found | 400 | Return error, no changes made |
| Violation service fails | 500 | Log error, rollback report status |
| Notification fails | 500 | Log error, continue (non-critical) |

---

## Rollback Strategy

If any critical step fails (Steps 3-5), the system should:
1. Log the error with full context
2. Revert report status to 'pending'
3. Return error response to admin
4. Admin can retry the approval

---

## Future Enhancements

1. **Appeal System**: Allow users to appeal violations
2. **Automated Moderation**: Use AI to pre-screen reports
3. **Batch Actions**: Approve/dismiss multiple reports at once
4. **Custom Strike Thresholds**: Per-violation-type strike weights
5. **Notification Preferences**: Let users choose notification channels

---

## Testing Checklist

- [ ] Report status updates correctly
- [ ] User violation record is created
- [ ] Strike count increments
- [ ] Reply is hidden from public view
- [ ] Notification is sent to violating user
- [ ] Audit log entry is created
- [ ] Error handling works for each failure scenario
- [ ] Frontend refreshes and shows updated status
- [ ] Admin can view hidden content in moderation panel
- [ ] Multiple strikes trigger suspension/ban correctly
