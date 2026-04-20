// Department Scholar Service - Handles scholar operations specific to department users
import { supabase } from '../../../supabaseClient';
import { generateUniqueDepartmentCode, getInstitutionGroup, getInstitutionPrefix } from '../../../utils/departmentUtils';

/**
 * Generate the exact department code that FOET writes into faculty_status.
 */
const getDepartmentShortCode = (departmentName, facultyName = '') => {
  if (!departmentName) return 'UNKNOWN';
  return generateUniqueDepartmentCode(departmentName, facultyName);
};

// Helper function to get expected forwarding status based on faculty
const getExpectedStatusByFaculty = (faculty) => {
  if (!faculty) return null;
  const group = getInstitutionGroup(faculty);
  if (!group) return null;
  return `Forwarded to ${group}`;
};

/**
 * Fetch scholars for a logged-in department user.
 *
 * DEFINITIVE STRATEGY — three independent queries, merged and deduplicated:
 *
 * Q1 — faculty_status exact match (what FOET writes):
 *      FORWARDED_TO_<PREFIX>_<CODE> generated from user's faculty + department.
 *      Works when department_users.assigned_department exactly matches
 *      scholar_applications.department.
 *
 * Q2 — institution group + department column match (raw DB values):
 *      Fetches ALL scholars whose faculty_status starts with FORWARDED_TO_<PREFIX>_
 *      (correct faculty group) AND whose department column matches the user's
 *      department name (case-insensitive). This is immune to any code generation
 *      mismatch because it matches on the actual stored department name.
 *
 * Q3 — institution column + department column match (belt-and-suspenders):
 *      Fetches scholars where the institution column contains the faculty group
 *      keyword AND department matches. Catches scholars that were forwarded but
 *      whose faculty_status was set differently.
 *
 * All three results are merged and deduplicated by scholar id.
 */
export const fetchScholarsForDepartmentUser = async (faculty, department) => {
  try {
    const instGroup = getInstitutionGroup(faculty); // 'Engineering' | 'Science' | 'Medical' | 'Management'
    const instPrefix = getInstitutionPrefix(faculty); // 'ENG' | 'SCI' | 'MED' | 'MGT'
    const exactFacultyStatus = `FORWARDED_TO_${getDepartmentShortCode(department, faculty)}`;

    console.log(`🔍 Fetching scholars for: "${department}" (${faculty})`);
    console.log(`   instGroup: ${instGroup} | instPrefix: ${instPrefix}`);
    console.log(`   Q1 faculty_status target: ${exactFacultyStatus}`);

    if (!instGroup || !instPrefix) {
      console.warn('⚠️ Could not determine institution group/prefix. Returning empty list.');
      return { data: [], error: null };
    }

    // Normalise department name for comparison
    const deptNorm = department.toLowerCase().trim();

    // Run all three queries in parallel
    const [q1Result, q2Result, q3Result] = await Promise.all([

      // Q1: exact faculty_status match
      supabase
        .from('scholar_applications')
        .select('*')
        .eq('faculty_status', exactFacultyStatus)
        .order('created_at', { ascending: false }),

      // Q2: faculty_status starts with correct prefix (fetch all for this faculty group)
      //     PostgREST ilike with % wildcard — no underscore escaping needed here
      //     because we match PREFIX_ which is always letters only
      supabase
        .from('scholar_applications')
        .select('*')
        .ilike('faculty_status', `FORWARDED_TO_${instPrefix}_%`)
        .order('created_at', { ascending: false }),

      // Q3: institution keyword match + forwarded status
      //     Uses the forwarding status string (e.g. 'Forwarded to Engineering')
      supabase
        .from('scholar_applications')
        .select('*')
        .eq('status', `Forwarded to ${instGroup}`)
        .order('created_at', { ascending: false }),
    ]);

    if (q1Result.error) console.error('❌ Q1 error:', q1Result.error);
    if (q2Result.error) console.error('❌ Q2 error:', q2Result.error);
    if (q3Result.error) console.error('❌ Q3 error:', q3Result.error);

    // Filter Q2 results by department name match (client-side)
    const q2Filtered = (q2Result.data || []).filter(s => {
      const sd = (s.department || '').toLowerCase().trim();
      return sd === deptNorm || sd.includes(deptNorm) || deptNorm.includes(sd);
    });

    // Filter Q3 results by department name match (client-side)
    const q3Filtered = (q3Result.data || []).filter(s => {
      const sd = (s.department || '').toLowerCase().trim();
      return sd === deptNorm || sd.includes(deptNorm) || deptNorm.includes(sd);
    });

    // Merge all three, deduplicate by id — Q1 takes priority
    const seen = new Set();
    const merged = [];
    for (const s of [...(q1Result.data || []), ...q2Filtered, ...q3Filtered]) {
      if (!seen.has(s.id)) {
        seen.add(s.id);
        merged.push(s);
      }
    }

    console.log(`✅ Q1: ${q1Result.data?.length || 0} | Q2 filtered: ${q2Filtered.length} | Q3 filtered: ${q3Filtered.length} | Merged: ${merged.length}`);
    return { data: merged, error: null };
  } catch (err) {
    console.error('❌ Exception in fetchScholarsForDepartmentUser:', err);
    return { data: null, error: err };
  }
};

export { getDepartmentShortCode, getExpectedStatusByFaculty };

/**
 * Legacy function for backward compatibility with main scholar service
 * @param {string} departmentId - Department ID (short code like 'CSE')
 * @returns {Promise<{data: Array, error: any}>}
 */
export const fetchDepartmentSpecificScholars = async (departmentId) => {
  // Map department ID to full names for the new function
  const departmentMap = {
    // Faculty of Engineering & Technology (11 departments)
    'BME': { department: 'Biomedical Engineering', faculty: 'Faculty of Engineering & Technology' },
    'ENGBIO': { department: 'Biotechnology', faculty: 'Faculty of Engineering & Technology' },
    'ENGCHEM': { department: 'Chemistry', faculty: 'Faculty of Engineering & Technology' },
    'CIVIL': { department: 'Civil Engineering', faculty: 'Faculty of Engineering & Technology' },
    'CSE': { department: 'Computer Science and Engineering', faculty: 'Faculty of Engineering & Technology' },
    'EEE': { department: 'Electrical and Electronics Engineering', faculty: 'Faculty of Engineering & Technology' },
    'ECE': { department: 'Electronics and Communication Engineering', faculty: 'Faculty of Engineering & Technology' },
    'ENGENG': { department: 'English', faculty: 'Faculty of Engineering & Technology' },
    'ENGMATH': { department: 'Mathematics', faculty: 'Faculty of Engineering & Technology' },
    'MECH': { department: 'Mechanical Engineering', faculty: 'Faculty of Engineering & Technology' },
    'ENGPHYS': { department: 'Physics', faculty: 'Faculty of Engineering & Technology' },

    // Faculty of Management (1 department)
    'MBA': { department: 'Management Studies', faculty: 'Faculty of Management' },

    // Faculty of Medical and Health Sciences (10 departments)
    'BMS': { department: 'Department of Basic Medical Sciences', faculty: 'Faculty of Medical and Health Sciences' },
    'CDE': { department: 'Department of Conservative Dentistry & Endodontics', faculty: 'Faculty of Medical and Health Sciences' },
    'OMPM': { department: 'Department of Oral and Maxillofacial Pathology and Microbiology', faculty: 'Faculty of Medical and Health Sciences' },
    'OMS': { department: 'Department of Oral and Maxillofacial Surgery', faculty: 'Faculty of Medical and Health Sciences' },
    'OMR': { department: 'Department of Oral Medicine and Radiology', faculty: 'Faculty of Medical and Health Sciences' },
    'ORTHO': { department: 'Department of Orthodontics', faculty: 'Faculty of Medical and Health Sciences' },
    'PPD': { department: 'Department of Pediatric and Preventive Dentistry', faculty: 'Faculty of Medical and Health Sciences' },
    'POI': { department: 'Department of Periodontics and Oral Implantology', faculty: 'Faculty of Medical and Health Sciences' },
    'PROSTH': { department: 'Department of Prosthodontics', faculty: 'Faculty of Medical and Health Sciences' },
    'PHD': { department: 'Department of Public Health Dentistry', faculty: 'Faculty of Medical and Health Sciences' },

    // Faculty of Science & Humanities (8 departments)
    'BIO': { department: 'Biotechnology', faculty: 'Faculty of Science & Humanities' },
    'COMM': { department: 'Commerce', faculty: 'Faculty of Science & Humanities' },
    'CS': { department: 'Computer Science', faculty: 'Faculty of Science & Humanities' },
    'EFL': { department: 'English & Foreign Languages', faculty: 'Faculty of Science & Humanities' },
    'FASHION': { department: 'Fashion Designing', faculty: 'Faculty of Science & Humanities' },
    'MATH': { department: 'Mathematics', faculty: 'Faculty of Science & Humanities' },
    'TAMIL': { department: 'Tamil', faculty: 'Faculty of Science & Humanities' },
    'VISCOM': { department: 'Visual Communication', faculty: 'Faculty of Science & Humanities' }
  };

  const mapping = departmentMap[departmentId];
  if (mapping) {
    return await fetchScholarsForDepartmentUser(mapping.faculty, mapping.department);
  } else {
    console.warn(`⚠️ Unknown department ID: ${departmentId}`);
    return { data: [], error: new Error(`Unknown department ID: ${departmentId}`) };
  }
};

