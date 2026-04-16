import React, { useState, useEffect } from 'react';
import { FaChevronRight, FaDownload, FaEye, FaPaperPlane, FaCheckCircle } from 'react-icons/fa';
import { SlidersHorizontal } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useAppContext } from '../App';
import MessageBox from './Modals/MessageBox';
import { createPortal } from 'react-dom';
import { supabase } from '../../../supabaseClient';
import './FOETResult.css';

// Department mapping for short forms
const DEPARTMENT_MAPPING = {
  // Faculty of Engineering & Technology (11 departments)
  'Biomedical Engineering': 'BME',
  'Biotechnology': 'ENGBIO',
  'Chemistry': 'ENGCHEM', 
  'Civil Engineering': 'CIVIL',
  'Computer Science and Engineering': 'CSE',
  'Computer Science And Engineering': 'CSE',
  'Computer Science Engineering': 'CSE',
  'Electrical and Electronics Engineering': 'EEE',
  'Electronics and Communication Engineering': 'ECE',
  'English': 'ENGENG', 
  'Mathematics': 'ENGMATH', 
  'Mechanical Engineering': 'MECH',
  'Physics': 'ENGPHYS', 
  
  // Faculty of Management (1 department)
  'Management Studies': 'MBA',
  
  // Faculty of Medical and Health Sciences (10 departments)
  'Department of Basic Medical Sciences': 'BMS',
  'Basic Medical Sciences': 'BMS',
  'Department of Conservative Dentistry & Endodontics': 'CDE',
  'Conservative Dentistry & Endodontics': 'CDE',
  'Department of Oral and Maxillofacial Pathology and Microbiology': 'OMPM',
  'Oral and Maxillofacial Pathology and Microbiology': 'OMPM',
  'Department of Oral and Maxillofacial Surgery': 'OMS',
  'Oral and Maxillofacial Surgery': 'OMS',
  'Department of Oral Medicine and Radiology': 'OMR',
  'Oral Medicine and Radiology': 'OMR',
  'Department of Orthodontics': 'ORTHO',
  'Orthodontics': 'ORTHO',
  'Department of Pediatric and Preventive Dentistry': 'PPD',
  'Pediatric and Preventive Dentistry': 'PPD',
  'Department of Periodontics and Oral Implantology': 'POI',
  'Periodontics and Oral Implantology': 'POI',
  'Department of Prosthodontics': 'PROSTH',
  'Prosthodontics': 'PROSTH',
  'Department of Public Health Dentistry': 'PHD',
  'Public Health Dentistry': 'PHD',
  
  // Faculty of Science & Humanities (8 departments)
  'Biotechnology': 'BIO', 
  'Commerce': 'COMM',
  'Computer Science': 'CS',
  'English & Foreign Languages': 'EFL',
  'Fashion Designing': 'FASHION',
  'Mathematics': 'MATH', 
  'Tamil': 'TAMIL',
  'Visual Communication': 'VISCOM',
  'Visual Communications': 'VISCOM'
};

// Faculty color map
const facultyColors = {
  'FOET': 'border-l-[6px] border-l-[#4f8cff]', // Blue
};

