import { supabase } from '../../../supabaseClient';

// Map faculty names to status values
const FACULTY_TO_STATUS = {
  'Faculty of Engineering & Technology': 'Forwarded to Engineering',
  'Faculty of Science & Humanities': 'Forwarded to Science',
  'Faculty of Management': 'Forwarded to Management',
  'Faculty of Medical & Health Science': 'Forwarded to Medical',
  // Handle alternate spellings stored in coordinators table
  'Faculty of Medical and Health Sciences': 'Forwarded to Medical',
  'Faculty of Medical & Health Sciences': 'Forwarded to Medical',
  'Faculty of Medical and Health Science': 'Forwarded to Medical',
};

// Map faculty names to dept_status values for admin
const FACULTY_TO_DEPT_STATUS = {
  'Faculty of Engineering & Technology': 'Back_To_Engineering',
  'Faculty of Science & Humanities': 'Back_To_Science',
  'Faculty of Management': 'Back_To_Management',
  'Faculty of Medical & Health Science': 'Back_To_Medical',
  // Handle alternate spellings
  'Faculty of Medical and Health Sciences': 'Back_To_Medical',
  'Faculty of Medical & Health Sciences': 'Back_To_Medical',
  'Faculty of Medical and Health Science': 'Back_To_Medical',
};

// Get status value for a faculty
export const getStatusForFaculty = (facultyName) => {
  if (!facultyName) return null;
  // Try exact map lookup first
  if (FACULTY_TO_STATUS[facultyName]) return FACULTY_TO_STATUS[facultyName];
  // Fallback: keyword matching (medical before science/technology to avoid misclassification)
  const f = facultyName.toLowerCase();
  if (f.includes('medical') || f.includes('health') || f.includes('dentistry')) return 'Forwarded to Medical';
  if (f.includes('engineering')) return 'Forwarded to Engineering';
  if (f.includes('science') || f.includes('humanities')) return 'Forwarded to Science';
  if (f.includes('management') || f.includes('business')) return 'Forwarded to Management';
  if (f.includes('technology')) return 'Forwarded to Engineering';
  return null;
};

// Get dept_status value for admin based on faculty
export const getDeptStatusForFaculty = (facultyName) => {
  if (!facultyName) return null;
  // Try exact map lookup first
  if (FACULTY_TO_DEPT_STATUS[facultyName]) return FACULTY_TO_DEPT_STATUS[facultyName];
  // Fallback: keyword matching
  const f = facultyName.toLowerCase();
  if (f.includes('medical') || f.includes('health') || f.includes('dentistry')) return 'Back_To_Medical';
  if (f.includes('engineering')) return 'Back_To_Engineering';
  if (f.includes('science') || f.includes('humanities')) return 'Back_To_Science';
  if (f.includes('management') || f.includes('business')) return 'Back_To_Management';
  if (f.includes('technology')) return 'Back_To_Engineering';
  return null;
};

// Fetch scholars for faculty portal (Research Coordinator view) - filtered by status AND faculty/institution
// Map institution column values → faculty status strings
const INSTITUTION_TO_STATUS = {
  'engineering and technology': 'Forwarded to Engineering',
  'engineering & technology': 'Forwarded to Engineering',
  'science and humanities': 'Forwarded to Science',
  'science & humanities': 'Forwarded to Science',
  'medical and health sciences': 'Forwarded to Medical',
  'medical & health sciences': 'Forwarded to Medical',
  'medical & health science': 'Forwarded to Medical',
  'management': 'Forwarded to Management',
};

// Derive the expected forwarded status from an institution string
const getStatusForInstitution = (institutionValue) => {
  if (!institutionValue) return null;
  const lower = institutionValue.toLowerCase();
  // Medical must be checked BEFORE science/technology
  if (lower.includes('medical') || lower.includes('health') || lower.includes('dentistry')) return 'Forwarded to Medical';
  if (lower.includes('engineering')) return 'Forwarded to Engineering';
  if (lower.includes('science') || lower.includes('humanities')) return 'Forwarded to Science';
  if (lower.includes('management') || lower.includes('business')) return 'Forwarded to Management';
  if (lower.includes('technology')) return 'Forwarded to Engineering';
  return null;
};

