import { supabase } from '../supabaseClient';
import * as XLSX from 'xlsx';
import { normalizeFacultyName } from '../utils/departmentUtils';

// HELPER: Check if a string contains faculty abbreviation with robust "and" handling
// Handles: "e and t", "e AND t", "e & t", "E and T", etc.
const containsFacultyAbbreviation = (text, abbrev1, abbrev2) => {
  if (!text) return false;
  const lower = text.toLowerCase().replace(/\s*&\s*/g, ' and ');
  const alt1 = abbrev1.toLowerCase().replace(/\s*&\s*/g, ' and ');
  const alt2 = abbrev2?.toLowerCase().replace(/\s*&\s*/g, ' and ');
  return lower.includes(alt1) || (alt2 ? lower.includes(alt2) : false);
};

// SHARED FETCH LOGIC - Used by BOTH Director and Admin Scholar Administration
export const fetchDirectorAdminScholars = async () => {
  try {
    const { data, error } = await supabase
      .from('scholar_applications')
      .select('*')
      .or('current_owner.eq.director,current_owner.eq.research_coordinator,current_owner.eq.admin')
      .order('id', { ascending: false });

    if (error) {
      console.error('Error fetching director/admin scholars:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchDirectorAdminScholars:', err);
    return { data: null, error: err };
  }
};

// Fetch ALL uploaded scholars for Checklist module (no current_owner filter)
export const fetchAllUploadedScholars = async () => {
  try {
    const { data, error } = await supabase
      .from('scholar_applications')
      .select('*')
      .order('id', { ascending: false });

    if (error) {
      console.error('Error fetching all uploaded scholars:', error);
      return { data: null, error };
    }

    console.log(`✅ Fetched ${data?.length || 0} scholars for Checklist`);
    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchAllUploadedScholars:', err);
    return { data: null, error: err };
  }
};

// Fetch only admitted scholars from examination_records for Checklist
export const fetchAdmittedScholars = async () => {
  try {
    const { data, error } = await supabase
      .from('examination_records')
      .select('*')
      .eq('supervisor_status', 'Admitted')
      .not('supervisor_name', 'is', null)
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching admitted scholars:', error);
      return { data: null, error };
    }

    console.log(`✅ Fetched ${data?.length || 0} admitted scholars for Checklist`);
    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchAdmittedScholars:', err);
    return { data: null, error: err };
  }
};

// Fetch total application count from scholar_applications table
export const getTotalApplicationsCount = async () => {
  try {
    const { count, error } = await supabase
      .from('scholar_applications')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('Error fetching total applications count:', error);
      return { data: 0, error };
    }

    console.log('✅ Total applications count:', count);
    return { data: count || 0, error: null };
  } catch (err) {
    console.error('Exception in getTotalApplicationsCount:', err);
    return { data: 0, error: err };
  }
};

// Fetch scholar counts by faculty from scholar_applications table
export const getScholarCountsByFacultyFromDB = async () => {
  try {
    const { data, error } = await supabase
      .from('scholar_applications')
      .select('faculty, type');

    if (error) {
      console.error('Error fetching scholars by faculty:', error);
      return { data: null, error };
    }

    // Group by faculty and count
    const facultyCounts = {
      'Faculty of Engineering & Technology': { total: 0, fullTime: 0, partTime: 0 },
      'Faculty of Science & Humanities': { total: 0, fullTime: 0, partTime: 0 },
      'Faculty of Management': { total: 0, fullTime: 0, partTime: 0 },
      'Faculty of Medical & Health Science': { total: 0, fullTime: 0, partTime: 0 }
    };

    data?.forEach(scholar => {
      const faculty = scholar.faculty;
      const type = (scholar.type || '').trim();

      if (facultyCounts[faculty]) {
        facultyCounts[faculty].total++;

        if (type === 'Full Time' || type === 'FT') {
          facultyCounts[faculty].fullTime++;
        } else if (type.toLowerCase().includes('part time')) {
          facultyCounts[faculty].partTime++;
        }
      }
    });

    console.log('✅ Scholar counts by faculty:', facultyCounts);
    return { data: facultyCounts, error: null };
  } catch (err) {
    console.error('Exception in getScholarCountsByFacultyFromDB:', err);
    return { data: null, error: err };
  }
};

