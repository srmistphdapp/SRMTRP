# Department Services

This directory contains all service files related to department operations in the PhD application system.

## Service Files

### 1. `departmentService.js`
Handles department user authentication, profile management, and general department operations.

**Key Functions:**
- `fetchLoggedInDepartmentUser()` - Get current logged-in department user info
- `updateDepartmentUserProfile()` - Update user profile
- `getDepartmentUserPermissions()` - Get user permissions based on role
- `validateDepartmentUserSession()` - Validate current session
- `signOutDepartmentUser()` - Sign out user
- `changeDepartmentUserPassword()` - Change user password
- `getDepartmentConfiguration()` - Get department-specific configuration

### 2. `departmentScholarService.js`
Handles scholar management operations specific to department users.

**Key Functions:**
- `fetchScholarsForDepartmentUser()` - Fetch scholars with precise status/faculty_status filtering
- `fetchScholarsForDepartmentUserFlexible()` - Fetch scholars with flexible filtering
- `updateScholarStatusForDepartment()` - Update scholar status
- `approveScholarAtDepartment()` - Approve scholar at department level
- `rejectScholarAtDepartment()` - Reject scholar at department level
- `forwardScholarFromDepartment()` - Forward scholar to next level
- `addQueryToScholar()` - Add query/comment to scholar record
- `getDepartmentStatistics()` - Get department statistics

### 3. `index.js`
Central export file for all department services. Provides both named exports and grouped default export.

## Usage Examples

### Basic Import
```javascript
import { fetchLoggedInDepartmentUser, fetchScholarsForDepartmentUser } from '../services';
```

### Grouped Import
```javascript
import departmentServices from '../services';

// Use services
const user = await departmentServices.user.fetchLoggedInDepartmentUser();
const scholars = await departmentServices.scholar.fetchScholarsForDepartmentUser(faculty, department);
```

### Specific Service Import
```javascript
import { fetchScholarsForDepartmentUser } from '../services/departmentScholarService';
import { fetchLoggedInDepartmentUser } from '../services/departmentService';
```

## Data Flow

### Scholar Filtering Logic
The department services implement precise filtering based on:

1. **User Authentication**: Get department user from `department_users` table
2. **Department Code**: Convert full department name to short code (e.g., "Computer Science Engineering" → "CSE")
3. **Status Filtering**: Filter by faculty-specific status (e.g., "Forwarded to Engineering")
4. **Faculty Status Filtering**: Filter by department-specific faculty_status (e.g., "FORWARDED_TO_CSE")

### Example Flow for CSE Department
```
User Login → department_users table
↓
Get: faculty = "Faculty of Engineering & Technology"
     department = "Computer Science Engineering"
     departmentCode = "CSE"
↓
Query: status = "Forwarded to Engineering" 
       AND faculty_status = "FORWARDED_TO_CSE"
↓
Display: Only CSE-specific scholars
```

## Department Code Mapping

The services automatically map full department names to short codes:

- Computer Science Engineering → CSE
- Electronics and Communication Engineering → ECE
- Mechanical Engineering → MECH
- Civil Engineering → CIVIL
- Biotechnology → BIO
- Chemistry → CHEM
- Physics → PHYSICS
- Mathematics → MATH
- Management → MBA
- Medicine → MEDICINE

## Error Handling

All service functions follow a consistent error handling pattern:

```javascript
try {
  const { data, error } = await serviceFunction();
  
  if (error) {
    console.error('❌ Error:', error);
    return { data: null, error };
  }
  
  return { data, error: null };
} catch (err) {
  console.error('❌ Exception:', err);
  return { data: null, error: err };
}
```

## Logging

Services include comprehensive logging with emojis for easy identification:
- 🔍 Fetching data
- ✅ Success operations
- ❌ Errors and exceptions
- 🔄 Update operations
- 📊 Statistics
- 📋 Data samples

## Security

- All operations require authenticated users
- Department users can only access scholars assigned to their department
- Role-based permissions control available actions
- Session validation ensures secure access