export default function FOETResult() {
  const { departmentsData, scholarsData, examinationsData, isLoadingSupabase, assignedFaculty, coordinatorInfo, coordinatorName } = useAppContext();
  
  // ALL HOOKS MUST BE AT THE TOP - BEFORE ANY EARLY RETURNS
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ department: '', type: '' });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [publishedLists, setPublishedLists] = useState([]);
  const [confirmModal, setConfirmModal] = useState(null);
  const [scholars, setScholars] = useState(scholarsData || []);
  const [isPublishConfirmed, setIsPublishConfirmed] = useState(false);
  const [messageBox, setMessageBox] = useState({ show: false, title: '', message: '', type: 'info' });

  // ALL useEffect hooks must also be at the top
  useEffect(() => {
    if (scholarsData && scholarsData.length > 0) {
      setScholars(scholarsData);
    }
  }, [scholarsData]);

  // Helper function to extract department name from program string
  const extractDepartmentFromProgram = (program) => {
    console.log('🔧 Extracting department from program:', program);
    
    if (!program || program === 'N/A') {
      console.log('❌ No valid program provided');
      return '';
    }
    
    // If it's a faculty name like "Faculty of Engineering & Technology", extract the main part
    if (program.includes('Faculty of')) {
      const match = program.match(/Faculty of (.+)/i);
      if (match) {
        const department = match[1].trim();
        console.log('✅ Extracted department from faculty:', department);
        return department;
      }
    }
    
    // Extract department name from program string like "Ph.d. - Biomedical Engineering (ph.d. - Pti - E And T)"
    // Look for the pattern after "Ph.d. - " and before " ("
    const match = program.match(/Ph\.d\.\s*-\s*([^(]+)/i);
    if (match) {
      const department = match[1].trim();
      console.log('✅ Extracted department (main pattern):', department);
      return department;
    }
    
    // Try alternative patterns
    // Look for patterns like "Biomedical Engineering" directly
    const altMatch = program.match(/([A-Za-z\s]+Engineering|[A-Za-z\s]+Science|[A-Za-z\s]+Technology|[A-Za-z\s]+Management)/i);
    if (altMatch) {
      const department = altMatch[1].trim();
      console.log('✅ Extracted department (alt pattern):', department);
      return department;
    }
    
    // Fallback: return the program as is
    console.log('⚠️ Using program as department (fallback):', program);
    return program;
  };

  // Create faculty object from Supabase departments data - USING DIRECTOR'S EXACT LOGIC
  const getPublishedDepartments = () => {
    if (!departmentsData || !examinationsData || examinationsData.length === 0) {
      return [];
    }

    console.log('=== GETTING PUBLISHED DEPARTMENTS - DIRECTOR LOGIC ===');
    console.log('Assigned Faculty:', assignedFaculty);
    console.log('Total departments:', departmentsData.length);
    console.log('Total examination records:', examinationsData.length);

    // DEBUG: Log all result_dir values to see what we have
    console.log('\n=== ALL RESULT_DIR VALUES ===');
    examinationsData.forEach((record, index) => {
      console.log(`Record ${record.id} (${record.registered_name}):`, {
        result_dir: record.result_dir,
        result_dir_type: typeof record.result_dir,
        hasResultDir: !!record.result_dir,
        includesPublished: record.result_dir ? record.result_dir.includes('Published') : false,
        department: record.department,
        department: record.department
      });
    });

    // DIRECTOR'S LOGIC: Group departments by faculty, then check for published results
    // First, get all departments for this faculty
    const facultyDepartments = departmentsData.filter(d => d.faculty === assignedFaculty);
    console.log(`Faculty departments for ${assignedFaculty}:`, facultyDepartments.map(d => d.department_name));

    // Then, check which departments have published results
    const publishedDepartments = facultyDepartments.filter(dept => {
      console.log(`\n=== CHECKING DEPARTMENT: ${dept.department_name} ===`);
      
      // Check if this department has any published results in examination_records
      const hasPublishedResults = examinationsData.some(record => {
        // Extract department from program field (same as director)
        const recordDepartment = record.department;
        
        // Department matching (same as director)
        const departmentMatch = recordDepartment === dept.department_name;
        
        // Published status check (same as director) - just check if result_dir contains "Published"
        const isPublished = record.result_dir && record.result_dir.includes('Published');
        
        const matches = departmentMatch && isPublished;
        
        console.log(`🔍 DETAILED CHECK - Record ${record.id}:`, {
          registered_name: record.registered_name,
          application_no: record.application_no,
          department: record.department,
          recordDepartment: recordDepartment,
          deptName: dept.department_name,
          result_dir: record.result_dir,
          result_dir_type: typeof record.result_dir,
          result_dir_value: record.result_dir,
          departmentMatch: departmentMatch,
          isPublished: isPublished,
          hasResultDir: !!record.result_dir,
          includesPublished: record.result_dir ? record.result_dir.includes('Published') : false,
          matches: matches
        });
        
        if (matches) {
          console.log(`✅ DIRECTOR LOGIC - Found published result for ${dept.department_name}:`, {
            recordDepartment,
            result_dir: record.result_dir,
            registered_name: record.registered_name,
            faculty: record.faculty
          });
        }
        
        return matches;
      });
      
      console.log(`DIRECTOR LOGIC - Department ${dept.department_name}:`, {
        hasPublishedResults,
        included: hasPublishedResults
      });
      
      return hasPublishedResults;
    });

    console.log(`DIRECTOR LOGIC - Found ${publishedDepartments.length} departments with published results for ${assignedFaculty}`);
    publishedDepartments.forEach(dept => {
      console.log(`- ${dept.department_name}`);
    });

    return publishedDepartments;
  };

  const filteredPublishedDepartments = getPublishedDepartments();

  const faculty = {
    id: 'current_faculty',
    name: assignedFaculty || 'Faculty',
    departments: filteredPublishedDepartments?.map(dept => ({
      id: dept.id,
      name: dept.department_name
    })) || []
  };

  // Debug logging
  console.log('FOETResult Component Debug:');
  console.log('Assigned Faculty:', assignedFaculty);
  console.log('All Departments Data:', departmentsData);
  console.log('All Departments Count:', departmentsData?.length || 0);
  console.log('Published Departments:', filteredPublishedDepartments);
  console.log('Published Departments Count:', filteredPublishedDepartments?.length || 0);
  console.log('Faculty Object (FOETResult):', faculty);

  // NOW we can have early returns after all hooks
  if (isLoadingSupabase) {
    return (
      <div className="foet-result-container">
        <div className="loading-state">
          <p>Loading departments...</p>
        </div>
      </div>
    );
  }

  if (!filteredPublishedDepartments || filteredPublishedDepartments.length === 0) {
    return (
      <div className="foet-result-container">
        <div className="no-departments">
          <p>No published results found for {assignedFaculty || 'this faculty'}.</p>
        </div>
      </div>
    );
  }

  // Helper function to get the total number of scholars for a faculty
  const getScholarCountForFaculty = (facultyDepartments) => {
    if (!examinationsData || examinationsData.length === 0) {
      return 0;
    }
    
    const deptNames = facultyDepartments.map(d => d.name);
    const totalScholars = examinationsData.filter(record => {
      const recordDepartment = record.department;
      
      // Check if department matches
      const departmentMatch = deptNames.some(deptName => 
        recordDepartment.toLowerCase().includes(deptName.toLowerCase()) ||
        deptName.toLowerCase().includes(recordDepartment.toLowerCase())
      );
      
      // Check if result_dir contains "Published to" (more flexible matching)
      const isPublished = record.result_dir && 
                         (record.result_dir.includes('Published to Engineering') ||
                          record.result_dir.includes('Published to Management') ||
                          record.result_dir.includes('Published to Science') ||
                          record.result_dir.includes('Published to Medical') ||
                          record.result_dir.includes('Publish to Engineering') ||
                          record.result_dir.includes('Publish to Management') ||
                          record.result_dir.includes('Publish to Science') ||
                          record.result_dir.includes('Publish to Medical') ||
                          record.result_dir.toLowerCase().includes('publish'));
      
      // Check if total_marks has actual marks OR if scholar has any marks (including partial absence)
      const hasTotalMarks = (record.total_marks && 
                           record.total_marks !== null && 
                           record.total_marks !== '' && 
                           parseFloat(record.total_marks) > 0) ||
                           (record.total_marks === 'Absent') ||
                           (record.written_marks === 'Ab' || record.interview_marks === 'Ab') ||
                           (record.written_marks && parseFloat(record.written_marks) > 0) ||
                           (record.interview_marks && parseFloat(record.interview_marks) > 0);
      
      return departmentMatch && isPublished && hasTotalMarks;
    }).length;
    
    return totalScholars;
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    if (key === 'department' && value === '') {
      setFilter(prev => ({ ...prev, department: '' }));
    } else {
      setFilter(prev => ({ ...prev, [key]: value }));
    }
  };

  // Clear search function
  const clearSearch = () => {
    setSearch('');
  };

  // Reset all filters
  const resetFilters = () => {
    setFilter({ department: '', type: '' });
    setSearch('');
    setShowFilterModal(false);
  };

  // Check if any filters are active
  const hasActiveFilters = (search && search.trim()) || filter.department || filter.type;

  // Helper function to check if department has unpublished scholars (NULL or empty dept_result)
  const hasUnpublishedScholars = (departmentName) => {
    if (!examinationsData || examinationsData.length === 0) return false;
    
    // Check if any scholar from this department has NULL or empty dept_result
    return examinationsData.some(record => {
      const recordDepartment = record.department;
      const departmentMatch = recordDepartment === departmentName ||
                             recordDepartment.toLowerCase().includes(departmentName.toLowerCase()) ||
                             departmentName.toLowerCase().includes(recordDepartment.toLowerCase());
      
      // Check if dept_result is NULL, empty, or undefined
      const hasNoDeptResult = !record.dept_result || record.dept_result === '' || record.dept_result === null;
      
      return departmentMatch && hasNoDeptResult;
    });
  };

  // Helper function to check if department is already published
  const isDepartmentPublished = (departmentName) => {
    if (!examinationsData || examinationsData.length === 0) return false;
    
    const deptShortForm = DEPARTMENT_MAPPING[departmentName] || departmentName;
    const publishValue = `Published_To_${deptShortForm}`;
    
    console.log(`🔍 Checking if ${departmentName} is published:`, {
      deptShortForm,
      publishValue
    });
    
    // Get all scholars from this department that have published results (result_dir contains "Published")
    const departmentScholars = examinationsData.filter(record => {
      const recordDepartment = record.department;
      const departmentMatch = recordDepartment === departmentName;
      const isPublished = record.result_dir && record.result_dir.includes('Published');
      return departmentMatch && isPublished;
    });
    
    if (departmentScholars.length === 0) {
      console.log(`❌ No published scholars found for ${departmentName}`);
      return false;
    }
    
    console.log(`📊 Found ${departmentScholars.length} published scholars for ${departmentName}`);
    
    // Check if ALL published scholars have been forwarded to department (have dept_result)
    const scholarsWithDeptResult = departmentScholars.filter(record => 
      record.dept_result === publishValue
    );
    
    const allScholarsForwarded = scholarsWithDeptResult.length === departmentScholars.length;
    
    console.log(`📋 Department ${departmentName} status:`, {
      totalPublishedScholars: departmentScholars.length,
      scholarsForwardedToDept: scholarsWithDeptResult.length,
      allScholarsForwarded: allScholarsForwarded,
      publishValue: publishValue
    });
    
    // Department is considered published if ALL published scholars have been forwarded to department
    return allScholarsForwarded;
  };



  // Get scholars for a specific department and mode - USING DIRECTOR'S EXACT LOGIC
  const getScholarsForDepartment = (departmentName, mode) => {
    console.log(`=== Getting scholars for department: ${departmentName}, mode: ${mode} ===`);
    console.log('Available examination records:', examinationsData?.length || 0);
    console.log('Assigned Faculty:', assignedFaculty);
    
    if (!examinationsData || examinationsData.length === 0) {
      console.log('No examination records available');
      return [];
    }
    
    // DIRECTOR'S EXACT LOGIC: Filter by department and type, then check if published
    const filtered = examinationsData.filter(record => {
      // Extract department from program field (same as director)
      const recordDepartment = record.department;
      
      // Department matching (same as director)
      const departmentMatch = recordDepartment === departmentName;
      
      // Type matching - Use program_type field directly from examination_records table
      // program_type can be: 'Full Time', 'Part Time Internal', 'Part Time External', 'Part Time External (Industry)'
      const programType = record.program_type || record.type || '';
      
      let typeMatch = false;
      if (mode === 'Full Time') {
        // Match only Full Time
        typeMatch = programType === 'Full Time';
      } else if (mode === 'Part Time') {
        // Match all Part Time variations
        typeMatch = programType === 'Part Time Internal' || 
                   programType === 'Part Time External' || 
                   programType === 'Part Time External (Industry)' ||
                   programType === 'Part Time';
      }
      
      // Published status check - DIRECTOR USES result_dir field with "Published" keyword
      const isPublished = record.result_dir && record.result_dir.includes('Published');
      
      console.log(`🔍 DIRECTOR LOGIC - Record ${record.id} (${record.registered_name}):`, {
        department: record.department,
        recordDepartment: recordDepartment,
        departmentName: departmentName,
        type: record.type,
        program_type: record.program_type,
        programType: programType,
        mode: mode,
        result_dir: record.result_dir,
        departmentMatch: departmentMatch,
        typeMatch: typeMatch,
        isPublished: isPublished,
        passesFilter: departmentMatch && typeMatch && isPublished
      });
      
      return departmentMatch && typeMatch && isPublished;
    });
    
    console.log(`✅ DIRECTOR LOGIC - Found ${filtered.length} published scholars for ${departmentName} (${mode})`);
    console.log('Filtered records:', filtered);
    
    // Transform and sort by total marks (same as director portal)
    const transformed = filtered
      .map((record, index) => {
        // Handle absent scholars - check if marks are 'Ab' or 'Absent' (including partial absence)
        const isCompletelyAbsent = record.total_marks === 'Absent' || 
                                  (record.written_marks === 'Ab' && record.interview_marks === 'Ab');
        const isPartiallyAbsent = (record.written_marks === 'Ab' && record.interview_marks !== 'Ab') ||
                                 (record.written_marks !== 'Ab' && record.interview_marks === 'Ab');
        
        const writtenMarks = record.written_marks === 'Ab' ? 'Ab' : Math.round(parseFloat(record.written_marks) || 0);
        const vivaMarks = record.interview_marks === 'Ab' ? 'Ab' : Math.round(parseFloat(record.interview_marks) || 0);
        
        let totalMarks;
        if (isCompletelyAbsent) {
          totalMarks = 'Absent';
        } else if (record.total_marks && record.total_marks !== 'Absent') {
          totalMarks = Math.round(parseFloat(record.total_marks));
        } else {
          // Calculate total for partial absence cases
          const writtenScore = record.written_marks === 'Ab' ? 0 : (parseFloat(record.written_marks) || 0);
          const vivaScore = record.interview_marks === 'Ab' ? 0 : (parseFloat(record.interview_marks) || 0);
          totalMarks = Math.round(writtenScore + vivaScore);
        }
        
        console.log(`=== TRANSFORMING RECORD ${record.id} ===`);
        console.log('Original record department:', record.department);
        
        const scholarObj = {
          id: record.id,
          'Registered Name': record.registered_name || 'N/A',
          'Application Number': record.application_no || 'N/A',
          'Mode of Study': mode,
          Specialization: record.department || record.department || 'N/A',
          writtenMarks,
          vivaMarks,
          totalMarks,
          // FIXED: Store the original type from database for display
          originalType: record.type,
          type: record.type,
          // Store the program field for Part Time type display
          department: record.department || 'N/A',
          // Also include the raw field names for compatibility
          registered_name: record.registered_name || 'N/A',
          application_no: record.application_no || 'N/A',
          written_marks: writtenMarks,
          interview_marks: vivaMarks,
          total_marks: totalMarks,
          status: isCompletelyAbsent ? 'Absent' : (parseFloat(totalMarks) >= 50 ? 'Qualified' : 'Not Qualified')
        };
        
        console.log('Transformed scholar object department field:', scholarObj.department);
        return scholarObj;
      })
      .sort((a, b) => {
        // Sort completely absent scholars to the bottom, then by total marks
        if (a.totalMarks === 'Absent' && b.totalMarks !== 'Absent') return 1;
        if (a.totalMarks !== 'Absent' && b.totalMarks === 'Absent') return -1;
        if (a.totalMarks === 'Absent' && b.totalMarks === 'Absent') return 0;
        return parseFloat(b.totalMarks) - parseFloat(a.totalMarks);
      })
      .map((scholar, index) => ({ ...scholar, rank: index + 1 }));
    
    console.log('Final transformed scholars:', transformed);
    return transformed;
  };

  // Department action logic
  function showRankListModal(deptName, scholarType) {
    console.log('=== SHOWING RANK LIST MODAL ===');
    console.log(`Department: ${deptName}, Scholar Type: ${scholarType}`);
    
    // DEBUG: Show all available departments from examination records
    if (examinationsData && examinationsData.length > 0) {
      const availableDepartments = [...new Set(examinationsData.map(record => {
        const dept = record.department;
        return dept;
      }).filter(Boolean))];
      
      console.log('=== AVAILABLE DEPARTMENTS IN EXAMINATION RECORDS ===');
      console.log('Available departments:', availableDepartments);
      console.log(`Searching for: "${deptName}"`);
      console.log('Exact matches:', availableDepartments.filter(dept => dept === deptName));
      console.log('Partial matches:', availableDepartments.filter(dept => 
        dept.toLowerCase().includes(deptName.toLowerCase()) || 
        deptName.toLowerCase().includes(dept.toLowerCase())
      ));
    }
    
    let rows = getScholarsForDepartment(deptName, scholarType);
    
    console.log('=== RAW SCHOLARS DATA FROM getScholarsForDepartment ===');
    console.log('Raw rows:', rows);
    if (rows.length > 0) {
      console.log('First scholar raw data:', rows[0]);
      console.log('Department field in first scholar:', rows[0].department);
      console.log('All fields in first scholar:', Object.keys(rows[0]));
    }

    // Transform the data to match the expected modal format
    const transformedRows = rows.map((scholar, index) => ({
      id: scholar.id,
      rank: index + 1,
      'Registered Name': scholar['Registered Name'] || scholar.registered_name || 'N/A',
      'Application Number': scholar['Application Number'] || scholar.application_no || 'N/A',
      'Mode of Study': scholar['Mode of Study'] || scholarType,
      // FIXED: Show the actual specific part-time type from the database
      partTimeDetails: scholar.originalType || scholar.type || scholarType,
      // Add the program field for Type column display
      department: scholar.department || 'N/A',
      writtenMarks: scholar.writtenMarks === 'Ab' ? 'Ab' : (typeof scholar.writtenMarks === 'number' ? scholar.writtenMarks : Math.round(scholar.written_marks || 0)),
      vivaMarks: scholar.vivaMarks === 'Ab' ? 'Ab' : (typeof scholar.vivaMarks === 'number' ? scholar.vivaMarks : Math.round(scholar.interview_marks || 0)),
      totalMarks: scholar.totalMarks === 'Absent' ? 'Absent' : (typeof scholar.totalMarks === 'number' ? scholar.totalMarks : Math.round(scholar.total_marks || 0)),
      status: scholar.status || (scholar.totalMarks === 'Absent' ? 'Absent' : ((parseFloat(scholar.totalMarks || scholar.total_marks || 0) >= 50) ? 'Qualified' : 'Not Qualified'))
    }));

    console.log('=== TRANSFORMED ROWS FOR MODAL ===');
    console.log('Transformed rows for modal:', transformedRows);
    console.log('Sample row data:', transformedRows[0]);
    if (transformedRows[0]) {
      console.log('partTimeDetails:', transformedRows[0].partTimeDetails);
      console.log('originalType:', transformedRows[0].originalType);
      console.log('type:', transformedRows[0].type);
      console.log('department in transformed row:', transformedRows[0].department);
    }
    console.log('Raw scholar data sample:', rows[0]);
    setModal({ deptName, scholarType, rows: transformedRows });
  }

  function closeModal() { setModal(null); }

  // Publish logic
  function togglePublishRankList(deptId, deptName) {
    if (publishedLists.includes(deptId)) return;

    setIsPublishConfirmed(false); // Reset confirmation state
    setConfirmModal({
      title: "Confirm Publish",
      deptName: deptName,
      message: `Are you sure you want to publish the rank list for ${deptName}? This action will update the department results.`,
      onConfirm: async () => {
        try {
          // Get department short form
          const deptShortForm = DEPARTMENT_MAPPING[deptName] || deptName;
          const publishValue = `Published_To_${deptShortForm}`;
          
          console.log(`Publishing ${deptName} results to department with value: ${publishValue}`);
          
          // Get all scholars for this department (both FT and PT)
          const ftScholars = getScholarsForDepartment(deptName, 'Full Time');
          const ptScholars = getScholarsForDepartment(deptName, 'Part Time');
          const allScholars = [...ftScholars, ...ptScholars];
          
          if (allScholars.length === 0) {
            setMessageBox({ show: true, title: 'Notification', message: 'No scholars found for this department to publish.', type: 'warning' });
            setConfirmModal(null);
            return;
          }
          
          // Update dept_result column for all scholars in this department
          const scholarIds = allScholars.map(scholar => scholar.id);
          
          const { data, error } = await supabase
            .from('examination_records')
            .update({ dept_result: publishValue })
            .in('id', scholarIds);
          
          if (error) {
            console.error('Error publishing results:', error);
            setMessageBox({ show: true, title: 'Notification', message: 'Error occurred while publishing results. Please try again.', type: 'error' });
          } else {
            console.log(`Successfully published ${allScholars.length} scholars to ${deptName}`);
            setPublishedLists(prev => [...prev, deptId]);
          }
        } catch (error) {
          console.error('Exception during publish:', error);
          setMessageBox({ show: true, title: 'Notification', message: 'Error occurred while publishing results. Please try again.', type: 'error' });
        }
        
        setConfirmModal(null);
        setIsPublishConfirmed(false); // Reset confirmation state
      }
    });
  }

  // Download logic for a specific rank list
  function downloadRankings(deptName, scholarType) {
    const getRankingData = (type) => {
      return getScholarsForDepartment(deptName, type)
        .map((scholar, index) => {
          let rowData = {
            'Rank': index + 1,
            'Name': scholar['Registered Name'] || scholar.registered_name || 'N/A',
            'Application Number': scholar['Application Number'] || scholar.application_no || 'N/A',
            'Type': scholar.type || scholar.program_type || type,
          };
          rowData = {
            ...rowData,
            'Written Marks': scholar.writtenMarks === 'Ab' ? 'Ab' : (typeof scholar.writtenMarks === 'number' ? scholar.writtenMarks : Math.round(scholar.written_marks || 0)),
            'Interview Marks': scholar.vivaMarks === 'Ab' ? 'Ab' : (typeof scholar.vivaMarks === 'number' ? scholar.vivaMarks : Math.round(scholar.interview_marks || 0)),
            'Total Marks': scholar.totalMarks === 'Absent' ? 'Absent' : (typeof scholar.totalMarks === 'number' ? scholar.totalMarks : Math.round(scholar.total_marks || 0)),
            'Status': scholar.status || (scholar.totalMarks === 'Absent' ? 'Absent' : ((parseFloat(scholar.totalMarks || scholar.total_marks || 0) >= 50) ? 'Qualified' : 'Not Qualified'))
          };
          return rowData;
        });
    };

    const data = getRankingData(scholarType);

    if (data.length === 0) {
      setMessageBox({ show: true, title: 'Notification', message: `No ${scholarType} ranking data available to download for this department.`, type: 'warning' });
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, `${scholarType} Rankings`);

    XLSX.writeFile(wb, `Rankings_${deptName.replace(/ /g, '_')}_${scholarType.replace(/ /g, '_')}.xlsx`);
  }

  // Filtering faculties and departments
  const filteredDepartments = faculty.departments.filter(dept => {
    if (filter.department && dept.name !== filter.department) return false;

    if (search && search.trim()) {
      const searchTerm = search.toLowerCase().trim();
      // Use examination records data instead of static data
      return examinationsData.some(record => {
        const recordDepartment = record.department;
        const departmentMatch = recordDepartment.toLowerCase().includes(dept.name.toLowerCase());
        const nameMatch = record.registered_name?.toLowerCase().includes(searchTerm);
        const appNoMatch = record.application_no?.toLowerCase().includes(searchTerm);
        
        // Check if result_dir contains "Published to" (improved matching)
        const isPublished = record.result_dir && 
                           (record.result_dir.includes('Published to Engineering') ||
                            record.result_dir.includes('Published to Management') ||
                            record.result_dir.includes('Published to Science') ||
                            record.result_dir.includes('Published to Medical') ||
                            record.result_dir.includes('Publish to Engineering') ||
                            record.result_dir.includes('Publish to Management') ||
                            record.result_dir.includes('Publish to Science') ||
                            record.result_dir.includes('Publish to Medical') ||
                            record.result_dir.toLowerCase().includes('publish'));
        
        // Check if total_marks has actual marks OR if scholar has any marks (including partial absence)
        const hasTotalMarks = (record.total_marks && 
                             record.total_marks !== null && 
                             record.total_marks !== '' && 
                             parseFloat(record.total_marks) > 0) ||
                             (record.total_marks === 'Absent') ||
                             (record.written_marks === 'Ab' || record.interview_marks === 'Ab') ||
                             (record.written_marks && parseFloat(record.written_marks) > 0) ||
                             (record.interview_marks && parseFloat(record.interview_marks) > 0);
        
        return departmentMatch && (nameMatch || appNoMatch) && isPublished && hasTotalMarks;
      });
    }
    return true;
  });;

  return (
    <div className="foet-result-container">
      {/* Header */}
      <div className="foet-result-header">
        <h3 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#111827', margin: 0 }}>Results</h3>
      </div>

      {/* Search and Filter */}
      <div className="foet-result-search-section">
        <div className="flex items-center gap-4">
          <div className="relative flex-grow max-w-lg">
            <input
              type="text"
              placeholder="Search by name or application number..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`px-4 py-2 w-full h-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${search && search.trim() ? 'border-blue-300 bg-blue-50' : 'border-gray-300'}`}
            />
            {search && (
              <button onClick={clearSearch} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700">
                <span className="font-bold text-xl">&times;</span>
              </button>
            )}
          </div>
          <button
            className="scholar-control-button"
            onClick={() => setShowFilterModal(true)}
            title="Filter"
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>
      </div>

      {/* Accordions by Faculty */}
      <div id="foetResultTablesContainer" className="foet-result-content">
        {filteredDepartments.length === 0 && hasActiveFilters && (
          <div className="foet-result-no-results">
            <div className="text-gray-500 text-lg mb-2">No results found</div>
            <div className="text-gray-400 text-sm mb-4">Try adjusting your search terms or filters</div>
            <button onClick={resetFilters} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Clear All Filters</button>
          </div>
        )}
        
        <div className={`foet-result-faculty-card ${facultyColors['FOET'] || 'border-l-[6px] border-l-gray-400'}`}>
          <div className="flex items-center px-6 py-4 select-none">
            <span className="font-bold text-lg flex-1">{faculty.name}</span>
            <span className="bg-gray-200 text-gray-700 px-3 py-1 rounded-full text-sm font-semibold mr-4">
              {getScholarCountForFaculty(faculty.departments)} Scholars
            </span>
          </div>
          <div className="px-8 pb-4">
            <div className="flex items-center justify-between border-b-2 border-gray-200 py-2 mb-2 text-sm font-semibold text-gray-500 uppercase">
              <div className="flex-1">Department</div>
              <div className="flex items-center text-center">
                <div className="w-32">FT Ranks</div>
                <div className="w-32">PT Ranks</div>
                <div className="w-32">PUBLISH</div>
              </div>
            </div>

            {filteredDepartments.map(dept => {
              return (
                <div key={dept.id} className="flex items-center justify-between border-b py-3">
                  <div className="flex flex-1 items-center gap-2">
                    <span className="font-medium text-gray-800">{dept.name}</span>
                  </div>
                  <div className="flex items-center">
                      <div className="w-32 text-center">
                        <button
                          title="View Full Time Ranks"
                          className="bg-blue-500 text-white hover:bg-blue-700 transition-colors px-2 py-1 rounded"
                          onClick={() => showRankListModal(dept.name, 'Full Time')}
                        >
                          <FaEye size={20} />
                        </button>
                      </div>
                      <div className="w-32 text-center">
                        <button
                          title="View Part Time Ranks"
                          className="bg-purple-500 text-white hover:bg-purple-700 transition-colors px-2 py-1 rounded"
                          onClick={() => showRankListModal(dept.name, 'Part Time')}
                        >
                          <FaEye size={20} />
                        </button>
                      </div>
                      <div className="w-32 text-center">
                        {publishedLists.includes(dept.id) || isDepartmentPublished(dept.name) ? (
                          <button
                            title="Published"
                            className="text-green-500"
                            disabled
                          >
                            <FaCheckCircle size={20} />
                          </button>
                        ) : (
                          <button
                            title="Publish Ranks"
                            className="bg-green-500 hover:bg-green-600 text-white transition-colors px-2 py-2 rounded"
                            onClick={() => togglePublishRankList(dept.id, dept.name)}
                          >
                            <FaPaperPlane size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
        </div>
      </div>

      {/* Rank List Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-6xl max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-4 border-b">
              <div>
                <h2 className="text-xl font-bold">{modal.deptName} - {modal.scholarType} Rank List</h2>
              </div>
              <button onClick={closeModal} className="text-gray-600 hover:text-red-400 text-2xl font-bold">&times;</button>
            </div>
            <div className="overflow-y-auto">
              <table className="min-w-full border-collapse">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-b border-gray-200 w-16">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">Name</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">App No</th>
                    {modal.scholarType === 'Part Time' && (
                      <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">Type</th>
                    )}
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">Written Marks</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">Interview Marks</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">Total Marks</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {modal.rows.length === 0 ? (
                    <tr>
                      <td colSpan={modal.scholarType === 'Part Time' ? "8" : "7"} className="text-center py-8 text-gray-500">
                        No scholars found.
                      </td>
                    </tr>
                  ) : (
                    modal.rows.map((row, i) => (
                      <tr key={row.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 text-center border-b border-gray-100">
                          <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full font-medium ${i < 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>
                            {i + 1}
                          </span>
                        </td>
                        <td className="px-4 py-4 border-b border-gray-100">
                          <div className="text-gray-800">{row['Registered Name'] || row.registered_name || 'N/A'}</div>
                        </td>
                        <td className="px-4 py-4 text-center border-b border-gray-100">
                          <div className="text-sm text-gray-600">{row['Application Number'] || row.application_no || 'N/A'}</div>
                        </td>
                        {modal.scholarType === 'Part Time' && (
                          <td className="px-4 py-4 text-center border-b border-gray-100">
                            <div className="text-gray-700">
                              {row.department || 'N/A'}
                            </div>
                          </td>
                        )}
                        <td className="px-4 py-4 text-center border-b border-gray-100">
                          <div className={`font-semibold ${
                            (row.writtenMarks || row.written_marks || 0) === 'Ab' ? 'text-red-600' :
                            (row.writtenMarks || row.written_marks || 0) >= 35 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {row.writtenMarks || row.written_marks || 0}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center border-b border-gray-100">
                          <div className={`font-semibold ${
                            (row.vivaMarks || row.interview_marks || 0) === 'Ab' ? 'text-red-600' :
                            (row.vivaMarks || row.interview_marks || 0) >= 15 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {row.vivaMarks || row.interview_marks || 0}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center border-b border-gray-100">
                          <div className={`font-semibold ${
                            (row.totalMarks || row.total_marks || 0) === 'Absent' ? 'text-red-600' :
                            (row.totalMarks || row.total_marks || 0) >= 50 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {row.totalMarks || row.total_marks || 0}
                          </div>
                        </td>
                        <td className="px-4 py-4 text-center border-b border-gray-100">
                          {(row.status === 'Qualified' || (row.totalMarks || row.total_marks || 0) >= 60) ? (
                            <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold">Qualified</span>
                          ) : (
                            <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold inline-block">Not Qualified</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex justify-between items-center pt-4 mt-4 border-t">
              <button
                onClick={() => downloadRankings(modal.deptName, modal.scholarType)}
                className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700 text-sm"
              >
                <FaDownload />
                Download Excel
              </button>
              <button onClick={closeModal} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal && (
        <div className="publish-confirmation-modal">
          <div className="publish-confirmation-content">
            {/* Header */}
            <div className="publish-confirmation-header">
              <button 
                onClick={() => setConfirmModal(null)}
                className="publish-confirmation-close"
              >
                ×
              </button>
              <h2 className="publish-confirmation-title">
                Confirm Publishing
              </h2>
            </div>

            {/* Content */}
            <div className="publish-confirmation-body">
              {/* Admin Info Section */}
              <div className="admin-info-section">
                <div className="admin-info-row">
                  <span className="admin-info-label">Admin Name:</span> {coordinatorInfo?.name || coordinatorName || 'Research Coordinator'}
                </div>
                <div className="admin-info-row">
                  <span className="admin-info-label">Role:</span> Research Coordinator, {assignedFaculty || 'Faculty'}
                </div>
                <div className="admin-info-row">
                  <span className="admin-info-label">Email:</span> <span className="admin-info-email">{coordinatorInfo?.email || 'coordinator@srm.edu.in'}</span>
                </div>
              </div>

              {/* Consent & Confirmation Section */}
              <div className="consent-section">
                <h3 className="consent-title">
                  Consent & Confirmation
                </h3>
                <ul className="consent-list">
                  <li className="consent-item">
                    <span className="consent-bullet">•</span>
                    I have thoroughly reviewed all submitted results data
                  </li>
                  <li className="consent-item">
                    <span className="consent-bullet">•</span>
                    I have verified the authenticity of examination records
                  </li>
                  <li className="consent-item">
                    <span className="consent-bullet">•</span>
                    This action will be recorded in the system
                  </li>
                </ul>

                <div className="consent-checkbox-container">
                  <input 
                    type="checkbox" 
                    id="confirmFOETCheckbox"
                    className="consent-checkbox"
                    checked={isPublishConfirmed}
                    onChange={(e) => setIsPublishConfirmed(e.target.checked)}
                  />
                  <label htmlFor="confirmFOETCheckbox" className="consent-checkbox-label">
                    I confirm I have read and agree to the above terms
                  </label>
                </div>
              </div>

              {/* Conclusion */}
              <div className="conclusion-section">
                <p className="conclusion-text">
                  You are about to <span className="conclusion-bold">PUBLISH</span> results for {confirmModal.deptName || 'Department'} to the department for further processing.
                </p>
              </div>

              {/* Action Buttons */}
              <div className="confirmation-actions">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="confirmation-cancel-btn"
                >
                  Cancel
                </button>
                <button 
                  className="confirmation-confirm-btn"
                  onClick={confirmModal.onConfirm}
                  disabled={!isPublishConfirmed}
                >
                  PUBLISH
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {createPortal(
        showFilterModal && (
          <div className="modal-overlay" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md foet-filter-modal" style={{ margin: 'auto', position: 'relative', zIndex: 10000 }}>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Filter Results</h2>
                <button onClick={() => setShowFilterModal(false)} className="text-gray-600 hover:text-red-400 text-2xl font-bold">&times;</button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Department</label>
                  <select value={filter.department} onChange={(e) => handleFilterChange('department', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">All Departments</option>
                    {faculty.departments.map(dept => <option key={dept.id} value={dept.name}>{dept.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Scholar Type</label>
                  <select value={filter.type} onChange={(e) => handleFilterChange('type', e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">All Types</option>
                    <option value="Full Time">Full Time</option>
                    <option value="Part Time">Part Time</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-6">
                <button onClick={resetFilters} className="px-4 py-2 text-gray-600 border border-gray-300 rounded hover:bg-gray-50 transition-colors">Reset All</button>
                <button onClick={() => setShowFilterModal(false)} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">Apply Filters</button>
              </div>
            </div>
          </div>
        ),
        document.body
      )}

      {/* Message Box - Rendered as Portal to appear on top */}
      {createPortal(
        <MessageBox 
          show={messageBox.show}
          title={messageBox.title}
          message={messageBox.message}
          type={messageBox.type}
          onClose={() => setMessageBox({ show: false, title: '', message: '', type: 'info' })}
        />,
        document.body
      )}
    </div>
  );
}
