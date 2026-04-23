import React, { useState, useEffect, useRef } from 'react';
import { MdSearch, MdChevronRight, MdFullscreen, MdFullscreenExit } from 'react-icons/md';
import Chart from 'chart.js/auto';
import { fetchDepartments } from '../../../../services/departmentService';
import { fetchExaminationRecords } from '../../../../services/examinationService';
import { normalizeFacultyName } from '../../../../utils/departmentUtils';
import './PartTimeSplit.css';

const PartTimeSplit = ({ appData }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedFaculties, setExpandedFaculties] = useState({});
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [partTimeData, setPartTimeData] = useState({
    internal: [],
    external: [],
    industry: [],
    fulltime: [],
    facultyBreakdown: {},
    totals: { internal: 0, external: 0, industry: 0, fulltime: 0 }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const internalChartRef = useRef(null);
  const externalChartRef = useRef(null);
  const industryChartRef = useRef(null);
  const chartInstances = useRef({});

  // Faculty colors for consistency
  const facultyColors = {
    'Faculty of Engineering & Technology': '#ef4444',
    'Faculty of Science & Humanities': '#3b82f6', 
    'Faculty of Medical and Health Sciences': '#22d3ee',
    'Faculty of Management': '#eab308'
  };

  // Helper function to extract department from program string (same as Dashboard)
  const extractDepartmentFromProgram = (programString) => {
    if (!programString) return null;
    
    // Extract text between "Ph.d. - " and " ("
    const match = programString.match(/Ph\.d\.\s*-\s*([^(]+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return null;
  };

  // Helper function to extract faculty from program string (same as Dashboard)
  const extractFacultyFromProgram = (programString) => {
    if (!programString) return null;
    
    const lowerProgram = programString.toLowerCase()
      .replace(/\s*&\s*/g, ' and ')      // Normalize & to 'and'
      .replace(/\band\b/gi, 'and');       // Normalize all AND variations to 'and'
    
    // Check for faculty abbreviations in the program string
    // Now handles: "e and t", "e AND t", "E and T", "e & t", etc.
    if (lowerProgram.includes('e and t') || lowerProgram.includes('foet')) {
      return 'Faculty of Engineering & Technology';
    }
    if (lowerProgram.includes('s and h') || lowerProgram.includes('fsh')) {
      return 'Faculty of Science & Humanities';
    }
    if (lowerProgram.includes('mgt') || lowerProgram.includes('management') || lowerProgram.includes('fom')) {
      return 'Faculty of Management';
    }
    if (lowerProgram.includes('hs') || lowerProgram.includes('health') || lowerProgram.includes('medical') || lowerProgram.includes('fmhs')) {
      return 'Faculty of Medical & Health Science';
    }
    
    return null;
  };

  // Fetch departments and examination records from Supabase (same as Dashboard)
  useEffect(() => {
    const loadDataFromSupabase = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Fetch departments and examination records in parallel
        const [departmentsResult, examinationResult] = await Promise.all([
          fetchDepartments(),
          fetchExaminationRecords()
        ]);

        if (departmentsResult.error) {
          setError('Failed to load departments from Supabase');
          console.error('Error fetching departments:', departmentsResult.error);
          return;
        }

        if (examinationResult.error) {
          setError('Failed to load examination records from Supabase');
          console.error('Error fetching examination records:', examinationResult.error);
          return;
        }

        const departments = departmentsResult.data;
        const examinationRecords = examinationResult.data;

        console.log('PartTime Split - Raw departments from Supabase:', departments.length);
        console.log('PartTime Split - Raw examination records from Supabase:', examinationRecords.length);

        // Group departments by faculty (same structure as Dashboard)
        const facultiesData = {};
        departments.forEach(dept => {
          if (!facultiesData[dept.faculty]) {
            facultiesData[dept.faculty] = {
              name: dept.faculty,
              departments: []
            };
          }
          facultiesData[dept.faculty].departments.push({
            name: dept.department_name
          });
        });

        // Convert to array format
        const facultiesArray = Object.values(facultiesData);

        // Use EXACT same logic as Dashboard for counting
        const facultyData = facultiesArray.map(faculty => {
          // Get examination records for this faculty (same as Dashboard)
          const facultyExamRecords = examinationRecords.filter(exam => {
            // Check faculty field first
            if (exam.faculty === faculty.name) return true;
            
            // Extract faculty from program string
            const extractedFaculty = extractFacultyFromProgram(exam.program);
            return extractedFaculty === faculty.name;
          });

          return {
            name: faculty.name,
            departments: faculty.departments.map(dept => {
              // Get examination records for this department (same as Dashboard)
              const deptExamRecords = facultyExamRecords.filter(exam => {
                // Check department field first
                if (exam.department === dept.name) return true;
                
                // Extract department from program string
                const extractedDept = extractDepartmentFromProgram(exam.program);
                if (!extractedDept) return false;
                
                // Fuzzy match department names (case-insensitive, partial match)
                const deptLower = dept.name.toLowerCase();
                const extractedLower = extractedDept.toLowerCase();
                
                // Check if department name contains the extracted name or vice versa
                return deptLower.includes(extractedLower) || extractedLower.includes(deptLower);
              });
              
              // Count by program_type only (not type column)
              const fullTimeCount = deptExamRecords.filter(e => {
                const programType = e.program_type || '';
                return programType === 'Full Time' || programType.toLowerCase() === 'ft' || programType.toLowerCase() === 'full time';
              }).length;
              
              const partTimeInternalCount = deptExamRecords.filter(e => {
                const programType = e.program_type || '';
                return programType === 'Part Time Internal' || programType.toLowerCase() === 'pti' || programType.toLowerCase() === 'part time internal';
              }).length;
              
              const partTimeExternalCount = deptExamRecords.filter(e => {
                const programType = e.program_type || '';
                return programType === 'Part Time External' || programType.toLowerCase() === 'pte' || programType.toLowerCase() === 'part time external';
              }).length;
              
              const partTimeIndustryCount = deptExamRecords.filter(e => {
                const programType = e.program_type || '';
                return programType === 'Part Time External (Industry)' || programType.toLowerCase() === 'pte(industry)' || 
                       programType.toLowerCase().includes('industry');
              }).length;

              return {
                name: dept.name,
                fullTime: fullTimeCount,
                internal: partTimeInternalCount,
                external: partTimeExternalCount,
                industry: partTimeIndustryCount,
                total: deptExamRecords.length
              };
            })
          };
        });

        console.log('PartTime Split - Faculty data with counts:', facultyData);

        // Calculate totals (same as Dashboard)
        const overallTotals = facultyData.reduce((acc, faculty) => {
          faculty.departments.forEach(dept => {
            acc.fullTime += dept.fullTime;
            acc.internal += dept.internal;
            acc.external += dept.external;
            acc.industry += dept.industry;
            acc.total += dept.total;
          });
          return acc;
        }, { fullTime: 0, internal: 0, external: 0, industry: 0, total: 0 });

        // Create scholar arrays for charts (same structure as before)
        const allScholarsData = {
          internal: [],
          external: [],
          industry: [],
          fulltime: []
        };

        // Populate scholar arrays from examination records
        examinationRecords.forEach(record => {
          const type = record.program_type || record.type || '';
          const programLower = (record.program || '').toLowerCase();
          
          let category = null;
          if (type === 'Part Time Internal' || type.toLowerCase() === 'pti' || programLower.includes('pti')) {
            category = 'internal';
          } else if (type === 'Part Time External (Industry)' || type.toLowerCase() === 'pte(industry)' || 
                     programLower.includes('pte(industry)') || programLower.includes('pte (industry)')) {
            category = 'industry';
          } else if (type === 'Part Time External' || type.toLowerCase() === 'pte' || 
                     (programLower.includes('pte') && !programLower.includes('pte(industry)') && !programLower.includes('pte (industry)'))) {
            category = 'external';
          } else if (type === 'Full Time' || type.toLowerCase() === 'ft' || programLower.includes('ft')) {
            category = 'fulltime';
          }
          
          if (category && record.faculty && record.department) {
            allScholarsData[category].push({
              name: record.registered_name,
              faculty: record.faculty,
              department: record.department,
              type: record.type || record.program_type
            });
          }
        });

        // Convert facultyData to facultyBreakdown format
        const facultyBreakdown = {};
        facultyData.forEach(faculty => {
          facultyBreakdown[faculty.name] = {
            name: faculty.name,
            departments: {},
            totals: { internal: 0, external: 0, industry: 0, fulltime: 0 }
          };
          
          faculty.departments.forEach(dept => {
            facultyBreakdown[faculty.name].departments[dept.name] = {
              internal: dept.internal,
              external: dept.external,
              industry: dept.industry,
              fulltime: dept.fullTime
            };
            
            // Add to faculty totals
            facultyBreakdown[faculty.name].totals.internal += dept.internal;
            facultyBreakdown[faculty.name].totals.external += dept.external;
            facultyBreakdown[faculty.name].totals.industry += dept.industry;
            facultyBreakdown[faculty.name].totals.fulltime += dept.fullTime;
          });
        });

        setPartTimeData({
          ...allScholarsData,
          facultyBreakdown,
          totals: {
            internal: overallTotals.internal,
            external: overallTotals.external,
            industry: overallTotals.industry,
            fulltime: overallTotals.fullTime
          }
        });

        console.log('PartTime Split - Final totals:', {
          internal: overallTotals.internal,
          external: overallTotals.external,
          industry: overallTotals.industry,
          fulltime: overallTotals.fullTime
        });
        
      } catch (err) {
        setError('Failed to load data from Supabase');
        console.error('Exception loading data:', err);
      } finally {
        setLoading(false);
      }
    };

    loadDataFromSupabase();
  }, [appData]);

  // Create donut charts
  useEffect(() => {
    const createChart = (canvasRef, data, title) => {
      if (!canvasRef.current) return;

      const ctx = canvasRef.current.getContext('2d');
      
      // Destroy existing chart
      if (chartInstances.current[title]) {
        chartInstances.current[title].destroy();
      }

      if (!data.length) {
        // Create empty chart
        chartInstances.current[title] = new Chart(ctx, {
          type: 'doughnut',
          data: {
            labels: ['No Data'],
            datasets: [{
              data: [1],
              backgroundColor: ['#e5e7eb'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
              legend: { display: false },
              tooltip: { enabled: false }
            }
          }
        });
        return;
      }

      // Prepare chart data by faculty
      const facultyData = {};
      data.forEach(scholar => {
        const facultyName = scholar.faculty;
        facultyData[facultyName] = (facultyData[facultyName] || 0) + 1;
      });

      const labels = Object.keys(facultyData);
      const values = Object.values(facultyData);
      const colors = Object.keys(facultyData).map(facultyName => facultyColors[facultyName] || '#6b7280');

      chartInstances.current[title] = new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels,
          datasets: [{
            data: values,
            backgroundColor: colors,
            borderWidth: 3,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          cutout: '70%',
          plugins: {
            legend: { display: false },
            tooltip: {
              backgroundColor: '#1f2937',
              titleColor: '#ffffff',
              bodyColor: '#ffffff',
              borderColor: '#374151',
              borderWidth: 1
            }
          }
        }
      });
    };

    if (!loading) {
      createChart(internalChartRef, partTimeData.internal, 'Internal Scholars');
      createChart(externalChartRef, partTimeData.external, 'External Scholars');
      createChart(industryChartRef, partTimeData.industry, 'Industry Scholars');
    }

    return () => {
      Object.values(chartInstances.current).forEach(chart => chart?.destroy());
    };
  }, [partTimeData, loading]);

  const toggleFaculty = (facultyName) => {
    setExpandedFaculties(prev => ({
      ...prev,
      [facultyName]: !prev[facultyName]
    }));
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const filteredFaculties = Object.entries(partTimeData.facultyBreakdown).filter(([facultyName, faculty]) => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    const facultyMatch = faculty.name.toLowerCase().includes(searchLower);
    const departmentMatch = Object.keys(faculty.departments).some(dept => 
      dept.toLowerCase().includes(searchLower)
    );
    
    return facultyMatch || departmentMatch;
  });

  if (loading) {
    return (
      <div className="ptsplit-container">
        <div className="ptsplit-header">
          <h1 className="ptsplit-title font-size"><b>Part Time Split</b></h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-gray-600">Loading departments from Supabase...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="ptsplit-container">
        <div className="ptsplit-header">
          <h1 className="ptsplit-title font-size"><b>Part Time Split</b></h1>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="text-lg text-red-600">Error: {error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`ptsplit-container ${isFullscreen ? 'fullscreen-mode' : ''} overflow-x-hidden`} style={{ maxWidth: '100%', width: '100%', boxSizing: 'border-box' }}>
      {/* Header with Title and Fullscreen Toggle */}
      <div className="ptsplit-header">
        <h1 className="ptsplit-title font-size"><b>Part Time Split</b></h1>
        <button 
          onClick={toggleFullscreen}
          className="fullscreen-toggle-btn"
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <MdFullscreenExit className="w-5 h-5" /> : <MdFullscreen className="w-5 h-5" />}
        </button>
      </div>

      {/* Charts Section */}
      <div className="ptsplit-charts-row">
        <div className="chart-block">
          <div className="donut-chart-container">
            <canvas ref={internalChartRef} className="donut-chart"></canvas>
          </div>
          <div className="donut-label">Internal Scholars</div>
        </div>
        
        <div className="chart-block">
          <div className="donut-chart-container">
            <canvas ref={externalChartRef} className="donut-chart"></canvas>
          </div>
          <div className="donut-label">External Scholars</div>
        </div>
        
        <div className="chart-block">
          <div className="donut-chart-container">
            <canvas ref={industryChartRef} className="donut-chart"></canvas>
          </div>
          <div className="donut-label">Industry Scholars</div>
        </div>
      </div>

      {/* Summary Cards Section */}
      <div className="ptsplit-summary-row">
        <div className="summary-block internal-block">
          <span className="summary-title">Internal</span>
          <span className="summary-value">{partTimeData.totals.internal}</span>
          <span className="summary-icon">💼</span>
        </div>
        <div className="summary-block external-block">
          <span className="summary-title">External</span>
          <span className="summary-value">{partTimeData.totals.external}</span>
          <span className="summary-icon">🧑‍💼</span>
        </div>
        <div className="summary-block industry-block">
          <span className="summary-title">Industry</span>
          <span className="summary-value">{partTimeData.totals.industry}</span>
          <span className="summary-icon">📋</span>
        </div>
      </div>

      {/* Faculty Distribution Section */}
      <div className="ptsplit-dist">
        <div className="dist-title">Faculty-wise Distribution</div>
        <div className="dist-desc">Detailed breakdown of part-time scholars by faculty and department</div>
        
        {/* Search Bar */}
        <div className="search-container">
          <MdSearch className="search-icon" />
          <input
            type="text"
            placeholder="Search faculties and departments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Table Headers */}
        <div className="table-headers">
          <div className="header-row">
            <div className="header-faculty">Faculty / Department</div>
            <span className="header-label internal">Internal</span>
            <span className="header-label external">External</span>
            <span className="header-label industry">Industry</span>
            <span className="header-label total">Total</span>
          </div>
        </div>

        {/* Faculty Accordion */}
        <div className="faculty-accordion">
          {filteredFaculties.map(([facultyName, faculty]) => (
            <div key={facultyName} className="faculty-item">
              <div 
                className="faculty-header"
                onClick={() => toggleFaculty(facultyName)}
              >
                <div className="faculty-info">
                  <MdChevronRight 
                    className={`expand-icon ${expandedFaculties[facultyName] ? 'expanded' : ''}`}
                  />
                  <span className="dist-dot" style={{ color: facultyColors[facultyName] }}>•</span>
                  <span className="dist-faculty-label">{faculty.name}</span>
                </div>

              </div>
              
              {expandedFaculties[facultyName] && (
                <div className="department-list">
                  {Object.entries(faculty.departments).map(([deptName, dept]) => {
                    const deptTotal = dept.internal + dept.external + dept.industry; // Only part-time totals
                    // Show all departments, even with 0 counts
                    
                    return (
                      <div key={deptName} className="department-item">
                        <span className="department-name">{deptName}</span>
                        <span className="count-badge internal small">{dept.internal}</span>
                        <span className="count-badge external small">{dept.external}</span>
                        <span className="count-badge industry small">{dept.industry}</span>
                        <span className="count-badge total small">{deptTotal}</span>
                      </div>
                    );
                  })}
                  {Object.keys(faculty.departments).length === 0 && (
                    <div className="department-item">
                      <span className="department-name text-gray-500">No departments found</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        
        {filteredFaculties.length === 0 && (
          <div className="no-results">
            No faculties found matching your search.
          </div>
        )}
      </div>
    </div>
  );
};

export default PartTimeSplit;