// Fetch department-wise scholar counts from scholar_applications table for Dashboard accordion
// Fetch department-wise scholar counts from scholar_applications table for Dashboard accordion
// Includes ALL departments from facultiesData context even if they have 0 scholars
export const getDepartmentWiseScholarCountsWithFaculties = async (facultiesData) => {
  try {
    console.log('📊 Step 1: Using departments from facultiesData context...');

    // Helper function to normalize faculty names
    const normalizeFacultyName = (name) => {
      if (!name) return '';
      const normalized = name.trim();
      // Handle variations of Medical & Health Science
      if (normalized.includes('Medical') && normalized.includes('Health')) {
        return 'Faculty of Medical & Health Science';
      }
      return normalized;
    };

    // STEP 1: Get all departments from facultiesData (passed from context)
    const allDepartments = [];
    const facultyNameMap = {}; // Map to track normalized names

    facultiesData?.forEach(faculty => {
      const normalizedName = normalizeFacultyName(faculty.name);
      facultyNameMap[normalizedName] = faculty.name; // Store original name

      faculty.departments?.forEach(dept => {
        allDepartments.push({
          name: dept.name,
          faculty: normalizedName // Use normalized name
        });
      });
    });

    console.log(`✅ Got ${allDepartments.length} departments from facultiesData context`);
    console.log('📊 Faculty names:', Object.keys(facultyNameMap));

    // STEP 2: Fetch scholar counts from scholar_applications
    console.log('📊 Step 2: Fetching scholars from scholar_applications table...');
    const { data: scholars, error: scholarError } = await supabase
      .from('scholar_applications')
      .select('faculty, department, type');

    if (scholarError) {
      console.error('❌ Error fetching scholars:', scholarError);
      return { data: null, error: scholarError };
    }

    console.log(`✅ Fetched ${scholars?.length || 0} scholars from scholar_applications table`);

    // STEP 3: Initialize faculty structure with ALL departments at 0 counts
    console.log('📊 Step 3: Initializing all departments with 0 counts...');
    const facultyData = {};

    // Add all departments from facultiesData with 0 counts
    allDepartments.forEach(dept => {
      const faculty = dept.faculty;
      const department = dept.name;

      if (!faculty || !department) {
        console.warn('⚠️ Skipping department with missing faculty or name:', dept);
        return;
      }

      // Initialize faculty if not exists
      if (!facultyData[faculty]) {
        facultyData[faculty] = {
          name: faculty,
          departments: {}
        };
      }

      // Initialize department with 0 counts (avoid duplicates)
      if (!facultyData[faculty].departments[department]) {
        facultyData[faculty].departments[department] = {
          name: department,
          fullTime: 0,
          internal: 0,
          partTimeExternal: 0,
          industry: 0,
          total: 0
        };
      }
    });

    console.log('✅ Initialized all departments with 0 counts');

    // STEP 4: Add scholar counts to departments
    console.log('📊 Step 4: Merging scholar counts into departments...');

    // Helper function to normalize department names for matching (ONLY for Medical & Health Science)
    const normalizeDepartmentName = (name) => {
      if (!name) return '';
      // Remove common prefixes and suffixes
      let normalized = name.toLowerCase().trim();
      normalized = normalized.replace(/^department of /i, '');
      normalized = normalized.replace(/\s*\[.*?\]\s*/g, ''); // Remove [ph.d. - Pti - Hs] etc
      normalized = normalized.replace(/\s*\(.*?\)\s*/g, ''); // Remove (anything in parentheses)
      normalized = normalized.replace(/\s+/g, ' '); // Normalize spaces
      return normalized;
    };

    // Helper function to find matching department (ONLY for Medical & Health Science)
    const findMatchingDepartment = (scholarDept, facultyDepts, facultyName) => {
      // Only apply fuzzy matching for Medical & Health Science faculty
      if (!facultyName.includes('Medical') || !facultyName.includes('Health')) {
        // For other faculties, return exact match or null
        return facultyDepts[scholarDept] ? scholarDept : null;
      }

      const normalizedScholarDept = normalizeDepartmentName(scholarDept);

      // First try exact match
      for (const deptName of Object.keys(facultyDepts)) {
        if (normalizeDepartmentName(deptName) === normalizedScholarDept) {
          return deptName;
        }
      }

      // Then try partial match (contains)
      for (const deptName of Object.keys(facultyDepts)) {
        const normalizedDeptName = normalizeDepartmentName(deptName);
        if (normalizedDeptName.includes(normalizedScholarDept) || normalizedScholarDept.includes(normalizedDeptName)) {
          return deptName;
        }
      }

      return null; // No match found
    };

    scholars?.forEach(scholar => {
      const faculty = normalizeFacultyName(scholar.faculty); // Normalize scholar faculty name
      const department = scholar.department;
      const type = (scholar.type || '').trim();

      if (!faculty || !department) return;

      // Initialize faculty if not exists (for scholars with faculties not in facultiesData)
      if (!facultyData[faculty]) {
        console.warn(`⚠️ Scholar has faculty "${faculty}" not in facultiesData, adding it`);
        facultyData[faculty] = {
          name: faculty,
          departments: {}
        };
      }

      // Try to find matching department using fuzzy matching (only for Medical & Health Science)
      const matchingDept = findMatchingDepartment(department, facultyData[faculty].departments, faculty);
      const targetDept = matchingDept || department;

      if (!matchingDept && faculty.includes('Medical') && faculty.includes('Health')) {
        console.warn(`⚠️ No matching department found for "${department}" in ${faculty}, creating new entry`);
      }

      // Initialize department if not exists
      if (!facultyData[faculty].departments[targetDept]) {
        facultyData[faculty].departments[targetDept] = {
          name: targetDept,
          fullTime: 0,
          internal: 0,
          partTimeExternal: 0,
          industry: 0,
          total: 0
        };
      }

      // Count by type
      const dept = facultyData[faculty].departments[targetDept];
      dept.total++;

      if (type === 'Full Time' || type === 'FT') {
        dept.fullTime++;
      } else if (type === 'Part Time Internal' || type === 'PTI') {
        dept.internal++;
      } else if (type === 'Part Time External (Industry)' || type === 'PTE(Industry)') {
        dept.industry++;
      } else if (type === 'Part Time External' || type === 'PTE') {
        dept.partTimeExternal++;
      }
    });

    console.log('✅ Merged scholar counts into departments');

    // STEP 5: Convert to array format and sort departments alphabetically
    console.log('📊 Step 5: Converting to array format and sorting...');
    const result = Object.values(facultyData).map(faculty => ({
      name: faculty.name,
      departments: Object.values(faculty.departments).sort((a, b) => a.name.localeCompare(b.name))
    }));

    console.log('✅ Department-wise scholar counts loaded (including ALL departments)');
    result.forEach(faculty => {
      const deptsWithScholars = faculty.departments.filter(d => d.total > 0).length;
      const deptsWithoutScholars = faculty.departments.filter(d => d.total === 0).length;
      console.log(`   ${faculty.name}: ${faculty.departments.length} total (${deptsWithScholars} with scholars, ${deptsWithoutScholars} without)`);
    });

    return { data: result, error: null };
  } catch (err) {
    console.error('❌ Exception in getDepartmentWiseScholarCountsWithFaculties:', err);
    return { data: null, error: err };
  }
};

// Fetch scholars sent back to director from faculty (for Verified Scholars page)
// EXCLUDES scholars with queries (dept_review contains "Query")
// OPTION 1: Try using database function (bypasses RLS if function exists)
// OPTION 2: Fall back to admin client
// OPTION 3: Fall back to regular client
export const fetchBackToDirectorScholars = async () => {
  try {
    console.log('🔍 Fetching scholars sent back to director (excluding Query scholars)...');

    // OPTION 1: Try using database function that bypasses RLS
    console.log('Attempting to use database function (bypasses RLS)...');
    const { data: functionData, error: functionError } = await supabase
      .rpc('get_back_to_director_scholars');

    if (!functionError && functionData) {
      console.log(`✅ SUCCESS via database function! Found ${functionData.length} scholars`);
      // Filter out scholars with queries
      const filteredData = functionData.filter(scholar => {
        const deptReview = scholar.dept_review || '';
        return !deptReview.toLowerCase().includes('query');
      });
      console.log(`✅ After excluding Query scholars: ${filteredData.length} scholars`);
      console.log('Scholar IDs:', filteredData.map(s => s.id));
      return { data: filteredData, error: null };
    }

    if (functionError) {
      console.log('⚠️ Database function not available:', functionError.message);
      console.log('Falling back to admin client...');
    }

    // OPTION 2: Try admin client
    const { supabaseAdmin } = await import('../supabaseClient');
    const client = supabaseAdmin || supabase;

    console.log('Using client:', supabaseAdmin ? 'ADMIN (should bypass RLS)' : 'REGULAR (subject to RLS)');

    const { data, error } = await client
      .from('scholar_applications')
      .select('*')
      .eq('faculty_forward', 'Back_To_Director')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching back to director scholars:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('');
      console.error('🔧 RLS IS BLOCKING THE QUERY!');
      console.error('📋 You need to run SQL in Supabase to fix this:');
      console.error('   1. Go to Supabase Dashboard > SQL Editor');
      console.error('   2. Run: ALTER TABLE scholar_applications DISABLE ROW LEVEL SECURITY;');
      console.error('   OR create the bypass function from CREATE_BYPASS_RLS_FUNCTION.sql');
      console.error('');
      return { data: null, error };
    }

    console.log(`✅ Found ${data?.length || 0} scholars sent back to director`);

    // Filter out scholars with queries (dept_review contains "Query")
    const filteredData = data.filter(scholar => {
      const deptReview = scholar.dept_review || '';
      return !deptReview.toLowerCase().includes('query');
    });

    console.log(`✅ After excluding Query scholars: ${filteredData.length} scholars`);

    if (filteredData && filteredData.length === 1) {
      console.warn('⚠️ WARNING: Only 1 scholar found. This suggests RLS is still blocking!');
      console.warn('📋 Expected more scholars. RLS policy needs to be updated in Supabase.');
    }

    console.log('Scholar IDs:', filteredData?.map(s => s.id));

    // Log first scholar for debugging
    if (filteredData && filteredData.length > 0) {
      console.log('Sample scholar data:', {
        id: filteredData[0].id,
        registered_name: filteredData[0].registered_name,
        faculty_forward: filteredData[0].faculty_forward,
        dept_review: filteredData[0].dept_review,
        reject_reason: filteredData[0].reject_reason,
        current_owner: filteredData[0].current_owner
      });
    }

    return { data: filteredData, error: null };
  } catch (err) {
    console.error('❌ Exception in fetchBackToDirectorScholars:', err);
    return { data: null, error: err };
  }
};

