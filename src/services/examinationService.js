import { supabase, supabaseAdmin } from '../supabaseClient';
import * as XLSX from 'xlsx';

// Fetch scholars from scholar_applications whose hall ticket has been generated (status = 'Generated')
export const fetchHallTicketGeneratedScholars = async () => {
  try {
    const { data, error } = await supabase
      .from('scholar_applications')
      .select('*')
      .eq('status', 'Generated')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching hall-ticket-generated scholars:', error);
      return { data: null, error };
    }

    // Map scholar_applications fields to the shape Examination components expect
    const mapped = (data || []).map(s => ({
      ...s,
      // Normalise field names used by Examination UI
      name: s.registered_name || s.name || '',
      written_marks: s.written_marks ?? 0,
      written_marks_100: s.written_marks_100 ?? null,
      interview_marks: s.interview_marks ?? 0,
      total_marks: s.total_marks ?? null,
    }));

    return { data: mapped, error: null };
  } catch (err) {
    console.error('Exception in fetchHallTicketGeneratedScholars:', err);
    return { data: null, error: err };
  }
};

// Fetch all examination records for Director/Admin
export const fetchExaminationRecords = async () => {
  try {
    console.log('Fetching examination records from Supabase...');

    const { data, error } = await supabase
      .from('examination_records')
      .select('*')
      .order('id', { ascending: true });

    if (error) {
      console.error('Error fetching examination records:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return { data: null, error };
    }

    console.log('Successfully fetched examination records:', data?.length || 0, 'records');
    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchExaminationRecords:', err);
    console.error('Exception details:', err.message, err.stack);
    return { data: null, error: err };
  }
};

// Fetch single examination record by ID
export const fetchExaminationRecordById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('examination_records')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching examination record by ID:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchExaminationRecordById:', err);
    return { data: null, error: err };
  }
};

// Add new examination record
export const addExaminationRecord = async (recordData) => {
  try {
    // Ensure marks is set to 0 initially
    const dataWithMarks = {
      ...recordData,
      marks: 0,
      status: 'pending',
      current_owner: 'director'
    };

    const { data, error } = await supabase
      .from('examination_records')
      .insert([dataWithMarks])
      .select();

    if (error) {
      console.error('Error adding examination record:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in addExaminationRecord:', err);
    return { data: null, error: err };
  }
};

// Update examination record (including marks)
export const updateExaminationRecord = async (id, updates) => {
  try {
    // If interview_marks is being updated, calculate total_marks
    if (updates.interview_marks !== undefined) {
      // Get current written marks
      const { data: currentRecord, error: fetchError } = await supabase
        .from('examination_records')
        .select('written_marks')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Error fetching current record:', fetchError);
        return { data: null, error: fetchError };
      }

      const writtenMarks = currentRecord?.written_marks || 0;
      const interviewMarks = parseFloat(updates.interview_marks) || 0;

      // Calculate total marks only if both marks are present (> 0)
      updates.total_marks = (writtenMarks > 0 && interviewMarks > 0)
        ? writtenMarks + interviewMarks
        : null;
    }

    // If written_marks is being updated, calculate total_marks
    if (updates.written_marks !== undefined) {
      // Get current interview marks
      const { data: currentRecord, error: fetchError } = await supabase
        .from('examination_records')
        .select('interview_marks')
        .eq('id', id)
        .single();

      if (fetchError) {
        console.error('Error fetching current record:', fetchError);
        return { data: null, error: fetchError };
      }

      const writtenMarks = parseFloat(updates.written_marks) || 0;
      const interviewMarks = currentRecord?.interview_marks || 0;

      // Calculate total marks only if both marks are present (> 0)
      updates.total_marks = (writtenMarks > 0 && interviewMarks > 0)
        ? writtenMarks + interviewMarks
        : null;
    }

    const { data, error } = await supabase
      .from('examination_records')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating examination record:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in updateExaminationRecord:', err);
    return { data: null, error: err };
  }
};

