# Revert Button Fix for Rejected Scholars

## Problem Identified
The revert button in the RejectedScholars component was not working properly to revert rejected scholars back to pending status.

## Root Cause
The `revertScholar` service function had logic that preserved the 'Rejected' status instead of changing it to 'Pending' when reverting:

```javascript
// PROBLEMATIC CODE
if (currentScholar.dept_review !== 'Rejected') {
  updates.dept_review = 'Pending';  // Only set to Pending if NOT rejected
} else {
  // Do nothing - preserve 'Rejected' status  ❌ This was the problem
}
```

This meant that when clicking the revert button on a rejected scholar:
1. ✅ `dept_status` was set to 'Revert' 
2. ❌ `dept_review` remained 'Rejected' (should change to 'Pending')
3. ❌ Scholar stayed in RejectedScholars list (should move to pending)

## Solution Applied
Modified the `revertScholar` function to always set `dept_review = 'Pending'` when reverting, regardless of the current status:

```javascript
// FIXED CODE
const updates = {
  dept_status: 'Revert',
  dept_review: 'Pending'  // ✅ Always set to Pending when reverting
};
```

## Complete Revert Flow (Fixed)

### Step 1: User Clicks Revert Button
1. **RejectedScholars component** → User clicks revert button on a rejected scholar
2. **Confirmation modal** → User confirms the revert action
3. **Service call** → `handleConfirmRevert()` calls `revertScholar(scholarId)`

### Step 2: Database Update
1. **Fetch current status** → Gets scholar's current `dept_review` and `dept_status`
2. **Database update** → Sets `dept_review = 'Pending'` AND `dept_status = 'Revert'`
3. **Logging** → Logs the status change for debugging

### Step 3: Local State Update
1. **Local state update** → Updates scholar with new status in component state
2. **UI feedback** → Shows success message "Scholar status reverted to pending"
3. **Data refresh** → Triggers refresh after 1 second to sync with backend

### Step 4: UI Changes
1. **Scholar disappears** → From RejectedScholars list (no longer has `deptReview === 'Rejected'`)
2. **Scholar appears** → In ScholarApplications as pending (has `deptReview === 'Pending'`)
3. **Action buttons** → Enabled in ScholarApplications for approve/reject/query

## Technical Details

### Database Changes
```sql
-- Before revert
UPDATE scholar_applications 
SET dept_review = 'Rejected', reject_reason = 'Some reason'
WHERE id = scholar_id;

-- After revert button click
UPDATE scholar_applications 
SET dept_review = 'Pending', dept_status = 'Revert'
WHERE id = scholar_id;
```

### Component Filtering
```javascript
// RejectedScholars.js - Only shows rejected scholars
const filtered = scholarList.filter(s =>
  s.deptReview === 'Rejected' &&  // After revert, this becomes false
  // ... other filters
);

// ScholarApplications.js - Shows all scholars for department
// After revert, scholar appears here with deptReview = 'Pending'
```

### Local State Updates
```javascript
// RejectedScholars component updates local state after revert
const updates = {
  verificationStatus: 'Pending',
  deptReview: 'Pending',           // ✅ Changed from 'Rejected' to 'Pending'
  approvalTimestamp: null,
  rejectionReason: null,           // ✅ Cleared rejection reason
  forwarded: false,
  forwardingTimestamp: null,
  approved: false,
  _supabaseData: {
    ...scholar._supabaseData,
    deptStatus: 'Revert',          // ✅ Set revert status
    deptReview: 'Pending'          // ✅ Set pending review
  }
};
```

## Key Improvements

### ✅ 1. Proper Status Change
- **Before**: `dept_review` remained 'Rejected' after revert
- **After**: `dept_review` changes to 'Pending' after revert

### ✅ 2. Correct UI Behavior  
- **Before**: Scholar stayed in RejectedScholars list after revert
- **After**: Scholar disappears from RejectedScholars and appears in ScholarApplications

### ✅ 3. Complete Reset
- **Rejection reason**: Cleared when reverting
- **Timestamps**: Reset to null
- **Status flags**: Reset to pending state

### ✅ 4. Consistent Behavior
- **Same logic**: Works for both approved and rejected scholars
- **Predictable results**: Revert always means "back to pending"
- **Clear purpose**: Revert button undoes the previous decision

## Usage Scenarios

### Scenario 1: Revert Rejected Scholar
1. **Scholar rejected** → `dept_review = 'Rejected'`, appears in RejectedScholars
2. **Click revert** → Confirmation modal appears
3. **Confirm revert** → `dept_review = 'Pending'`, `dept_status = 'Revert'`
4. **Result** → Scholar disappears from RejectedScholars, appears in ScholarApplications as pending

### Scenario 2: Revert Approved Scholar (from ApprovedScholars)
1. **Scholar approved** → `dept_review = 'Approved'`, appears in ApprovedScholars  
2. **Click revert** → Confirmation modal appears
3. **Confirm revert** → `dept_review = 'Pending'`, `dept_status = 'Revert'`
4. **Result** → Scholar disappears from ApprovedScholars, appears in ScholarApplications as pending

## Status: ✅ FIXED

The revert button in RejectedScholars now works correctly:
1. ✅ **Database update** → Changes `dept_review` from 'Rejected' to 'Pending'
2. ✅ **UI update** → Scholar disappears from RejectedScholars list
3. ✅ **Status reset** → Scholar appears in ScholarApplications as pending
4. ✅ **Action buttons** → Enabled for approve/reject/query actions
5. ✅ **Complete revert** → Undoes the rejection decision entirely

Rejected scholars can now be properly reverted back to pending status for re-evaluation.