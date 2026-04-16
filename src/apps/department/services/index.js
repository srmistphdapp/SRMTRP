// Department Services Index - Central export for all department-related services

// Department user authentication and profile services
export {
  fetchLoggedInDepartmentUser,
  updateDepartmentUserProfile,
  getDepartmentUserPermissions,
  logDepartmentUserActivity,
  getDepartmentUserActivityHistory,
  validateDepartmentUserSession,
  signOutDepartmentUser,
  changeDepartmentUserPassword,
  getDepartmentConfiguration
} from './departmentService';

// Department scholar management services
export {
  fetchScholarsForDepartmentUser,
  fetchScholarsForDepartmentUserFlexible,
  fetchDepartmentSpecificScholars, // Legacy compatibility function
  updateDeptReview,
  updateDeptReviewStatus,
  approveScholar,
  rejectScholar,
  sendQueryToScholar,
  approveScholarAtDepartment,
  rejectScholarAtDepartment,
  addQueryToScholarDeptReview,
  forwardScholarFromDepartment,
  forwardScholar,
  revertScholar,
  addQueryToScholar,
  getDepartmentStatistics,
  getDepartmentShortCode,
  getExpectedStatusByFaculty,
  getScholarDeptReviewStatus,
  bulkUpdateDeptReviewStatus,
  checkAndUpdateDeptReviewBasedOnStatus,
  monitorAndUpdateDeptReviewForAllScholars
} from './departmentScholarService';

// Default export with all services grouped
export default {
  // User services
  user: {
    fetchLoggedInDepartmentUser,
    updateDepartmentUserProfile,
    getDepartmentUserPermissions,
    logDepartmentUserActivity,
    getDepartmentUserActivityHistory,
    validateDepartmentUserSession,
    signOutDepartmentUser,
    changeDepartmentUserPassword,
    getDepartmentConfiguration
  },
  
  // Scholar services
  scholar: {
    fetchScholarsForDepartmentUser,
    fetchScholarsForDepartmentUserFlexible,
    fetchDepartmentSpecificScholars, // Legacy compatibility
    updateDeptReview,
    updateDeptReviewStatus,
    approveScholar,
    rejectScholar,
    sendQueryToScholar,
    approveScholarAtDepartment,
    rejectScholarAtDepartment,
    addQueryToScholarDeptReview,
    forwardScholarFromDepartment,
    forwardScholar,
    revertScholar,
    addQueryToScholar,
    getDepartmentStatistics,
    getScholarDeptReviewStatus,
    bulkUpdateDeptReviewStatus,
    checkAndUpdateDeptReviewBasedOnStatus,
    monitorAndUpdateDeptReviewForAllScholars
  },
  
  // Utility functions
  utils: {
    getDepartmentShortCode,
    getExpectedStatusByFaculty
  }
};