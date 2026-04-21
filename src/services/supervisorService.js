import { supabase, supabaseAdmin } from '../supabaseClient';

/**
 * Supervisor Service
 * Handles all supervisor-related operations
 */

// Fetch all supervisors with vacancy calculations
export const fetchSupervisors = async () => {
  try {
    // Fetch directly from supervisors table instead of using RPC
    const { data, error } = await supabaseAdmin
      .from('supervisors')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching supervisors:', error);
      return { data: null, error };
    }

    console.log(`✅ Fetched ${data?.length || 0} supervisors from Supabase`);
    console.log('📊 Raw supervisor data sample:', data?.[0]);
    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchSupervisors:', err);
    return { data: null, error: err };
  }
};

// Fetch single supervisor by ID
export const fetchSupervisorById = async (id) => {
  try {
    const { data, error } = await supabaseAdmin
      .from('supervisors')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching supervisor by ID:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchSupervisorById:', err);
    return { data: null, error: err };
  }
};

// Add new supervisor
export const addSupervisor = async (supervisorData) => {
  try {
    console.log('Adding supervisor:', supervisorData);

    const { data, error } = await supabaseAdmin
      .from('supervisors')
      .insert([supervisorData])
      .select();

    if (error) {
      console.error('Error adding supervisor:', error);
      return { data: null, error };
    }

    console.log('✅ Supervisor added successfully:', data);
    return { data, error: null };
  } catch (err) {
    console.error('Exception in addSupervisor:', err);
    return { data: null, error: err };
  }
};

// Add multiple supervisors (append only - skips existing emails)
export const addMultipleSupervisors = async (supervisorsArray) => {
  try {
    console.log(`Appending ${supervisorsArray.length} supervisors (skipping duplicates)`);

    // Step 1: Fetch all existing supervisor emails AND names to detect duplicates
    const { data: existingSupervisors, error: fetchError } = await supabaseAdmin
      .from('supervisors')
      .select('email, name, faculty_name, department_name');

    if (fetchError) {
      console.error('Error fetching existing supervisors:', fetchError);
      return { data: null, error: fetchError };
    }

    const existingEmails = new Set(
      (existingSupervisors || []).map(s => (s.email || '').toLowerCase().trim())
    );
    // Also deduplicate by name+faculty+department to prevent re-uploading same person
    const existingKeys = new Set(
      (existingSupervisors || []).map(s =>
        `${(s.name || '').toLowerCase().trim()}|${(s.faculty_name || '').toLowerCase().trim()}|${(s.department_name || '').toLowerCase().trim()}`
      )
    );

    // Step 2: Filter out supervisors whose email already exists OR name+faculty+dept matches
    const newSupervisors = supervisorsArray.filter(s => {
      const email = (s.email || '').toLowerCase().trim();
      const key = `${(s.name || '').toLowerCase().trim()}|${(s.faculty_name || '').toLowerCase().trim()}|${(s.department_name || '').toLowerCase().trim()}`;
      // If no email, check by name+faculty+dept
      if (!email) return !existingKeys.has(key);
      return !existingEmails.has(email) && !existingKeys.has(key);
    });

    const skippedCount = supervisorsArray.length - newSupervisors.length;
    if (skippedCount > 0) {
      console.log(`⏩ Skipping ${skippedCount} supervisors (email already exists)`);
    }

    if (newSupervisors.length === 0) {
      console.log('✅ No new supervisors to add (all already exist)');
      return { data: [], error: null, skippedCount };
    }

    // Step 3: Insert only the new supervisors
    const { data, error } = await supabaseAdmin
      .from('supervisors')
      .insert(newSupervisors)
      .select();

    if (error) {
      console.error('Error inserting new supervisors:', error);
      return { data: null, error };
    }

    console.log(`✅ ${data?.length || 0} new supervisors added, ${skippedCount} duplicates skipped`);
    return { data, error: null, skippedCount };
  } catch (err) {
    console.error('Exception in addMultipleSupervisors:', err);
    return { data: null, error: err };
  }
};

// Update supervisor
export const updateSupervisor = async (id, updates) => {
  try {
    console.log('Updating supervisor:', id, updates);

    const { data, error } = await supabaseAdmin
      .from('supervisors')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating supervisor:', error);
      return { data: null, error };
    }

    console.log('✅ Supervisor updated successfully:', data);
    return { data, error: null };
  } catch (err) {
    console.error('Exception in updateSupervisor:', err);
    return { data: null, error: err };
  }
};