export const fetchFacultyScholars = async (assignedFaculty) => {
  try {
    console.log(`Fetching scholars for assigned faculty: ${assignedFaculty}`);

    if (!assignedFaculty) {
      console.warn('No assigned faculty provided');
      return { data: [], error: null };
    }

    // Derive the expected status value from the faculty name
    // e.g. "Faculty of Medical and Health Sciences" -> "Forwarded to Medical"
    const statusValue = getStatusForFaculty(assignedFaculty);
    console.log(`Normalized faculty: ${assignedFaculty}, Status filter: ${statusValue}`);

    if (!statusValue) {
      console.warn('Could not map faculty to status value');
      return { data: [], error: null };
    }

    // Single authoritative query: status column is set by the director when forwarding
    // to a specific FOET faculty, so it is the correct filter for which scholars
    // belong to this coordinator.
    const { data, error } = await supabase
      .from('scholar_applications')
      .select('*, program_type')
      .eq('status', statusValue)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching scholars by status:', error);
      return { data: null, error };
    }

    console.log(`Found ${data?.length || 0} scholars for faculty: ${assignedFaculty}`);
    return { data: data || [], error: null };
  } catch (err) {
    console.error('Exception in fetchFacultyScholars:', err);
    return { data: null, error: err };
  }
};

// Fetch scholars for admin forward page - filtered by dept_status derived from institution
export const fetchAdminForwardScholars = async (assignedFaculty) => {
  try {
    console.log(`Fetching admin forward scholars for assigned faculty: ${assignedFaculty}`);

    if (!assignedFaculty) {
      console.warn('No assigned faculty provided for admin forward');
      return { data: [], error: null };
    }

    // Derive the expected dept_status from the faculty name using keyword matching
    const getDeptStatusFromFaculty = (faculty) => {
      const f = (faculty || '').toLowerCase();
      // Medical before science/technology
      if (f.includes('medical') || f.includes('health') || f.includes('dentistry')) return 'Back_To_Medical';
      if (f.includes('engineering')) return 'Back_To_Engineering';
      if (f.includes('science') || f.includes('humanities')) return 'Back_To_Science';
      if (f.includes('management') || f.includes('business')) return 'Back_To_Management';
      if (f.includes('technology')) return 'Back_To_Engineering';
      return null;
    };

    const deptStatusValue = getDeptStatusFromFaculty(assignedFaculty);
    console.log(`Assigned faculty: ${assignedFaculty}, Dept status filter: ${deptStatusValue}`);

    if (!deptStatusValue) {
      console.warn('Could not map faculty to dept_status value');
      return { data: [], error: null };
    }

    // Query scholars filtered by dept_status only — no faculty column used
    const { data, error } = await supabase
      .from('scholar_applications')
      .select('*, program_type')
      .eq('dept_status', deptStatusValue)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching admin forward scholars:', error);
      return { data: null, error };
    }

    console.log(`Found ${data?.length || 0} admin forward scholars with dept_status: ${deptStatusValue}`);

    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchAdminForwardScholars:', err);
    return { data: null, error: err };
  }
};

// Fetch examination records for faculty portal
export const fetchFacultyExaminations = async () => {
  try {
    const { data, error } = await supabase
      .from('examinations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching faculty examinations:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchFacultyExaminations:', err);
    return { data: null, error: err };
  }
};

// Fetch question papers for faculty filtered by assigned faculty
export const fetchFacultyQuestionPapers = async (assignedFaculty) => {
  try {
    // Normalize faculty name to handle variations
    const facultyMapping = {
      'Faculty of Engineering & Technology': 'Faculty of Engineering & Technology',
      'Faculty of Science & Humanities': 'Faculty of Science & Humanities',
      'Faculty of Management': 'Faculty of Management',
      'Faculty of Medical & Health Science': 'Faculty of Medical and Health Sciences',
      'Faculty of Medical and Health Sciences': 'Faculty of Medical and Health Sciences'
    };

    let normalizedFaculty = assignedFaculty;
    if (assignedFaculty && facultyMapping[assignedFaculty]) {
      normalizedFaculty = facultyMapping[assignedFaculty];
    }

    let query = supabase
      .from('question_papers')
      .select('*')
      .order('created_at', { ascending: false });

    // Filter by faculty_name if provided
    if (normalizedFaculty) {
      query = query.eq('faculty_name', normalizedFaculty);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching question papers:', error);
      return { data: null, error };
    }

    console.log(`Fetched ${data?.length || 0} question papers for faculty: ${normalizedFaculty}`);
    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchFacultyQuestionPapers:', err);
    return { data: null, error: err };
  }
};

// Update scholar status
export const updateScholarStatus = async (id, status) => {
  try {
    const { data, error } = await supabase
      .from('scholar_applications')
      .update({ status })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating scholar status:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in updateScholarStatus:', err);
    return { data: null, error: err };
  }
};

