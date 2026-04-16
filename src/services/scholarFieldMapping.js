// Scholar Field Mapping Helper
// Maps database fields to form fields and vice versa for VerifiedScholars component

/**
 * Maps a scholar object from database to form data format
 * @param {Object} scholar - Scholar object from database
 * @returns {Object} - Form data object
 */
export const mapScholarToFormData = (scholar) => {
  if (!scholar) return null;

  return {
    // Basic Information
    applicationNo: scholar.application_no || '',
    formName: scholar.form_name || 'PhD Application Form',
    name: scholar.registered_name || scholar.name || '',
    institution: scholar.institution || 'SRM Institute of Science and Technology',
    program: scholar.select_program || scholar.program || '',
    programType: scholar.program_type || '',
    mobile: scholar.mobile || '',
    email: scholar.email || '',
    dateOfBirth: scholar.date_of_birth || '',
    gender: scholar.gender || 'Male',
    
    // Additional Fields
    graduatedFromIndia: scholar.graduated_from_india || 'Yes',
    course: scholar.course || '',
    employeeId: scholar.employee_id || '',
    designation: scholar.designation || '',
    organizationName: scholar.organization_name || '',
    organizationAddress: scholar.organization_address || '',
    differentlyAbled: scholar.differently_abled || 'No',
    natureOfDeformity: scholar.nature_of_deformity || '',
    percentageOfDeformity: scholar.percentage_of_deformity || '',
    nationality: scholar.nationality || 'Indian',
    aadhaarNo: scholar.aadhaar_no || '',
    modeOfProfession: scholar.mode_of_profession || 'Academic',
    areaOfInterest: scholar.area_of_interest || '',
    
    // UG Details
    ugQualification: scholar.ug_qualification || '',
    ugInstitute: scholar.ug_institute || '',
    ugDegree: scholar.ug_degree || '',
    ugSpecialization: scholar.ug_specialization || '',
    ugMarkingScheme: scholar.ug_marking_scheme || 'CGPA',
    ugCgpa: scholar.ug_cgpa || '',
    ugMonthYear: scholar.ug_month_year || '',
    ugRegistrationNo: scholar.ug_registration_no || '',
    ugModeOfStudy: scholar.ug_mode_of_study || 'Full Time',
    ugPlaceOfInstitution: scholar.ug_place_of_institution || '',
    
    // PG Details
    pgQualification: scholar.pg_qualification || '',
    pgInstitute: scholar.pg_institute || '',
    pgDegree: scholar.pg_degree || '',
    pgSpecialization: scholar.pg_specialization || '',
    pgMarkingScheme: scholar.pg_marking_scheme || 'CGPA',
    pgCgpa: scholar.pg_cgpa || '',
    pgMonthYear: scholar.pg_month_year || '',
    pgRegistrationNo: scholar.pg_registration_no || '',
    pgModeOfStudy: scholar.pg_mode_of_study || 'Full Time',
    pgPlaceOfInstitution: scholar.pg_place_of_institution || '',
    
    // Other Degree Details
    otherQualification: scholar.other_qualification || '',
    otherInstitute: scholar.other_institute || '',
    otherDegree: scholar.other_degree || '',
    otherSpecialization: scholar.other_specialization || '',
    otherMarkingScheme: scholar.other_marking_scheme || '',
    otherCgpa: scholar.other_cgpa || '',
    otherMonthYear: scholar.other_month_year || '',
    otherRegistrationNo: scholar.other_registration_no || '',
    otherModeOfStudy: scholar.other_mode_of_study || '',
    otherPlaceOfInstitution: scholar.other_place_of_institution || '',
    
    // Competitive Exams
    competitiveExam: scholar.competitive_exam || 'No',
    exam1Name: scholar.exam1_name || '',
    exam1RegNo: scholar.exam1_reg_no || '',
    exam1Score: scholar.exam1_score || '',
    exam1MaxScore: scholar.exam1_max_score || '',
    exam1Year: scholar.exam1_year || '',
    exam1Rank: scholar.exam1_rank || '',
    exam1Qualified: scholar.exam1_qualified || '',
    exam2Name: scholar.exam2_name || '',
    exam2RegNo: scholar.exam2_reg_no || '',
    exam2Score: scholar.exam2_score || '',
    exam2MaxScore: scholar.exam2_max_score || '',
    exam2Year: scholar.exam2_year || '',
    exam2Rank: scholar.exam2_rank || '',
    exam2Qualified: scholar.exam2_qualified || '',
    exam3Name: scholar.exam3_name || '',
    exam3RegNo: scholar.exam3_reg_no || '',
    exam3Score: scholar.exam3_score || '',
    exam3MaxScore: scholar.exam3_max_score || '',
    exam3Year: scholar.exam3_year || '',
    exam3Rank: scholar.exam3_rank || '',
    exam3Qualified: scholar.exam3_qualified || '',
    
    // Research Interest
    reasonsForApplying: scholar.reasons_for_applying || '',
    researchInterest: scholar.research_interest || '',
    
    // System Fields
    userId: scholar.user_id || '',
    certificates: scholar.certificates || 'Certificates',
    status: scholar.status || 'Pending',
    faculty: scholar.select_institution || scholar.faculty || '',
    department: scholar.dept_name || scholar.department || '',
    type: scholar.program_type || 'Full Time',
    cgpa: scholar.cgpa || ''
  };
};