// Delete supervisor
export const deleteSupervisor = async (id) => {
  try {
    console.log('Deleting supervisor:', id);

    const { data, error } = await supabaseAdmin
      .from('supervisors')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting supervisor:', error);
      return { data: null, error };
    }

    console.log('✅ Supervisor deleted successfully');
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error('Exception in deleteSupervisor:', err);
    return { data: null, error: err };
  }
};

// Delete all supervisors
export const deleteAllSupervisors = async () => {
  try {
    console.log('Deleting all supervisors...');

    const { data, error } = await supabaseAdmin
      .from('supervisors')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if (error) {
      console.error('Error deleting all supervisors:', error);
      return { data: null, error };
    }

    console.log('✅ All supervisors deleted successfully');
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error('Exception in deleteAllSupervisors:', err);
    return { data: null, error: err };
  }
};

// Get qualified scholars for a supervisor by faculty and department
// Fetches scholars who have completed examination (all marks entered), faculty, and department
export const getQualifiedScholarsByFacultyDept = async (facultyName, departmentName, limit = 50) => {
  try {
    console.log(`🔍 Fetching completed scholars for faculty: "${facultyName}", department: "${departmentName}"`);

    // Fetch ALL scholars from examination_records
    const { data: allScholars, error } = await supabaseAdmin
      .from('examination_records')
      .select('*');

    if (error) {
      console.error('❌ Error fetching scholars:', error);
      return { data: null, error };
    }

    console.log(`📊 Total scholars in database: ${allScholars?.length || 0}`);

    // Filter scholars based on completion status, faculty, department, and unassigned status
    const qualifiedScholars = (allScholars || []).filter(record => {
      // 1. MUST have faculty_written status containing "Forwarded to"
      // This covers: "Forwarded to Engineering", "Forwarded to Management", "Forwarded to Science", "Forwarded to Medical"
      const hasFacultyForwarded = record.faculty_written &&
        record.faculty_written.includes('Forwarded to');

      if (!hasFacultyForwarded) {
        return false;
      }

      // 2. MUST have director_interview status as "Forwarded to Director"
      const hasDirectorForwarded = record.director_interview === 'Forwarded to Director';

      if (!hasDirectorForwarded) {
        return false;
      }

      // 3. MUST have written marks (not null, not empty, not 0, not "Ab")
      const hasWrittenMarks = record.written_marks !== null &&
        record.written_marks !== undefined &&
        record.written_marks !== '' &&
        record.written_marks !== 0 &&
        record.written_marks !== 'Ab' &&
        record.written_marks !== 'AB' &&
        record.written_marks !== 'ab';

      if (!hasWrittenMarks) {
        return false;
      }

      // 4. MUST have interview marks (not null, not empty, not 0, not "Ab")
      const hasInterviewMarks = record.interview_marks !== null &&
        record.interview_marks !== undefined &&
        record.interview_marks !== '' &&
        record.interview_marks !== 0 &&
        record.interview_marks !== 'Ab' &&
        record.interview_marks !== 'AB' &&
        record.interview_marks !== 'ab';

      if (!hasInterviewMarks) {
        return false;
      }

      // 5. MUST have total marks (not null, not empty, not 0, not "Absent")
      const hasTotalMarks = record.total_marks !== null &&
        record.total_marks !== undefined &&
        record.total_marks !== '' &&
        record.total_marks !== 0 &&
        record.total_marks !== 'Absent' &&
        record.total_marks !== 'ABSENT' &&
        record.total_marks !== 'absent';

      if (!hasTotalMarks) {
        return false;
      }

      // 6. MUST match faculty — normalize before comparing to handle variations like:
      //    "Faculty of Medical & Health Science"  (examination_records)
      //    "Faculty of Medical and Health Sciences" (departments table)
      const normalizeFaculty = (s) => (s || '')
        .toLowerCase()
        .replace(/\s*&\s*/g, ' and ')   // & → and
        .replace(/sciences\b/g, 'science') // plural → singular
        .replace(/\s+/g, ' ')
        .trim();

      const facultyMatch = normalizeFaculty(record.faculty) === normalizeFaculty(facultyName);
      if (!facultyMatch) {
        return false;
      }

      // 7. MUST match department - check department column, program field, AND the
      //    bracket content of the program field (e.g. "Ph.d.- Medical Imaging Technology [...]")
      //    because department column is often empty in examination_records.
      const recordDept = record.department || '';
      const recordProgram = record.program || '';

      // Also extract the subject/discipline part before the bracket in program field
      // e.g. "Ph.d.- Medical Imaging Technology [part Time External...]" → "Medical Imaging Technology"
      const programSubject = recordProgram.replace(/\[.*\]/g, '').replace(/^Ph\.?d\.?[-–\s]*/i, '').trim();

      const deptLower = departmentName.toLowerCase();
      const deptMatch = recordDept.toLowerCase().includes(deptLower) ||
        recordProgram.toLowerCase().includes(deptLower) ||
        programSubject.toLowerCase().includes(deptLower) ||
        deptLower.includes(programSubject.toLowerCase());

      if (!deptMatch) {
        return false;
      }

      // 8. MUST NOT be assigned to a supervisor yet
      const isUnassigned = !record.supervisor_name || record.supervisor_name === '';
      if (!isUnassigned) {
        return false;
      }

      return true;
    });

    // Sort by total_marks (highest first)
    const sortedScholars = qualifiedScholars.sort((a, b) => {
      const marksA = parseFloat(a.total_marks) || 0;
      const marksB = parseFloat(b.total_marks) || 0;
      return marksB - marksA;
    }).slice(0, limit);

    console.log(`✅ Found ${sortedScholars.length} completed & unassigned scholars for "${facultyName} - ${departmentName}"`);

    if (sortedScholars.length > 0) {
      console.log('📋 Qualified scholars:', sortedScholars.map(s => ({
        name: s.registered_name || s.name,
        app_no: s.application_no,
        department: s.department,
        faculty: s.faculty,
        faculty_written: s.faculty_written,
        director_interview: s.director_interview,
        written_marks: s.written_marks,
        interview_marks: s.interview_marks,
        total_marks: s.total_marks,
        supervisor_name: s.supervisor_name || 'UNASSIGNED'
      })));
    } else {
      console.log(`❌ No completed scholars found. Debugging...`);

      // Debug 1: Check all scholars in this faculty (use same normalization)
      const normFaculty = (s) => (s || '').toLowerCase().replace(/\s*&\s*/g, ' and ').replace(/sciences\b/g, 'science').replace(/\s+/g, ' ').trim();
      const scholarsInFaculty = allScholars.filter(s => normFaculty(s.faculty) === normFaculty(facultyName));
      console.log(`📊 Total scholars in "${facultyName}": ${scholarsInFaculty.length}`);

      // Debug 2: Check scholars with all marks completed
      const completedInFaculty = scholarsInFaculty.filter(s => {
        const hasFacultyForwarded = s.faculty_written && s.faculty_written.includes('Forwarded to');
        const hasDirectorForwarded = s.director_interview === 'Forwarded to Director';
        const hasWritten = s.written_marks && s.written_marks !== 0 && s.written_marks !== 'Ab';
        const hasInterview = s.interview_marks && s.interview_marks !== 0 && s.interview_marks !== 'Ab';
        const hasTotal = s.total_marks && s.total_marks !== 0 && s.total_marks !== 'Absent';
        return hasFacultyForwarded && hasDirectorForwarded && hasWritten && hasInterview && hasTotal;
      });
      console.log(`📊 Completed scholars in "${facultyName}": ${completedInFaculty.length}`);

      if (completedInFaculty.length > 0) {
        console.log(`📊 ALL Completed scholars in "${facultyName}" with their EXACT department values:`);
        completedInFaculty.forEach(s => {
          console.log(`   - ${s.registered_name || s.name}: department="${s.department}", program="${s.program}", faculty_written="${s.faculty_written}", director_interview="${s.director_interview}", marks: W=${s.written_marks} I=${s.interview_marks} T=${s.total_marks}`);
        });

        console.log(`📝 Completed scholars sample:`, completedInFaculty.slice(0, 5).map(s => ({
          name: s.registered_name || s.name,
          dept: s.department,
          faculty_written: s.faculty_written,
          director_interview: s.director_interview,
          written: s.written_marks,
          interview: s.interview_marks,
          total: s.total_marks,
          supervisor: s.supervisor_name || 'UNASSIGNED'
        })));
      }

      if (scholarsInFaculty.length > 0) {
        console.log(`📝 Departments in this faculty:`, [...new Set(scholarsInFaculty.map(s => s.department))]);
      }

      // Debug 3: Check scholars in the requested department
      const scholarsInDept = allScholars.filter(s =>
        s.department && s.department.toLowerCase().includes(departmentName.toLowerCase())
      );
      console.log(`📊 Scholars with department containing "${departmentName}": ${scholarsInDept.length}`);

      if (scholarsInDept.length > 0) {
        console.log(`📝 Their faculties:`, [...new Set(scholarsInDept.map(s => s.faculty))]);
        console.log(`📝 Their completion status:`, scholarsInDept.slice(0, 5).map(s => ({
          name: s.registered_name || s.name,
          faculty: s.faculty,
          dept: s.department,
          faculty_written: s.faculty_written || 'NOT FORWARDED',
          director_interview: s.director_interview || 'NOT FORWARDED',
          written: s.written_marks || 'MISSING',
          interview: s.interview_marks || 'MISSING',
          total: s.total_marks || 'MISSING',
          supervisor: s.supervisor_name || 'UNASSIGNED'
        })));
      }
    }

    return { data: sortedScholars, error: null };
  } catch (err) {
    console.error('💥 Exception in getQualifiedScholarsByFacultyDept:', err);
    return { data: null, error: err };
  }
};