// Fetch departments filtered by faculty
export const fetchDepartments = async (assignedFaculty) => {
  try {
    // Normalize faculty name to handle variations
    // Map coordinator faculty names to departments table faculty names
    const facultyMapping = {
      'Faculty of Engineering & Technology': 'Faculty of Engineering & Technology',
      'Faculty of Science & Humanities': 'Faculty of Science & Humanities',
      'Faculty of Management': 'Faculty of Management',
      'Faculty of Medical & Health Science': 'Faculty of Medical and Health Sciences',
      'Faculty of Medical and Health Sciences': 'Faculty of Medical and Health Sciences'
    };

    let normalizedFaculty = assignedFaculty;
    if (assignedFaculty && facultyMapping[assignedFaculty]) {
      normalizedFaculty = facultyMapping[assignedFaculty];
    }

    let query = supabase
      .from('departments')
      .select('*')
      .order('department_name', { ascending: true });

    // Filter by faculty if provided
    if (normalizedFaculty) {
      query = query.eq('faculty', normalizedFaculty);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching departments:', error);
      return { data: null, error };
    }

    console.log(`Fetched ${data?.length || 0} departments for faculty: ${normalizedFaculty}`);
    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchDepartments:', err);
    return { data: null, error: err };
  }
};

// Update scholar faculty_status for department forwarding
export const updateScholarFacultyStatus = async (scholarId, facultyStatus, forwardingStatus) => {
  try {
    const updates = { faculty_status: facultyStatus };
    // Also persist the forwarding status so fetch queries on the `status` column work correctly
    if (forwardingStatus) updates.status = forwardingStatus;

    const { data, error } = await supabase
      .from('scholar_applications')
      .update(updates)
      .eq('id', scholarId)
      .select();

    if (error) {
      console.error('Error updating scholar faculty_status:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in updateScholarFacultyStatus:', err);
    return { data: null, error: err };
  }
};

// Batch update multiple scholars' faculty_status
export const batchUpdateScholarsFacultyStatus = async (scholarIds, facultyStatus, forwardingStatus) => {
  try {
    const updates = { faculty_status: facultyStatus };
    if (forwardingStatus) updates.status = forwardingStatus;

    // Update each scholar individually to ensure proper tracking
    const results = await Promise.all(
      scholarIds.map(id =>
        supabase
          .from('scholar_applications')
          .update(updates)
          .eq('id', id)
          .select()
      )
    );

    // Check for any errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Errors during batch update:', errors);
      return {
        data: results.map(r => r.data).filter(Boolean),
        error: `${errors.length} update(s) failed`
      };
    }

    return {
      data: results.map(r => r.data).flat(),
      error: null
    };
  } catch (err) {
    console.error('Exception in batchUpdateScholarsFacultyStatus:', err);
    return { data: null, error: err };
  }
};