/**
 * Fetch scholars with flexible filtering (multiple conditions)
 * @param {string} faculty - User's faculty
 * @param {string} department - User's department
 * @returns {Promise<{data: Array, error: any}>}
 */
export const fetchScholarsForDepartmentUserFlexible = async (faculty, department) => {
  // Delegates to the main fetch which already uses the two-pass strategy
  return fetchScholarsForDepartmentUser(faculty, department);
};

/**
 * Update dept_review column for a scholar (SIMPLIFIED - only updates dept_review column)
 * @param {string} scholarId - Scholar ID
 * @param {string} reviewStatus - Status to set ('Approved', 'Rejected', 'Query')
 * @param {Object} additionalData - Additional data to update (ignored for now)
 * @returns {Promise<{data: Object, error: any, success: boolean}>}
 */
export const updateDeptReview = async (scholarId, reviewStatus, additionalData = {}) => {
  try {
    // Validate input
    if (!scholarId) {
      return { data: null, error: new Error('Scholar ID is required'), success: false };
    }

    if (!['Approved', 'Rejected', 'Query', 'Query Resolved', 'Pending'].includes(reviewStatus)) {
      return { data: null, error: new Error('Invalid review status'), success: false };
    }

    // ONLY update the dept_review column - no other columns
    const updates = {
      dept_review: reviewStatus
    };

    console.log(`📝 Applying updates:`, updates);

    // Execute Supabase update
    const { data, error } = await supabase
      .from('scholar_applications')
      .update(updates)
      .eq('id', scholarId)
      .select();

    if (error) {
      console.error('❌ Supabase update failed:', error);
      return { data: null, error, success: false };
    }

    if (!data || data.length === 0) {
      console.error('❌ No rows updated - scholar not found');
      return { data: null, error: new Error('Scholar not found'), success: false };
    }

    console.log('✅ dept_review updated successfully:', data[0]);

    return { data: data[0], error: null, success: true };

  } catch (err) {
    console.error('❌ Exception in updateDeptReview:', err);
    return { data: null, error: err, success: false };
  }
};

/**
 * Approve scholar - wrapper for updateDeptReview (SIMPLIFIED)
 * @param {string} scholarId - Scholar ID
 * @param {string} departmentCode - Department code
 * @param {Object} approvalData - Additional approval data (ignored for now)
 * @returns {Promise<{data: Object, error: any, success: boolean}>}
 */
export const approveScholarAtDepartment = async (scholarId, departmentCode, approvalData = {}) => {
  try {
    console.log(`✅ Approving scholar ${scholarId} for department ${departmentCode}`);

    const result = await updateDeptReview(scholarId, 'Approved', {});

    return result;
  } catch (err) {
    console.error('❌ Exception in approveScholarAtDepartment:', err);
    return { data: null, error: err, success: false };
  }
};

/**
 * Reject scholar - wrapper for updateDeptReview with rejection reason (SIMPLIFIED)
 * @param {string} scholarId - Scholar ID
 * @param {string} departmentCode - Department code
 * @param {string} rejectionReason - Reason for rejection
 * @param {Object} rejectionData - Additional rejection data (ignored for now)
 * @returns {Promise<{data: Object, error: any, success: boolean}>}
 */
export const rejectScholarAtDepartment = async (scholarId, departmentCode, rejectionReason, rejectionData = {}) => {
  try {
    console.log(`❌ Rejecting scholar ${scholarId} for department ${departmentCode}`);
    console.log(`   Rejection reason: ${rejectionReason}`);

    // Validate input
    if (!rejectionReason || !rejectionReason.trim()) {
      return { data: null, error: new Error('Rejection reason is required'), success: false };
    }

    // Update both dept_review and reject_reason columns
    const updates = {
      dept_review: 'Rejected',
      reject_reason: rejectionReason.trim()
    };

    console.log(`📝 Applying updates:`, updates);

    // Execute Supabase update
    const { data, error } = await supabase
      .from('scholar_applications')
      .update(updates)
      .eq('id', scholarId)
      .select();

    if (error) {
      console.error('❌ Supabase update failed:', error);
      return { data: null, error, success: false };
    }

    if (!data || data.length === 0) {
      console.error('❌ No rows updated - scholar not found');
      return { data: null, error: new Error('Scholar not found'), success: false };
    }

    console.log('✅ Scholar rejected successfully with reason saved:', data[0]);

    return { data: data[0], error: null, success: true };

  } catch (err) {
    console.error('❌ Exception in rejectScholarAtDepartment:', err);
    return { data: null, error: err, success: false };
  }
};

/**
 * Add query to scholar - wrapper for sendQueryToScholar with query text (SIMPLIFIED)
 * @param {string} scholarId - Scholar ID
 * @param {string} queryText - Query text
 * @param {string} departmentCode - Department code
 * @param {Object} queryData - Additional query data (ignored for now)
 * @returns {Promise<{data: Object, error: any, success: boolean}>}
 */
export const addQueryToScholarDeptReview = async (scholarId, queryText, departmentCode, queryData = {}) => {
  try {
    console.log(`💬 Adding query to scholar ${scholarId} for department ${departmentCode}`);
    console.log(`   Query text: ${queryText}`);

    // Validate input
    if (!queryText || !queryText.trim()) {
      return { data: null, error: new Error('Query text is required'), success: false };
    }

    // Update both dept_review and dept_query columns
    const updates = {
      dept_review: 'Query',
      dept_query: queryText.trim()
    };

    console.log(`📝 Applying updates:`, updates);

    // Execute Supabase update
    const { data, error } = await supabase
      .from('scholar_applications')
      .update(updates)
      .eq('id', scholarId)
      .select();

    if (error) {
      console.error('❌ Supabase update failed:', error);
      return { data: null, error, success: false };
    }

    if (!data || data.length === 0) {
      console.error('❌ No rows updated - scholar not found');
      return { data: null, error: new Error('Scholar not found'), success: false };
    }

    console.log('✅ Query added successfully with text saved:', data[0]);

    return { data: data[0], error: null, success: true };

  } catch (err) {
    console.error('❌ Exception in addQueryToScholarDeptReview:', err);
    return { data: null, error: err, success: false };
  }
};

/**
 * Forward scholar to next level (e.g., to Research Coordinator) - SIMPLIFIED
 * @param {string} scholarId - Scholar ID
 * @param {string} departmentCode - Department code
 * @param {string} targetLevel - Target level (e.g., 'research_coordinator', 'director')
 * @param {Object} forwardData - Additional forwarding data (ignored for now)
 * @returns {Promise<{data: Object, error: any}>}
 */
export const forwardScholarFromDepartment = async (scholarId, departmentCode, targetLevel = 'research_coordinator', forwardData = {}) => {
  try {
    console.log(`🔄 Forwarding scholar ${scholarId} - setting dept_review to 'Approved'`);

    // Simply set dept_review to Approved when forwarding
    const result = await updateDeptReview(scholarId, 'Approved', {});

    return result;
  } catch (err) {
    console.error('❌ Exception in forwardScholarFromDepartment:', err);
    return { data: null, error: err };
  }
};

/**
 * Add query/comment to scholar record
 * @param {string} scholarId - Scholar ID
 * @param {string} queryText - Query text
 * @param {string} departmentCode - Department code
 * @param {Object} queryData - Additional query data
 * @returns {Promise<{data: Object, error: any}>}
 */
