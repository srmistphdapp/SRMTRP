import React, { useState, useEffect } from 'react';
import { FaChevronRight, FaSearch, FaFilter, FaDownload, FaEye } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { 
  fetchExaminationResultsRecords 
} from '../../../../services/examinationService';
import { publishFacultyResults } from '../../../../services/examinationService';
import { supabase } from '../../../../supabaseClient';
import { toast } from 'react-toastify';

// Faculty color map
const facultyColors = {
  'Faculty of Engineering & Technology': 'border-l-[6px] border-l-[#4f8cff]',
  'Faculty of Science & Humanities': 'border-l-[6px] border-l-[#64c864]',
  'Faculty of Medical & Health Science': 'border-l-[6px] border-l-[#e57373]',
  'Faculty of Management': 'border-l-[6px] border-l-[#ffb74d]',
};

// Helper function to extract department from program field
// Example: "Ph.d. - Mechanical Engineering (ph.d. - Ft - E And T)" => "Mechanical Engineering"
const extractDepartmentFromProgram = (program) => {
  if (!program) return null;
  
  // Match pattern: "Ph.d. - DEPARTMENT_NAME (..."
  // or "M.Tech - DEPARTMENT_NAME (..."
  // or any degree - DEPARTMENT_NAME (...)
  const match = program.match(/^[^-]+-\s*([^(]+)\s*\(/);
  
  if (match && match[1]) {
    return match[1].trim();
  }
  
  // Fallback: if no match, return null
  return null;
};

export default function Result({ onModalStateChange }) {
  const [faculties, setFaculties] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [examRecords, setExamRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState({ faculty: '', department: '', type: '' });
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [availableDepartments, setAvailableDepartments] = useState([]);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [facultyToPublish, setFacultyToPublish] = useState(null);
  const [publishedFaculties, setPublishedFaculties] = useState(new Set());

  // Load faculties, departments, and examination records on component mount
  useEffect(() => {
    loadFacultiesAndDepartments();
    loadExaminationRecords();
  }, []);

  // Check published status whenever examRecords or faculties change
  useEffect(() => {
    if (examRecords.length > 0 && faculties.length > 0) {
      checkPublishedFaculties();
    }
  }, [examRecords, faculties, departments]);

  // Track modal states and notify parent
  useEffect(() => {
    const hasModal = modal !== null || showFilterModal || showPublishModal;
    if (onModalStateChange) {
      onModalStateChange(hasModal);
    }
  }, [modal, showFilterModal, showPublishModal, onModalStateChange]);

  const loadFacultiesAndDepartments = async () => {
    try {
      // Fetch departments (which contain faculty information)
      const { data: departmentsData, error: departmentsError } = await supabase
        .from('departments')
        .select('*')
        .order('faculty', { ascending: true })
        .order('department_name', { ascending: true });

      if (departmentsError) {
        console.error('Error fetching departments:', departmentsError);
        toast.error('Failed to load departments');
        return;
      }

      // Group departments by faculty
      const grouped = {};
      (departmentsData || []).forEach(dept => {
        if (!grouped[dept.faculty]) {
          grouped[dept.faculty] = {
            id: Object.keys(grouped).length + 1,
            name: dept.faculty,
            departments: []
          };
        }
        grouped[dept.faculty].departments.push({
          id: dept.id,
          name: dept.department_name,
          faculty: dept.faculty
        });
      });

      const facultiesArray = Object.values(grouped);
      setFaculties(facultiesArray);
      setDepartments(departmentsData || []);
      
      console.log('🏫 Faculties loaded:', facultiesArray.length);
      console.log('🏢 Departments loaded:', departmentsData?.length || 0);
      console.log('📝 Department names:', departmentsData?.map(d => d.department_name).join(', '));
    } catch (err) {
      console.error('Exception loading faculties and departments:', err);
      toast.error('Failed to load faculties and departments');
    }
  };

  // Map department names to match database department names
  const mapDepartmentName = (deptName, facultyName) => {
    // Special mapping for Science & Humanities faculty
    if (facultyName === 'Faculty of Science & Humanities' || facultyName?.includes('Science')) {
      if (deptName === 'English' || deptName?.toLowerCase() === 'english') {
        return 'English & Foreign Languages';
      }
    }
    // Add more mappings here if needed
    return deptName;
  };

  const loadExaminationRecords = async () => {
    setLoading(true);
    
    try {
      // Fetch ALL examination records first to see what we have
      const { data, error } = await supabase
        .from('examination_records')
        .select('*');

      if (error) {
        console.error('❌ Error fetching examination results:', error);
        toast.error('Failed to load examination results');
        setExamRecords([]);
      } else {
        console.log('📊 TOTAL RECORDS FETCHED:', data?.length || 0);
        
        if (data && data.length > 0) {
          // Log first record to see structure
          console.log('📋 FIRST RECORD STRUCTURE:', data[0]);
          console.log('📋 FIRST RECORD KEYS:', Object.keys(data[0]));
        }

        // Filter records where:
        // 1. Written marks are entered AND forwarded to director
        // 2. Interview marks are entered
        // 3. Total marks are calculated
        const recordsWithMarks = (data || []).filter(record => {
          // Check if forwarded to director
          const isForwardedToDirector = record.director_interview === 'Forwarded to Director' || 
                                        record.status?.toLowerCase().includes('forwarded');
          
          // Must be forwarded to director
          if (!isForwardedToDirector) {
            console.log(`❌ NOT FORWARDED ${record.application_no}:`, {
              director_interview: record.director_interview,
              status: record.status
            });
            return false;
          }
          
          // Check if marks are absent
          const isWrittenAbsent = record.written_marks === 'Ab' || record.written_marks === 'AB' || record.written_marks === 'ab';
          const isInterviewAbsent = record.interview_marks === 'Ab' || record.interview_marks === 'AB' || record.interview_marks === 'ab';
          const isTotalAbsent = record.total_marks === 'Absent' || record.total_marks === 'ABSENT' || record.total_marks === 'absent';
          
          // Check if marks are numeric
          const hasWrittenNumeric = record.written_marks != null && record.written_marks !== '' && !isNaN(parseFloat(record.written_marks)) && parseFloat(record.written_marks) >= 0;
          const hasInterviewNumeric = record.interview_marks != null && record.interview_marks !== '' && !isNaN(parseFloat(record.interview_marks)) && parseFloat(record.interview_marks) >= 0;
          const hasTotalNumeric = record.total_marks != null && record.total_marks !== '' && !isNaN(parseFloat(record.total_marks)) && parseFloat(record.total_marks) >= 0;
          
          // Include if both written and interview are absent
          if (isWrittenAbsent && isInterviewAbsent) {
            console.log(`✅ BOTH ABSENT Record ${record.application_no}:`, {
              written_marks: record.written_marks,
              interview_marks: record.interview_marks,
              total_marks: record.total_marks
            });
            return true;
          }
          
          // Include if written is AB but interview is numeric
          if (isWrittenAbsent && hasInterviewNumeric) {
            console.log(`✅ WRITTEN AB, INTERVIEW NUMERIC ${record.application_no}:`, {
              written_marks: record.written_marks,
              interview_marks: record.interview_marks,
              total_marks: record.total_marks
            });
            return true;
          }
          
          // Include if interview is AB but written is numeric
          if (hasWrittenNumeric && isInterviewAbsent) {
            console.log(`✅ WRITTEN NUMERIC, INTERVIEW AB ${record.application_no}:`, {
              written_marks: record.written_marks,
              interview_marks: record.interview_marks,
              total_marks: record.total_marks
            });
            return true;
          }
          
          // Include if all marks are numeric and filled
          const isWrittenForwarded = record.faculty_written && record.faculty_written.includes('Forwarded to');
          const isInterviewForwarded = record.director_interview === 'Forwarded to Director';
          
          if (hasWrittenNumeric && hasInterviewNumeric && hasTotalNumeric && isWrittenForwarded && isInterviewForwarded) {
            console.log(`✅ ALL NUMERIC Record ${record.application_no}:`, {
              written_marks: record.written_marks,
              interview_marks: record.interview_marks,
              total_marks: record.total_marks
            });
            return true;
          }
          
          console.log(`❌ INCOMPLETE ${record.application_no}:`, {
            written_marks: record.written_marks,
            interview_marks: record.interview_marks,
            total_marks: record.total_marks,
            hasWrittenNumeric,
            hasInterviewNumeric,
            hasTotalNumeric
          });
          return false;
        });

        // Extract department from program field if department is null
        const recordsWithDepartment = recordsWithMarks.map(record => ({
          ...record,
          department: mapDepartmentName(
            record.department || extractDepartmentFromProgram(record.program),
            record.faculty
          )
        }));

        // Sort by total_marks (highest first, absent records at the end)
        const recordsWithCalculations = recordsWithDepartment.sort((a, b) => {
          const isAAbsent = a.total_marks === 'Absent' || a.total_marks === 'ABSENT' || a.total_marks === 'absent';
          const isBAbsent = b.total_marks === 'Absent' || b.total_marks === 'ABSENT' || b.total_marks === 'absent';
          
          // Put absent records at the end
          if (isAAbsent && !isBAbsent) return 1;
          if (!isAAbsent && isBAbsent) return -1;
          if (isAAbsent && isBAbsent) return 0;
          
          // Sort numeric values highest first
          return parseFloat(b.total_marks) - parseFloat(a.total_marks);
        });
        
        console.log('✅ RECORDS WITH COMPLETE MARKS:', recordsWithCalculations.length);
        if (recordsWithCalculations.length > 0) {
          console.log('📋 SAMPLE RECORD:', {
            name: recordsWithCalculations[0].registered_name,
            department: recordsWithCalculations[0].department,
            written_marks: recordsWithCalculations[0].written_marks,
            interview_marks: recordsWithCalculations[0].interview_marks,
            total_marks: recordsWithCalculations[0].total_marks
          });
          console.log('📋 ALL DEPARTMENTS:', [...new Set(recordsWithCalculations.map(r => r.department))]);
        }
        setExamRecords(recordsWithCalculations);
      }
    } catch (err) {
      console.error('💥 Exception loading examination records:', err);
      toast.error('Failed to load examination records');
      setExamRecords([]);
    }
    
    setLoading(false);
  };

  // Update available departments when faculty filter changes
  useEffect(() => {
    if (filter.faculty) {
      const facultyDepartments = departments.filter(d => d.faculty === filter.faculty);
      setAvailableDepartments(facultyDepartments);
      setFilter(prev => ({ ...prev, department: '' }));
    } else {
      setAvailableDepartments([]);
    }
  }, [filter.faculty, departments]);

  // Accordion toggle for faculties
  const toggleFacultyAccordion = id => setExpanded(e => ({ ...e, [`faculty-${id}`]: !e[`faculty-${id}`] }));
  
  // Accordion toggle for departments
  const toggleDepartmentAccordion = (facultyId, deptId) => {
    const key = `dept-${facultyId}-${deptId}`;
    setExpanded(e => ({ ...e, [key]: !e[key] }));
  };

  // Helper function to normalize names for comparison
  const normalizeName = (name) => {
    if (!name) return '';
    return name.toLowerCase()
      .replace(/&/g, 'and')
      .replace(/\s+/g, ' ')
      .trim();
  };

  // Get scholar count for a faculty - match by faculty field directly
  const getScholarCountForFaculty = (facultyName) => {
    const normalizedFaculty = normalizeName(facultyName);
    return examRecords.filter(record => {
      const recordFaculty = normalizeName(record.faculty || '');
      return recordFaculty === normalizedFaculty || 
             recordFaculty.includes(normalizedFaculty) || 
             normalizedFaculty.includes(recordFaculty);
    }).length;
  };

  // Get scholar count for a department and type (considering faculty context)
  const getScholarCountForDepartment = (facultyName, deptName, type) => {
    const normalizedFaculty = normalizeName(facultyName);
    const normalizedDept = normalizeName(deptName);
    return examRecords.filter(record => {
      const recordFaculty = normalizeName(record.faculty || '');
      const recordDept = normalizeName(record.department || '');
      const facultyMatch = recordFaculty === normalizedFaculty || 
                          recordFaculty.includes(normalizedFaculty) || 
                          normalizedFaculty.includes(recordFaculty);
      const deptMatch = recordDept === normalizedDept || 
                       recordDept.includes(normalizedDept) || 
                       normalizedDept.includes(recordDept);
      return facultyMatch && deptMatch && (record.program_type || record.type) === type;
    }).length;
  };

  // Handle filter changes
  const handleFilterChange = (key, value) => {
    if (key === 'faculty' && value === '') {
      setFilter(prev => ({ ...prev, faculty: '', department: '' }));
      setAvailableDepartments([]);
    } else {
      setFilter(prev => ({ ...prev, [key]: value }));
    }
  };

  // Clear search
  const clearSearch = () => setSearch('');

  // Reset all filters
  const resetFilters = () => {
    setFilter({ faculty: '', department: '', type: '' });
    setSearch('');
    setAvailableDepartments([]);
    setShowFilterModal(false);
  };

  // Check if any filters are active
  const hasActiveFilters = (search && search.trim()) || filter.faculty || filter.department || filter.type;

  // Filter examination records
  const filteredRecords = examRecords.filter(record => {
    // Faculty filter - match by the faculty field directly
    if (filter.faculty) {
      const normalizedFilter = normalizeName(filter.faculty);
      const recordFaculty = normalizeName(record.faculty || '');
      const facultyMatch = recordFaculty === normalizedFilter || 
                          recordFaculty.includes(normalizedFilter) || 
                          normalizedFilter.includes(recordFaculty);
      if (!facultyMatch) return false;
    }
    
    // Department filter - flexible match
    if (filter.department) {
      const normalizedFilter = normalizeName(filter.department);
      const recordDept = normalizeName(record.department || '');
      const deptMatch = recordDept === normalizedFilter || 
                       recordDept.includes(normalizedFilter) || 
                       normalizedFilter.includes(recordDept);
      if (!deptMatch) return false;
    }
    
    // Type filter
    if (filter.type && (record.program_type || record.type) !== filter.type) return false;
    
    // Search filter - includes name, application number, department, and faculty
    if (search && search.trim()) {
      const searchTerm = search.toLowerCase().trim();
      const name = (record.registered_name || record.name || '').toLowerCase();
      const appNo = (record.application_no || '').toLowerCase();
      const department = (record.department || '').toLowerCase();
      const faculty = (record.faculty || '').toLowerCase();
      
      return name.includes(searchTerm) || 
             appNo.includes(searchTerm) || 
             department.includes(searchTerm) || 
             faculty.includes(searchTerm);
    }
    
    return true;
  });

  console.log('🔍 Filtered records:', filteredRecords.length);

  // Group records by faculty → department
  // Step 1: Match scholars to faculties using the faculty field FIRST
  // Step 2: Then group matched scholars into departments
  const groupedByFaculty = faculties.map(faculty => {
    const facultyDepartments = departments.filter(d => d.faculty === faculty.name);
    const deptNames = facultyDepartments.map(d => d.department_name);
    
    const normalizedFacultyName = normalizeName(faculty.name);
    const normalizedDeptNames = deptNames.map(d => normalizeName(d));
    
    // STEP 1: First match by FACULTY field directly
    const facultyRecords = filteredRecords.filter(r => {
      const recordFaculty = normalizeName(r.faculty || r.institution || '');
      return recordFaculty === normalizedFacultyName || 
             recordFaculty.includes(normalizedFacultyName) || 
             normalizedFacultyName.includes(recordFaculty);
    });
    
    console.log(`🏫 Faculty: ${faculty.name} → ${facultyRecords.length} scholars matched by faculty field`);
    if (facultyRecords.length > 0) {
      console.log(`   📝 Scholar departments:`, [...new Set(facultyRecords.map(r => r.department))]);
    }
    
    // STEP 2: Group matched scholars by department
    const departmentGroups = facultyDepartments.map(dept => {
      const normalizedConfiguredDept = normalizeName(dept.department_name);
      const deptRecords = facultyRecords.filter(r => {
        const recordDept = normalizeName(r.department || '');
        return recordDept === normalizedConfiguredDept || 
               recordDept.includes(normalizedConfiguredDept) || 
               normalizedConfiguredDept.includes(recordDept);
      });
      
      if (deptRecords.length === 0) return null;
      
      // Group by type
      const fullTime = deptRecords.filter(r => (r.program_type || r.type) === 'Full Time');
      const partTimeInternal = deptRecords.filter(r => (r.program_type || r.type) === 'Part Time Internal');
      const partTimeExternal = deptRecords.filter(r => (r.program_type || r.type) === 'Part Time External');
      const partTimeIndustry = deptRecords.filter(r => (r.program_type || r.type) === 'Part Time External (Industry)');
      
      return {
        id: dept.id,
        name: dept.department_name,
        faculty: dept.faculty,
        fullTime,
        partTimeInternal,
        partTimeExternal,
        partTimeIndustry,
        hasRecords: true
      };
    }).filter(dept => dept !== null);
    
    // STEP 3: Check for scholars that matched faculty but NOT any department
    // These are scholars whose department field doesn't match any configured department
    const matchedInDepts = departmentGroups.reduce((acc, dg) => {
      return acc + dg.fullTime.length + dg.partTimeInternal.length + dg.partTimeExternal.length + dg.partTimeIndustry.length;
    }, 0);
    
    const unmatchedScholars = facultyRecords.length - matchedInDepts;
    if (unmatchedScholars > 0) {
      console.log(`   ⚠️ ${unmatchedScholars} scholars matched faculty but NOT any configured department`);
      const unmatchedRecords = facultyRecords.filter(r => {
        const recordDept = normalizeName(r.department || '');
        return !normalizedDeptNames.some(configuredDept => 
          recordDept === configuredDept || 
          recordDept.includes(configuredDept) || 
          configuredDept.includes(recordDept)
        );
      });
      console.log(`   📝 Their departments:`, [...new Set(unmatchedRecords.map(r => r.department))]);
      
      // Add unmatched scholars as "Other / Unassigned" department
      if (unmatchedRecords.length > 0) {
        const fullTime = unmatchedRecords.filter(r => (r.program_type || r.type) === 'Full Time');
        const partTimeInternal = unmatchedRecords.filter(r => (r.program_type || r.type) === 'Part Time Internal');
        const partTimeExternal = unmatchedRecords.filter(r => (r.program_type || r.type) === 'Part Time External');
        const partTimeIndustry = unmatchedRecords.filter(r => (r.program_type || r.type) === 'Part Time External (Industry)');
        
        departmentGroups.push({
          id: `unassigned-${faculty.id}`,
          name: unmatchedRecords[0]?.department || 'Other / Unassigned',
          faculty: faculty.name,
          fullTime,
          partTimeInternal,
          partTimeExternal,
          partTimeIndustry,
          hasRecords: true
        });
      }
    }
    
    return {
      ...faculty,
      departments: departmentGroups,
      hasRecords: departmentGroups.length > 0
    };
  }).filter(faculty => faculty.hasRecords);

  // Show rank list modal
  function showRankListModal(facultyName, deptName, scholarType) {
    const normalizedFaculty = normalizeName(facultyName || '');
    const normalizedDeptName = normalizeName(deptName);
    
    const rows = examRecords
      .filter(r => {
        // Match by faculty first
        const recordFaculty = normalizeName(r.faculty || r.institution || '');
        const facultyMatch = recordFaculty === normalizedFaculty || 
                            recordFaculty.includes(normalizedFaculty) || 
                            normalizedFaculty.includes(recordFaculty);
        
        // Then match by department
        const recordDept = normalizeName(r.department || '');
        const deptMatch = recordDept === normalizedDeptName || 
                         recordDept.includes(normalizedDeptName) || 
                         normalizedDeptName.includes(recordDept);
        
        const typeMatch = (r.program_type || r.type) === scholarType;
        
        return facultyMatch && deptMatch && typeMatch;
      })
      .map((r, index) => {
        const isWrittenAbsent = r.written_marks === 'Ab' || r.written_marks === 'AB' || r.written_marks === 'ab';
        const isInterviewAbsent = r.interview_marks === 'Ab' || r.interview_marks === 'AB' || r.interview_marks === 'ab';
        const isTotalAbsent = r.total_marks === 'Absent' || r.total_marks === 'ABSENT' || r.total_marks === 'absent';
        const isAbsent = isTotalAbsent || (isWrittenAbsent && isInterviewAbsent);
        
        return {
          rank: index + 1,
          name: r.registered_name || r.name,
          applicationNo: r.application_no,
          type: r.program_type || r.type,
          community: r.community || 'N/A',
          written: r.written_marks,
          viva: r.interview_marks,
          total: isAbsent ? 'Absent' : r.total_marks,
          qualified: isAbsent ? false : (parseFloat(r.total_marks) >= 60)
        };
      });
    
    setModal({ facultyName, deptName, scholarType, rows });
  }

  function closeModal() {
    setModal(null);
  }

  // Handle publish faculty results
  const handlePublishFaculty = (facultyName) => {
    setFacultyToPublish(facultyName);
    setShowPublishModal(true);
  };

  const confirmPublishFaculty = async () => {
    try {
      // Get all scholar IDs for the faculty being published from currently loaded records
      const normalizedTarget = normalizeName(facultyToPublish);
      const scholarIdsToPublish = examRecords
        .filter(record => {
          const recordFaculty = normalizeName(record.faculty || '');
          return recordFaculty === normalizedTarget || 
                 recordFaculty.includes(normalizedTarget) || 
                 normalizedTarget.includes(recordFaculty);
        })
        .map(record => record.id);
      
      console.log(`📋 Publishing ${scholarIdsToPublish.length} scholars for ${facultyToPublish}`);
      
      if (scholarIdsToPublish.length === 0) {
        toast.error('No scholars found to publish for this faculty');
        setShowPublishModal(false);
        setFacultyToPublish(null);
        return;
      }
      
      const { data, error } = await publishFacultyResults(facultyToPublish, scholarIdsToPublish);
      
      if (error) {
        toast.error(`Failed to publish results: ${error.message}`);
        console.error('Publish error:', error);
      } else {
        toast.success(`Results for ${facultyToPublish} have been published! (${data?.length || 0} records updated)`);
        // Reload examination records - checkPublishedFaculties will be called automatically by useEffect
        await loadExaminationRecords();
      }
    } catch (err) {
      toast.error('An error occurred while publishing results');
      console.error('Publish exception:', err);
    }
    
    setShowPublishModal(false);
    setFacultyToPublish(null);
  };

  const cancelPublish = () => {
    setShowPublishModal(false);
    setFacultyToPublish(null);
  };

  // Check which faculties have all AVAILABLE scholars published
  // Only disable publish button if ALL scholars currently visible in Result module are published
  const checkPublishedFaculties = async () => {
    try {
      const fullyPublished = new Set();
      
      faculties.forEach(faculty => {
        const normalizedFacultyName = normalizeName(faculty.name);
        
        // Match by faculty field directly (same logic as display grouping)
        const facultyScholars = examRecords.filter(r => {
          const recordFaculty = normalizeName(r.faculty || r.institution || '');
          return recordFaculty === normalizedFacultyName || 
                 recordFaculty.includes(normalizedFacultyName) || 
                 normalizedFacultyName.includes(recordFaculty);
        });
        
        if (facultyScholars.length === 0) return;
        
        // Count how many are published
        const publishedCount = facultyScholars.filter(s => 
          s.result_dir && s.result_dir.includes('Published')
        ).length;
        
        console.log(`📊 ${faculty.name}: ${publishedCount}/${facultyScholars.length} available scholars published`);
        
        if (publishedCount === facultyScholars.length) {
          fullyPublished.add(faculty.name);
        }
      });

      setPublishedFaculties(fullyPublished);
      console.log('📢 Faculties with all available scholars published:', Array.from(fullyPublished));
    } catch (err) {
      console.error('Exception checking published faculties:', err);
    }
  };

  // Download rankings
  function downloadRankings(facultyName, deptName, scholarType) {
    const normalizedFaculty = normalizeName(facultyName || '');
    const normalizedDeptName = normalizeName(deptName);
    
    const data = examRecords
      .filter(r => {
        // Match by faculty first
        const recordFaculty = normalizeName(r.faculty || r.institution || '');
        const facultyMatch = recordFaculty === normalizedFaculty || 
                            recordFaculty.includes(normalizedFaculty) || 
                            normalizedFaculty.includes(recordFaculty);
        
        // Then match by department
        const recordDept = normalizeName(r.department || '');
        const deptMatch = recordDept === normalizedDeptName || 
                         recordDept.includes(normalizedDeptName) || 
                         normalizedDeptName.includes(recordDept);
        
        const typeMatch = (r.program_type || r.type) === scholarType;
        
        return facultyMatch && deptMatch && typeMatch;
      })
      .map((r, index) => ({
        'Rank': index + 1,
        'Name': r.registered_name || r.name,
        'Application Number': r.application_no,
        'Type': r.program_type || r.type,
        'Community': r.community || 'N/A',
        'Written Marks': r.written_marks,
        'Viva Marks': r.interview_marks,
        'Total Marks': r.total_marks,
        'Status': r.total_marks === 'Absent' || r.total_marks === 'ABSENT' || r.total_marks === 'absent' 
          ? 'Absent' 
          : (parseFloat(r.total_marks) >= 60 ? 'Qualified' : 'Not Qualified')
      }));

    if (data.length === 0) {
      toast.warning(`No ${scholarType} ranking data available for ${deptName}`);
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, `${scholarType} Rankings`);
    XLSX.writeFile(wb, `Rankings_${deptName.replace(/ /g, '_')}_${scholarType.replace(/ /g, '_')}.xlsx`);
    toast.success('Rankings downloaded successfully!');
  }

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="text-gray-500">Loading examination results...</div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h3 style={{ fontSize: '1.875rem', fontWeight: '700', color: '#111827', margin: 0 }}>Results</h3>
      </div>

      {/* Search and Filter */}
      <div className="mb-6">
        <div className="flex items-center gap-4">
          <div className="relative flex-grow max-w-lg pt-4">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3">
              <FaSearch className={`${search && search.trim() ? 'text-blue-500' : 'text-gray-400'}`} />
            </span>
            <input
              type="text"
              placeholder="Search by name, application number, department, or faculty..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={`pl-10 pr-10 py-2 w-full h-10 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${search && search.trim() ? 'border-blue-300 bg-blue-50' : 'border-gray-300'}`}
            />
            {search && (
              <button onClick={clearSearch} className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700">
                <span className="font-bold text-xl">&times;</span>
              </button>
            )}
          </div>
          <button
            className={`flex items-center gap-2 px-4 h-10 border rounded-md text-sm transition-colors ${hasActiveFilters ? 'bg-blue-100 border-blue-300 text-blue-700 hover:bg-blue-200' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}`}
            onClick={() => setShowFilterModal(true)}
          >
            <FaFilter /> <span>Filter</span>
            {hasActiveFilters && (
              <span className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs">
                {[search && search.trim(), filter.faculty, filter.department, filter.type].filter(Boolean).length}
              </span>
            )}
          </button>
        </div>

        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 items-center mt-4">
            {search && search.trim() && (
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                Search: "{search}" <button onClick={clearSearch} className="text-yellow-600 hover:text-yellow-800">×</button>
              </span>
            )}
            {filter.faculty && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                Faculty: {filter.faculty} <button onClick={() => handleFilterChange('faculty', '')} className="text-blue-600 hover:text-blue-800">×</button>
              </span>
            )}
            {filter.department && (
              <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                Department: {filter.department} <button onClick={() => handleFilterChange('department', '')} className="text-green-600 hover:text-green-800">×</button>
              </span>
            )}
            {filter.type && (
              <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1">
                Type: {filter.type} <button onClick={() => handleFilterChange('type', '')} className="text-purple-600 hover:text-purple-800">×</button>
              </span>
            )}
            <button onClick={resetFilters} className="text-red-600 hover:text-red-800 text-xs font-medium">Clear all</button>
          </div>
        )}
      </div>

      {/* Results List */}
      {groupedByFaculty.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-500 text-lg">No examination results found</p>
          <p className="text-gray-400 text-sm mt-2">Scholars with complete marks will appear here</p>
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByFaculty.map(faculty => (
            <div key={faculty.id} className={`bg-white rounded-lg shadow-sm ${facultyColors[faculty.name] || ''}`}>
              <div
                className="flex justify-between items-center p-4 cursor-pointer hover:bg-gray-50"
              >
                <div 
                  className="flex items-center gap-3 flex-1"
                  onClick={() => toggleFacultyAccordion(faculty.id)}
                >
                  <FaChevronRight className={`transition-transform ${expanded[`faculty-${faculty.id}`] ? 'rotate-90' : ''}`} />
                  <h4 className="font-semibold text-lg">{faculty.name}</h4>
                  <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">
                    {getScholarCountForFaculty(faculty.name)} Scholars
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePublishFaculty(faculty.name);
                  }}
                  disabled={publishedFaculties.has(faculty.name)}
                  className={`px-4 py-2 rounded-md transition-colors flex items-center gap-2 text-sm font-medium ${
                    publishedFaculties.has(faculty.name)
                      ? 'bg-gray-400 text-gray-600 cursor-not-allowed'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                  title={publishedFaculties.has(faculty.name) ? 'Results already published for this faculty' : 'Publish results for this faculty'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3.478 2.405a.75.75 0 00-.926.94l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.405z" />
                  </svg>
                  {publishedFaculties.has(faculty.name) ? 'Published' : 'Publish'}
                </button>
              </div>

              {expanded[`faculty-${faculty.id}`] && (
                <div className="px-4 pb-4">
                  {faculty.departments.map(dept => (
                    <div key={dept.id} className="ml-8 mb-4 border-l-2 border-gray-200 pl-4">
                      {/* Department Header - Clickable */}
                      <div
                        className="flex items-center gap-2 cursor-pointer hover:bg-gray-50 p-2 rounded"
                        onClick={() => toggleDepartmentAccordion(faculty.id, dept.id)}
                      >
                        <FaChevronRight className={`transition-transform text-sm ${expanded[`dept-${faculty.id}-${dept.id}`] ? 'rotate-90' : ''}`} />
                        <h5 className="font-medium text-gray-800">{dept.name}</h5>
                        <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs">
                          {dept.fullTime.length + (dept.partTimeInternal?.length || 0) + (dept.partTimeExternal?.length || 0) + (dept.partTimeIndustry?.length || 0)} scholars
                        </span>
                      </div>

                      {/* Program Types - Show when department is expanded */}
                      {expanded[`dept-${faculty.id}-${dept.id}`] && (
                        <div className="ml-6 mt-2 space-y-2">
                          {dept.fullTime.length > 0 && (
                            <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                              <div>
                                <span className="font-medium">Full Time</span>
                                <span className="ml-2 text-gray-600">({dept.fullTime.length} scholars)</span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => showRankListModal(dept.faculty, dept.name, 'Full Time')}
                                  className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                                >
                                  <FaEye /> View
                                </button>
                                <button
                                  onClick={() => downloadRankings(dept.faculty, dept.name, 'Full Time')}
                                  className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                                >
                                  <FaDownload /> Download
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {/* Part Time Internal */}
                          {dept.partTimeInternal && dept.partTimeInternal.length > 0 && (
                            <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                              <div>
                                <span className="font-medium">Part Time Internal</span>
                                <span className="ml-2 text-gray-600">({dept.partTimeInternal.length} scholars)</span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => showRankListModal(dept.faculty, dept.name, 'Part Time Internal')}
                                  className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                                >
                                  <FaEye /> View
                                </button>
                                <button
                                  onClick={() => downloadRankings(dept.faculty, dept.name, 'Part Time Internal')}
                                  className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                                >
                                  <FaDownload /> Download
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {/* Part Time External */}
                          {dept.partTimeExternal && dept.partTimeExternal.length > 0 && (
                            <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                              <div>
                                <span className="font-medium">Part Time External</span>
                                <span className="ml-2 text-gray-600">({dept.partTimeExternal.length} scholars)</span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => showRankListModal(dept.faculty, dept.name, 'Part Time External')}
                                  className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                                >
                                  <FaEye /> View
                                </button>
                                <button
                                  onClick={() => downloadRankings(dept.faculty, dept.name, 'Part Time External')}
                                  className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                                >
                                  <FaDownload /> Download
                                </button>
                              </div>
                            </div>
                          )}
                          
                          {/* Part Time External (Industry) */}
                          {dept.partTimeIndustry && dept.partTimeIndustry.length > 0 && (
                            <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
                              <div>
                                <span className="font-medium">Part Time External (Industry)</span>
                                <span className="ml-2 text-gray-600">({dept.partTimeIndustry.length} scholars)</span>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => showRankListModal(dept.faculty, dept.name, 'Part Time External (Industry)')}
                                  className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600 text-sm"
                                >
                                  <FaEye /> View
                                </button>
                                <button
                                  onClick={() => downloadRankings(dept.faculty, dept.name, 'Part Time External (Industry)')}
                                  className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600 text-sm"
                                >
                                  <FaDownload /> Download
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              Filter Results
              <button onClick={() => setShowFilterModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Faculty</label>
                <select
                  value={filter.faculty}
                  onChange={e => handleFilterChange('faculty', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">All Faculties</option>
                  {faculties.map(f => (
                    <option key={f.id} value={f.name}>{f.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                <select
                  value={filter.department}
                  onChange={e => handleFilterChange('department', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                  disabled={!filter.faculty}
                >
                  <option value="">All Departments</option>
                  {availableDepartments.map(d => (
                    <option key={d.id} value={d.department_name}>{d.department_name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filter.type}
                  onChange={e => handleFilterChange('type', e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2"
                >
                  <option value="">All Types</option>
                  <option value="Full Time">Full Time</option>
                  <option value="Part Time Internal">Part Time Internal</option>
                  <option value="Part Time External">Part Time External</option>
                  <option value="Part Time External (Industry)">Part Time External (Industry)</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-6">
              <button
                onClick={resetFilters}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Reset
              </button>
              <button
                onClick={() => setShowFilterModal(false)}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rank List Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b">
              <h3 className="text-xl font-semibold">
                {modal.deptName} - {modal.scholarType} Rankings
              </h3>
            </div>
            <div className="flex-1 overflow-auto p-6">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase w-16">Rank</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">App No</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-32">Written Marks</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-32">Interview Marks</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-32">Total Marks</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-32">Community</th>
                    <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase w-32">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {modal.rows.map(row => {
                    const isAbsent = row.total === 'Absent' || row.total === 'ABSENT' || row.total === 'absent';
                    return (
                      <tr key={row.applicationNo} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-center font-semibold">{row.rank}</td>
                        <td className="px-4 py-3">{row.name}</td>
                        <td className="px-4 py-3">{row.applicationNo}</td>
                        <td className="px-4 py-3 text-center">
                          {row.written === 'Ab' || row.written === 'AB' || row.written === 'ab' ? (
                            <span className="text-red-600 font-semibold">Ab</span>
                          ) : (
                            row.written
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {row.viva === 'Ab' || row.viva === 'AB' || row.viva === 'ab' ? (
                            <span className="text-red-600 font-semibold">Ab</span>
                          ) : (
                            row.viva
                          )}
                        </td>
                        <td className="px-4 py-3 text-center font-semibold">
                          {isAbsent ? (
                            <span className="text-red-600 font-bold">Absent</span>
                          ) : (
                            row.total
                          )}
                        </td>
                        <td className="px-4 py-3 text-center">{row.community}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            isAbsent ? 'bg-red-100 text-red-800' : 
                            row.qualified ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {isAbsent ? 'Absent' : (row.qualified ? 'Qualified' : 'Not Qualified')}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="p-6 border-t flex justify-end gap-2">
              <button
                onClick={() => downloadRankings(modal.facultyName, modal.deptName, modal.scholarType)}
                className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 flex items-center gap-2"
              >
                <FaDownload /> Download
              </button>
              <button
                onClick={closeModal}
                className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Publish Confirmation Modal */}
      {showPublishModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-semibold mb-4">Publish Results</h3>
            <p className="text-gray-700 mb-6">
              Are you sure you want to publish the results for <strong>{facultyToPublish}</strong>?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelPublish}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmPublishFaculty}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Publish
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