// Fetch examination records filtered by faculty with scholar details
export const fetchFacultyExaminationRecords = async (assignedFaculty) => {
  try {
    // Normalize faculty name to handle variations
    const facultyMapping = {
      'Faculty of Engineering & Technology': ['Faculty of Engineering & Technology', 'Engineering And Technology'],
      'Faculty of Science & Humanities': ['Faculty of Science & Humanities', 'Science And Humanities'],
      'Faculty of Management': ['Faculty of Management', 'Management'],
      'Faculty of Medical & Health Science': ['Faculty of Medical & Health Science', 'Faculty of Medical and Health Sciences', 'Medical And Health Sciences', 'Medical and Health Sciences'],
      'Faculty of Medical and Health Sciences': ['Faculty of Medical & Health Science', 'Faculty of Medical and Health Sciences', 'Medical And Health Sciences', 'Medical and Health Sciences']
    };

    // Get all possible faculty name variations for the assigned faculty
    const facultyVariations = facultyMapping[assignedFaculty] || [assignedFaculty];

    console.log(`Fetching examination records for faculty: ${assignedFaculty}`);
    console.log(`Faculty variations to search:`, facultyVariations);

    // Get ALL examination records for this faculty from the faculty column using OR condition
    const { data: examData, error: examError } = await supabase
      .from('examination_records')
      .select('*')
      .or(facultyVariations.map(faculty => `faculty.eq.${faculty}`).join(','))
      .order('created_at', { ascending: false });

    if (examError) {
      console.error('Error fetching examination records:', examError);
      return { data: null, error: examError };
    }

    console.log(`Found ${examData?.length || 0} examination records for faculty variations: ${facultyVariations.join(', ')}`);

    // Get scholar applications to join with examination records
    const { data: scholarData, error: scholarError } = await supabase
      .from('scholar_applications')
      .select('id, registered_name, application_no, faculty, institution, department, type');

    if (scholarError) {
      console.error('Error fetching scholar applications:', scholarError);
      return { data: null, error: scholarError };
    }

    // Create maps for scholar lookup - try multiple matching strategies
    const scholarMapByAppNo = {};
    const scholarMapById = {};
    scholarData.forEach(scholar => {
      if (scholar.application_no) {
        scholarMapByAppNo[scholar.application_no] = scholar;
      }
      if (scholar.id) {
        scholarMapById[scholar.id] = scholar;
      }
    });

    console.log(`Created scholar maps: ${Object.keys(scholarMapByAppNo).length} by app_no, ${Object.keys(scholarMapById).length} by id`);

    // Combine examination records with scholar information
    const combinedData = examData.map(examRecord => {
      let scholar = {};
      let scholarName = '';

      // Try to find scholar by application_no first
      if (examRecord.application_no) {
        scholar = scholarMapByAppNo[examRecord.application_no] || {};
        if (scholar.registered_name) {
          scholarName = scholar.registered_name;
          console.log(`✓ Found scholar by app_no ${examRecord.application_no}: ${scholarName}`);
        }
      }

      // If not found by app_no, try by scholar_id if available
      if (!scholarName && examRecord.scholar_id) {
        scholar = scholarMapById[examRecord.scholar_id] || {};
        if (scholar.registered_name) {
          scholarName = scholar.registered_name;
          console.log(`✓ Found scholar by scholar_id ${examRecord.scholar_id}: ${scholarName}`);
        }
      }

      // If still not found, try scholar_name field from examination_records
      if (!scholarName && examRecord.scholar_name) {
        scholarName = examRecord.scholar_name;
        console.log(`✓ Using scholar_name from examination_records: ${scholarName}`);
      }

      // If still not found, try examiner_name as fallback
      if (!scholarName && examRecord.examiner_name) {
        scholarName = examRecord.examiner_name;
        console.log(`⚠ Using examiner_name as fallback: ${scholarName}`);
      }

      // If still empty, mark as unknown
      if (!scholarName) {
        scholarName = '-';
        console.log(`⚠ No scholar name found for exam record ${examRecord.id}`);
      }

      // Helper function to extract department from program string using regex
      const extractDepartment = (programString) => {
        if (!programString) return '-';
        // Match text before the opening parenthesis
        const match = programString.match(/^([^(]+)/);
        if (match && match[1]) {
          return match[1].trim();
        }
        return programString.trim();
      };

      // Helper function to check if faculty_written indicates marks are forwarded
      const isWrittenMarksForwarded = (facultyWritten) => {
        if (!facultyWritten) return false;
        const forwardedPatterns = [
          'Forwarded to Engineering',
          'Forwarded to Science',
          'Forwarded to Medical',
          'Forwarded to Management'
        ];
        return forwardedPatterns.some(pattern =>
          facultyWritten.includes(pattern)
        );
      };

      // Helper function to check if faculty_interview indicates viva marks are forwarded
      const isVivaMarksForwarded = (facultyInterview) => {
        if (!facultyInterview) return false;
        const forwardedPatterns = [
          'Forwarded_To_Engineering',
          'Forwarded_To_Medical',
          'Forwarded_To_Science',
          'Forwarded_To_Management'
        ];
        return forwardedPatterns.some(pattern =>
          facultyInterview.includes(pattern)
        );
      };

      // Use department field directly — no program parsing needed
      let department = examRecord.department || scholar.department || '-';

      return {
        ...examRecord,
        scholar_name: scholarName,
        registered_name: scholarName,
        scholar_faculty: scholar.faculty || examRecord.faculty || 'N/A',
        institution: examRecord.institution || scholar.institution || 'N/A',
        department: department,
        type: examRecord.type || examRecord.program_type || scholar.type || 'N/A',
        // Preserve original written_marks and faculty_written values for pending detection
        written_marks: examRecord.written_marks,
        faculty_written: examRecord.faculty_written,
        // Preserve original interview_marks and faculty_interview values for pending detection
        interview_marks: examRecord.interview_marks,
        faculty_interview: examRecord.faculty_interview,
        // Director interview status for forwarding to director
        director_interview: examRecord.director_interview || 'Pending'
      };
    });

    // DEDUPLICATION: Remove duplicate records based on application_no or id
    // This ensures each scholar appears only once, even if there are multiple examination records
    const deduplicatedData = [];
    const seenApplicationNos = new Set();
    const seenIds = new Set();

    console.log(`\n=== DEDUPLICATION PROCESS ===`);
    console.log(`Total records before deduplication: ${combinedData.length}`);

    for (const record of combinedData) {
      const appNo = record.application_no;
      const recordId = record.id;

      // Skip if we've already seen this application_no
      if (appNo && seenApplicationNos.has(appNo)) {
        console.log(`⚠️ DUPLICATE DETECTED - Skipping duplicate application_no: ${appNo} (record id: ${recordId})`);
        continue;
      }

      // Skip if we've already seen this record id
      if (recordId && seenIds.has(recordId)) {
        console.log(`⚠️ DUPLICATE DETECTED - Skipping duplicate record id: ${recordId}`);
        continue;
      }

      // Mark as seen
      if (appNo) seenApplicationNos.add(appNo);
      if (recordId) seenIds.add(recordId);

      deduplicatedData.push(record);
    }

    console.log(`Total records after deduplication: ${deduplicatedData.length}`);
    console.log(`Removed ${combinedData.length - deduplicatedData.length} duplicate records`);
    console.log(`=== END DEDUPLICATION ===\n`);

    console.log(`Fetched ${deduplicatedData?.length || 0} examination records for faculty: ${assignedFaculty}`);
    console.log('Sample examination records with type:', deduplicatedData.slice(0, 3).map(record => ({
      id: record.id,
      registered_name: record.registered_name,
      faculty: record.faculty,
      type: record.type,
      program_type: record.program_type,
      written_marks: record.written_marks,
      interview_marks: record.interview_marks
    }))); // Debug log with type field
    return { data: deduplicatedData, error: null };
  } catch (err) {
    console.error('Exception in fetchFacultyExaminationRecords:', err);
    return { data: null, error: err };
  }
};


// Fetch scholars with resolved queries for query scholar page
export const fetchQueryScholars = async (assignedFaculty) => {
  try {
    console.log(`Fetching query scholars for assigned faculty: ${assignedFaculty}`);

    if (!assignedFaculty) {
      console.warn('No assigned faculty provided for query scholars');
      return { data: [], error: null };
    }

    // Derive institution group from the coordinator's assigned faculty name
    const getGroupFromFaculty = (faculty) => {
      const f = (faculty || '').toLowerCase();
      // Medical before science/technology
      if (f.includes('medical') || f.includes('health') || f.includes('dentistry')) return 'Medical';
      if (f.includes('engineering')) return 'Engineering';
      if (f.includes('science') || f.includes('humanities')) return 'Science';
      if (f.includes('management') || f.includes('business')) return 'Management';
      if (f.includes('technology')) return 'Engineering';
      return null;
    };

    const coordinatorGroup = getGroupFromFaculty(assignedFaculty);
    console.log(`Coordinator group derived from "${assignedFaculty}": ${coordinatorGroup}`);

    if (!coordinatorGroup) {
      console.warn('Could not derive institution group from assigned faculty');
      return { data: [], error: null };
    }

    // Fetch scholars that have a query raised (dept_review = 'Query') OR already resolved (query_resolved = 'Query Resolved')
    const { data, error } = await supabase
      .from('scholar_applications')
      .select('*, program_type')
      .or('dept_review.eq.Query,query_resolved.eq.Query Resolved')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching resolved query scholars:', error);
      return { data: null, error };
    }

    // Filter client-side: match scholar's institution column to coordinator's group
    const filtered = (data || []).filter((scholar) => {
      const scholarGroup = getGroupFromFaculty(scholar.institution || '');
      return scholarGroup === coordinatorGroup;
    });

    console.log(`Found ${filtered.length} resolved query scholars for group: ${coordinatorGroup}`);

    return { data: filtered, error: null };
  } catch (err) {
    console.error('Exception in fetchQueryScholars:', err);
    return { data: null, error: err };
  }
};

// Refresh examination records data
export const refreshExaminationRecords = async (assignedFaculty) => {
  return await fetchFacultyExaminationRecords(assignedFaculty);
};

// Update director_interview status in examination_records
export const updateDirectorInterviewStatus = async (recordId, status) => {
  try {
    const { data, error } = await supabase
      .from('examination_records')
      .update({ director_interview: status })
      .eq('id', recordId)
      .select();

    if (error) {
      console.error('Error updating director_interview status:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in updateDirectorInterviewStatus:', err);
    return { data: null, error: err };
  }
};