export const addQueryToScholar = async (scholarId, queryText, departmentCode, queryData = {}) => {
  try {
    // First, get the current scholar record to append to existing queries
    const { data: scholar, error: fetchError } = await supabase
      .from('scholar_applications')
      .select('department_queries')
      .eq('id', scholarId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching scholar for query:', fetchError);
      return { data: null, error: fetchError };
    }

    const existingQueries = scholar.department_queries || [];
    const newQuery = {
      id: `query_${Date.now()}`,
      text: queryText,
      department: departmentCode,
      created_at: new Date().toISOString(),
      created_by: queryData.createdBy || 'Department HOD',
      ...queryData
    };

    const updatedQueries = [...existingQueries, newQuery];

    const { data, error } = await supabase
      .from('scholar_applications')
      .update({
        department_queries: updatedQueries,
        last_query_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', scholarId)
      .select();

    if (error) {
      console.error('❌ Error adding query to scholar:', error);
      return { data: null, error };
    }

    console.log(`✅ Query added to scholar ${scholarId}`);
    return { data, error: null };
  } catch (err) {
    console.error('❌ Exception in addQueryToScholar:', err);
    return { data: null, error: err };
  }
};

/**
 * Get department statistics
 * @param {string} departmentCode - Department code
 * @param {string} faculty - Faculty name
 * @returns {Promise<{data: Object, error: any}>}
 */
export const getDepartmentStatistics = async (departmentCode, faculty) => {
  try {
    const expectedFacultyStatus = `FORWARDED_TO_${departmentCode}`;

    const queries = await Promise.all([
      supabase
        .from('scholar_applications')
        .select('id', { count: 'exact' })
        .eq('faculty_status', expectedFacultyStatus),
      supabase
        .from('scholar_applications')
        .select('id', { count: 'exact' })
        .eq('faculty_status', expectedFacultyStatus)
        .eq('dept_review', 'Approved'),
      supabase
        .from('scholar_applications')
        .select('id', { count: 'exact' })
        .eq('faculty_status', expectedFacultyStatus)
        .eq('dept_review', 'Rejected'),
    ]);

    const [totalResult, approvedResult, rejectedResult] = queries;

    const total = totalResult.count || 0;
    const approved = approvedResult.count || 0;
    const rejected = rejectedResult.count || 0;

    const statistics = {
      total,
      approved,
      rejected,
      forwarded: 0,
      pending: total - approved - rejected
    };

    console.log(`📊 Department ${departmentCode} statistics:`, statistics);
    return { data: statistics, error: null };
  } catch (err) {
    console.error('❌ Exception in getDepartmentStatistics:', err);
    return { data: null, error: err };
  }
};

/**
 * Get scholar's current dept_review status
 * @param {string} scholarId - Scholar ID
 * @returns {Promise<{data: Object, error: any}>}
 */
export const getScholarDeptReviewStatus = async (scholarId) => {
  try {
    console.log(`🔍 Checking dept_review status for scholar ${scholarId}`);

    const { data, error } = await supabase
      .from('scholar_applications')
      .select('id, registered_name, status, faculty_status, dept_review, department_approval_date, department_rejection_date')
      .eq('id', scholarId)
      .single();

    if (error) {
      console.error('❌ Error fetching scholar dept_review status:', error);
      return { data: null, error };
    }

    console.log(`📋 Scholar ${scholarId} dept_review status:`, {
      name: data.registered_name,
      status: data.status,
      faculty_status: data.faculty_status,
      dept_review: data.dept_review,
      approval_date: data.department_approval_date,
      rejection_date: data.department_rejection_date
    });

    return { data, error: null };
  } catch (err) {
    console.error('❌ Exception in getScholarDeptReviewStatus:', err);
    return { data: null, error: err };
  }
};

/**
 * Bulk update dept_review status for multiple scholars (SIMPLIFIED)
 * @param {Array} scholarIds - Array of scholar IDs
 * @param {string} deptReviewStatus - Status to set ('Approved', 'Rejected', 'Pending')
 * @param {string} departmentCode - Department code (ignored for now)
 * @param {Object} additionalData - Additional data to update (ignored for now)
 * @returns {Promise<{data: Array, error: any}>}
 */
export const bulkUpdateDeptReviewStatus = async (scholarIds, deptReviewStatus, departmentCode, additionalData = {}) => {
  try {
    console.log(`🔄 Bulk updating dept_review to '${deptReviewStatus}' for ${scholarIds.length} scholars`);

    // ONLY update the dept_review column
    const updates = {
      dept_review: deptReviewStatus
    };

    const { data, error } = await supabase
      .from('scholar_applications')
      .update(updates)
      .in('id', scholarIds)
      .select();

    if (error) {
      console.error('❌ Error bulk updating dept_review status:', error);
      return { data: null, error };
    }

    console.log(`✅ Successfully updated dept_review status for ${data.length} scholars`);
    return { data, error: null };
  } catch (err) {
    console.error('❌ Exception in bulkUpdateDeptReviewStatus:', err);
    return { data: null, error: err };
  }
};

/**
 * Update dept_review column for a scholar
 * @param {string} scholarId - Scholar ID
 * @param {string} deptReviewStatus - New dept_review status ("Approved", "Rejected", "Query", "Pending")
 * @param {Object} additionalData - Additional data to update
 * @returns {Promise<{data: Object, error: any}>}
 */
/**
 * Update dept_review column for a scholar (only dept_review column)
 * @param {string} scholarId - Scholar ID
 * @param {string} deptReviewStatus - New dept_review status ("Approved", "Rejected", "Query", "Pending")
 * @returns {Promise<{data: Object, error: any}>}
 */
export const updateDeptReviewStatus = async (scholarId, deptReviewStatus) => {
  try {
    console.log(`🔄 updateDeptReviewStatus called:`);
    console.log(`   Scholar ID: ${scholarId}`);
    console.log(`   New dept_review: ${deptReviewStatus}`);

    // ONLY update the dept_review column - nothing else
    const updates = {
      dept_review: deptReviewStatus
    };

    console.log(`📝 Final updates to apply:`, updates);

    const { data, error } = await supabase
      .from('scholar_applications')
      .update(updates)
      .eq('id', scholarId)
      .select();

    if (error) {
      console.error('❌ Supabase error updating dept_review:', error);
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      console.error('❌ No rows updated - scholar ID not found:', scholarId);
      return { data: null, error: new Error(`Scholar with ID ${scholarId} not found`) };
    }

    console.log(`✅ Successfully updated dept_review to "${deptReviewStatus}" for scholar ${scholarId}`);
    console.log(`📋 Updated scholar data:`, data[0]);

    return { data, error: null };
  } catch (err) {
    console.error('❌ Exception in updateDeptReviewStatus:', err);
    return { data: null, error: err };
  }
};

/**
 * Approve scholar - sets dept_review to "Approved"
 * @param {string} scholarId - Scholar ID
 * @param {string} departmentCode - Department code
 * @param {Object} approvalData - Additional approval data
 * @returns {Promise<{data: Object, error: any}>}
 */
/**
 * Approve scholar - sets dept_review to "Approved" and dept_status based on scholar's current status
 * @param {string} scholarId - Scholar ID
 * @param {string} departmentCode - Department code
 * @param {Object} approvalData - Additional approval data (ignored for now)
 * @returns {Promise<{data: Object, error: any, success: boolean}>}
 */
export const approveScholar = async (scholarId, departmentCode, approvalData = {}) => {
  try {
    console.log(`✅ Approving scholar ${scholarId} - setting dept_review to 'Approved'`);

    // Validate input
    if (!scholarId) {
      return { data: null, error: new Error('Scholar ID is required'), success: false };
    }

    // Get scholar name for logging
    const { data: scholar, error: fetchError } = await supabase
      .from('scholar_applications')
      .select('id, registered_name')
      .eq('id', scholarId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching scholar for approval:', fetchError);
      return { data: null, error: fetchError, success: false };
    }

    if (!scholar) {
      console.error('❌ Scholar not found');
      return { data: null, error: new Error('Scholar not found'), success: false };
    }

    // ONLY update dept_review - do NOT set dept_status yet
    // dept_status should only be set when the scholar is actually forwarded
    // Also clear query-related fields and forwarding status when approving from queries
    // NOTE: query_resolved_dept is preserved to maintain resolution history
    const updates = {
      dept_review: 'Approved',
      dept_query: null,
      query_timestamp: null,
      dept_status: null,
      faculty_forward: null
    };

    console.log(`📝 Applying updates for scholar ${scholar.registered_name}:`, updates);

    const { data, error } = await supabase
      .from('scholar_applications')
      .update(updates)
      .eq('id', scholarId)
      .select();

    if (error) {
      console.error('❌ Supabase update failed:', error);
      return { data: null, error, success: false };
    }

    if (data.length === 0) {
      console.error('❌ No rows updated - scholar not found');
      return { data: null, error: new Error('Scholar not found'), success: false };
    }

    console.log(`✅ Scholar ${scholar.registered_name} approved successfully:`, {
      id: data[0].id,
      dept_review: data[0].dept_review
    });

    return { data: data[0], error: null, success: true };

  } catch (err) {
    console.error('❌ Exception in approveScholar:', err);
    return { data: null, error: err, success: false };
  }
};

/**
 * Reject scholar - sets dept_review to "Rejected" and saves rejection reason
 * @param {string} scholarId - Scholar ID
 * @param {string} departmentCode - Department code
 * @param {string} rejectionReason - Reason for rejection
 * @param {Object} rejectionData - Additional rejection data (ignored for now)
 * @returns {Promise<{data: Object, error: any}>}
 */
export const rejectScholar = async (scholarId, departmentCode, rejectionReason, rejectionData = {}) => {
  try {
    console.log(`❌ Rejecting scholar ${scholarId} - setting dept_review to 'Rejected' and saving rejection reason`);
    console.log(`   Rejection reason: ${rejectionReason}`);

    // Validate input
    if (!scholarId) {
      return { data: null, error: new Error('Scholar ID is required'), success: false };
    }

    if (!rejectionReason || !rejectionReason.trim()) {
      return { data: null, error: new Error('Rejection reason is required'), success: false };
    }

    // Update both dept_review and reject_reason columns
    // Also clear query-related fields and forwarding status when rejecting from queries
    // NOTE: query_resolved_dept is preserved to maintain resolution history
    const updates = {
      dept_review: 'Rejected',
      reject_reason: rejectionReason.trim(),
      dept_query: null,
      query_timestamp: null,
      dept_status: null,
      faculty_forward: null
    };

    console.log(`📝 Applying updates:`, updates);

    // Execute Supabase update
    const { data, error } = await supabase
      .from('scholar_applications')
      .update(updates)
      .eq('id', scholarId)
      .select();

    if (error) {
      console.error('❌ Supabase update failed:', error);
      return { data: null, error, success: false };
    }

    if (!data || data.length === 0) {
      console.error('❌ No rows updated - scholar not found');
      return { data: null, error: new Error('Scholar not found'), success: false };
    }

    console.log('✅ Scholar rejected successfully with reason saved:', data[0]);

    return { data: data[0], error: null, success: true };

  } catch (err) {
    console.error('❌ Exception in rejectScholar:', err);
    return { data: null, error: err, success: false };
  }
};

/**
 * Send query to scholar - sets dept_review to "Query" and saves query text, auto-forwards with dept_status
 * @param {string} scholarId - Scholar ID
 * @param {string} queryText - Query message
 * @param {string} departmentCode - Department code
 * @param {Object} queryData - Additional query data (ignored for now)
 * @returns {Promise<{data: Object, error: any, success: boolean}>}
 */
export const sendQueryToScholar = async (scholarId, queryText, departmentCode, queryData = {}) => {
  try {
    console.log(`💬 Sending query to scholar ${scholarId} - setting dept_review to 'Query' and auto-forwarding with dept_status`);
    console.log(`   Query text: ${queryText}`);
    console.log(`   Department code: ${departmentCode}`);

    // Validate input
    if (!scholarId) {
      return { data: null, error: new Error('Scholar ID is required'), success: false };
    }

    if (!queryText || !queryText.trim()) {
      return { data: null, error: new Error('Query text is required'), success: false };
    }

    // Get scholar data including institution and faculty for accurate dept_status determination
    const { data: scholar, error: fetchError } = await supabase
      .from('scholar_applications')
      .select('id, registered_name, status, faculty_status, institution, faculty')
      .eq('id', scholarId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching scholar for query:', fetchError);
      return { data: null, error: fetchError, success: false };
    }

    if (!scholar) {
      console.error('❌ Scholar not found');
      return { data: null, error: new Error('Scholar not found'), success: false };
    }

    // Shared helper: map any string to a dept_status value by keyword
    const mapToDeptStatus = (str) => {
      if (!str) return null;
      const lower = str.toLowerCase();
      if (lower.includes('engineering') || lower.includes('technology')) return 'Back_To_Engineering';
      if (lower.includes('medical') || lower.includes('health') || lower.includes('dentistry')) return 'Back_To_Medical';
      if (lower.includes('management') || lower.includes('business')) return 'Back_To_Management';
      if (lower.includes('science') || lower.includes('humanities')) return 'Back_To_Science';
      return null;
    };

    // Priority: institution > faculty > status
    // faculty_status is intentionally skipped (it stores forwarding codes, not the scholar's own faculty)
    const deptStatusValue =
      mapToDeptStatus(scholar.institution) ||
      mapToDeptStatus(scholar.faculty) ||
      mapToDeptStatus(scholar.status) ||
      'Back_To_Engineering'; // last-resort default

    console.log(`📝 Auto-forwarding query: Setting dept_status to: ${deptStatusValue} (institution="${scholar.institution}", faculty="${scholar.faculty}", status="${scholar.status}")`);

    // Update dept_review, dept_query, dept_status (auto-forward), and query_timestamp columns
    const currentTimestamp = new Date().toISOString(); // timestamptz format
    const updates = {
      dept_review: 'Query',
      dept_query: queryText.trim(),
      dept_status: deptStatusValue, // Auto-forward queries
      query_timestamp: currentTimestamp
    };

    console.log(`📝 Applying updates for scholar ${scholar.registered_name}:`, updates);

    // Execute Supabase update
    const { data, error } = await supabase
      .from('scholar_applications')
      .update(updates)
      .eq('id', scholarId)
      .select();

    if (error) {
      console.error('❌ Supabase update failed:', error);
      return { data: null, error, success: false };
    }

    if (!data || data.length === 0) {
      console.error('❌ No rows updated - scholar not found');
      return { data: null, error: new Error('Scholar not found'), success: false };
    }

    console.log(`✅ Query sent to ${scholar.registered_name} and auto-forwarded successfully:`, {
      id: data[0].id,
      dept_review: data[0].dept_review,
      dept_query: data[0].dept_query,
      dept_status: data[0].dept_status
    });

    return { data: data[0], error: null, success: true };

  } catch (err) {
    console.error('❌ Exception in sendQueryToScholar:', err);
    return { data: null, error: err, success: false };
  }
};

/**
 * Forward scholar - updates dept_status based on the scholar's dept_review status
 * If scholar is rejected: sets dept_status to "Rejected"
 * If scholar is approved: sets dept_status based on faculty (Back_To_Engineering, etc.)
 * @param {string} scholarId - Scholar ID
 * @param {string} currentStatus - Current status from scholar_applications.status column
 * @returns {Promise<{data: Object, error: any}>}
 */
export const forwardScholar = async (scholarId, currentStatus) => {
  try {
    console.log(`🔄 Forwarding scholar ${scholarId} with current status: ${currentStatus}`);

    // First, get the current scholar data to check their faculty information
    const { data: currentScholar, error: fetchError } = await supabase
      .from('scholar_applications')
      .select('id, registered_name, dept_review, dept_status, status, faculty_status, faculty, institution, department, type')
      .eq('id', scholarId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching scholar for forward:', fetchError);
      return { data: null, error: fetchError };
    }

    if (!currentScholar) {
      console.error('❌ Scholar not found');
      return { data: null, error: new Error('Scholar not found') };
    }

    console.log(`📋 Current scholar data:`, {
      dept_review: currentScholar.dept_review,
      dept_status: currentScholar.dept_status,
      status: currentScholar.status,
      faculty_status: currentScholar.faculty_status,
      faculty: currentScholar.faculty,
      institution: currentScholar.institution,
      department: currentScholar.department,
      type: currentScholar.type
    });

    // Helper: map a string to a dept_status value by checking faculty/institution keywords
    const mapToDeptStatus = (str) => {
      if (!str) return null;
      const lower = str.toLowerCase();
      if (lower.includes('engineering') || lower.includes('technology')) return 'Back_To_Engineering';
      if (lower.includes('medical') || lower.includes('health') || lower.includes('dentistry')) return 'Back_To_Medical';
      if (lower.includes('management') || lower.includes('business')) return 'Back_To_Management';
      if (lower.includes('science') || lower.includes('humanities')) return 'Back_To_Science';
      return null;
    };

    // Determine dept_status using columns in priority order:
    // 1. institution  (most reliable — directly stores the scholar's faculty/institution)
    // 2. faculty      (explicit faculty field)
    // 3. status       (e.g. "Forwarded to Engineering")
    // 4. currentStatus parameter
    // faculty_status is intentionally skipped — it stores the forwarding code (e.g. FORWARDED_TO_SCI_CSE)
    // which does NOT reliably encode the scholar's own faculty.
    let deptStatusValue =
      mapToDeptStatus(currentScholar.institution) ||
      mapToDeptStatus(currentScholar.faculty) ||
      mapToDeptStatus(currentScholar.status) ||
      mapToDeptStatus(currentStatus);

    const usedSource =
      (mapToDeptStatus(currentScholar.institution) && `institution="${currentScholar.institution}"`) ||
      (mapToDeptStatus(currentScholar.faculty) && `faculty="${currentScholar.faculty}"`) ||
      (mapToDeptStatus(currentScholar.status) && `status="${currentScholar.status}"`) ||
      (mapToDeptStatus(currentStatus) && `currentStatus="${currentStatus}"`);

    if (!deptStatusValue) {
      console.warn(`⚠️ Could not determine faculty from any field. Checked:`, {
        institution: currentScholar.institution,
        faculty: currentScholar.faculty,
        status: currentScholar.status,
        currentStatus,
      });
      console.warn(`⚠️ Defaulting to Back_To_Engineering`);
      deptStatusValue = 'Back_To_Engineering';
    } else {
      console.log(`📋 Resolved dept_status from ${usedSource}`);
    }

    console.log(`📝 Setting dept_status to: ${deptStatusValue}`);

    const updates = {
      dept_status: deptStatusValue
    };

    const { data, error } = await supabase
      .from('scholar_applications')
      .update(updates)
      .eq('id', scholarId)
      .select();

    if (error) {
      console.error('❌ Supabase error forwarding scholar:', error);
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      console.error('❌ No rows updated - scholar ID not found:', scholarId);
      return { data: null, error: new Error(`Scholar with ID ${scholarId} not found`) };
    }

    console.log(`✅ Successfully forwarded scholar ${scholarId} - dept_status set to "${deptStatusValue}"`);
    console.log(`📋 Updated scholar data:`, data[0]);

    return { data, error: null };
  } catch (err) {
    console.error('❌ Exception in forwardScholar:', err);
    return { data: null, error: err };
  }
};

/**
 * Revert scholar - sets dept_status to "Revert" and conditionally updates dept_review
 * Only changes dept_review to "Pending" if it's not already "Rejected" (preserves rejected status)
 * @param {string} scholarId - Scholar ID
 * @returns {Promise<{data: Object, error: any}>}
 */
export const revertScholar = async (scholarId) => {
  try {
    console.log(`🔄 Reverting scholar ${scholarId} - setting dept_status to 'Revert'`);

    // First, get the current scholar data to check their dept_review status
    const { data: currentScholar, error: fetchError } = await supabase
      .from('scholar_applications')
      .select('id, registered_name, dept_review, dept_status')
      .eq('id', scholarId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching scholar for revert:', fetchError);
      return { data: null, error: fetchError };
    }

    if (!currentScholar) {
      console.error('❌ Scholar not found');
      return { data: null, error: new Error('Scholar not found') };
    }

    console.log(`📋 Current scholar status: dept_review="${currentScholar.dept_review}", dept_status="${currentScholar.dept_status}"`);

    // Prepare updates - always set dept_status to "Revert"
    // For rejected scholars, we DO want to change dept_review to "Pending" when reverting
    // Also clear reject_reason since the rejection is being undone
    const updates = {
      dept_status: 'Revert',
      dept_review: 'Pending',  // Always set to Pending when reverting, regardless of current status
      reject_reason: null      // Clear rejection reason when reverting
    };

    console.log(`🔄 Setting dept_status to 'Revert', dept_review to 'Pending', and clearing reject_reason for scholar ${currentScholar.registered_name}`);
    console.log(`   Previous status: dept_review="${currentScholar.dept_review}", dept_status="${currentScholar.dept_status}"`);
    console.log(`   New status: dept_review="Pending", dept_status="Revert", reject_reason=NULL`);

    const { data, error } = await supabase
      .from('scholar_applications')
      .update(updates)
      .eq('id', scholarId)
      .select();

    if (error) {
      console.error('❌ Supabase error reverting scholar:', error);
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      console.error('❌ No rows updated - scholar ID not found:', scholarId);
      return { data: null, error: new Error(`Scholar with ID ${scholarId} not found`) };
    }

    console.log(`✅ Successfully reverted scholar ${scholarId}:`, {
      dept_status: data[0].dept_status,
      dept_review: data[0].dept_review
    });

    return { data, error: null };
  } catch (err) {
    console.error('❌ Exception in revertScholar:', err);
    return { data: null, error: err };
  }
};

/**
 * Check and update dept_review based on dept_status value
 * This function monitors dept_status and automatically sets dept_review to "Pending" when dept_status is "Revert"
 * (but preserves "Rejected" status for rejected scholars)
 * @param {string} scholarId - Scholar ID
 * @returns {Promise<{data: Object, error: any}>}
 */
export const checkAndUpdateDeptReviewBasedOnStatus = async (scholarId) => {
  try {
    console.log(`🔍 Checking dept_status for scholar ${scholarId} to update dept_review if needed`);

    // First, get the current scholar data
    const { data: scholar, error: fetchError } = await supabase
      .from('scholar_applications')
      .select('id, dept_status, dept_review')
      .eq('id', scholarId)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching scholar data:', fetchError);
      return { data: null, error: fetchError };
    }

    console.log(`📋 Current scholar status:`, {
      id: scholar.id,
      dept_status: scholar.dept_status,
      dept_review: scholar.dept_review
    });

    // Check if dept_status is "Revert" and dept_review is not already "Pending"
    // BUT preserve "Rejected" status for rejected scholars
    if (scholar.dept_status === 'Revert' &&
      scholar.dept_review !== 'Pending' &&
      scholar.dept_review !== 'Rejected') {
      console.log(`🔄 dept_status is 'Revert', updating dept_review to 'Pending'`);

      const updates = {
        dept_review: 'Pending'
      };

      const { data, error } = await supabase
        .from('scholar_applications')
        .update(updates)
        .eq('id', scholarId)
        .select();

      if (error) {
        console.error('❌ Error updating dept_review to Pending:', error);
        return { data: null, error };
      }

      console.log(`✅ Successfully updated dept_review to 'Pending' for scholar ${scholarId}`);
      return { data, error: null };
    } else {
      console.log(`ℹ️ No update needed - dept_status: ${scholar.dept_status}, dept_review: ${scholar.dept_review}`);
      return { data: scholar, error: null };
    }
  } catch (err) {
    console.error('❌ Exception in checkAndUpdateDeptReviewBasedOnStatus:', err);
    return { data: null, error: err };
  }
};

/**
 * Monitor and update dept_review for all scholars based on their dept_status
 * This function checks all scholars and updates dept_review to "Pending" if dept_status is "Revert"
 * @param {string} departmentCode - Department code to filter scholars (optional)
 * @returns {Promise<{data: Array, error: any, updatedCount: number}>}
 */
export const monitorAndUpdateDeptReviewForAllScholars = async (departmentCode = null) => {
  try {
    console.log(`🔍 Monitoring all scholars to update dept_review based on dept_status`);

    let query = supabase
      .from('scholar_applications')
      .select('id, registered_name, dept_status, dept_review');

    // Optionally filter by department
    if (departmentCode) {
      query = query.or(`faculty_status.like.%${departmentCode}%,department.ilike.%${departmentCode}%`);
    }

    const { data: scholars, error: fetchError } = await query;

    if (fetchError) {
      console.error('❌ Error fetching scholars for monitoring:', fetchError);
      return { data: null, error: fetchError, updatedCount: 0 };
    }

    console.log(`📋 Found ${scholars.length} scholars to monitor`);

    // Find scholars that need updating (dept_status = "Revert" but dept_review ≠ "Pending")
    // BUT ONLY if they were previously approved (not rejected)
    const scholarsToUpdate = scholars.filter(scholar =>
      scholar.dept_status === 'Revert' &&
      scholar.dept_review !== 'Pending' &&
      scholar.dept_review !== 'Rejected'  // Don't change rejected scholars to pending
    );

    if (scholarsToUpdate.length === 0) {
      console.log(`ℹ️ No scholars need dept_review updates`);
      return { data: scholars, error: null, updatedCount: 0 };
    }

    console.log(`🔄 Found ${scholarsToUpdate.length} scholars that need dept_review updated to 'Pending'`);

    // Update all scholars that need it
    const scholarIdsToUpdate = scholarsToUpdate.map(s => s.id);

    const { data: updatedScholars, error: updateError } = await supabase
      .from('scholar_applications')
      .update({ dept_review: 'Pending' })
      .in('id', scholarIdsToUpdate)
      .select();

    if (updateError) {
      console.error('❌ Error bulk updating dept_review:', updateError);
      return { data: null, error: updateError, updatedCount: 0 };
    }

    console.log(`✅ Successfully updated dept_review to 'Pending' for ${updatedScholars.length} scholars`);

    // Log the updated scholars
    updatedScholars.forEach(scholar => {
      console.log(`   - ${scholar.registered_name} (ID: ${scholar.id}): dept_review → 'Pending'`);
    });

    return { data: updatedScholars, error: null, updatedCount: updatedScholars.length };
  } catch (err) {
    console.error('❌ Exception in monitorAndUpdateDeptReviewForAllScholars:', err);
    return { data: null, error: err, updatedCount: 0 };
  }
};

/**
 * Check if department results are published in examination_records table
 * @param {string} departmentName - Department name to check
 * @param {string} institution - Institution name to check
 * @returns {Promise<{data: boolean, error: any}>}
 */
export const checkDepartmentResultsPublished = async (departmentName, departmentCode) => {
  try {
    console.log(`🔍 Checking if results are published for department: ${departmentName} (${departmentCode})`);

    if (!departmentCode) {
      console.error('❌ Department code is required');
      return { data: false, error: new Error('Department code is required') };
    }

    const expectedDeptResult = `Published_To_${departmentCode}`;
    console.log(`📋 Looking for dept_result = "${expectedDeptResult}"`);

    const { data, error } = await supabase
      .from('examination_records')
      .select('dept_result, department')
      .ilike('department', `%${departmentName}%`)
      .eq('dept_result', expectedDeptResult) // Check for exact dept_result value like "Published_To_CSE"
      .limit(1);

    if (error) {
      console.error('❌ Error checking dept_result status:', error);
      return { data: false, error };
    }

    const isPublished = data && data.length > 0;
    console.log(`📋 Department ${departmentName} (${departmentCode}) results published:`, isPublished);

    if (data && data.length > 0) {
      console.log(`📋 Found dept_result value:`, data[0].dept_result);
    }

    return { data: isPublished, error: null };
  } catch (err) {
    console.error('❌ Exception checking dept_result status:', err);
    return { data: false, error: err };
  }
};

/**
 * Fetch examination records for interview page - shows all scholars regardless of interview_marks status
 * @param {string} departmentName - Department name
 * @param {string} institution - Institution name
 * @returns {Promise<{data: Array, error: any}>}
 */
export const fetchExaminationRecordsForInterview = async (departmentName, institution = 'Faculty of Engineering & Technology') => {
  try {
    console.log(`🔍 INTERVIEW FETCH: Fetching examination records`);
    console.log(`📋 Input - Department: "${departmentName}", Institution: "${institution}"`);

    // Import centralized department mapping functions from foet
    const { getDepartmentFromProgram, getFacultyFromDepartment, DEPARTMENT_TO_FACULTY } = await import('../../foet/utils/departmentMapping.js');

    // Generate department code from department name
    const departmentCode = getDepartmentShortCode(departmentName, institution);
    console.log(`📋 Generated department code: ${departmentCode}`);

    // First, get all records to see what's available
    const { data: allRecords, error: countError } = await supabase
      .from('examination_records')
      .select('*');

    if (countError) {
      console.error('❌ Error accessing examination_records table:', countError);
      return { data: null, error: countError };
    }

    console.log(`📊 Total records in examination_records table: ${allRecords?.length || 0}`);

    if (!allRecords || allRecords.length === 0) {
      console.log(`⚠️ No records found in examination_records table`);
      return { data: [], error: null };
    }

    // DIAGNOSTIC: Show ALL unique values
    const uniqueInstitutions = [...new Set(allRecords.map(r => r.institution).filter(Boolean))];
    const uniqueDepartments = [...new Set(allRecords.map(r => r.department).filter(Boolean))];
    const uniqueTypes = [...new Set(allRecords.map(r => r.type).filter(Boolean))];

    console.log(`📋 ===== DATABASE DIAGNOSTIC =====`);
    console.log(`📋 Unique INSTITUTIONS (${uniqueInstitutions.length}):`, uniqueInstitutions);
    console.log(`📋 Unique DEPARTMENTS (${uniqueDepartments.length}):`, uniqueDepartments);
    console.log(`📋 Unique TYPES:`, uniqueTypes);
    console.log(`📋 ===== USER REQUEST =====`);
    console.log(`📋 Looking for - Institution: "${institution}"`);
    console.log(`📋 Looking for - Department: "${departmentName}"`);
    console.log(`📋 Looking for - Department Code: "${departmentCode}"`);

    // STEP 1: Filter by INSTITUTION FIRST (highest priority)
    console.log(`\n🔍 STEP 1: Filter by Institution`);

    // Map user's faculty to database institution values
    let targetInstitution = null;
    const cleanInstitution = institution.replace('Faculty of ', '').trim().toLowerCase();

    if (cleanInstitution.includes('science') || cleanInstitution.includes('humanities')) {
      targetInstitution = 'Science And Humanities';
    } else if (cleanInstitution.includes('engineering') || cleanInstitution.includes('technology')) {
      targetInstitution = 'Engineering And Technology';
    } else if (cleanInstitution.includes('medical') || cleanInstitution.includes('health')) {
      targetInstitution = 'Medical And Health Sciences';
    } else if (cleanInstitution.includes('management')) {
      targetInstitution = 'Management';
    }

    console.log(`📋 Institution mapping: "${institution}" -> "${targetInstitution}"`);

    // FALLBACK: If no exact institution match, try case-insensitive substring match
    let institutionFilteredRecords = [];
    if (targetInstitution) {
      institutionFilteredRecords = allRecords.filter(record =>
        record.institution === targetInstitution
      );
      console.log(`📊 Exact match - Records in "${targetInstitution}": ${institutionFilteredRecords.length}`);

      // If exact match failed, try case-insensitive
      if (institutionFilteredRecords.length === 0) {
        console.warn(`⚠️ No exact institution match. Trying case-insensitive match...`);
        institutionFilteredRecords = allRecords.filter(record =>
          record.institution && record.institution.toLowerCase().includes(cleanInstitution.split(' ')[0])
        );
        console.log(`📊 Case-insensitive match found: ${institutionFilteredRecords.length} records`);
        if (institutionFilteredRecords.length > 0) {
          console.log(`📋 Matched institution values:`, [...new Set(institutionFilteredRecords.map(r => r.institution))]);
        }
      }
    } else {
      console.log(`⚠️ No institution mapping found, using all records as fallback`);
      institutionFilteredRecords = allRecords;
    }

    if (institutionFilteredRecords.length > 0) {
      console.log(`📋 Sample from institution-filtered records:`, institutionFilteredRecords.slice(0, 2).map(r => ({
        department: r.department,
        institution: r.institution,
        type: r.type,
        name: r.registered_name || r.name
      })));
    }

    // STEP 2: Filter by DEPARTMENT using centralized mapping (prefer explicit `department` column)
    console.log(`\n🔍 STEP 2: Filter by Department within Institution`);

    const targetDeptCode = departmentCode;

    // STRATEGY 1: Try exact department code match
    let finalRecords = institutionFilteredRecords.filter(record => {
      // If there's an explicit department column on the record, try to match
      if (record.department && typeof record.department === 'string' && record.department.trim() !== '') {
        try {
          const recDeptCode = getDepartmentShortCode(record.department, institution);
          if (recDeptCode && targetDeptCode && recDeptCode === targetDeptCode) {
            console.log(`✅ Department match: "${record.department}" -> ${recDeptCode}`);
            return true;
          }
        } catch (e) {
          console.warn(`⚠️ getDepartmentShortCode error for "${record.department}":`, e.message);
        }
      }

      // Fallback: use department text match if code match failed
      if (record.department && typeof record.department === 'string' && record.department.trim() !== '') {
        const recDeptNorm = record.department.toLowerCase().replace(/department of /g, '').trim();
        const targetNorm = (departmentName || '').toLowerCase().replace(/department of /g, '').trim();
        if (recDeptNorm.includes(targetNorm) || targetNorm.includes(recDeptNorm)) {
          return true;
        }
      }

      return false;
    });

    console.log(`📊 Records matching department code "${targetDeptCode}": ${finalRecords.length}`);

    // STRATEGY 2: If no department match, try text-based matching as fallback
    if (finalRecords.length === 0) {
      console.warn(`⚠️ No department code match found. Trying text-based matching...`);

      const deptNameNormalized = (departmentName || '').toLowerCase().replace(/department of /g, '').trim();

      finalRecords = institutionFilteredRecords.filter(record => {
        // Try explicit department field only
        if (record.department) {
          const recDeptNorm = record.department.toLowerCase().replace(/department of /g, '').trim();
          if (recDeptNorm.includes(deptNameNormalized) || deptNameNormalized.includes(recDeptNorm)) {
            console.log(`✅ Text match (dept): "${record.department}" includes "${deptNameNormalized}"`);
            return true;
          }
        }
        return false;
      });

      console.log(`📊 Text-based match found: ${finalRecords.length} records`);
    }

    // STRATEGY 3: If still no match, return ALL records from the institution as last resort
    if (finalRecords.length === 0) {
      console.warn(`⚠️ Still no department match. Using all records from institution as fallback`);
      finalRecords = institutionFilteredRecords;
      console.log(`📊 Using fallback: ${finalRecords.length} records from institution`);
    }

    if (finalRecords.length > 0) {
      console.log(`📋 Final matching records (first 3):`, finalRecords.slice(0, 3).map(r => ({
        id: r.id,
        department: r.department,
        institution: r.institution,
        type: r.type,
        name: r.registered_name || r.name
      })));
    }

    // Sort by creation date (newest first)
    finalRecords.sort((a, b) =>
      new Date(b.created_at || 0) - new Date(a.created_at || 0)
    );

    console.log(`✅ Final result: ${finalRecords.length} examination records returned`);

    return { data: finalRecords, error: null };
  } catch (err) {
    console.error('❌ Exception fetching examination records for interview:', err);
    return { data: null, error: err };
  }
};

/**
 * Update examination record marks
 * @param {string} recordId - Examination record ID
 * @param {Object} updates - Updates to apply (marks, evaluator comments, etc.)
 * @returns {Promise<{data: Object, error: any}>}
 */
export const updateExaminationRecord = async (recordId, updates) => {
  try {
    console.log(`🔄 Updating examination record ${recordId}:`, updates);

    // First check if the record exists
    const { data: existingRecord, error: checkError } = await supabase
      .from('examination_records')
      .select('id, registered_name')
      .eq('id', recordId)
      .single();

    if (checkError) {
      console.error('❌ Error checking if examination record exists:', checkError);
      return { data: null, error: checkError };
    }

    if (!existingRecord) {
      console.error('❌ Examination record not found:', recordId);
      return { data: null, error: new Error(`Examination record with ID ${recordId} not found`) };
    }

    console.log(`📋 Found existing record: ${existingRecord.registered_name} (ID: ${recordId})`);

    const { data, error } = await supabase
      .from('examination_records')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', recordId)
      .select();

    if (error) {
      console.error('❌ Error updating examination record:', error);
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      console.error('❌ No rows updated - record may not exist');
      return { data: null, error: new Error('No rows updated') };
    }

    console.log('✅ Examination record updated successfully:', data[0]);
    return { data: data[0], error: null };
  } catch (err) {
    console.error('❌ Exception updating examination record:', err);
    return { data: null, error: err };
  }
};

/**
 * Mark query as resolved by updating dept_review to "Query Resolved"
 * @param {string} scholarId - Scholar ID
 * @returns {Promise<{data: Object, error: any}>}
 */
export const markQueryAsResolved = async (scholarId) => {
  return await updateDeptReviewStatus(scholarId, 'Query Resolved');
};

// Keep the old function name for backward compatibility
export const fetchExaminationRecordsForViva = fetchExaminationRecordsForInterview;
/**
 * Update examination records with panel and evaluator information
 * @param {Array} scholarIds - Array of scholar IDs to assign to the panel
 * @param {number} panelNumber - Panel number (1, 2, 3, etc.)
 * @param {Array} evaluators - Array of evaluator objects with name, designation, affiliation
 * @returns {Promise<{data: Array, error: any}>}
 */
export const assignScholarsToPanel = async (scholarIds, panelNumber, evaluators) => {
  try {
    console.log(`🔄 Assigning ${scholarIds.length} scholars to Panel ${panelNumber}`);
    console.log(`🔍 Scholar IDs received:`, scholarIds);
    console.log(`🔍 Evaluators received:`, evaluators);

    // Validate inputs
    if (!scholarIds || scholarIds.length === 0) {
      console.error('❌ No scholar IDs provided');
      return { data: null, error: new Error('No scholar IDs provided') };
    }

    if (!evaluators || evaluators.length < 1 || evaluators.length > 3) {
      console.error('❌ Invalid number of evaluators provided');
      return { data: null, error: new Error('One to three evaluators are required') };
    }

    // Validate that each evaluator has all required fields
    for (let i = 0; i < evaluators.length; i++) {
      const evaluator = evaluators[i];
      if (!evaluator.name || !evaluator.affiliation || !evaluator.designation ||
        evaluator.name.trim() === '' || evaluator.affiliation.trim() === '' || evaluator.designation.trim() === '') {
        console.error(`❌ Evaluator ${i + 1} is missing required fields:`, evaluator);
        return { data: null, error: new Error(`Evaluator ${i + 1} must have name, affiliation, and designation`) };
      }
    }

    // Format evaluator information as "name | designation | affiliation" - only for valid evaluators
    const examiner1 = evaluators[0] ? `${evaluators[0].name.trim()} | ${evaluators[0].designation.trim()} | ${evaluators[0].affiliation.trim()}` : null;
    const examiner2 = evaluators[1] ? `${evaluators[1].name.trim()} | ${evaluators[1].designation.trim()} | ${evaluators[1].affiliation.trim()}` : null;
    const examiner3 = evaluators[2] ? `${evaluators[2].name.trim()} | ${evaluators[2].designation.trim()} | ${evaluators[2].affiliation.trim()}` : null;

    const updates = {
      panel: `Panel ${panelNumber}`,
      examiner1: examiner1,
      examiner2: examiner2,
      examiner3: examiner3,
      updated_at: new Date().toISOString()
    };

    console.log(`📝 Panel assignment updates:`, updates);
    console.log(`📝 Updating records with IDs:`, scholarIds);

    // First, check if the records exist
    const { data: existingRecords, error: checkError } = await supabase
      .from('examination_records')
      .select('id, registered_name')
      .in('id', scholarIds);

    if (checkError) {
      console.error('❌ Error checking existing records:', checkError);
      return { data: null, error: checkError };
    }

    console.log(`📋 Found ${existingRecords?.length || 0} existing records out of ${scholarIds.length} requested`);
    if (existingRecords) {
      console.log(`📋 Existing records:`, existingRecords.map(r => ({ id: r.id, name: r.registered_name })));
    }

    const { data, error } = await supabase
      .from('examination_records')
      .update(updates)
      .in('id', scholarIds)
      .select();

    if (error) {
      console.error('❌ Error assigning scholars to panel:', error);
      return { data: null, error };
    }

    if (!data || data.length === 0) {
      console.error('❌ No records were updated - IDs may not exist');
      return { data: null, error: new Error('No records were updated') };
    }

    console.log(`✅ Successfully assigned ${data.length} scholars to Panel ${panelNumber}`);
    console.log(`✅ Updated records:`, data.map(r => ({
      id: r.id,
      name: r.registered_name,
      panel: r.panel,
      examiner1: r.examiner1
    })));

    return { data, error: null };
  } catch (err) {
    console.error('❌ Exception assigning scholars to panel:', err);
    return { data: null, error: err };
  }
};

/**
 * Remove panel assignment from examination records
 * @param {Array} scholarIds - Array of scholar IDs to remove from panel
 * @returns {Promise<{data: Array, error: any}>}
 */
export const removeScholarsFromPanel = async (scholarIds) => {
  try {
    console.log(`🔄 Removing ${scholarIds.length} scholars from panel assignment`);

    // First, get the current state of all scholars to check if they have been saved or forwarded
    const { data: currentRecords, error: fetchError } = await supabase
      .from('examination_records')
      .select('id, registered_name, examiner1_marks, examiner2_marks, examiner3_marks, interview_marks, faculty_interview')
      .in('id', scholarIds);

    if (fetchError) {
      console.error('❌ Error fetching current scholar records:', fetchError);
      return { data: null, error: fetchError };
    }

    console.log(`📋 Checking ${currentRecords?.length || 0} scholars for saved/forwarded status`);

    const scholarsToFullyRemove = [];
    const scholarsToPartiallyRemove = [];

    currentRecords.forEach(record => {
      // Check for saved marks (including "Ab" for absent)
      const hasSavedMarks = (record.examiner1_marks && record.examiner1_marks !== 0) ||
        (record.examiner2_marks && record.examiner2_marks !== 0) ||
        (record.examiner3_marks && record.examiner3_marks !== 0) ||
        (record.interview_marks && record.interview_marks !== 0) ||
        record.examiner1_marks === 'Ab' ||
        record.examiner2_marks === 'Ab' ||
        record.examiner3_marks === 'Ab' ||
        record.interview_marks === 'Ab';

      const isForwarded = record.faculty_interview && record.faculty_interview.startsWith('Forwarded_To_');

      if (hasSavedMarks || isForwarded) {
        // Scholar has saved marks or is forwarded - only remove panel assignment, keep examiner data
        scholarsToPartiallyRemove.push(record);
        console.log(`📋 Scholar ${record.registered_name} has saved data or is forwarded - keeping examiner data`);
        console.log(`   - Marks: E1=${record.examiner1_marks}, E2=${record.examiner2_marks}, E3=${record.examiner3_marks}, Avg=${record.interview_marks}`);
        console.log(`   - Forwarded: ${record.faculty_interview || 'No'}`);
      } else {
        // Scholar has no saved marks and is not forwarded - remove everything
        scholarsToFullyRemove.push(record);
        console.log(`📋 Scholar ${record.registered_name} has no saved data - removing all panel data`);
      }
    });

    let updatedRecords = [];

    // For scholars with no saved data - remove everything
    if (scholarsToFullyRemove.length > 0) {
      const fullRemovalIds = scholarsToFullyRemove.map(r => r.id);
      const fullUpdates = {
        panel: null,
        examiner1: null,
        examiner2: null,
        examiner3: null,
        updated_at: new Date().toISOString()
      };

      console.log(`🔄 Fully removing panel data for ${fullRemovalIds.length} scholars`);

      const { data: fullRemovalData, error: fullRemovalError } = await supabase
        .from('examination_records')
        .update(fullUpdates)
        .in('id', fullRemovalIds)
        .select();

      if (fullRemovalError) {
        console.error('❌ Error fully removing scholars from panel:', fullRemovalError);
        return { data: null, error: fullRemovalError };
      }

      updatedRecords = [...updatedRecords, ...(fullRemovalData || [])];
    }

    // For scholars with saved data - only remove panel assignment, keep examiner data
    if (scholarsToPartiallyRemove.length > 0) {
      const partialRemovalIds = scholarsToPartiallyRemove.map(r => r.id);
      const partialUpdates = {
        panel: null, // Only remove panel assignment
        updated_at: new Date().toISOString()
        // Keep examiner1, examiner2, examiner3 intact
      };

      console.log(`🔄 Partially removing panel data for ${partialRemovalIds.length} scholars (keeping examiner data)`);

      const { data: partialRemovalData, error: partialRemovalError } = await supabase
        .from('examination_records')
        .update(partialUpdates)
        .in('id', partialRemovalIds)
        .select();

      if (partialRemovalError) {
        console.error('❌ Error partially removing scholars from panel:', partialRemovalError);
        return { data: null, error: partialRemovalError };
      }

      updatedRecords = [...updatedRecords, ...(partialRemovalData || [])];
    }

    console.log(`✅ Successfully processed ${updatedRecords.length} scholars:`);
    console.log(`   - ${scholarsToFullyRemove.length} scholars: fully removed (no saved data)`);
    console.log(`   - ${scholarsToPartiallyRemove.length} scholars: partially removed (kept examiner data)`);

    return { data: updatedRecords, error: null };
  } catch (err) {
    console.error('❌ Exception removing scholars from panel:', err);
    return { data: null, error: err };
  }
};
/**
 * Forward scholar interview - update faculty_interview column with faculty-specific status
 * @param {string} scholarId - Scholar ID from examination_records table
 * @param {string} departmentName - Department name to determine faculty
 * @param {string} faculty - Faculty name (optional, will be determined from department if not provided)
 * @returns {Promise<{data: Object, error: any}>}
 */
export const forwardScholarInterview = async (scholarId, departmentName = null, faculty = null) => {
  try {
    console.log(`🔄 Forwarding scholar interview ${scholarId} - determining faculty-specific status`);
    console.log(`🔍 Input parameters:`, { scholarId, departmentName, faculty });

    // Get scholar data to determine department/faculty if not provided
    let targetFaculty = faculty;
    if (!targetFaculty && !departmentName) {
      const { data: scholarData, error: fetchError } = await supabase
        .from('examination_records')
        .select('department, institution, type')
        .eq('id', scholarId)
        .single();

      if (fetchError) {
        console.error('❌ Error fetching scholar data for forwarding:', fetchError);
        return { data: null, error: fetchError };
      }

      departmentName = scholarData.department;
      // Determine faculty from institution
      if (scholarData.institution) {
        targetFaculty = scholarData.institution;
      }
    }

    // Determine faculty-specific forwarding status - PRIORITIZE DEPARTMENT MAPPING
    let facultyInterviewStatus;

    // First, try to determine from department name (most reliable)
    if (departmentName) {
      const departmentCode = getDepartmentShortCode(departmentName);
      console.log(`🔍 Department mapping:`, { departmentName, departmentCode });

      if (['BMS', 'CDE', 'OMPM', 'OMS', 'OMR', 'ORTHO', 'PPD', 'POI', 'PROSTH', 'PHD'].includes(departmentCode)) {
        facultyInterviewStatus = 'Forwarded_To_Medical';
        console.log(`✅ Medical department detected: ${departmentCode} -> ${facultyInterviewStatus}`);
      } else if (['BME', 'ENGBIO', 'ENGCHEM', 'CIVIL', 'CSE', 'EEE', 'ECE', 'ENGENG', 'ENGMATH', 'MECH', 'ENGPHYS'].includes(departmentCode)) {
        facultyInterviewStatus = 'Forwarded_To_Engineering';
        console.log(`✅ Engineering department detected: ${departmentCode} -> ${facultyInterviewStatus}`);
      } else if (['BIO', 'COMM', 'CS', 'EFL', 'FASHION', 'MATH', 'TAMIL', 'VISCOM'].includes(departmentCode)) {
        facultyInterviewStatus = 'Forwarded_To_Science';
        console.log(`✅ Science department detected: ${departmentCode} -> ${facultyInterviewStatus}`);
      } else if (['MBA'].includes(departmentCode)) {
        facultyInterviewStatus = 'Forwarded_To_Management';
        console.log(`✅ Management department detected: ${departmentCode} -> ${facultyInterviewStatus}`);
      }
    }

    // If department mapping didn't work, fall back to faculty name
    if (!facultyInterviewStatus && targetFaculty) {
      console.log(`🔍 Faculty fallback mapping:`, { targetFaculty });
      if (targetFaculty.includes('Engineering')) {
        facultyInterviewStatus = 'Forwarded_To_Engineering';
      } else if (targetFaculty.includes('Science')) {
        facultyInterviewStatus = 'Forwarded_To_Science';
      } else if (targetFaculty.includes('Medical')) {
        facultyInterviewStatus = 'Forwarded_To_Medical';
      } else if (targetFaculty.includes('Management')) {
        facultyInterviewStatus = 'Forwarded_To_Management';
      }
      console.log(`✅ Faculty fallback result: ${facultyInterviewStatus}`);
    }

    // Final fallback
    if (!facultyInterviewStatus) {
      facultyInterviewStatus = 'Forwarded_To_Engineering';
      console.log(`⚠️ Using default fallback: ${facultyInterviewStatus}`);
    }

    console.log(`📝 Final decision - Setting faculty_interview to: ${facultyInterviewStatus}`);

    const updates = {
      faculty_interview: facultyInterviewStatus,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('examination_records')
      .update(updates)
      .eq('id', scholarId)
      .select();

    if (error) {
      console.error('❌ Error forwarding scholar interview:', error);
      return { data: null, error };
    }

    console.log(`✅ Successfully forwarded scholar interview ${scholarId} with status: ${facultyInterviewStatus}`);
    return { data: data[0], error: null };
  } catch (err) {
    console.error('❌ Exception forwarding scholar interview:', err);
    return { data: null, error: err };
  }
};

/**
 * Get department statistics for dashboard tiles
 * @param {string} faculty - User's faculty
 * @param {string} department - User's department
 * @returns {Promise<{data: Object, error: any}>}
 */
export const getDepartmentDashboardStats = async (faculty, department) => {
  try {
    console.log(`📊 Fetching dashboard stats for ${department} in ${faculty}`);

    // Get all scholars for this department
    const { data: scholars, error } = await fetchScholarsForDepartmentUser(faculty, department);

    if (error) {
      console.error('❌ Error fetching scholars for stats:', error);
      return { data: null, error };
    }

    if (!scholars || scholars.length === 0) {
      console.log('📊 No scholars found, returning zero stats');
      return {
        data: {
          totalApplications: 0,
          approvedApplications: 0,
          rejectedApplications: 0,
          pendingQueries: 0
        },
        error: null
      };
    }

    // Calculate statistics
    const stats = {
      totalApplications: scholars.length,
      approvedApplications: scholars.filter(s => s.dept_review === 'Approved').length,
      rejectedApplications: scholars.filter(s => s.dept_review === 'Rejected').length,
      pendingQueries: scholars.filter(s => s.dept_review === 'Query').length
    };

    console.log(`📊 Dashboard stats calculated:`, stats);

    return { data: stats, error: null };
  } catch (err) {
    console.error('❌ Exception getting dashboard stats:', err);
    return { data: null, error: err };
  }
};

/**
 * Forward multiple scholar interviews - update faculty_interview column with faculty-specific status
 * @param {Array} scholarIds - Array of scholar IDs from examination_records table
 * @param {string} departmentName - Department name to determine faculty
 * @param {string} faculty - Faculty name (optional, will be determined from department if not provided)
 * @returns {Promise<{data: Array, error: any}>}
 */
export const forwardMultipleScholarInterviews = async (scholarIds, departmentName = null, faculty = null) => {
  try {
    console.log(`🔄 Forwarding ${scholarIds.length} scholar interviews - determining faculty-specific status`);

    // Determine faculty-specific forwarding status
    let facultyInterviewStatus;
    if (faculty) {
      if (faculty.includes('Engineering')) {
        facultyInterviewStatus = 'Forwarded_To_Engineering';
      } else if (faculty.includes('Science')) {
        facultyInterviewStatus = 'Forwarded_To_Science';
      } else if (faculty.includes('Medical')) {
        facultyInterviewStatus = 'Forwarded_To_Medical';
      } else if (faculty.includes('Management')) {
        facultyInterviewStatus = 'Forwarded_To_Management';
      } else {
        facultyInterviewStatus = 'Forwarded_To_Engineering'; // Default fallback
      }
    } else if (departmentName) {
      // Determine faculty from department name
      const departmentCode = getDepartmentShortCode(departmentName);
      if (['BME', 'ENGBIO', 'ENGCHEM', 'CIVIL', 'CSE', 'EEE', 'ECE', 'ENGENG', 'ENGMATH', 'MECH', 'ENGPHYS'].includes(departmentCode)) {
        facultyInterviewStatus = 'Forwarded_To_Engineering';
      } else if (['BIO', 'COMM', 'CS', 'EFL', 'FASHION', 'MATH', 'TAMIL', 'VISCOM'].includes(departmentCode)) {
        facultyInterviewStatus = 'Forwarded_To_Science';
      } else if (['MBA'].includes(departmentCode)) {
        facultyInterviewStatus = 'Forwarded_To_Management';
      } else if (['BMS', 'CDE', 'OMPM', 'OMS', 'OMR', 'ORTHO', 'PPD', 'POI', 'PROSTH', 'PHD'].includes(departmentCode)) {
        facultyInterviewStatus = 'Forwarded_To_Medical';
      } else {
        facultyInterviewStatus = 'Forwarded_To_Engineering'; // Default fallback
      }
    } else {
      facultyInterviewStatus = 'Forwarded_To_Engineering'; // Default fallback
    }

    console.log(`📝 Setting faculty_interview to: ${facultyInterviewStatus} for ${scholarIds.length} scholars`);

    const updates = {
      faculty_interview: facultyInterviewStatus,
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('examination_records')
      .update(updates)
      .in('id', scholarIds)
      .select();

    if (error) {
      console.error('❌ Error forwarding scholar interviews:', error);
      return { data: null, error };
    }

    console.log(`✅ Successfully forwarded ${data.length} scholar interviews with status: ${facultyInterviewStatus}`);
    return { data, error: null };
  } catch (err) {
    console.error('❌ Exception forwarding scholar interviews:', err);
    return { data: null, error: err };
  }
};