// Assign scholar to supervisor - UPDATE examination_records table AND increment supervisor count
export const assignScholarToSupervisor = async (assignmentData) => {
  try {
    console.log('Assigning scholar to supervisor:', assignmentData);

    // Get supervisor data
    const { data: supervisor, error: supError } = await supabaseAdmin
      .from('supervisors')
      .select('*')
      .eq('id', assignmentData.supervisor_id)
      .single();

    if (supError) {
      console.error('Error fetching supervisor:', supError);
      return { data: null, error: supError };
    }

    // Update examination_records table with supervisor info
    const { data, error } = await supabaseAdmin
      .from('examination_records')
      .update({
        supervisor_name: supervisor.name,
        supervisor_status: 'Admitted',
        supervisor_affilation: supervisor.staff_id,
        supervisor_designation: supervisor.designation,
        supervisor_dept: supervisor.department_name
      })
      .eq('id', assignmentData.scholar_id)
      .select();

    if (error) {
      console.error('Error assigning scholar:', error);
      return { data: null, error };
    }

    // Increment current_full_time_scholars as the unified "currently guiding" counter
    // Available vacancy = max_full_time_scholars - current_full_time_scholars
    const totalCurrentlyGuiding = (supervisor.current_full_time_scholars || 0) +
      (supervisor.current_part_time_internal_scholars || 0) +
      (supervisor.current_part_time_external_scholars || 0) +
      (supervisor.current_part_time_industry_scholars || 0);
    const totalMax = (supervisor.max_full_time_scholars || 0) +
      (supervisor.max_part_time_internal_scholars || 0) +
      (supervisor.max_part_time_external_scholars || 0) +
      (supervisor.max_part_time_industry_scholars || 0);

    if (totalCurrentlyGuiding >= totalMax) {
      return { data: null, error: { message: 'No available vacancy for this supervisor.' } };
    }

    // Increment current_full_time_scholars to represent one more scholar being guided
    const updateField = {
      current_full_time_scholars: (supervisor.current_full_time_scholars || 0) + 1
    };

    // Update supervisor's current count
    const { error: updateError } = await supabaseAdmin
      .from('supervisors')
      .update(updateField)
      .eq('id', assignmentData.supervisor_id);

    if (updateError) {
      console.error('Error updating supervisor count:', updateError);
    } else {
      console.log('✅ Updated supervisor count (currently guiding +1):', updateField);
    }

    console.log('✅ Scholar assigned successfully:', data);
    return { data, error: null };
  } catch (err) {
    console.error('Exception in assignScholarToSupervisor:', err);
    return { data: null, error: err };
  }
};