// Update marks for an examination record
export const updateExaminationMarks = async (id, marks) => {
  try {
    // First, get the current interview marks
    const { data: currentRecord, error: fetchError } = await supabase
      .from('examination_records')
      .select('interview_marks')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching current record:', fetchError);
      return { data: null, error: fetchError };
    }

    const writtenMarks = parseFloat(marks) || 0;
    const interviewMarks = currentRecord?.interview_marks || 0;

    // Calculate total marks only if both marks are present (> 0)
    const totalMarks = (writtenMarks > 0 && interviewMarks > 0)
      ? writtenMarks + interviewMarks
      : null;

    const { data, error } = await supabase
      .from('examination_records')
      .update({
        written_marks: writtenMarks,
        total_marks: totalMarks
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating examination marks:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in updateExaminationMarks:', err);
    return { data: null, error: err };
  }
};

// Delete examination record
export const deleteExaminationRecord = async (id) => {
  try {
    const { data, error } = await supabase
      .from('examination_records')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error deleting examination record:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in deleteExaminationRecord:', err);
    return { data: null, error: err };
  }
};

// Upload Excel file with examination records
export const uploadExaminationExcel = async (file) => {
  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    const jsonData = XLSX.utils.sheet_to_json(firstSheet);

    if (!jsonData || jsonData.length === 0) {
      return { data: null, error: { message: 'No data found in file' } };
    }

    // Log Excel column names for debugging
    console.log('=== EXCEL COLUMNS FOUND ===');
    if (jsonData.length > 0) {
      const excelColumns = Object.keys(jsonData[0]);
      console.log('Total columns in Excel:', excelColumns.length);
      console.log('Column names:', excelColumns.join(', '));
    }

    // Helper function to get value from multiple possible column names (robust)
    const getColumnValue = (row, ...columnNames) => {
      const rowKeys = Object.keys(row);
      for (const name of columnNames) {
        // Try exact match first
        if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
          return String(row[name]).trim();
        }
        // Try case-insensitive and trimmed match if exact match fails
        const matchingKey = rowKeys.find(key => key.trim().toLowerCase() === name.trim().toLowerCase());
        if (matchingKey && row[matchingKey] !== undefined && row[matchingKey] !== null && row[matchingKey] !== '') {
          return String(row[matchingKey]).trim();
        }
      }
      return null;
    };

    // Helper function to safely convert to string
    const safeString = (value) => {
      if (value === null || value === undefined || value === '') return null;
      return String(value);
    };

    // Helper function to safely convert to number
    const safeNumber = (value) => {
      if (value === null || value === undefined || value === '') return null;
      const num = parseFloat(value);
      return isNaN(num) ? null : num;
    };

    // Helper function to convert Excel date serial number to DD-MM-YYYY format
    const convertExcelDate = (excelDate) => {
      if (!excelDate) return null;

      // If it's already a string date in DD-MM-YYYY format, return as is
      if (typeof excelDate === 'string' && excelDate.includes('-') && excelDate.length === 10) {
        const parts = excelDate.split('-');
        if (parts.length === 3 && parts[0].length === 2) {
          return excelDate; // Already in DD-MM-YYYY format
        }
      }

      // If it's a number (Excel serial date)
      if (typeof excelDate === 'number') {
        // Excel date serial number starts from 1900-01-01
        const excelEpoch = new Date(1900, 0, 1);
        const date = new Date(excelEpoch.getTime() + (excelDate - 1) * 24 * 60 * 60 * 1000);

        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();

        return `${day}-${month}-${year}`; // Return DD-MM-YYYY format
      }

      // Try to parse as date if it's a string
      if (typeof excelDate === 'string') {
        const parsedDate = new Date(excelDate);
        if (!isNaN(parsedDate.getTime())) {
          const day = String(parsedDate.getDate()).padStart(2, '0');
          const month = String(parsedDate.getMonth() + 1).padStart(2, '0');
          const year = parsedDate.getFullYear();

          return `${day}-${month}-${year}`; // Return DD-MM-YYYY format
        }
      }

      return null;
    };

    // Helper function to extract faculty from program/institution string
    const extractFaculty = (programString) => {
      if (!programString) return null;
      const lowerProgram = programString.toLowerCase();

      if (lowerProgram.includes('engineering') || lowerProgram.includes('e and t')) {
        return 'Faculty of Engineering & Technology';
      }
      if (lowerProgram.includes('science') || lowerProgram.includes('humanities') || lowerProgram.includes('s and h')) {
        return 'Faculty of Science & Humanities';
      }
      if (lowerProgram.includes('management') || lowerProgram.includes('mgt')) {
        return 'Faculty of Management';
      }
      if (lowerProgram.includes('medical') || lowerProgram.includes('health') || lowerProgram.includes('hs')) {
        return 'Faculty of Medical & Health Science';
      }
      return null;
    };

    // Helper function to extract type from program string
    const extractType = (programString) => {
      if (!programString) return 'Full Time';
      const lowerProgram = programString.toLowerCase();

      // Check for specific part-time categories in order
      if (lowerProgram.includes('pte (industry)') || lowerProgram.includes('part time external (industry)')) {
        return 'Part Time External (Industry)';
      }
      if (lowerProgram.includes('pte') || lowerProgram.includes('part time external')) {
        return 'Part Time External';
      }
      if (lowerProgram.includes('pti') || lowerProgram.includes('part time internal')) {
        return 'Part Time Internal';
      }
      if (lowerProgram.includes('ft') || lowerProgram.includes('full time')) {
        return 'Full Time';
      }
      return 'Full Time';
    };

    // Map Excel columns to database columns - matching exact Supabase schema
    const records = jsonData.map(row => {
      const programString = getColumnValue(row, 'Select Program', 'Program', 'Course Name', 'Programme', 'program');
      const institutionString = getColumnValue(row, 'Select Institution', 'Institution', 'Faculty', 'institution');

      const faculty = extractFaculty(programString) || extractFaculty(institutionString);
      const type = extractType(programString);

      return {
        // Basic Application Details
        application_no: getColumnValue(row, 'Application No', 'application_no', 'ApplicationNo', 'App No'),
        form_name: getColumnValue(row, 'Form Name', 'form_name', 'FormName') || 'PhD Application Form',
        registered_name: getColumnValue(row, 'Registered Name', 'registered_name', 'RegisteredName', 'Name') || 'Unknown',
        institution: getColumnValue(row, 'Select Institution', 'institution', 'Institution') || faculty || institutionString || 'SRM Institute of Science and Technology',
        program: getColumnValue(row, 'Select Program', 'program', 'Program') || programString || faculty,
        program_type: getColumnValue(row, 'program_type', 'Program Type', 'Type') || type,

        // Contact & Personal Details
        mobile_number: getColumnValue(row, 'Mobile Number', 'mobile_number', 'Mobile', 'Phone'),
        email: getColumnValue(row, 'Email ID', 'email', 'Email'),
        date_of_birth: convertExcelDate(getColumnValue(row, 'Date Of Birth', 'date_of_birth', 'DOB')),
        gender: getColumnValue(row, 'Gender', 'gender') || 'Male',
        community: getColumnValue(row, 'Community', 'community', 'COMMUNITY'),
        community: getColumnValue(row, 'Community', 'community', 'COMMUNITY'),
        nationality: getColumnValue(row, 'Nationality', 'nationality') || 'Indian',
        aadhaar_no: getColumnValue(row, 'Aadhaar Card No.', 'Aadhaar Card No', 'aadhaar_no', 'Aadhaar No'),

        // Education & Background
        graduated_from_india: getColumnValue(row, 'Have You Graduated From India?', 'graduated_from_india', 'Graduated From India') || 'Yes',
        course: getColumnValue(row, 'Course', 'course'),
        area_of_interest: getColumnValue(row, 'Area Of Interest', 'area_of_interest', 'AreaOfInterest'),
        mode_of_profession: getColumnValue(row, 'Mode Of Profession (Industry/Academic)', 'mode_of_profession', 'Mode Of Profession') || 'Academic',

        // Employment Details
        employee_id: getColumnValue(row, '1 - Employee Id', '1- Employee Id', '1 -Employee Id', 'employee_id', 'Employee Id'),
        designation: getColumnValue(row, '1 - Designation', '1- Designation', '1 -Designation', 'designation', 'Designation'),
        organization_name: getColumnValue(row, '1 - Organization Name', '1- Organization Name', '1 -Organization Name', 'organization_name', 'Organization Name'),
        organization_address: getColumnValue(row, '1 - Organization Address', '1- Organization Address', '1 -Organization Address', 'organization_address', 'Organization Address'),

        // Disability Information
        differently_abled: getColumnValue(row, 'Are You Differently Abled ?', 'differently_abled', 'Differently Abled') || 'No',
        nature_of_deformity: getColumnValue(row, 'Nature Of Deformity', 'nature_of_deformity', 'NatureOfDeformity'),
        percentage_of_deformity: getColumnValue(row, 'Percentage Of Deformity', 'percentage_of_deformity', 'PercentageOfDeformity'),

        // UG (Undergraduate) Details
        ug_qualification: getColumnValue(row, 'UG - Current Education Qualification', 'UG- Current Education Qualification', 'ug_qualification', 'UG Qualification'),
        ug_institute: getColumnValue(row, 'UG - Institute Name', 'UG- Institute Name', 'ug_institute', 'UG Institute'),
        ug_degree: getColumnValue(row, 'UG - Degree', 'UG- Degree', 'ug_degree', 'UG Degree'),
        ug_specialization: getColumnValue(row, 'UG - Specialization', 'UG- Specialization', 'ug_specialization', 'UG Specialization'),
        ug_marking_scheme: getColumnValue(row, 'UG - Marking Scheme', 'UG- Marking Scheme', 'ug_marking_scheme', 'UG Marking Scheme'),
        ug_cgpa: getColumnValue(row, 'UG - CGPA Or Percentage', 'UG- CGPA Or Percentage', 'ug_cgpa', 'UG CGPA'),
        ug_month_year: getColumnValue(row, 'UG - Month & Year', 'UG- Month & Year', 'ug_month_year', 'UG Month Year'),
        ug_registration_no: getColumnValue(row, 'UG - Registration No.', 'UG - Registration No', 'UG- Registration No.', 'UG- Registration No', 'ug_registration_no', 'UG Registration No'),
        ug_mode_of_study: getColumnValue(row, 'UG - Mode Of Study', 'UG- Mode Of Study', 'ug_mode_of_study', 'UG Mode Of Study'),
        ug_place_of_institution: getColumnValue(row, 'UG - Place Of The Institution', 'UG- Place Of The Institution', 'ug_place_of_institution', 'UG Place Of Institution'),

        // PG (Postgraduate) Details
        pg_qualification: getColumnValue(row, 'PG. - Current Education Qualification', 'PG - Current Education Qualification', 'pg_qualification', 'PG Qualification'),
        pg_institute: getColumnValue(row, 'PG. - Institute Name', 'PG - Institute Name', 'pg_institute', 'PG Institute'),
        pg_degree: getColumnValue(row, 'PG. - Degree', 'PG - Degree', 'pg_degree', 'PG Degree'),
        pg_specialization: getColumnValue(row, 'PG. - Specialization', 'PG - Specialization', 'pg_specialization', 'PG Specialization'),
        pg_marking_scheme: getColumnValue(row, 'PG. - Marking Scheme', 'PG - Marking Scheme', 'pg_marking_scheme', 'PG Marking Scheme'),
        pg_cgpa: getColumnValue(row, 'PG. - CGPA Or Percentage', 'PG - CGPA Or Percentage', 'pg_cgpa', 'PG CGPA'),
        pg_month_year: getColumnValue(row, 'PG. - Month & Year', 'PG - Month & Year', 'pg_month_year', 'PG Month Year'),
        pg_registration_no: getColumnValue(row, 'PG. - Registration No.', 'PG. - Registration No', 'PG - Registration No.', 'PG - Registration No', 'pg_registration_no', 'PG Registration No'),
        pg_mode_of_study: getColumnValue(row, 'PG. - Mode Of Study', 'PG - Mode Of Study', 'pg_mode_of_study', 'PG Mode Of Study'),
        pg_place_of_institution: getColumnValue(row, 'PG. - Place Of The Institution', 'PG - Place Of The Institution', 'pg_place_of_institution', 'PG Place Of Institution'),

        // Other Qualification Details
        other_qualification: getColumnValue(row, 'Other Degree - Current Education Qualification', 'Other Degree- Current Education Qualification', 'other_qualification', 'Other Qualification'),
        other_institute: getColumnValue(row, 'Other Degree - Institute Name', 'Other Degree- Institute Name', 'other_institute', 'Other Institute'),
        other_degree: getColumnValue(row, 'Other Degree - Degree', 'Other Degree- Degree', 'other_degree', 'Other Degree'),
        other_specialization: getColumnValue(row, 'Other Degree - Specialization', 'Other Degree- Specialization', 'other_specialization', 'Other Specialization'),
        other_marking_scheme: getColumnValue(row, 'Other Degree - Marking Scheme', 'Other Degree- Marking Scheme', 'other_marking_scheme', 'Other Marking Scheme'),
        other_cgpa: getColumnValue(row, 'Other Degree - CGPA Or Percentage', 'Other Degree- CGPA Or Percentage', 'other_cgpa', 'Other CGPA'),
        other_month_year: getColumnValue(row, 'Other Degree - Month & Year', 'Other Degree- Month & Year', 'other_month_year', 'Other Month Year'),
        other_registration_no: getColumnValue(row, 'Other Degree - Registration No.', 'Other Degree - Registration No', 'Other Degree- Registration No.', 'Other Degree- Registration No', 'other_registration_no', 'Other Registration No'),
        other_mode_of_study: getColumnValue(row, 'Other Degree - Mode Of Study', 'Other Degree- Mode Of Study', 'other_mode_of_study', 'Other Mode Of Study'),
        other_place_of_institution: getColumnValue(row, 'Other Degree - Place Of The Institution', 'Other Degree- Place Of The Institution', 'other_place_of_institution', 'Other Place Of Institution'),

        // Entrance Exam / Test Details
        competitive_exam: getColumnValue(row, 'competitive_exam', 'Competitive Exam') || 'No',
        exam1_name: getColumnValue(row, '1. - Name Of The Exam', '1.- Name Of The Exam', '1 - Name Of The Exam', 'exam1_name', 'Exam1 Name'),
        exam1_reg_no: getColumnValue(row, '1. - Registration No./Roll No.', '1. - Registration No./Roll No', '1.- Registration No./Roll No.', '1 - Registration No./Roll No.', 'exam1_reg_no', 'Exam1 Reg No'),
        exam1_score: getColumnValue(row, '1. - Score Obtained', '1.- Score Obtained', '1 - Score Obtained', 'exam1_score', 'Exam1 Score'),
        exam1_max_score: getColumnValue(row, '1. - Max Score', '1.- Max Score', '1 - Max Score', 'exam1_max_score', 'Exam1 Max Score'),
        exam1_year: getColumnValue(row, '1. - Year Appeared', '1.- Year Appeared', '1 - Year Appeared', 'exam1_year', 'Exam1 Year'),
        exam1_rank: getColumnValue(row, '1. - AIR/Overall Rank', '1.- AIR/Overall Rank', '1 - AIR/Overall Rank', 'exam1_rank', 'Exam1 Rank'),
        exam1_qualified: getColumnValue(row, '1. - Qualified/Not Qualified', '1.- Qualified/Not Qualified', '1 - Qualified/Not Qualified', 'exam1_qualified', 'Exam1 Qualified'),
        exam2_name: getColumnValue(row, '2. - Name Of The Exam', '2.- Name Of The Exam', '2 - Name Of The Exam', 'exam2_name', 'Exam2 Name'),
        exam2_reg_no: getColumnValue(row, '2. - Registration No./Roll No.', '2. - Registration No./Roll No', '2.- Registration No./Roll No.', '2 - Registration No./Roll No.', 'exam2_reg_no', 'Exam2 Reg No'),
        exam2_score: getColumnValue(row, '2. - Score Obtained', '2.- Score Obtained', '2 - Score Obtained', 'exam2_score', 'Exam2 Score'),
        exam2_max_score: getColumnValue(row, '2. - Max Score', '2.- Max Score', '2 - Max Score', 'exam2_max_score', 'Exam2 Max Score'),
        exam2_year: getColumnValue(row, '2. - Year Appeared', '2.- Year Appeared', '2 - Year Appeared', 'exam2_year', 'Exam2 Year'),
        exam2_rank: getColumnValue(row, '2. - AIR/Overall Rank', '2.- AIR/Overall Rank', '2 - AIR/Overall Rank', 'exam2_rank', 'Exam2 Rank'),
        exam2_qualified: getColumnValue(row, '2. - Qualified/Not Qualified', '2.- Qualified/Not Qualified', '2 - Qualified/Not Qualified', 'exam2_qualified', 'Exam2 Qualified'),
        exam3_name: getColumnValue(row, '3. - Name Of The Exam', '3.- Name Of The Exam', '3 - Name Of The Exam', 'exam3_name', 'Exam3 Name'),
        exam3_reg_no: getColumnValue(row, '3. - Registration No./Roll No.', '3. - Registration No./Roll No', '3.- Registration No./Roll No.', '3 - Registration No./Roll No.', 'exam3_reg_no', 'Exam3 Reg No'),
        exam3_score: getColumnValue(row, '3. - Score Obtained', '3.- Score Obtained', '3 - Score Obtained', 'exam3_score', 'Exam3 Score'),
        exam3_max_score: getColumnValue(row, '3. - Max Score', '3.- Max Score', '3 - Max Score', 'exam3_max_score', 'Exam3 Max Score'),
        exam3_year: getColumnValue(row, '3. - Year Appeared', '3.- Year Appeared', '3 - Year Appeared', 'exam3_year', 'Exam3 Year'),
        exam3_rank: getColumnValue(row, '3. - AIR/Overall Rank', '3.- AIR/Overall Rank', '3 - AIR/Overall Rank', 'exam3_rank', 'Exam3 Rank'),
        exam3_qualified: getColumnValue(row, '3. - Qualified/Not Qualified', '3.- Qualified/Not Qualified', '3 - Qualified/Not Qualified', 'exam3_qualified', 'Exam3 Qualified'),

        // Research & Application Info
        research_interest: getColumnValue(row, 'Title And Abstract Of The Master Degree Thesis And Your Research Interest In 500 Words', 'research_interest', 'Research Interest'),
        reasons_for_applying: getColumnValue(row, 'Describe In 300 Words; Your Reasons For Applying To The Program, And Other Interests That Drives You To Apply To The Program.', 'Describe In 300 Words; Your Reasons For Applying To The Program, And Other Interests That Drives You To Apply To The Program', 'reasons_for_applying', 'Reasons For Applying'),
        user_id: getColumnValue(row, 'User Id', 'user_id', 'UserId', 'User ID'),
        certificates: getColumnValue(row, 'Certificates', 'certificates', 'Certificate') || 'Available',

        // Additional fields for examination module
        faculty: faculty,
        department: getColumnValue(row, 'department', 'Department', 'Dept', 'Department Name', 'Dept Name'),
        type: type,

        // Initialize examination-specific fields with default values (don't import from Excel)
        written_marks_100: 0,
        written_marks: 0,
        interview_marks: 0,
        total_marks: null,
        status: 'pending', // Always set to pending for new uploads
        current_owner: 'director',
        faculty_written: null, // Don't import status fields
        director_interview: null // Don't import status fields
      };
    });

    console.log('=== EXCEL UPLOAD DEBUG INFO ===');
    console.log('Total rows in Excel:', jsonData.length);
    console.log('Total records to insert:', records.length);
    console.log('\n=== SAMPLE RECORD (FIRST ROW) ===');
    console.log(JSON.stringify(records[0], null, 2));
    console.log('\n=== FIELD COUNT CHECK ===');
    const firstRecord = records[0];
    const nonNullFields = Object.entries(firstRecord).filter(([key, value]) => value !== null && value !== undefined && value !== '');
    console.log('Total fields in record:', Object.keys(firstRecord).length);
    console.log('Non-null fields:', nonNullFields.length);
    console.log('Non-null field names:', nonNullFields.map(([key]) => key).join(', '));
    console.log('\n=== UPLOADING TO SUPABASE ===');

    const { data: insertedData, error } = await supabase
      .from('examination_records')
      .insert(records)
      .select();

    if (error) {
      console.error('Error inserting examination records:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      console.error('Sample record that failed:', records[0]);
      return { data: null, error };
    }

    console.log('Successfully inserted', insertedData?.length || 0, 'examination records');
    return { data: insertedData, error: null };
  } catch (err) {
    console.error('Exception in uploadExaminationExcel:', err);
    console.error('Exception details:', err.message, err.stack);
    return { data: null, error: err };
  }
};