// Fetch Back_To_Director scholar counts grouped by faculty and department (for Dashboard)
// EXCLUDES scholars with queries (dept_review contains "Query")
export const fetchBackToDirectorCountsByFaculty = async () => {
  try {
    console.log('🔍 Fetching Back_To_Director counts by faculty and department (excluding Query scholars)...');

    // Try using database function first (bypasses RLS)
    const { data: functionData, error: functionError } = await supabase
      .rpc('get_back_to_director_scholars');

    let scholars = [];

    if (!functionError && functionData) {
      console.log(`✅ Using database function - Found ${functionData.length} scholars`);
      // Filter out scholars with queries
      scholars = functionData.filter(scholar => {
        const deptReview = scholar.dept_review || '';
        return !deptReview.toLowerCase().includes('query');
      });
      console.log(`✅ After excluding Query scholars: ${scholars.length} scholars`);
    } else {
      // Fallback to direct query
      const { supabaseAdmin } = await import('../supabaseClient');
      const client = supabaseAdmin || supabase;

      const { data, error } = await client
        .from('scholar_applications')
        .select('faculty, department, program, dept_review')
        .eq('faculty_forward', 'Back_To_Director');

      if (error) {
        console.error('❌ Error fetching Back_To_Director counts:', error);
        return { data: null, error };
      }

      // Filter out scholars with queries
      scholars = (data || []).filter(scholar => {
        const deptReview = scholar.dept_review || '';
        return !deptReview.toLowerCase().includes('query');
      });
      console.log(`✅ After excluding Query scholars: ${scholars.length} scholars`);
    }

    // Group by faculty and department
    const facultyCounts = {};

    scholars.forEach(scholar => {
      const faculty = scholar.faculty || 'Unknown';
      const department = scholar.department || scholar.program || 'Unknown';

      if (!facultyCounts[faculty]) {
        facultyCounts[faculty] = {
          total: 0,
          departments: {}
        };
      }

      if (!facultyCounts[faculty].departments[department]) {
        facultyCounts[faculty].departments[department] = 0;
      }

      facultyCounts[faculty].total++;
      facultyCounts[faculty].departments[department]++;
    });

    console.log('✅ Back_To_Director counts by faculty (excluding Query scholars):', facultyCounts);
    return { data: facultyCounts, error: null };
  } catch (err) {
    console.error('❌ Exception in fetchBackToDirectorCountsByFaculty:', err);
    return { data: null, error: err };
  }
};

// Fetch single scholar by ID - for View and Edit
export const fetchScholarById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('scholar_applications')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching scholar by ID:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchScholarById:', err);
    return { data: null, error: err };
  }
};

// Update scholar record
export const updateScholar = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('scholar_applications')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating scholar:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in updateScholar:', err);
    return { data: null, error: err };
  }
};

// Update scholar checklist in examination_records table
export const updateScholarChecklist = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('examination_records')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating scholar checklist:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in updateScholarChecklist:', err);
    return { data: null, error: err };
  }
};

// Add new scholar record
export const addScholar = async (scholarData) => {
  try {
    console.log('Attempting to add scholar with data:', scholarData);

    const { data, error } = await supabase
      .from('scholar_applications')
      .insert([scholarData])
      .select();

    if (error) {
      console.error('Supabase error adding scholar:', error);
      console.error('Error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code
      });
      return { data: null, error };
    }

    console.log('Scholar added successfully:', data);
    return { data, error: null };
  } catch (err) {
    console.error('Exception in addScholar:', err);
    console.error('Exception details:', err.message, err.stack);
    return { data: null, error: err };
  }
};

// Fetch distinct institution values from scholar_applications
export const fetchDistinctInstitutions = async () => {
  try {
    const { data, error } = await supabase
      .from('scholar_applications')
      .select('institution')
      .not('institution', 'is', null)
      .neq('institution', '');

    if (error) {
      console.error('Error fetching institutions:', error);
      return { data: null, error };
    }

    const unique = [...new Set(data.map(r => r.institution).filter(Boolean))].sort();
    return { data: unique, error: null };
  } catch (err) {
    console.error('Exception in fetchDistinctInstitutions:', err);
    return { data: null, error: err };
  }
};

// Fetch distinct department values from scholar_applications
export const fetchDistinctDepartments = async () => {
  try {
    const { data, error } = await supabase
      .from('scholar_applications')
      .select('department')
      .not('department', 'is', null)
      .neq('department', '');

    if (error) {
      console.error('Error fetching departments:', error);
      return { data: null, error };
    }

    const unique = [...new Set(data.map(r => r.department).filter(Boolean))].sort();
    return { data: unique, error: null };
  } catch (err) {
    console.error('Exception in fetchDistinctDepartments:', err);
    return { data: null, error: err };
  }
};

// Fetch distinct type values from scholar_applications
export const fetchDistinctTypes = async () => {
  try {
    const { data, error } = await supabase
      .from('scholar_applications')
      .select('type')
      .not('type', 'is', null)
      .neq('type', '');

    if (error) {
      console.error('Error fetching types:', error);
      return { data: null, error };
    }

    const unique = [...new Set(data.map(r => r.type).filter(Boolean))].sort();
    return { data: unique, error: null };
  } catch (err) {
    console.error('Exception in fetchDistinctTypes:', err);
    return { data: null, error: err };
  }
};