// Fetch assignments for a supervisor - FROM examination_records
export const fetchSupervisorAssignments = async (supervisorId) => {
  try {
    // Get supervisor name first
    const { data: supervisor, error: supError } = await supabaseAdmin
      .from('supervisors')
      .select('name')
      .eq('id', supervisorId)
      .single();

    if (supError) {
      console.error('Error fetching supervisor:', supError);
      return { data: null, error: supError };
    }

    // Fetch scholars assigned to this supervisor from examination_records
    const { data, error } = await supabaseAdmin
      .from('examination_records')
      .select('*')
      .eq('supervisor_name', supervisor.name)
      .eq('supervisor_status', 'Admitted')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching supervisor assignments:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchSupervisorAssignments:', err);
    return { data: null, error: err };
  }
};

// Fetch all assignments - FROM examination_records
export const fetchAllAssignments = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('examination_records')
      .select('*')
      .not('supervisor_name', 'is', null)
      .eq('supervisor_status', 'Admitted')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching all assignments:', error);
      return { data: null, error };
    }

    console.log(`✅ Fetched ${data?.length || 0} assignments from examination_records`);
    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchAllAssignments:', err);
    return { data: null, error: err };
  }
};

// Unassign scholar from supervisor
// Unassign scholar from supervisor - UPDATE examination_records AND decrement supervisor count
export const unassignScholar = async (scholarId) => {
  try {
    console.log('Unassigning scholar:', scholarId);

    // First, get the scholar's current assignment info
    const { data: scholarData, error: fetchError } = await supabaseAdmin
      .from('examination_records')
      .select('supervisor_name, type, program_type')
      .eq('id', scholarId)
      .single();

    if (fetchError) {
      console.error('Error fetching scholar data:', fetchError);
      return { data: null, error: fetchError };
    }

    const supervisorName = scholarData.supervisor_name;
    const scholarType = scholarData.program_type;

    // Clear supervisor_name and supervisor_status in examination_records
    const { data, error } = await supabaseAdmin
      .from('examination_records')
      .update({
        supervisor_name: null,
        supervisor_status: null
      })
      .eq('id', scholarId)
      .select();

    if (error) {
      console.error('Error unassigning scholar:', error);
      return { data: null, error };
    }

    // Decrement the supervisor's count if we have supervisor info
    if (supervisorName) {
      // Get supervisor by name
      const { data: supervisor, error: supError } = await supabaseAdmin
        .from('supervisors')
        .select('*')
        .eq('name', supervisorName)
        .single();

      if (!supError && supervisor) {
        // Decrement current_full_time_scholars as the unified "currently guiding" counter
        const updateField = {
          current_full_time_scholars: Math.max(0, (supervisor.current_full_time_scholars || 0) - 1)
        };

        const { error: updateError } = await supabaseAdmin
          .from('supervisors')
          .update(updateField)
          .eq('id', supervisor.id);

        if (updateError) {
          console.error('Error updating supervisor count:', updateError);
        } else {
          console.log('✅ Decremented supervisor count (currently guiding -1):', updateField);
        }
      }
    }

    console.log('✅ Scholar unassigned successfully');
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error('Exception in unassignScholar:', err);
    return { data: null, error: err };
  }
};