/**
 * Maps form data to database field format
 * @param {Object} formData - Form data object
 * @returns {Object} - Database update object
 */
export const mapFormDataToScholar = (formData) => {
  return {
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
};

/**
 * Get all field labels for display in View modal
 * @returns {Object} - Object with field keys and their display labels
 */
export const getFieldLabels = () => {
  return {
    // Basic Information
    applicationNo: 'Application Number',
    formName: 'Form Name',
    name: 'Scholar Name',
    institution: 'Institution',
    program: 'Program',
    programType: 'Program Type',
    mobile: 'Mobile Number',
    email: 'Email Address',
    dateOfBirth: 'Date of Birth',
    gender: 'Gender',
    
    // Additional Fields
    graduatedFromIndia: 'Graduated from India',
    course: 'Course',
    employeeId: 'Employee ID',
    designation: 'Designation',
    organizationName: 'Organization Name',
    organizationAddress: 'Organization Address',
    differentlyAbled: 'Differently Abled',
    natureOfDeformity: 'Nature of Deformity',
    percentageOfDeformity: 'Percentage of Deformity',
    nationality: 'Nationality',
    aadhaarNo: 'Aadhaar Number',
    modeOfProfession: 'Mode of Profession',
    areaOfInterest: 'Area of Interest',
    
    // UG Details
    ugQualification: 'UG Qualification',
    ugInstitute: 'UG Institute',
    ugDegree: 'UG Degree',
    ugSpecialization: 'UG Specialization',
    ugMarkingScheme: 'UG Marking Scheme',
    ugCgpa: 'UG CGPA/Percentage',
    ugMonthYear: 'UG Month & Year',
    ugRegistrationNo: 'UG Registration Number',
    ugModeOfStudy: 'UG Mode of Study',
    ugPlaceOfInstitution: 'UG Place of Institution',
    
    // PG Details
    pgQualification: 'PG Qualification',
    pgInstitute: 'PG Institute',
    pgDegree: 'PG Degree',
    pgSpecialization: 'PG Specialization',
    pgMarkingScheme: 'PG Marking Scheme',
    pgCgpa: 'PG CGPA/Percentage',
    pgMonthYear: 'PG Month & Year',
    pgRegistrationNo: 'PG Registration Number',
    pgModeOfStudy: 'PG Mode of Study',
    pgPlaceOfInstitution: 'PG Place of Institution',
    
    // Other Degree Details
    otherQualification: 'Other Qualification',
    otherInstitute: 'Other Institute',
    otherDegree: 'Other Degree',
    otherSpecialization: 'Other Specialization',
    otherMarkingScheme: 'Other Marking Scheme',
    otherCgpa: 'Other CGPA/Percentage',
    otherMonthYear: 'Other Month & Year',
    otherRegistrationNo: 'Other Registration Number',
    otherModeOfStudy: 'Other Mode of Study',
    otherPlaceOfInstitution: 'Other Place of Institution',
    
    // Competitive Exams
    competitiveExam: 'Competitive Exam Taken',
    exam1Name: 'Exam 1 Name',
    exam1RegNo: 'Exam 1 Registration Number',
    exam1Score: 'Exam 1 Score',
    exam1MaxScore: 'Exam 1 Max Score',
    exam1Year: 'Exam 1 Year',
    exam1Rank: 'Exam 1 Rank',
    exam1Qualified: 'Exam 1 Qualified',
    exam2Name: 'Exam 2 Name',
    exam2RegNo: 'Exam 2 Registration Number',
    exam2Score: 'Exam 2 Score',
    exam2MaxScore: 'Exam 2 Max Score',
    exam2Year: 'Exam 2 Year',
    exam2Rank: 'Exam 2 Rank',
    exam2Qualified: 'Exam 2 Qualified',
    exam3Name: 'Exam 3 Name',
    exam3RegNo: 'Exam 3 Registration Number',
    exam3Score: 'Exam 3 Score',
    exam3MaxScore: 'Exam 3 Max Score',
    exam3Year: 'Exam 3 Year',
    exam3Rank: 'Exam 3 Rank',
    exam3Qualified: 'Exam 3 Qualified',
    
    // Research Interest
    reasonsForApplying: 'Reasons for Applying',
    researchInterest: 'Research Interest',
    
    // System Fields
    userId: 'User ID',
    certificates: 'Certificates',
    status: 'Status',
    faculty: 'Faculty',
    department: 'Department',
    type: 'Type',
    cgpa: 'CGPA'
  };
};
