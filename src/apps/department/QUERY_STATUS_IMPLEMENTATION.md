# Query Status Implementation

## Overview
This document describes the implementation of query status functionality in the department portal's queries page.

## Feature Description
The action buttons (Approve/Reject) in the queries page are now disabled until the dept_review status changes from "Query" to "Query_Resolved".

## Implementation Details

### Database Schema
- Uses existing `dept_review` field to track query resolution
- New status value: `Query_Resolved` (in addition to existing: `Query`, `Approved`, `Rejected`, `Pending`)

### Components Modified
1. **QueriesPage.js**
   - Added logic to check if dept_review is "Query_Resolved"
   - Disabled action buttons when dept_review is "Query" (not resolved)
   - Enabled action buttons when dept_review is "Query_Resolved"
   - Added visual indicators for query resolution status

### Services Modified
1. **departmentScholarService.js**
   - Updated `updateDeptReview()` to accept "Query_Resolved" status
   - Added `markQueryAsResolved()` helper function
   - Updated validation to include "Query_Resolved"

### UI Changes
1. **Status Display**
   - "Query Pending" → Shows as purple badge when dept_review is "Query"
   - "Query Resolved" → Shows as green badge when dept_review is "Query_Resolved"
   - Updated department review status display in view modal

2. **Action Buttons**
   - Approve/Reject buttons are disabled when dept_review is "Query"
   - Approve/Reject buttons are enabled when dept_review is "Query_Resolved"
   - Added tooltips explaining why buttons are disabled

### Workflow
1. When a query is sent to a scholar, dept_review is set to "Query"
2. Scholar responds to the query (external process)
3. System updates dept_review to "Query_Resolved" when query is resolved
4. Action buttons become enabled for department to approve/reject
5. Status badge changes from purple "Query Pending" to green "Query Resolved"

### Status Flow
```
Query → Query_Resolved → (Approved | Rejected)
```

## Future Enhancements
- Automatic query resolution based on scholar response
- Integration with notification system when queries are resolved
- Query resolution timestamps
- Query resolution history tracking