// Update admitted counts from examination_records
export const updateAdmittedCounts = async () => {
  try {
    console.log('Updating admitted counts...');

    const { data, error } = await supabaseAdmin
      .rpc('update_supervisor_admitted_counts');

    if (error) {
      console.error('Error updating admitted counts:', error);
      return { data: null, error };
    }

    console.log('✅ Admitted counts updated successfully');
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error('Exception in updateAdmittedCounts:', err);
    return { data: null, error: err };
  }
};

// Get vacancy summary
export const getVacancySummary = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('get_supervisor_vacancy_summary');

    if (error) {
      console.error('Error fetching vacancy summary:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in getVacancySummary:', err);
    return { data: null, error: err };
  }
};

// Fetch faculties and departments from departments table
export const fetchFacultiesAndDepartments = async () => {
  try {
    const { data: departmentsData, error } = await supabaseAdmin
      .from('departments')
      .select('*')
      .order('faculty', { ascending: true })
      .order('department_name', { ascending: true });

    if (error) {
      console.error('Error fetching departments:', error);
      return { data: null, error };
    }

    // Group departments by faculty
    const grouped = {};
    (departmentsData || []).forEach(dept => {
      if (!grouped[dept.faculty]) {
        grouped[dept.faculty] = {
          id: dept.faculty, // Use full faculty name as ID to avoid collisions
          name: dept.faculty,
          departments: []
        };
      }
      grouped[dept.faculty].departments.push({
        id: `${dept.id}`,
        name: dept.department_name,
        faculty: dept.faculty
      });
    });

    const facultiesArray = Object.values(grouped);
    console.log(`✅ Fetched ${facultiesArray.length} faculties with departments`);

    return { data: facultiesArray, error: null };
  } catch (err) {
    console.error('Exception in fetchFacultiesAndDepartments:', err);
    return { data: null, error: err };
  }
};
