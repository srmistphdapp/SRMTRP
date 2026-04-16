import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchDepartments } from '../../../services/departmentService';

const AppContext = createContext();

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};

export const AppProvider = ({ children }) => {
  // Initial faculty and department data - will be populated from Supabase
  const [facultiesData, setFacultiesData] = useState([]);
  const [loadingDepartments, setLoadingDepartments] = useState(true);

  // Load departments from Supabase on mount
  useEffect(() => {
    const loadDepartmentsFromSupabase = async () => {
      setLoadingDepartments(true);
      const { data, error } = await fetchDepartments();
      
      if (error) {
        console.error('Error loading departments in AppContext:', error);
        setLoadingDepartments(false);
        return;
      }

      if (data) {
        // Group departments by faculty
        const grouped = {};
        
        data.forEach(dept => {
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
            hod: dept.head_of_department || 'N/A',
            staffCount: 0
          });
        });

        // Convert to array and set state
        const facultiesArray = Object.values(grouped);
        setFacultiesData(facultiesArray);
        console.log('Loaded faculties from Supabase:', facultiesArray);
      }
      
      setLoadingDepartments(false);
    };

    loadDepartmentsFromSupabase();
  }, []);

  // Calculate total departments
  const getTotalDepartments = () => {
    return facultiesData.reduce((total, faculty) => total + faculty.departments.length, 0);
  };

  // Scholar data - fetched from Supabase (no hardcoded data)
  const [scholarsData, setScholarsData] = useState([]);

  // Calculate scholar statistics based on academic eligibility criteria
  const getScholarStats = () => {
    const totalScholars = scholarsData.length;

    // Check if scholar is eligible based on required fields (same logic as ScholarManagement)
    const checkEligibility = (scholar) => {
      // Required fields for eligibility
      const requiredFields = [
        scholar.name,                    // Registered Name
        scholar.faculty,                 // Faculty
        scholar.department || scholar.program, // Department or Program
        scholar.programType || scholar.type,   // Type
        scholar.ugDegree || scholar.ugCgpa,    // UG Details (at least one)
        scholar.pgDegree || scholar.pgCgpa     // PG Details (at least one)
      ];

      // Check if all required fields are filled
      const allFieldsFilled = requiredFields.every(field => {
        if (typeof field === 'string') {
          return field && field.trim() !== '' && field.toLowerCase() !== 'n/a';
        }
        return field != null && field !== '';
      });

      // Check if scholar is a duplicate (by name)
      const isDuplicate = scholarsData.filter(s => {
        if (!s.name || !scholar.name) return false;
        return s.name.trim().toLowerCase() === scholar.name.trim().toLowerCase();
      }).length > 1;

      // Scholar is eligible only if all fields are filled AND not a duplicate
      return (allFieldsFilled && !isDuplicate) ? 'Eligible' : 'Not Eligible';
    };

    const eligibleScholars = scholarsData.filter(scholar => checkEligibility(scholar) === 'Eligible').length;
    const notEligible = totalScholars - eligibleScholars;
    const eligibilityRate = totalScholars > 0 ? ((eligibleScholars / totalScholars) * 100).toFixed(1) : 0;

    return {
      totalScholars,
      eligibleScholars,
      notEligible,
      eligibilityRate
    };
  };

  // Get scholar counts by faculty for dashboard
  const getScholarCountsByFaculty = () => {
    const counts = {};

    facultiesData.forEach(faculty => {
      // All applicants
      const facultyApplicants = scholarsData.filter(s => s.faculty === faculty.name);

      // Only admitted scholars
      const facultyScholars = scholarsData.filter(s =>
        s.faculty === faculty.name &&
        (s.status === 'Forwarded' || s.status === 'Verified' || s.status === 'Active')
      );

      counts[faculty.name] = {
        // Applicant counts
        totalApplicants: facultyApplicants.length,
        fullTimeApplicants: facultyApplicants.filter(s => s.type === 'Full Time').length,
        partTimeApplicants: facultyApplicants.filter(s => s.type === 'Part Time').length,

        // Scholar counts (admitted only)
        totalScholars: facultyScholars.length,
        fullTimeScholars: facultyScholars.filter(s => s.type === 'Full Time').length,
        partTimeScholars: facultyScholars.filter(s => s.type === 'Part Time').length,

        departments: faculty.departments.map(dept => {
          const deptApplicants = facultyApplicants.filter(s => s.department === dept.name);
          const deptScholars = facultyScholars.filter(s => s.department === dept.name);

          return {
            name: dept.name,
            totalApplicants: deptApplicants.length,
            fullTimeApplicants: deptApplicants.filter(s => s.type === 'Full Time').length,
            partTimeApplicants: deptApplicants.filter(s => s.type === 'Part Time').length,
            totalScholars: deptScholars.length,
            fullTimeScholars: deptScholars.filter(s => s.type === 'Full Time').length,
            partTimeScholars: deptScholars.filter(s => s.type === 'Part Time').length
          };
        })
      };
    });

    return counts;
  };

  const value = {
    facultiesData,
    setFacultiesData,
    scholarsData,
    setScholarsData,
    getScholarStats,
    getTotalDepartments,
    getScholarCountsByFaculty,
    loadingDepartments
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};