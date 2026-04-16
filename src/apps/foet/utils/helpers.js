// Utility Functions

// Generate unique ID
export const generateUniqueId = (prefix) => `${prefix}-${Date.now()}`;

// Get faculty details
export const getFacultyDetails = (campusId, facultyId, data) => {
  return data[campusId]?.faculties?.find(f => f.id === facultyId);
};

// Get faculty by department name
export const getFacultyByDepartmentFromAll = (departmentName, campusId, data) => {
  const campusData = data[campusId];
  if (!campusData) return { facultyName: 'N/A', facultyId: null };
  
  for (const faculty of campusData.faculties) {
    if (faculty.departments.some(d => d.name === departmentName)) {
      return { facultyName: faculty.name, facultyId: faculty.id };
    }
  }
  return { facultyName: 'N/A', facultyId: null };
};

// Check CGPA eligibility
export const checkCGPAEligibility = (scholar, campusId, facultyId, cgpaEligibilityCriteria, data) => {
  const campusName = data[campusId]?.name;
  const { facultyId: scholarFacultyId } = getFacultyByDepartmentFromAll(scholar.Specialization, campusId, data);
  const criteria = cgpaEligibilityCriteria[campusName]?.[scholarFacultyId]?.[scholar.Specialization];
  
  if (!criteria) return { eligible: false, reason: 'No criteria defined.', requiredCGPA: 'N/A' };
  
  const requiredCGPA = scholar['Mode of Study'] === 'Full Time' ? criteria.fullTime : criteria.partTime;
  const eligible = (scholar.cgpa || 0) >= requiredCGPA;
  return { eligible, requiredCGPA };
};

// Find duplicate scholars
export const findDuplicates = (scholarList) => {
  const seen = {};
  const duplicates = new Set();
  
  scholarList.forEach(s => {
    const key = `${s['Application Number']}-${s['Registered Mobile']}`;
    if (seen[key]) {
      duplicates.add(seen[key]);
      duplicates.add(s.id);
    } else {
      seen[key] = s.id;
    }
  });
  
  return scholarList.filter(s => duplicates.has(s.id));
};

// Format date
export const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleString();
};

// Download Excel file
export const downloadExcel = (data, filename) => {
  // This would require xlsx library to be imported in the component
  // For now, just return the data structure
  return { data, filename };
};

// Validate file upload
export const validateFileUpload = (file, maxSize = 2 * 1024 * 1024, allowedTypes = ['image/']) => {
  if (!file) return { valid: false, error: 'No file selected' };
  
  if (file.size > maxSize) {
    return { valid: false, error: 'File size too large' };
  }
  
  const isValidType = allowedTypes.some(type => file.type.startsWith(type));
  if (!isValidType) {
    return { valid: false, error: 'Invalid file type' };
  }
  
  return { valid: true };
};

// Filter and sort data
export const filterAndSortData = (data, filters, searchTerm, sortOrder, sortField) => {
  let filteredData = [...data];
  
  // Apply filters
  Object.entries(filters).forEach(([key, value]) => {
    if (value !== 'All' && value !== '') {
      filteredData = filteredData.filter(item => item[key] === value);
    }
  });
  
  // Apply search
  if (searchTerm) {
    const searchLower = searchTerm.toLowerCase();
    filteredData = filteredData.filter(item =>
      Object.values(item).some(val =>
        String(val).toLowerCase().includes(searchLower)
      )
    );
  }
  
  // Apply sort with null safety
  if (sortField) {
    filteredData.sort((a, b) => {
      const aVal = (a[sortField] || '').toString();
      const bVal = (b[sortField] || '').toString();
      
      if (sortOrder === 'asc') {
        return aVal.localeCompare(bVal);
      } else {
        return bVal.localeCompare(aVal);
      }
    });
  }
  
  return filteredData;
};

// Create status badge class
export const getStatusBadgeClass = (status) => {
  const statusClasses = {
    'Approved': 'bg-green-100 text-green-800',
    'Rejected': 'bg-red-100 text-red-800',
    'In Review': 'bg-yellow-100 text-yellow-800',
    'Pending': 'bg-gray-100 text-gray-800',
    'Verified': 'bg-blue-100 text-blue-800',
    'Distributed': 'bg-blue-100 text-blue-800',
    'Pending Distribution': 'bg-yellow-100 text-yellow-800'
  };
  
  return statusClasses[status] || 'bg-gray-100 text-gray-800';
};

// Debounce function for search
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};