// Forward individual examination record - store status in examination_records table
export const forwardExaminationRecord = async (id) => {
  try {
    console.log('🚀 Starting forward process for examination record ID:', id);

    // Get the examination record with all details
    const { data: examRecord, error: fetchError } = await supabase
      .from('examination_records')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('❌ Error fetching examination record:', fetchError);
      return {
        data: null,
        error: {
          message: `Failed to fetch examination record: ${fetchError.message}`,
          code: 'FETCH_ERROR',
          details: fetchError
        }
      };
    }

    if (!examRecord) {
      console.error('❌ Examination record not found for ID:', id);
      return {
        data: null,
        error: {
          message: 'Examination record not found',
          code: 'RECORD_NOT_FOUND'
        }
      };
    }

    console.log('✅ Found examination record:', {
      id: examRecord.id,
      application_no: examRecord.application_no,
      name: examRecord.registered_name || examRecord.name,
      faculty: examRecord.faculty,
      status: examRecord.status
    });

    // Check if already forwarded
    if (examRecord.status && examRecord.status.toLowerCase().includes('forwarded')) {
      console.log('⚠️ Record already forwarded, skipping');
      return {
        data: null,
        error: {
          message: 'This examination record has already been forwarded',
          code: 'ALREADY_FORWARDED'
        }
      };
    }

    // Determine the forward status based on exact faculty names
    let forwardStatus = 'Forwarded';
    if (examRecord.faculty) {
      const facultyName = examRecord.faculty.trim();
      console.log('🏫 Faculty name from record:', facultyName);

      if (facultyName === 'Faculty of Engineering & Technology') {
        forwardStatus = 'Forwarded to Engineering';
      } else if (facultyName === 'Faculty of Management') {
        forwardStatus = 'Forwarded to Management';
      } else if (facultyName === 'Faculty of Science & Humanities') {
        forwardStatus = 'Forwarded to Science';
      } else if (facultyName === 'Faculty of Medical & Health Science') {
        forwardStatus = 'Forwarded to Medical';
      } else {
        // Fallback to partial matching for any variations
        const facultyLower = facultyName.toLowerCase();
        if (facultyLower.includes('engineering')) {
          forwardStatus = 'Forwarded to Engineering';
        } else if (facultyLower.includes('management')) {
          forwardStatus = 'Forwarded to Management';
        } else if (facultyLower.includes('science') || facultyLower.includes('humanities')) {
          forwardStatus = 'Forwarded to Science';
        } else if (facultyLower.includes('medical') || facultyLower.includes('health')) {
          forwardStatus = 'Forwarded to Medical';
        }
      }
    }

    console.log('📋 Determined forward status:', forwardStatus);

    // Update examination record with forward status and faculty_written
    console.log('🔄 Updating examination record with forward status');
    const { data: examUpdateData, error: examUpdateError } = await supabase
      .from('examination_records')
      .update({
        status: 'forwarded',
        faculty_written: forwardStatus,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (examUpdateError) {
      console.error('❌ Error updating examination record:', examUpdateError);
      return {
        data: null,
        error: {
          message: `Failed to update examination record: ${examUpdateError.message}`,
          code: 'UPDATE_ERROR',
          details: examUpdateError
        }
      };
    }

    console.log('🎉 Successfully forwarded examination record');
    console.log('✅ Updated record:', {
      id: examUpdateData[0].id,
      status: examUpdateData[0].status,
      faculty_written: examUpdateData[0].faculty_written
    });

    return {
      data: {
        examination: examUpdateData[0],
        forwardStatus
      },
      error: null
    };
  } catch (err) {
    console.error('💥 Exception in forwardExaminationRecord:', err);
    console.error('💥 Exception details:', err.message, err.stack);
    return {
      data: null,
      error: {
        message: `Unexpected error: ${err.message || 'Unknown error occurred'}`,
        code: 'EXCEPTION_ERROR',
        details: err
      }
    };
  }
};

// Forward all examination records
export const forwardAllExaminationRecords = async () => {
  try {
    // Get all pending examination records
    const { data: pendingRecords, error: fetchError } = await supabase
      .from('examination_records')
      .select('*')
      .eq('status', 'pending');

    if (fetchError) {
      console.error('Error fetching pending examination records:', fetchError);
      return { data: null, error: fetchError };
    }

    if (!pendingRecords || pendingRecords.length === 0) {
      return { data: [], error: null };
    }

    // Forward each record individually
    const forwardPromises = pendingRecords.map(record =>
      forwardExaminationRecord(record.id)
    );

    const results = await Promise.all(forwardPromises);

    // Check for any errors
    const errors = results.filter(result => result.error);
    if (errors.length > 0) {
      console.error('Some records failed to forward:', errors);
      return { data: null, error: { message: `${errors.length} records failed to forward` } };
    }

    const successfulForwards = results.map(result => result.data);
    return { data: successfulForwards, error: null };
  } catch (err) {
    console.error('Exception in forwardAllExaminationRecords:', err);
    return { data: null, error: err };
  }
};

// Delete all examination records
export const deleteAllExaminationRecords = async () => {
  try {
    const { data, error } = await supabase
      .from('examination_records')
      .delete()
      .neq('id', 0) // Delete all records (neq 0 matches all)
      .select();

    if (error) {
      console.error('Error deleting all examination records:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in deleteAllExaminationRecords:', err);
    return { data: null, error: err };
  }
};

// Set director_interview status to 'Forwarded to Director'
export const forwardToDirectorForInterview = async (id) => {
  try {
    console.log('🎯 Setting director_interview to "Forwarded to Director" for record ID:', id);

    const { data, error } = await supabase
      .from('examination_records')
      .update({
        director_interview: 'Forwarded to Director',
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('❌ Error updating director_interview:', error);
      return { data: null, error };
    }

    console.log('✅ Successfully set director_interview to "Forwarded to Director"');
    return { data, error: null };
  } catch (err) {
    console.error('💥 Exception in forwardToDirectorForInterview:', err);
    return { data: null, error: err };
  }
};

// Bulk set director_interview status to 'Forwarded to Director'
export const bulkForwardToDirectorForInterview = async (ids) => {
  try {
    console.log('🎯 Bulk setting director_interview to "Forwarded to Director" for records:', ids);

    const { data, error } = await supabase
      .from('examination_records')
      .update({
        director_interview: 'Forwarded to Director',
        updated_at: new Date().toISOString()
      })
      .in('id', ids)
      .select();

    if (error) {
      console.error('❌ Error bulk updating director_interview:', error);
      return { data: null, error };
    }

    console.log('✅ Successfully bulk set director_interview to "Forwarded to Director"');
    return { data, error: null };
  } catch (err) {
    console.error('💥 Exception in bulkForwardToDirectorForInterview:', err);
    return { data: null, error: err };
  }
};


// Publish results for a faculty - Simple direct update to result_dir column
// Publish results for specific scholars (only those currently in the result view)
export const publishFacultyResults = async (facultyName, scholarIds) => {
  try {
    console.log('📢 Publishing results for faculty:', facultyName);
    console.log('📋 Scholar IDs to publish:', scholarIds);

    if (!scholarIds || scholarIds.length === 0) {
      console.error('No scholars to publish');
      return { data: null, error: { message: 'No scholars selected for publishing' } };
    }

    // Determine publish status based on faculty
    let publishStatus = '';
    if (facultyName === 'Faculty of Engineering & Technology') {
      publishStatus = 'Published to Engineering';
    } else if (facultyName === 'Faculty of Science & Humanities') {
      publishStatus = 'Published to Science';
    } else if (facultyName === 'Faculty of Management') {
      publishStatus = 'Published to Management';
    } else if (facultyName.includes('Medical')) {
      publishStatus = 'Published to Medical';
    } else {
      console.error('Unknown faculty:', facultyName);
      return { data: null, error: { message: 'Unknown faculty: ' + facultyName } };
    }

    console.log('Writing to result_dir:', publishStatus);
    console.log('Updating scholars:', scholarIds.length);

    // Update only the specific scholars by their IDs
    const { data, error, count } = await supabaseAdmin
      .from('examination_records')
      .update({ result_dir: publishStatus })
      .in('id', scholarIds) // Only update scholars with these IDs
      .select('id', { count: 'exact' });

    if (error) {
      console.error('Publish failed:', error);
      return { data: null, error };
    }

    console.log(`✅ Published ${count || data?.length || 0} records for ${facultyName}`);
    return { data: data || [], error: null };

  } catch (err) {
    console.error('Exception:', err);
    return { data: null, error: { message: err.message } };
  }
};

// Fetch examination records with total marks for results (sorted by highest marks)
export const fetchExaminationResultsRecords = async () => {
  try {
    console.log('Fetching examination records with total marks for results...');

    const { data, error } = await supabase
      .from('examination_records')
      .select('*')
      .not('written_marks_100', 'is', null)
      .not('interview_marks', 'is', null)
      .gt('written_marks_100', 0)
      .gt('interview_marks', 0)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching examination results:', error);
      return { data: null, error };
    }

    // Calculate total marks and sort by highest first
    const recordsWithTotal = (data || []).map(record => {
      const writtenMarks70 = Math.round(((record.written_marks_100 || 0) / 100) * 70);
      const totalMarks = writtenMarks70 + (record.interview_marks || 0);
      return {
        ...record,
        written_marks: writtenMarks70,
        total_marks: totalMarks
      };
    }).sort((a, b) => b.total_marks - a.total_marks);

    console.log('Successfully fetched examination results:', recordsWithTotal.length, 'records');
    return { data: recordsWithTotal, error: null };
  } catch (err) {
    console.error('Exception in fetchExaminationResultsRecords:', err);
    return { data: null, error: err };
  }
};


// Fetch examination records count by scholar type for Dashboard tiles
export const getExaminationCountsByType = async () => {
  try {
    const { data, error } = await supabase
      .from('examination_records')
      .select('program_type');

    if (error) {
      console.error('Error fetching examination counts:', error);
      return { data: null, error };
    }

    // Count by program_type only (not type column)
    const counts = {
      fullTime: 0,
      partTimeInternal: 0,
      partTimeExternal: 0,
      partTimeIndustry: 0,
      total: data?.length || 0
    };

    data?.forEach(record => {
      // Only check program_type field as requested
      const programType = (record.program_type || '').trim();

      if (programType === 'Full Time' || programType === 'FT' || programType.toLowerCase() === 'full time') {
        counts.fullTime++;
      } else if (programType === 'Part Time Internal' || programType === 'PTI' || programType.toLowerCase() === 'part time internal') {
        counts.partTimeInternal++;
      } else if (programType === 'Part Time External (Industry)' || programType === 'PTE(Industry)' || programType.toLowerCase().includes('industry')) {
        counts.partTimeIndustry++;
      } else if (programType === 'Part Time External' || programType === 'PTE' || programType.toLowerCase() === 'part time external') {
        counts.partTimeExternal++;
      }
    });

    console.log('✅ Examination counts by program_type:', counts);
    return { data: counts, error: null };
  } catch (err) {
    console.error('Exception in getExaminationCountsByType:', err);
    return { data: null, error: err };
  }
};
