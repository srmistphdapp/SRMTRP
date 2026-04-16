# Revert Button - Clear Rejection Reason Fix

## Enhancement Applied
Updated the revert functionality to clear the `reject_reason` column when reverting a rejected scholar back to pending status.

## Rationale
When a scholar is reverted from rejected status back to pending:
- The rejection decision is being undone
- The rejection reason is no longer valid
- The scholar should have a clean slate for re-evaluation
- The `reject_reason` should be cleared (set to NULL)

## Implementation

### Database Update
The `revertScholar` service function now updates three columns:

```javascript
const updates = {
  dept_status: 'Revert',        // Mark as reverted
  dept_review: 'Pending',       // Change status back to pending
  reject_reason: null           // ✅ Clear rejection reason
};
```

### Complete Database Flow
```sql
-- When scholar is rejected
UPDATE scholar_applications 
SET dept_review = 'Rejected', 
    reject_reason = 'Insufficient documentation'
WHERE id = scholar_id;

-- When scholar is reverted
UPDATE scholar_applications 
SET dept_review = 'Pending', 
    dept_status = 'Revert',
    reject_reason = NULL        -- ✅ Rejection reason cleared
WHERE id = scholar_id;
```

## Benefits

### ✅ 1. Clean Slate for Re-evaluation
- **No residual rejection data** when scholar is re-evaluated
- **Fresh start** for the approval process
- **No confusion** from old rejection reasons

### ✅ 2. Data Integrity
- **Consistent state** - pending scholars don't have rejection reasons
- **Logical flow** - rejection reason only exists when status is rejected
- **Clean database** - no orphaned rejection data

### ✅ 3. User Experience
- **Clear status** - scholar appears as truly pending, not "pending with old rejection"
- **No misleading data** - old rejection reasons don't appear in views
- **Proper reset** - complete undo of the rejection decision

## Complete Revert Process

### Step 1: Scholar Rejection
1. **Reject scholar** → `dept_review = 'Rejected'`
2. **Save reason** → `reject_reason = 'Some reason'`
3. **Scholar appears** → In RejectedScholars list with reason displayed

### Step 2: Scholar Revert
1. **Click revert** → In RejectedScholars component
2. **Confirm action** → User confirms revert decision
3. **Database update** → Three columns updated:
   - `dept_review = 'Pending'`
   - `dept_status = 'Revert'`
   - `reject_reason = NULL` ✅

### Step 3: Clean State
1. **Scholar disappears** → From RejectedScholars (no longer rejected)
2. **Scholar appears** → In ScholarApplications as pending
3. **No rejection data** → `reject_reason` is NULL, no residual rejection info
4. **Ready for re-evaluation** → Can be approved, rejected (with new reason), or queried

## Data Consistency

### Rejected Scholar State
```javascript
{
  dept_review: 'Rejected',
  reject_reason: 'Insufficient documentation',
  dept_status: null
}
```

### Reverted Scholar State  
```javascript
{
  dept_review: 'Pending',
  reject_reason: null,           // ✅ Cleared
  dept_status: 'Revert'
}
```

### Re-approved Scholar State
```javascript
{
  dept_review: 'Approved',
  reject_reason: null,           // ✅ Still null
  dept_status: 'Revert'          // Keeps revert history
}
```

## UI Impact

### RejectedScholars Component
- **Before revert**: Shows scholar with rejection reason
- **After revert**: Scholar disappears (no longer rejected)

### ScholarApplications Component  
- **After revert**: Scholar appears as pending with no rejection reason
- **Clean display**: No residual rejection data shown
- **Fresh evaluation**: Can be processed as if never rejected

### ApprovedScholars Component
- **If re-approved**: Scholar appears with no rejection history
- **Clean record**: No indication of previous rejection

## Status: ✅ ENHANCED

The revert functionality now provides a complete reset:
1. ✅ **Status reset** → `dept_review` changes from 'Rejected' to 'Pending'
2. ✅ **Reason cleared** → `reject_reason` set to NULL
3. ✅ **Revert tracked** → `dept_status` set to 'Revert' for audit trail
4. ✅ **Clean slate** → Scholar ready for fresh evaluation
5. ✅ **Data integrity** → No orphaned rejection data

Rejected scholars can now be completely reverted with all rejection data cleared, providing a true "undo" of the rejection decision.