// Forward scholar to Research Coordinator - derives status from institution column only
// faculty_status is NOT updated (stays null)
export const forwardScholarToRC = async (id) => {
  try {
    const { data: scholar, error: fetchError } = await supabase
      .from('scholar_applications')
      .select('institution, faculty')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching scholar data:', fetchError);
      return { data: null, error: fetchError };
    }

    // Use faculty first (more reliable), fall back to institution
    const institutionStr = ((scholar.faculty || scholar.institution || '')).toLowerCase();

    let forwardedStatus = 'Forwarded';

    // Medical must be checked BEFORE science/technology to avoid misclassifying
    if (institutionStr.includes('medical') || institutionStr.includes('health')) {
      forwardedStatus = 'Forwarded to Medical';
    } else if (institutionStr.includes('engineering') || institutionStr.includes('technology')) {
      forwardedStatus = 'Forwarded to Engineering';
    } else if (institutionStr.includes('science') || institutionStr.includes('humanities')) {
      forwardedStatus = 'Forwarded to Science';
    } else if (institutionStr.includes('management')) {
      forwardedStatus = 'Forwarded to Management';
    }

    // Only update status — do NOT touch faculty_status
    const { data, error } = await supabase
      .from('scholar_applications')
      .update({
        status: forwardedStatus,
        current_owner: 'research_coordinator'
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error forwarding scholar to RC:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in forwardScholarToRC:', err);
    return { data: null, error: err };
  }
};

// Fetch scholars for Research Coordinator
export const fetchResearchCoordinatorScholars = async () => {
  try {
    const { data, error } = await supabase
      .from('scholar_applications')
      .select('*')
      .eq('current_owner', 'research_coordinator')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching RC scholars:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchResearchCoordinatorScholars:', err);
    return { data: null, error: err };
  }
};

// Excel/CSV Upload - Parse file and insert records
export const uploadScholarExcel = async (file) => {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet);

    if (!jsonData || jsonData.length === 0) {
      return { data: null, error: { message: 'No data found in file' } };
    }

    // Helper function to get value from multiple possible column names (case-insensitive & trimmed)
    const getColumnValue = (row, ...columnNames) => {
      if (!row) return null;
      const rowKeys = Object.keys(row);
      for (const name of columnNames) {
        const targetName = name.toLowerCase().trim();
        const matchedKey = rowKeys.find(k => k.toLowerCase().trim() === targetName);
        if (matchedKey && row[matchedKey] !== undefined && row[matchedKey] !== null && row[matchedKey] !== '') {
          return row[matchedKey];
        }
      }
      return null;
    };

    // Helper function to clean phone numbers (remove quotes and extra characters)
    const cleanPhoneNumber = (phone) => {
      if (!phone) return null;
      // Remove surrounding quotes and trim
      return String(phone).replace(/^['"]|['"]$/g, '').trim();
    };

    // Helper function to convert Excel date serial number to formatted date
    const convertExcelDate = (excelDate) => {
      if (!excelDate) return null;

      // If it's already a formatted date string (DD-MM-YYYY or similar), return it
      if (typeof excelDate === 'string' && (excelDate.includes('-') || excelDate.includes('/'))) {
        // Strip time portion if present (e.g., "04/03/2026, 09:57 Am")
        const datePart = excelDate.split(',')[0].trim();
        const parts = datePart.split(/[-/]/);
        if (parts.length === 3) {
          // DD/MM/YYYY or DD-MM-YYYY
          if (parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
            return `${parts[0].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[2]}`;
          }
          // YYYY-MM-DD
          if (parts[0].length === 4) {
            return `${parts[2].padStart(2, '0')}-${parts[1].padStart(2, '0')}-${parts[0]}`;
          }
        }
        return datePart;
      }

      // If it's a number (Excel serial date), convert it
      if (typeof excelDate === 'number') {
        // Excel date serial number starts from 1900-01-01
        const excelEpoch = new Date(1900, 0, 1);
        const daysOffset = excelDate - 2; // Excel has a leap year bug for 1900
        const date = new Date(excelEpoch.getTime() + daysOffset * 24 * 60 * 60 * 1000);

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}-${month}-${year}`;
      }

      return excelDate;
    };

    // Helper function to convert Excel date to Month-Year format (e.g., "Jan-09")
    const convertToMonthYear = (excelDate) => {
      if (!excelDate) return null;

      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

      // If it's already in Month-Year format (e.g., "Jan-09"), return it
      if (typeof excelDate === 'string' && /^[A-Za-z]{3}-\d{2}$/.test(excelDate)) {
        return excelDate;
      }

      // Handle MM/YYYY format (e.g., "02/2024")
      if (typeof excelDate === 'string' && /^\d{1,2}\/\d{4}$/.test(excelDate.trim())) {
        const [mm, yyyy] = excelDate.trim().split('/');
        const monthIdx = parseInt(mm) - 1;
        if (monthIdx >= 0 && monthIdx < 12) {
          return `${monthNames[monthIdx]}-${yyyy.slice(-2)}`;
        }
      }

      // Handle MM-YYYY format (e.g., "02-2024")
      if (typeof excelDate === 'string' && /^\d{1,2}-\d{4}$/.test(excelDate.trim())) {
        const [mm, yyyy] = excelDate.trim().split('-');
        const monthIdx = parseInt(mm) - 1;
        if (monthIdx >= 0 && monthIdx < 12) {
          return `${monthNames[monthIdx]}-${yyyy.slice(-2)}`;
        }
      }

      // If it's a date string, parse it
      if (typeof excelDate === 'string' && (excelDate.includes('-') || excelDate.includes('/'))) {
        const parts = excelDate.split(/[-/]/);
        if (parts.length === 3) {
          let month, year;
          // Check format: DD-MM-YYYY or MM-DD-YYYY
          if (parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 4) {
            month = parseInt(parts[1]) - 1; // Month is 0-indexed
            year = parts[2].slice(-2); // Get last 2 digits of year
          }
          // Check format: YYYY-MM-DD
          else if (parts[0].length === 4) {
            month = parseInt(parts[1]) - 1;
            year = parts[0].slice(-2);
          }

          if (month >= 0 && month < 12) {
            return `${monthNames[month]}-${year}`;
          }
        }
        return excelDate;
      }

      // If it's a number (Excel serial date), convert it
      if (typeof excelDate === 'number') {
        const excelEpoch = new Date(1900, 0, 1);
        const daysOffset = excelDate - 2;
        const date = new Date(excelEpoch.getTime() + daysOffset * 24 * 60 * 60 * 1000);

        const month = monthNames[date.getMonth()];
        const year = String(date.getFullYear()).slice(-2);

        return `${month}-${year}`;
      }

      return excelDate;
    };

    // Map Excel columns to Supabase columns with proper field mapping
    const records = jsonData.map(row => {
      const programValue = getColumnValue(row, 'Program', 'Select Program', 'Course Name', 'Programme');
      const institutionValue = getColumnValue(row, 'Institution', 'Select Institution', 'Institute', 'University', 'Select Institute');

      // Extract type with specific categories from Type column or program string
      const extractType = (programString) => {
        // First check direct type/mode columns from the Excel
        const directType = getColumnValue(row, 'Mode Of Study', 'Type', 'Study Type', 'Program Type');

        const normalizeType = (val) => {
          const t = String(val).toLowerCase().trim();
          if (t === 'ft' || t === 'full time' || t.includes('full time')) return 'Full Time';
          if (t.includes('part time') && t.includes('external') && t.includes('industry')) return 'Part Time External (Industry)';
          if (t.includes('part time') && (t.includes('external') || t.includes('academic'))) return 'Part Time External';
          if (t.includes('part time') && t.includes('internal')) return 'Part Time Internal';
          if (t === 'pte(industry)' || t === 'pte (industry)') return 'Part Time External (Industry)';
          if (t === 'pte') return 'Part Time External';
          if (t === 'pti') return 'Part Time Internal';
          if (t === 'pt' || t.includes('part time')) return 'Part Time';
          return val; // return as-is if no mapping
        };

        if (directType) return normalizeType(directType);

        // Extract from program string with specific categories
        if (programString) {
          const programLower = programString.toLowerCase();
          if (programLower.includes('full time') || programLower.includes('- ft ') || programLower.includes('- ft-') || programLower.includes('(ft)')) return 'Full Time';
          if (programLower.includes('part time') && programLower.includes('external') && programLower.includes('industry')) return 'Part Time External (Industry)';
          if (programLower.includes('part time') && (programLower.includes('external') || programLower.includes('academic'))) return 'Part Time External';
          if (programLower.includes('part time') && programLower.includes('internal')) return 'Part Time Internal';
          if (programLower.includes('- pte(') || programLower.includes('- pte ') || programLower.includes('- pte-')) return 'Part Time External';
          if (programLower.includes('- pti ') || programLower.includes('- pti-')) return 'Part Time Internal';
          if (programLower.includes('part time')) return 'Part Time';
        }

        return 'Full Time';
      };

      // Extract faculty from program or institution
      const extractFaculty = (programString, institutionString) => {
        // First check if there's a direct faculty column
        const directFaculty = getColumnValue(row, 'Faculty', 'Faculty Name', 'Institute / Applying For');
        if (directFaculty) {
          const fl = directFaculty.toLowerCase();
          // Medical must be checked BEFORE engineering/technology to avoid misclassifying
          // departments like "Anaesthesia Technology", "Renal Dialysis Technology" etc.
          if (fl.includes('medical') || fl.includes('health') || fl.includes('medicine')) return 'Faculty of Medical & Health Science';
          // Use helper to check for E&T with all "and" variations
          if (containsFacultyAbbreviation(fl, 'engineering', 'e and t') || containsFacultyAbbreviation(fl, 'e & t', 'foet')) return 'Faculty of Engineering & Technology';
          // Use helper to check for S&H with all "and" variations
          if (containsFacultyAbbreviation(fl, 'science', 's and h') || containsFacultyAbbreviation(fl, 's & h', 'fsh')) return 'Faculty of Science & Humanities';
          if (fl.includes('management') || fl.includes('mgt') || fl.includes('business')) return 'Faculty of Management';
          if (fl.includes('law') || fl.includes('legal')) return 'Faculty of Law';
          // Only fall back to 'technology' keyword after ruling out medical
          if (fl.includes('technology')) return 'Faculty of Engineering & Technology';
          return directFaculty;
        }

        // Check institution string first (more reliable than program string for faculty)
        if (institutionString) {
          const instLower = institutionString.toLowerCase();
          if (instLower.includes('medical') || instLower.includes('health')) return 'Faculty of Medical & Health Science';
          if (instLower.includes('engineering')) return 'Faculty of Engineering & Technology';
          if (instLower.includes('science') || instLower.includes('humanities')) return 'Faculty of Science & Humanities';
          if (instLower.includes('management') || instLower.includes('business')) return 'Faculty of Management';
          if (instLower.includes('technology')) return 'Faculty of Engineering & Technology';
        }

        // Check program string for faculty indicators (least reliable — check medical first)
        if (programString) {
          const programLower = programString.toLowerCase();
          if (programLower.includes('medical') || programLower.includes('health') || programLower.includes('medicine')) return 'Faculty of Medical & Health Science';
          // Use helper to check for E&T with all "and" variations
          if (containsFacultyAbbreviation(programLower, 'engineering', 'e and t') || containsFacultyAbbreviation(programLower, 'e & t', 'foet')) return 'Faculty of Engineering & Technology';
          // Use helper to check for S&H with all "and" variations
          if (containsFacultyAbbreviation(programLower, 'science', 's and h') || containsFacultyAbbreviation(programLower, 's & h', 'fsh')) return 'Faculty of Science & Humanities';
          if (programLower.includes('management') || programLower.includes('mgt') || programLower.includes('business')) return 'Faculty of Management';
          if (programLower.includes('law') || programLower.includes('legal')) return 'Faculty of Law';
          // Only use 'technology' as a fallback after ruling out medical
          if (programLower.includes('technology')) return 'Faculty of Engineering & Technology';
        }

        return '';
      };

      // Extract department from program string or direct column
      const extractDepartment = (programString) => {
        // Check direct department column first
        const directDept = getColumnValue(row, 'Department', 'Specialization', 'Dept');
        if (directDept) return directDept;

        if (!programString) return '';

        // Remove everything from the opening bracket onwards
        const cleanMatch = programString.match(/^([^(]+)/);
        const cleanName = cleanMatch ? cleanMatch[1].trim() : programString;

        // Remove "Ph.d. - " or "Ph.D. - " prefix (case insensitive)
        const departmentName = cleanName.replace(/^ph\.?d\.?\s*-\s*/i, '').trim();

        return departmentName;
      };

      return {
        application_no: getColumnValue(row, 'Application No', 'ApplicationNo', 'App No', 'Application Number'),
        form_name: getColumnValue(row, 'Form Name', 'FormName', 'Form') || 'PhD Application Form',
        registered_name: getColumnValue(row, 'Registered Name', 'Applicant Name (As Per Certificates)', 'Applicant Name', 'Name', 'Scholar Name', 'Full Name', 'Student Name'),
        institution: institutionValue,
        program: programValue,
        program_type: extractType(programValue),
        mobile_number: cleanPhoneNumber(getColumnValue(row, 'Registered Mobile', 'Mobile Number', 'Mobile', 'Phone', 'Contact Number', 'Phone Number')),
        email: getColumnValue(row, 'Registered Email', 'Email ID', 'Email', 'E-mail', 'Email Address'),
        date_of_birth: convertExcelDate(getColumnValue(row, 'Date Of Birth', 'DOB', 'Birth Date')),
        gender: getColumnValue(row, 'Gender', 'Sex') || 'Male',
        graduated_from_india: getColumnValue(row, 'Have You Graduated From India?', 'Have You Studied From India', 'Graduated From India', 'India Graduate') || 'Yes',
        course: getColumnValue(row, 'Course', 'Degree', 'Programme'),
        employee_id: getColumnValue(row, '1 - Employee Id', 'Employee Id', 'Employee ID', 'EmployeeID', 'Emp ID'),
        designation: getColumnValue(row, '1 - Designation', 'Designation', 'Position', 'Job Title') || 'Research Scholar',
        organization_name: getColumnValue(row, '1 - Organization Name', 'Organization Name', 'Organization', 'Company Name', 'Employer'),
        organization_address: getColumnValue(row, '1 - Organization Address', 'Organization Address', 'Company Address', 'Office Address'),
        differently_abled: getColumnValue(row, 'Physically Challenged', 'Are You Differently Abled ?', 'Are You Differently Abled?', 'Differently Abled', 'Disabled', 'PWD'),
        nature_of_deformity: getColumnValue(row, 'Nature Of Deformity', 'Disability Type', 'Deformity Nature'),
        percentage_of_deformity: String(getColumnValue(row, 'Percentage Of Deformity', 'Disability Percentage', 'Deformity Percentage') || ''),
        nationality: getColumnValue(row, 'Nationality', 'Country') || 'Indian',
        aadhaar_no: getColumnValue(row, 'Aadhaar Number', 'Aadhaar Card No.', 'Aadhaar No', 'Aadhaar', 'Aadhar Number'),
        mode_of_profession: getColumnValue(row, 'Mode Of Profession (Industry/Academic)', 'Mode of Profession', 'Profession Mode', 'Profession Type') || 'Academic',
        area_of_interest: getColumnValue(row, 'Area Of Interest', 'Research Area', 'Interest Area', 'Specialization Area'),
        ug_qualification: getColumnValue(row, 'UG - Current Education Qualification', 'UG Qualification', 'UG Education', 'Undergraduate Qualification'),
        ug_institute: getColumnValue(row, 'UG - Institute Name', 'UG Institute', 'UG College', 'UG University'),
        ug_degree: getColumnValue(row, 'UG - Degree', 'UG Degree', 'Undergraduate Degree'),
        ug_specialization: getColumnValue(row, 'UG - Specialization', 'UG Specialization', 'UG Branch', 'UG Major'),
        ug_marking_scheme: getColumnValue(row, 'UG - Marking Scheme', 'UG Marking Scheme', 'UG Grade System') || 'CGPA',
        ug_cgpa: getColumnValue(row, 'UG - CGPA Or Percentage', 'UG CGPA', 'UG Marks', 'UG Percentage', 'UG Grade'),
        ug_month_year: convertToMonthYear(getColumnValue(row, 'UG - Month & Year', 'UG Month Year', 'UG Completion Date', 'UG Year')),
        ug_registration_no: getColumnValue(row, 'UG - Registration No.', 'UG Registration No', 'UG Reg No', 'UG Roll No'),
        ug_mode_of_study: getColumnValue(row, 'UG - Mode Of Study', 'UG Mode of Study', 'UG Study Mode') || 'Full Time',
        ug_place_of_institution: getColumnValue(row, 'UG - Place Of The Institution', 'UG Place', 'UG Location', 'UG City'),
        pg_qualification: getColumnValue(row, 'PG - Current Education Qualification', 'PG Qualification', 'PG Education', 'Postgraduate Qualification'),
        pg_institute: getColumnValue(row, 'PG - Institute Name', 'PG Institute', 'PG College', 'PG University'),
        pg_degree: getColumnValue(row, 'PG - Degree', 'PG Degree', 'Postgraduate Degree'),
        pg_specialization: getColumnValue(row, 'PG - Specialization', 'PG Specialization', 'PG Branch', 'PG Major'),
        pg_marking_scheme: getColumnValue(row, 'PG - Marking Scheme', 'PG Marking Scheme', 'PG Grade System') || 'CGPA',
        pg_cgpa: getColumnValue(row, 'PG - CGPA / Percentage', 'PG - CGPA Or Percentage', 'PG CGPA', 'PG Marks', 'PG Percentage', 'PG Grade'),
        pg_month_year: convertToMonthYear(getColumnValue(row, 'PG - Month & Year', 'PG Month Year', 'PG Completion Date', 'PG Year')),
        pg_registration_no: getColumnValue(row, 'PG - Registration No.', 'PG Registration No', 'PG Reg No', 'PG Roll No'),
        pg_mode_of_study: getColumnValue(row, 'PG - Mode Of Study', 'PG Mode of Study', 'PG Study Mode') || 'Full Time',
        pg_place_of_institution: getColumnValue(row, 'PG - Place Of The Institution', 'PG Place', 'PG Location', 'PG City'),
        other_qualification: getColumnValue(row, 'Other Degree - Current Education Qualification', 'Other Qualification', 'Additional Qualification'),
        other_institute: getColumnValue(row, 'Other Degree - Institute Name', 'Other Institute', 'Other College'),
        other_degree: getColumnValue(row, 'Other Degree - Degree', 'Other Degree', 'Additional Degree'),
        other_specialization: getColumnValue(row, 'Other Degree - Specialization', 'Other Specialization'),
        other_marking_scheme: getColumnValue(row, 'Other Degree - Marking Scheme', 'Other Marking Scheme'),
        other_cgpa: getColumnValue(row, 'Other Degree - CGPA / Percentage', 'Other Degree - CGPA Or Percentage', 'Other CGPA', 'Other Marks'),
        other_month_year: convertToMonthYear(getColumnValue(row, 'Other Degree - Month & Year', 'Other Month Year')),
        other_registration_no: getColumnValue(row, 'Other Degree - Registration No.', 'Other Registration No'),
        other_mode_of_study: getColumnValue(row, 'Other Degree - Mode Of Study', 'Other Mode of Study'),
        other_place_of_institution: getColumnValue(row, 'Other Degree - Place Of The Institution', 'Other Place'),
        competitive_exam: getColumnValue(row, 'Have You Taken Any Competitive Exam?', 'Competitive Exam', 'Exam Taken'),
        // '1. - ...' columns are unique prefixed names in the Excel; generic 'Exam Name' etc. are deduplicated with _N suffixes
        exam1_name: getColumnValue(row, '1. - Name Of The Exam', 'Exam Name', 'Exam 1 Name'),
        exam1_reg_no: getColumnValue(row, '1. - Registration No./Roll No.', 'Register No', 'Exam 1 Reg No'),
        exam1_score: getColumnValue(row, '1. - Score Obtained', 'Marks Obtained / Percentage', 'Exam 1 Score'),
        exam1_max_score: getColumnValue(row, '1. - Max Score', 'Maximum Marks / Percentage', 'Exam 1 Max Score'),
        exam1_year: getColumnValue(row, '1. - Year Appeared', 'Month And Year Of Passing / Appearing', 'Exam 1 Year'),
        exam1_rank: getColumnValue(row, '1. - AIR/Overall Rank', 'Overall Rank/Grade', 'Exam 1 Rank'),
        exam1_qualified: getColumnValue(row, '1. - Qualified/Not Qualified', 'Qualified Status', 'Exam 1 Qualified'),
        exam2_name: getColumnValue(row, '2. - Name Of The Exam', 'Exam 2 Name', 'Exam2 Name'),
        exam2_reg_no: getColumnValue(row, '2. - Registration No./Roll No.', 'Exam 2 Reg No', 'Exam2 Reg No'),
        exam2_score: getColumnValue(row, '2. - Score Obtained', 'Exam 2 Score', 'Exam2 Score'),
        exam2_max_score: getColumnValue(row, '2. - Max Score', 'Exam 2 Max Score', 'Exam2 Max Score'),
        exam2_year: getColumnValue(row, '2. - Year Appeared', 'Exam 2 Year', 'Exam2 Year'),
        exam2_rank: getColumnValue(row, '2. - AIR/Overall Rank', 'Exam 2 Rank', 'Exam2 Rank'),
        exam2_qualified: getColumnValue(row, '2. - Qualified/Not Qualified', 'Exam 2 Qualified', 'Exam2 Qualified'),
        exam3_name: getColumnValue(row, '3. - Name Of The Exam', 'Exam 3 Name', 'Exam3 Name'),
        exam3_reg_no: getColumnValue(row, '3. - Registration No./Roll No.', 'Exam 3 Reg No', 'Exam3 Reg No'),
        exam3_score: getColumnValue(row, '3. - Score Obtained', 'Exam 3 Score', 'Exam3 Score'),
        exam3_max_score: getColumnValue(row, '3. - Max Score', 'Exam 3 Max Score', 'Exam3 Max Score'),
        exam3_year: getColumnValue(row, '3. - Year Appeared', 'Exam 3 Year', 'Exam3 Year'),
        exam3_rank: getColumnValue(row, '3. - AIR/Overall Rank', 'Exam 3 Rank', 'Exam3 Rank'),
        exam3_qualified: getColumnValue(row, '3. - Qualified/Not Qualified', 'Exam 3 Qualified', 'Exam3 Qualified'),
        reasons_for_applying: getColumnValue(row, 'Describe In 300 Words; Your Reasons For Applying To The Proposed Program; Your Study Interests/future Career Plans, And Other Interests That Drives You To Apply To The Program.', 'Reasons For Applying', 'Reasons', 'Why Apply'),
        research_interest: getColumnValue(row, 'Title And Abstract Of The Master Degree Thesis And Your Research Interest In 500 Words', 'Research Interest', 'Research Area'),
        user_id: getColumnValue(row, 'User Id', 'User ID', 'UserID'),
        certificates: (() => {
          // Second Excel file has 'Ceritificate link' (typo) as a direct column
          const direct = getColumnValue(row, 'Ceritificate link', 'Certificate link', 'Certificates Drive Link', 'Certificates', 'Certificate Link');
          if (direct) return direct;
          // First Excel file has individual document URL columns — concatenate all available ones
          const docFields = [
            ['Upload Your Recent Passport Size Photograph', 'Photo'],
            ['Upload Scanned Copy Of  Your Signature', 'Signature'],
            ['Tenth  Marksheet/Certificate', '10th'],
            ['Twelth  Marksheet/Certificate', '12th'],
            ['Consolidated UG Degree Mark Sheets & Certificate', 'UG Degree'],
            ['Consolidated PG Mark Sheets & Certificate', 'PG Degree'],
            ['Competitive Exam Certificates', 'Competitive Exam'],
          ];
          const parts = docFields
            .map(([col, label]) => {
              const val = getColumnValue(row, col);
              return val ? `${label}: ${val}` : null;
            })
            .filter(Boolean);
          return parts.length > 0 ? parts.join(' | ') : null;
        })(),
        faculty: extractFaculty(programValue, institutionValue),
        department: extractDepartment(programValue),
        type: extractType(programValue),
        community: getColumnValue(row, 'Community (As Per Govt Norms)', 'Community', 'Caste/Community', 'Scholar Community'),
        // 'Obtained CGPA_1' is the PG CGPA (xlsx deduplicates repeated headers with _1, _2 suffixes)
        // 'Obtained CGPA' is the UG CGPA (first occurrence), fallback if PG not present
        cgpa: parseFloat(getColumnValue(row, 'Obtained CGPA_1', 'Overall CGPA', 'CGPA', 'Obtained CGPA') || 0),
        status: getColumnValue(row, 'Status') || 'uploaded',
        current_owner: getColumnValue(row, 'Current Owner', 'Owner') || 'director'
      };
    });

    const { data: insertedData, error } = await supabase
      .from('scholar_applications')
      .insert(records)
      .select();

    if (error) {
      console.error('Error inserting scholars:', error);
      return { data: null, error };
    }

    return { data: insertedData, error: null };
  } catch (err) {
    console.error('Exception in uploadScholarExcel:', err);
    return { data: null, error: err };
  }
};

// Delete scholar (if needed)
export const deleteScholar = async (id) => {
  try {
    const { data, error } = await supabase
      .from('scholar_applications')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error deleting scholar:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in deleteScholar:', err);
    return { data: null, error: err };
  }
};

// Delete all scholars for Director/Admin (current_owner = 'director')
export const deleteAllDirectorAdminScholars = async () => {
  try {
    const { data, error } = await supabase
      .from('scholar_applications')
      .delete()
      .eq('current_owner', 'director')
      .select();

    if (error) {
      console.error('Error deleting all scholars:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in deleteAllDirectorAdminScholars:', err);
    return { data: null, error: err };
  }
};
// Fetch scholars for Department based on status and faculty_status
export const fetchDepartmentScholars = async (statusFilters = [], facultyStatusFilters = []) => {
  try {
    let query = supabase
      .from('scholar_applications')
      .select('*');

    // Apply status filters if provided
    if (statusFilters.length > 0) {
      query = query.in('status', statusFilters);
    }

    // Apply faculty_status filters if provided
    if (facultyStatusFilters.length > 0) {
      query = query.in('faculty_status', facultyStatusFilters);
    }

    // Order by creation date
    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching department scholars:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchDepartmentScholars:', err);
    return { data: null, error: err };
  }
};

// Fetch scholars specifically forwarded to Engineering department
export const fetchEngineeringDepartmentScholars = async () => {
  return fetchDepartmentScholars(
    ['Forwarded to Engineering'],
    ['FORWARDED_TO_CSE', 'FORWARDED_TO_ECE', 'FORWARDED_TO_MECH', 'FORWARDED_TO_CIVIL']
  );
};

// Update scholar status and faculty_status
export const updateScholarStatus = async (id, status, facultyStatus = null) => {
  try {
    const updates = { status };
    if (facultyStatus) {
      updates.faculty_status = facultyStatus;
    }

    const { data, error } = await supabase
      .from('scholar_applications')
      .update(updates)
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

// Get department-specific filters based on department ID
export const getDepartmentFilters = (departmentId) => {
  const departmentFilterMap = {
    'CSE': {
      statusFilters: ['Forwarded to Engineering'],
      facultyStatusFilters: ['FORWARDED_TO_CSE']
    },
    'ECE': {
      statusFilters: ['Forwarded to Engineering'],
      facultyStatusFilters: ['FORWARDED_TO_ECE']
    },
    'MECH': {
      statusFilters: ['Forwarded to Engineering'],
      facultyStatusFilters: ['FORWARDED_TO_MECH']
    },
    'CIVIL': {
      statusFilters: ['Forwarded to Engineering'],
      facultyStatusFilters: ['FORWARDED_TO_CIVIL']
    },
    'BIO': {
      statusFilters: ['Forwarded to Science'],
      facultyStatusFilters: ['FORWARDED_TO_BIO']
    },
    'CHEM': {
      statusFilters: ['Forwarded to Science'],
      facultyStatusFilters: ['FORWARDED_TO_CHEM']
    },
    'PHYSICS': {
      statusFilters: ['Forwarded to Science'],
      facultyStatusFilters: ['FORWARDED_TO_PHYSICS']
    },
    'MATH': {
      statusFilters: ['Forwarded to Science'],
      facultyStatusFilters: ['FORWARDED_TO_MATH']
    },
    'MBA': {
      statusFilters: ['Forwarded to Management'],
      facultyStatusFilters: ['FORWARDED_TO_MBA']
    },
    'MEDICINE': {
      statusFilters: ['Forwarded to Medical'],
      facultyStatusFilters: ['FORWARDED_TO_MEDICINE']
    }
  };

  return departmentFilterMap[departmentId] || {
    statusFilters: ['Forwarded to Engineering'], // Default fallback
    facultyStatusFilters: ['FORWARDED_TO_CSE']
  };
};

// Fetch scholars for specific department
export const fetchDepartmentSpecificScholars = async (departmentId) => {
  const filters = getDepartmentFilters(departmentId);
  return fetchDepartmentScholars(filters.statusFilters, filters.facultyStatusFilters);
};



// Fetch scholars with queries (dept_review contains "Query" AND faculty_forward is "Back_To_Director")
export const fetchScholarsWithQueries = async () => {
  try {
    console.log('🔍 Fetching scholars with queries...');

    const { data, error } = await supabase
      .from('scholar_applications')
      .select('*')
      .ilike('dept_review', '%Query%')
      .eq('faculty_forward', 'Back_To_Director')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error fetching scholars with queries:', error);
      return { data: null, error };
    }

    console.log(`✅ Found ${data?.length || 0} scholars with queries (dept_review contains "Query" AND faculty_forward = "Back_To_Director")`);
    return { data, error: null };
  } catch (err) {
    console.error('❌ Exception in fetchScholarsWithQueries:', err);
    return { data: null, error: err };
  }
};


// Update scholar with comprehensive field mapping
export const updateScholarComprehensive = async (id, formData) => {
  try {
    console.log('📝 Updating scholar with ID:', id);

    // Map form data to database fields
    const updates = {
      // Basic Information
      application_no: formData.applicationNo,
      form_name: formData.formName,
      registered_name: formData.name,
      name: formData.name,
      institution: formData.institution,
      select_program: formData.program,
      program: formData.program,
      program_type: formData.programType,
      mobile: formData.mobile,
      email: formData.email,
      date_of_birth: formData.dateOfBirth,
      gender: formData.gender,

      // Additional Fields
      graduated_from_india: formData.graduatedFromIndia,
      course: formData.course,
      employee_id: formData.employeeId,
      designation: formData.designation,
      organization_name: formData.organizationName,
      organization_address: formData.organizationAddress,
      differently_abled: formData.differentlyAbled,
      nature_of_deformity: formData.natureOfDeformity,
      percentage_of_deformity: formData.percentageOfDeformity,
      nationality: formData.nationality,
      aadhaar_no: formData.aadhaarNo,
      mode_of_profession: formData.modeOfProfession,
      area_of_interest: formData.areaOfInterest,

      // UG Details
      ug_qualification: formData.ugQualification,
      ug_institute: formData.ugInstitute,
      ug_degree: formData.ugDegree,
      ug_specialization: formData.ugSpecialization,
      ug_marking_scheme: formData.ugMarkingScheme,
      ug_cgpa: formData.ugCgpa,
      ug_month_year: formData.ugMonthYear,
      ug_registration_no: formData.ugRegistrationNo,
      ug_mode_of_study: formData.ugModeOfStudy,
      ug_place_of_institution: formData.ugPlaceOfInstitution,

      // PG Details
      pg_qualification: formData.pgQualification,
      pg_institute: formData.pgInstitute,
      pg_degree: formData.pgDegree,
      pg_specialization: formData.pgSpecialization,
      pg_marking_scheme: formData.pgMarkingScheme,
      pg_cgpa: formData.pgCgpa,
      pg_month_year: formData.pgMonthYear,
      pg_registration_no: formData.pgRegistrationNo,
      pg_mode_of_study: formData.pgModeOfStudy,
      pg_place_of_institution: formData.pgPlaceOfInstitution,

      // Other Degree Details
      other_qualification: formData.otherQualification,
      other_institute: formData.otherInstitute,
      other_degree: formData.otherDegree,
      other_specialization: formData.otherSpecialization,
      other_marking_scheme: formData.otherMarkingScheme,
      other_cgpa: formData.otherCgpa,
      other_month_year: formData.otherMonthYear,
      other_registration_no: formData.otherRegistrationNo,
      other_mode_of_study: formData.otherModeOfStudy,
      other_place_of_institution: formData.otherPlaceOfInstitution,

      // Competitive Exams
      competitive_exam: formData.competitiveExam,
      exam1_name: formData.exam1Name,
      exam1_reg_no: formData.exam1RegNo,
      exam1_score: formData.exam1Score,
      exam1_max_score: formData.exam1MaxScore,
      exam1_year: formData.exam1Year,
      exam1_rank: formData.exam1Rank,
      exam1_qualified: formData.exam1Qualified,
      exam2_name: formData.exam2Name,
      exam2_reg_no: formData.exam2RegNo,
      exam2_score: formData.exam2Score,
      exam2_max_score: formData.exam2MaxScore,
      exam2_year: formData.exam2Year,
      exam2_rank: formData.exam2Rank,
      exam2_qualified: formData.exam2Qualified,
      exam3_name: formData.exam3Name,
      exam3_reg_no: formData.exam3RegNo,
      exam3_score: formData.exam3Score,
      exam3_max_score: formData.exam3MaxScore,
      exam3_year: formData.exam3Year,
      exam3_rank: formData.exam3Rank,
      exam3_qualified: formData.exam3Qualified,

      // Research Interest
      reasons_for_applying: formData.reasonsForApplying,
      research_interest: formData.researchInterest,

      // System Fields
      user_id: formData.userId,
      certificates: formData.certificates,
      status: formData.status,
      select_institution: formData.faculty,
      faculty: formData.faculty,
      dept_name: formData.department,
      department: formData.department,
      cgpa: formData.cgpa
    };

    const { data, error } = await supabase
      .from('scholar_applications')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('❌ Error updating scholar:', error);
      return { data: null, error };
    }

    console.log('✅ Scholar updated successfully:', data);
    return { data: data[0], error: null };
  } catch (err) {
    console.error('❌ Exception in updateScholarComprehensive:', err);
    return { data: null, error: err };
  }
};
