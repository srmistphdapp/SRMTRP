import React, { useState, useEffect, useRef } from 'react';
import { MdDownload, MdPeople, MdBusiness, MdDescription, MdSchool, MdGroup, MdWork, MdFolder, MdTrendingUp, MdExpandMore, MdExpandLess } from 'react-icons/md';
import { useAppContext } from '../../context/AppContext.js';
import { fetchBackToDirectorCountsByFaculty, getTotalApplicationsCount, getScholarCountsByFacultyFromDB, getDepartmentWiseScholarCountsWithFaculties } from '../../../../services/scholarService';
import { getCoordinatorStats } from '../../../../services/coordinatorService';
import { getExaminationCountsByType } from '../../../../services/examinationService';

const Dashboard = ({ appData }) => {
  const { facultiesData, getTotalDepartments } = useAppContext();
  const [expandedFaculties, setExpandedFaculties] = useState({});
  const [verifiedScholarsCounts, setVerifiedScholarsCounts] = useState({});
  const [coordinatorCount, setCoordinatorCount] = useState(0);
  const [totalApplicationsCount, setTotalApplicationsCount] = useState(0);
  const [facultyCountsFromDB, setFacultyCountsFromDB] = useState(null);
  const [facultyData, setFacultyData] = useState([]);
  const [examinationCounts, setExaminationCounts] = useState({
    fullTime: 0,
    partTimeInternal: 0,
    partTimeExternal: 0,
    partTimeIndustry: 0,
    total: 0
  });
  const chartRefs = useRef({});

  // Fetch total applications count from scholar_applications table
  useEffect(() => {
    const loadTotalApplicationsCount = async () => {
      console.log('📊 Loading total applications count from scholar_applications...');
      const { data, error } = await getTotalApplicationsCount();
      if (error) {
        console.error('Error loading total applications count:', error);
        return;
      }
      console.log('✅ Total applications count loaded:', data);
      setTotalApplicationsCount(data);
    };
    loadTotalApplicationsCount();
  }, []);

  // Fetch faculty counts from scholar_applications table for pie charts
  useEffect(() => {
    const loadFacultyCounts = async () => {
      console.log('📊 Loading faculty counts from scholar_applications...');
      const { data, error } = await getScholarCountsByFacultyFromDB();
      if (error) {
        console.error('Error loading faculty counts:', error);
        return;
      }
      console.log('✅ Faculty counts loaded:', data);
      setFacultyCountsFromDB(data);
    };
    loadFacultyCounts();
  }, []);

  // Fetch department-wise scholar counts from scholar_applications table
  useEffect(() => {
    const loadDepartmentCounts = async () => {
      if (!facultiesData || facultiesData.length === 0) {
        console.log('⏳ Waiting for facultiesData to load...');
        return;
      }
      console.log('📊 Loading department-wise scholar counts from scholar_applications...');
      const { data, error } = await getDepartmentWiseScholarCountsWithFaculties(facultiesData);
      if (error) {
        console.error('Error loading department-wise scholar counts:', error);
        return;
      }
      console.log('✅ Department-wise scholar counts loaded:', data);
      setFacultyData(data);
    };
    loadDepartmentCounts();
  }, [facultiesData]);

  // Fetch examination counts from examination_records table
  useEffect(() => {
    const loadExaminationCounts = async () => {
      console.log('📊 Loading examination counts for Dashboard...');
      const { data, error } = await getExaminationCountsByType();
      if (error) {
        console.error('Error loading examination counts:', error);
        return;
      }
      if (data) {
        console.log('✅ Examination counts loaded:', data);
        setExaminationCounts(data);
      }
    };
    loadExaminationCounts();
  }, []);

  // Fetch Verified Scholars (Back_To_Director) counts from scholar_applications
  useEffect(() => {
    const loadVerifiedScholarsBackToDirectorCounts = async () => {
      console.log('📊 Loading Verified Scholars (Back_To_Director) counts for Director dashboard...');
      const { data, error } = await fetchBackToDirectorCountsByFaculty();
      if (error) {
        console.error('Error loading Verified Scholars Back_To_Director counts:', error);
        return;
      }
      if (data) {
        console.log('✅ Verified Scholars Back_To_Director counts loaded:', data);
        setVerifiedScholarsCounts(data);
      }
    };
    loadVerifiedScholarsBackToDirectorCounts();
  }, []);

  // Fetch coordinator count from Supabase
  useEffect(() => {
    const loadCoordinatorCount = async () => {
      console.log('📊 Loading coordinator count for Director dashboard...');
      const { data, error } = await getCoordinatorStats();
      if (error) {
        console.error('Error loading coordinator count:', error);
        return;
      }
      if (data) {
        console.log('✅ Coordinator count loaded:', data.total);
        setCoordinatorCount(data.total);
      }
    };
    loadCoordinatorCount();
  }, []);

  // Calculate real statistics from scholar data
  const totalApplicationsReceived = totalApplicationsCount;
  const totalScholars = examinationCounts.total; // Fetch from examination_records table

  const stats = [
    {
      label: 'No. of Coordinators',
      value: coordinatorCount,
      icon: 'book-user',
      bgColor: 'bg-blue-50',
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      valueColor: 'text-gray-900',
      borderColor: 'border-l-4 border-purple-700'
    },
    {
      label: 'No. of Departments',
      value: getTotalDepartments(),
      icon: 'building-2',
      bgColor: 'bg-green-50',
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      valueColor: 'text-gray-900',
      borderColor: 'border-l-4 border-green-700'
    },
    {
      label: 'No. of Applications Received',
      value: totalApplicationsReceived,
      icon: 'file-text',
      bgColor: 'bg-purple-50',
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      valueColor: 'text-gray-900',
      borderColor: 'border-l-4 border-purple-700'
    },
    {
      label: 'No. of Eligible Scholars',
      value: totalScholars,
      icon: 'graduation-cap',
      bgColor: 'bg-amber-50',
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      valueColor: 'text-gray-900',
      borderColor: 'border-l-4 border-yellow-500'
    },
    {
      label: 'No. of Full Time Admitted',
      value: examinationCounts.fullTime,
      icon: 'users',
      bgColor: 'bg-rose-50',
      iconBg: 'bg-rose-100',
      iconColor: 'text-rose-600',
      valueColor: 'text-gray-900',
      borderColor: 'border-l-4 border-rose-500'
    },
    {
      label: 'No. of Full Time Vacancy',
      value: Math.max(0, 24 - examinationCounts.fullTime),
      icon: 'user-check',
      bgColor: 'bg-emerald-50',
      iconBg: 'bg-emerald-100',
      iconColor: 'text-emerald-600',
      valueColor: 'text-gray-900',
      borderColor: 'border-l-4 border-green-500'
    },
    {
      label: 'Part Time - Internal',
      value: examinationCounts.partTimeInternal,
      icon: 'briefcase',
      bgColor: 'bg-indigo-50',
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      valueColor: 'text-gray-900',
      borderColor: 'border-l-4 border-indigo-500'
    },
    {
      label: 'Part Time - External',
      value: examinationCounts.partTimeExternal,
      icon: 'external-link',
      bgColor: 'bg-sky-50',
      iconBg: 'bg-sky-100',
      iconColor: 'text-sky-600',
      valueColor: 'text-gray-900',
      borderColor: 'border-l-4 border-sky-500'
    },
    {
      label: 'Part Time - Industry',
      value: examinationCounts.partTimeIndustry,
      icon: 'factory',
      bgColor: 'bg-violet-50',
      iconBg: 'bg-violet-100',
      iconColor: 'text-violet-600',
      valueColor: 'text-gray-900',
      borderColor: 'border-l-4 border-violet-500'
    },
  ];

  // Define the 4 faculties with their colors exactly like HTML
  const faculties = [
    { id: 'FOET', name: 'Faculty of Engineering & Technology', color: 'rgba(255, 0, 0, 0.7)' },
    { id: 'FSH', name: 'Faculty of Science & Humanities', color: 'rgba(0, 100, 200, 0.7)' },
    { id: 'FOM', name: 'Faculty of Management', color: 'rgba(255, 140, 0, 0.7)' },
    { id: 'FMHS', name: 'Faculty of Medical & Health Science', color: 'rgba(0, 128, 0, 0.7)' }
  ];

  // Calculate real data for charts from database counts
  const facultyChartData = faculties.map(faculty => {
    // Get counts from database if available, otherwise use 0
    const counts = facultyCountsFromDB?.[faculty.name] || { total: 0, fullTime: 0, partTime: 0 };

    return {
      // All charts now use DATABASE counts from scholar_applications
      totalApplicants: counts.total,
      fullTimeApplicants: counts.fullTime,
      partTimeApplicants: counts.partTime,
      totalScholars: counts.total,
      fullTimeScholars: counts.fullTime,
      partTimeScholars: counts.partTime
    };
  });

  // Helper function to extract department from program string
  // Format: "Ph.d. - Chemistry (ph.d. - Pte (industry) - S And H)"
  const extractDepartmentFromProgram = (programString) => {
    if (!programString) return null;

    // Extract text between "Ph.d. - " and " ("
    const match = programString.match(/Ph\.d\.\s*-\s*([^(]+)/i);
    if (match && match[1]) {
      return match[1].trim();
    }
    return null;
  };

  // Helper function to extract faculty from program string
  const extractFacultyFromProgram = (programString) => {
    if (!programString) return null;

    const lowerProgram = programString.toLowerCase();

    // Check for faculty abbreviations in the program string
    if (lowerProgram.includes('e and t') || lowerProgram.includes('e & t') || lowerProgram.includes('foet')) {
      return 'Faculty of Engineering & Technology';
    }
    if (lowerProgram.includes('s and h') || lowerProgram.includes('s & h') || lowerProgram.includes('fsh')) {
      return 'Faculty of Science & Humanities';
    }
    if (lowerProgram.includes('mgt') || lowerProgram.includes('management') || lowerProgram.includes('fom')) {
      return 'Faculty of Management';
    }
    if (lowerProgram.includes('hs') || lowerProgram.includes('health') || lowerProgram.includes('medical') || lowerProgram.includes('fmhs')) {
      return 'Faculty of Medical & Health Science';
    }

    // Fallback to faculty field if available
    return null;
  };

  // Convert facultiesData to the format expected by dashboard with UPLOADED SCHOLARS DATA
  const toggleFaculty = (facultyName) => {
    setExpandedFaculties(prev => ({
      ...prev,
      [facultyName]: !prev[facultyName]
    }));
  };

  // Download report functionality
  const downloadReport = () => {
    try {
      // Calculate overall totals
      const overallTotals = facultyData.reduce((acc, faculty) => {
        faculty.departments.forEach(dept => {
          acc.fullTime += dept.fullTime;
          acc.internal += dept.internal;
          acc.partTimeExternal += dept.partTimeExternal;
          acc.industry += dept.industry;
          acc.total += dept.total;
        });
        return acc;
      }, { fullTime: 0, internal: 0, partTimeExternal: 0, industry: 0, total: 0 });

      // Create comprehensive CSV content
      let csvContent = "SRM IST DIRECTOR PORTAL - COMPREHENSIVE DASHBOARD REPORT\n";
      csvContent += "=".repeat(80) + "\n";
      csvContent += `Report Generated: ${new Date().toLocaleString()}\n`;
      csvContent += `Academic Year: ${new Date().getFullYear()}-${new Date().getFullYear() + 1}\n\n`;

      // Executive Summary
      csvContent += "EXECUTIVE SUMMARY\n";
      csvContent += "-".repeat(50) + "\n";
      csvContent += "Metric,Value\n";
      csvContent += `Total Scholars,${overallTotals.total}\n`;
      csvContent += `Total Full Time Scholars,${overallTotals.fullTime}\n`;
      csvContent += `Total Part Time Scholars,${overallTotals.internal + overallTotals.partTimeExternal + overallTotals.industry}\n`;
      csvContent += `Total Faculties,${facultyData.length}\n`;
      csvContent += `Total Departments,${facultyData.reduce((sum, faculty) => sum + faculty.departments.length, 0)}\n`;
      csvContent += `Total Coordinators,${coordinatorCount}\n`;
      csvContent += `Total Applications,${totalApplicationsReceived}\n\n`;

      // Dashboard Statistics
      csvContent += "DASHBOARD STATISTICS\n";
      csvContent += "-".repeat(50) + "\n";
      csvContent += "Category,Value,Percentage of Total\n";
      stats.forEach(stat => {
        const percentage = stat.label.includes('Scholar') ?
          ((stat.value / overallTotals.total) * 100).toFixed(1) + '%' : 'N/A';
        csvContent += `"${stat.label}",${stat.value},${percentage}\n`;
      });

      // Chart Data Analysis
      csvContent += "\nCHART DATA ANALYSIS\n";
      csvContent += "-".repeat(50) + "\n";
      csvContent += "Chart Type,Engineering & Technology,Sciences & Humanities,Management,Medical & Health Science,Total\n";

      const chartData = [
        { name: "Applicants by Faculty", data: facultyChartData.map(f => f.totalApplicants) },
        { name: "Full Time Applicants", data: facultyChartData.map(f => f.fullTimeApplicants) },
        { name: "Part Time Applicants", data: facultyChartData.map(f => f.partTimeApplicants) },
        { name: "Scholars by Faculty", data: facultyChartData.map(f => f.totalScholars) },
        { name: "Full Time Scholars", data: facultyChartData.map(f => f.fullTimeScholars) },
        { name: "Part Time Scholars", data: facultyChartData.map(f => f.partTimeScholars) }
      ];

      chartData.forEach(chart => {
        const total = chart.data.reduce((sum, val) => sum + val, 0);
        csvContent += `"${chart.name}",${chart.data.join(',')},${total}\n`;
      });

      // Faculty-wise Detailed Analysis
      csvContent += "\nFACULTY-WISE DETAILED ANALYSIS\n";
      csvContent += "=".repeat(80) + "\n";

      facultyData.forEach((faculty, index) => {
        csvContent += `\n${index + 1}. ${faculty.name.toUpperCase()}\n`;
        csvContent += "-".repeat(faculty.name.length + 10) + "\n";
        csvContent += "Department,Full Time,Part Time (Internal),Part Time (External),Part Time (Industry),Total Scholars,% of Faculty\n";

        const facultyTotal = faculty.departments.reduce((sum, dept) => sum + dept.total, 0);

        faculty.departments.forEach(dept => {
          const percentage = ((dept.total / facultyTotal) * 100).toFixed(1);
          csvContent += `"${dept.name}",${dept.fullTime},${dept.internal},${dept.partTimeExternal},${dept.industry},${dept.total},${percentage}%\n`;
        });

        // Faculty totals and analysis
        const facultyTotals = {
          fullTime: faculty.departments.reduce((sum, dept) => sum + dept.fullTime, 0),
          internal: faculty.departments.reduce((sum, dept) => sum + dept.internal, 0),
          partTimeExternal: faculty.departments.reduce((sum, dept) => sum + dept.partTimeExternal, 0),
          industry: faculty.departments.reduce((sum, dept) => sum + dept.industry, 0),
          total: faculty.departments.reduce((sum, dept) => sum + dept.total, 0)
        };

        csvContent += `"FACULTY TOTAL",${facultyTotals.fullTime},${facultyTotals.internal},${facultyTotals.partTimeExternal},${facultyTotals.industry},${facultyTotals.total},100.0%\n`;

        // Faculty insights
        csvContent += `\nFaculty Insights:\n`;
        csvContent += `- Total Departments: ${faculty.departments.length}\n`;
        csvContent += `- Largest Department: ${faculty.departments.reduce((max, dept) => dept.total > max.total ? dept : max).name} (${faculty.departments.reduce((max, dept) => dept.total > max.total ? dept : max).total} scholars)\n`;
        csvContent += `- Full Time vs Part Time Ratio: ${facultyTotals.fullTime}:${facultyTotals.internal + facultyTotals.partTimeExternal + facultyTotals.industry}\n`;
        csvContent += `- Faculty Share of Total Scholars: ${((facultyTotals.total / overallTotals.total) * 100).toFixed(1)}%\n\n`;
      });

      // Overall Analysis and Recommendations
      csvContent += "\nOVERALL ANALYSIS & KEY INSIGHTS\n";
      csvContent += "=".repeat(80) + "\n";
      csvContent += "Analysis Type,Value,Insight\n";
      csvContent += `Scholar Distribution,"Full Time: ${overallTotals.fullTime}, Part Time: ${overallTotals.internal + overallTotals.partTimeExternal + overallTotals.industry}","${((overallTotals.fullTime / overallTotals.total) * 100).toFixed(1)}% Full Time scholars"\n`;
      csvContent += `Part Time Breakdown,"Internal: ${overallTotals.internal}, External: ${overallTotals.partTimeExternal}, Industry: ${overallTotals.industry}","Internal scholars dominate part-time category"\n`;
      csvContent += `Faculty Dominance,"Engineering & Technology leads","${((facultyData[0].departments.reduce((sum, dept) => sum + dept.total, 0) / overallTotals.total) * 100).toFixed(1)}% of total scholars"\n`;
      csvContent += `Department Count,"${facultyData.reduce((sum, faculty) => sum + faculty.departments.length, 0)} total departments","Average ${(facultyData.reduce((sum, faculty) => sum + faculty.departments.length, 0) / facultyData.length).toFixed(1)} departments per faculty"\n`;

      // Recommendations
      csvContent += "\nRECOMMendations:\n";
      csvContent += "1. Consider expanding programs in high-demand faculties\n";
      csvContent += "2. Review part-time scholar distribution for optimization\n";
      csvContent += "3. Explore industry partnerships for more industry-sponsored scholars\n";
      csvContent += "4. Monitor faculty-wise growth trends for resource allocation\n\n";

      // Footer
      csvContent += "=".repeat(80) + "\n";
      csvContent += "Report End - SRM IST Director Portal\n";
      csvContent += `Generated by: Dashboard System | Date: ${new Date().toISOString()}\n`;

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `SRM_IST_Comprehensive_Dashboard_Report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Show success message
      showMessage('Comprehensive report downloaded successfully!', 'success');

    } catch (error) {
      console.error('Error generating report:', error);
      showMessage('Error generating report. Please try again.', 'error');
    }
  };

  // Show message function
  const showMessage = (message, type = 'info') => {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
      type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
        'bg-blue-100 text-blue-800 border border-blue-200'
      }`;
    messageDiv.innerHTML = `
      <div class="flex items-center gap-2">
        <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'x-circle' : 'info'}" class="w-5 h-5"></i>
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(messageDiv);

    // Initialize lucide icons for the message
    if (window.lucide) {
      window.lucide.createIcons();
    }

    // Remove message after 3 seconds
    setTimeout(() => {
      messageDiv.style.opacity = '0';
      messageDiv.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(messageDiv)) {
          document.body.removeChild(messageDiv);
        }
      }, 300);
    }, 3000);
  };

  // Initialize Lucide icons and charts
  useEffect(() => {
    const initializeLucide = () => {
      if (window.lucide) {
        window.lucide.createIcons();
      }
    };

    const waitForElement = (id, maxAttempts = 50) => {
      return new Promise((resolve, reject) => {
        let attempts = 0;
        const checkElement = () => {
          const element = document.getElementById(id);
          if (element) {
            resolve(element);
          } else if (attempts < maxAttempts) {
            attempts++;
            setTimeout(checkElement, 100);
          } else {
            reject(new Error(`Element with id "${id}" not found after ${maxAttempts} attempts`));
          }
        };
        checkElement();
      });
    };

    const initializeCharts = async () => {
      const chartConfigs = [
        {
          id: 'applicantsByFacultyChart',
          legendId: 'applicantsByFacultyLegend',
          data: facultyChartData.map(f => f.totalApplicants),
          title: 'Applicants by Faculty'
        },
        {
          id: 'fullTimeApplicantsChart',
          legendId: 'fullTimeApplicantsLegend',
          data: facultyChartData.map(f => f.fullTimeApplicants),
          title: 'Full Time Applicants'
        },
        {
          id: 'partTimeApplicantsChart',
          legendId: 'partTimeApplicantsLegend',
          data: facultyChartData.map(f => f.partTimeApplicants),
          title: 'Part Time Applicants'
        },
        {
          id: 'scholarsByFacultyChart',
          legendId: 'scholarsByFacultyLegend',
          data: facultyChartData.map(f => f.totalScholars),
          title: 'Scholars by Faculty'
        },
        {
          id: 'fullTimeScholarsChart',
          legendId: 'fullTimeScholarsLegend',
          data: facultyChartData.map(f => f.fullTimeScholars),
          title: 'Full Time Scholars'
        },
        {
          id: 'partTimeScholarsChart',
          legendId: 'partTimeScholarsLegend',
          data: facultyChartData.map(f => f.partTimeScholars),
          title: 'Part Time Scholars'
        }
      ];

      console.log(`🎯 Starting initialization of ${chartConfigs.length} charts...`);

      for (const config of chartConfigs) {
        try {
          console.log(`🔄 Initializing chart: ${config.title}`);

          // Wait for both canvas and legend elements to be available
          const canvas = await waitForElement(config.id);
          const legendContainer = await waitForElement(config.legendId);

          if (canvas && legendContainer && window.Chart) {
            // Destroy existing chart if it exists
            if (chartRefs.current[config.id]) {
              chartRefs.current[config.id].destroy();
            }

            const ctx = canvas.getContext('2d');
            chartRefs.current[config.id] = new window.Chart(ctx, {
              type: 'pie',
              data: {
                labels: faculties.map(f => f.name),
                datasets: [{
                  data: config.data,
                  backgroundColor: faculties.map(f => f.color),
                  borderColor: '#ffffff',
                  borderWidth: 2
                }]
              },
              options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { display: false },
                  tooltip: {
                    callbacks: {
                      label: function (context) {
                        const total = context.dataset.data.reduce((a, b) => a + b, 0);
                        const percentage = Math.round((context.parsed / total) * 100);
                        return `${context.label}: ${context.parsed} (${percentage}%)`;
                      }
                    }
                  },
                  datalabels: {
                    display: true,
                    color: 'white',
                    font: {
                      weight: 'bold',
                      size: 14
                    },
                    formatter: function (value, context) {
                      const total = context.dataset.data.reduce((a, b) => a + b, 0);
                      const percentage = Math.round((value / total) * 100);
                      return percentage + '%'; // Show percentage for all slices
                    },
                    anchor: 'center',
                    align: 'center'
                  }
                }
              },
              plugins: [{
                id: 'datalabels',
                afterDatasetsDraw: function (chart) {
                  const ctx = chart.ctx;
                  chart.data.datasets.forEach((dataset, datasetIndex) => {
                    const meta = chart.getDatasetMeta(datasetIndex);
                    const total = dataset.data.reduce((a, b) => a + b, 0);

                    meta.data.forEach((element, index) => {
                      const value = dataset.data[index];
                      const percentage = Math.round((value / total) * 100);

                      // Show percentage for all slices
                      const position = element.tooltipPosition();

                      ctx.fillStyle = 'white';
                      ctx.font = 'bold 12px Arial';
                      ctx.textAlign = 'center';
                      ctx.textBaseline = 'middle';

                      // Add text shadow for better visibility
                      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
                      ctx.shadowBlur = 3;
                      ctx.shadowOffsetX = 1;
                      ctx.shadowOffsetY = 1;

                      ctx.fillText(percentage + '%', position.x, position.y);

                      // Reset shadow
                      ctx.shadowColor = 'transparent';
                      ctx.shadowBlur = 0;
                      ctx.shadowOffsetX = 0;
                      ctx.shadowOffsetY = 0;
                    });
                  });
                }
              }]
            });

            // Create custom legend
            legendContainer.innerHTML = faculties.map((faculty, facultyIndex) => `
              <div class="flex items-center text-sm mb-1">
                <div class="w-3 h-3 rounded-full mr-2" style="background-color: ${faculty.color}"></div>
                <span class="text-gray-700">${faculty.name}: ${config.data[facultyIndex]}</span>
              </div>
            `).join('');

            console.log(`✅ Chart "${config.title}" initialized successfully`);
          }
        } catch (error) {
          console.error(`❌ Failed to initialize chart "${config.title}":`, error);
        }

        // Small delay between chart initializations
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      console.log('🎉 All charts initialization completed');
    };

    // Initialize everything
    const initializeAll = async () => {
      // Wait for libraries to be available
      let attempts = 0;
      while ((!window.Chart || !window.lucide) && attempts < 100) {
        await new Promise(resolve => setTimeout(resolve, 100));
        attempts++;
      }

      if (!window.Chart || !window.lucide) {
        console.error('❌ Required libraries not loaded after waiting');
        return;
      }

      console.log('📊 All libraries loaded, initializing charts...');
      initializeLucide();
      await initializeCharts();

      // Re-initialize Lucide icons after charts
      setTimeout(initializeLucide, 500);
    };

    // Start initialization
    initializeAll();

    return () => {
      // Cleanup charts on unmount
      Object.values(chartRefs.current).forEach(chart => {
        if (chart && typeof chart.destroy === 'function') {
          chart.destroy();
        }
      });
    };
  }, [facultyCountsFromDB, facultyChartData]); // Re-render charts when faculty counts from DB change

  const renderFacultyAccordion = () => {
    return facultyData.map((faculty, index) => {
      // Get Verified Scholars count for this faculty
      const facultyVerifiedScholarsCount = verifiedScholarsCounts[faculty.name]?.total || 0;

      return (
        <div key={index} className="faculty-accordion">
          <div
            className={`faculty-header flex items-center justify-between ${expandedFaculties[faculty.name] ? 'expanded' : ''}`}
            onClick={() => toggleFaculty(faculty.name)}
          >
            <div className="flex items-center gap-3">
              <i
                data-lucide={expandedFaculties[faculty.name] ? "chevron-up" : "chevron-down"}
                className={`w-5 h-5 text-gray-600 expand-icon ${expandedFaculties[faculty.name] ? 'rotated' : ''}`}
              ></i>
              <span className="font-semibold text-gray-900">{faculty.name}</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium min-w-[140px] text-center whitespace-nowrap">
                No.of Eligible Scholars: {faculty.departments.reduce((total, dept) => total + dept.total, 0)}
              </div>

              {/* UPDATED SECTION: Always show Verified Scholars count */}
              <div className={`px-4 py-1 rounded-full text-sm font-medium min-w-[160px] text-center whitespace-nowrap ${facultyVerifiedScholarsCount > 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-600'}`}>
                Verified Scholars: {facultyVerifiedScholarsCount}
              </div>

            </div>
          </div>

          <div className={`faculty-content ${expandedFaculties[faculty.name] ? 'expanded' : ''}`}>
            {expandedFaculties[faculty.name] && faculty.departments && (
              <div className="department-table-container">
                <table className="department-table">
                  <thead>
                    <tr>
                      <th>DEPARTMENT</th>
                      <th>FULL TIME</th>
                      <th>PART TIME<br />(INTERNAL)</th>
                      <th>PART TIME<br />(EXTERNAL)</th>
                      <th>PART TIME<br />(INDUSTRY)</th>
                      <th>TOTAL</th>
                      <th>VERIFIED<br />SCHOLARS</th>
                    </tr>
                  </thead>
                  <tbody>
                    {faculty.departments.map((dept, deptIndex) => {
                      // Get Verified Scholars count for this department
                      const deptVerifiedScholarsCount = verifiedScholarsCounts[faculty.name]?.departments[dept.name] || 0;

                      return (
                        <tr key={deptIndex}>
                          <td>{dept.name}</td>
                          <td>{dept.fullTime}</td>
                          <td>{dept.internal}</td>
                          <td>{dept.partTimeExternal}</td>
                          <td>{dept.industry}</td>
                          <td><strong>{dept.total}</strong></td>
                          <td style={{ backgroundColor: deptVerifiedScholarsCount > 0 ? '#fee2e2' : 'transparent', fontWeight: deptVerifiedScholarsCount > 0 ? '600' : 'normal', color: deptVerifiedScholarsCount > 0 ? '#991b1b' : 'inherit' }}>
                            {deptVerifiedScholarsCount}
                          </td>
                        </tr>
                      );
                    })}
                    <tr style={{ backgroundColor: '#f0f9ff', fontWeight: '600' }}>
                      <td>FACULTY TOTAL</td>
                      <td>{faculty.departments.reduce((sum, dept) => sum + dept.fullTime, 0)}</td>
                      <td>{faculty.departments.reduce((sum, dept) => sum + dept.internal, 0)}</td>
                      <td>{faculty.departments.reduce((sum, dept) => sum + dept.partTimeExternal, 0)}</td>
                      <td>{faculty.departments.reduce((sum, dept) => sum + dept.industry, 0)}</td>
                      <td><strong>{faculty.departments.reduce((sum, dept) => sum + dept.total, 0)}</strong></td>
                      <td style={{ backgroundColor: '#fee2e2', color: '#991b1b' }}>{facultyVerifiedScholarsCount}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      );
    });
  };

  return (
    <div className="dashboard-container dashboard-content p-6 space-y-6 overflow-x-hidden" style={{ maxWidth: '100%', width: '100%', boxSizing: 'border-box' }}>
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold font-size text-gray-900">Dashboard Overview</h2>
        <button
          onClick={downloadReport}
          className="bg-green-500 hover:bg-green-600 text-white border border-green-500 font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
        >
          <i data-lucide="download" className="w-4 h-4"></i>
          Download Report
        </button>
      </div>

      {/* Stats Cards - exactly 3 tiles per row */}
      <div className="stats-tiles-3">
        {stats.map((stat, index) => (
          <div key={index} className={`${stat.bgColor} p-4 rounded-lg border border-gray-100 hover:shadow-sm transition-shadow duration-200 ${stat.borderColor}`}>
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className={`text-2xl font-semibold ${stat.valueColor}`}>{stat.value}</p>
              </div>
              <div className={`p-2 rounded-full ${stat.iconBg} ${stat.iconColor}`}>
                <i data-lucide={stat.icon} className="w-5 h-5"></i>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pie Charts Section - 2 charts per row, wrapping automatically */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
        {/* Chart 1: Applicants by Faculty */}
        <div className="glassmorphic-card p-4 hover:bg-white/15 transition-all duration-300" style={{ border: '2px solid #e5e7eb' }}>
          <h3 className="text-lg font-bold text-black mb-4 text-center">Applicants by Faculty</h3>
          <div className="relative h-56 mb-3" style={{ minHeight: '224px', backgroundColor: '#f9fafb' }}>
            <canvas id="applicantsByFacultyChart" width="400" height="224" style={{ border: '1px solid #d1d5db' }}></canvas>
          </div>
          <div id="applicantsByFacultyLegend" className="space-y-1 text-black text-sm" style={{ minHeight: '80px', backgroundColor: '#f3f4f6' }}></div>
        </div>

        {/* Chart 2: Full Time Applicants */}
        <div className="glassmorphic-card p-4 hover:bg-white/15 transition-all duration-300" style={{ border: '2px solid #e5e7eb' }}>
          <h3 className="text-lg font-bold text-black mb-4 text-center">Full Time Applicants</h3>
          <div className="relative h-56 mb-3" style={{ minHeight: '224px', backgroundColor: '#f9fafb' }}>
            <canvas id="fullTimeApplicantsChart" width="400" height="224" style={{ border: '1px solid #d1d5db' }}></canvas>
          </div>
          <div id="fullTimeApplicantsLegend" className="space-y-1 text-black text-sm" style={{ minHeight: '80px', backgroundColor: '#f3f4f6' }}></div>
        </div>

        {/* Chart 3: Part Time Applicants */}
        <div className="glassmorphic-card p-4 hover:bg-white/15 transition-all duration-300" style={{ border: '2px solid #e5e7eb' }}>
          <h3 className="text-lg font-bold text-black mb-4 text-center">Part Time Applicants</h3>
          <div className="relative h-56 mb-3" style={{ minHeight: '224px', backgroundColor: '#f9fafb' }}>
            <canvas id="partTimeApplicantsChart" width="400" height="224" style={{ border: '1px solid #d1d5db' }}></canvas>
          </div>
          <div id="partTimeApplicantsLegend" className="space-y-1 text-black text-sm" style={{ minHeight: '80px', backgroundColor: '#f3f4f6' }}></div>
        </div>

        {/* Chart 4: Scholars by Faculty */}
        <div className="glassmorphic-card p-4 hover:bg-white/15 transition-all duration-300" style={{ border: '2px solid #e5e7eb' }}>
          <h3 className="text-lg font-bold text-black mb-4 text-center">Eligible Scholars by Faculty</h3>
          <div className="relative h-56 mb-3" style={{ minHeight: '224px', backgroundColor: '#f9fafb' }}>
            <canvas id="scholarsByFacultyChart" width="400" height="224" style={{ border: '1px solid #d1d5db' }}></canvas>
          </div>
          <div id="scholarsByFacultyLegend" className="space-y-1 text-black text-sm" style={{ minHeight: '80px', backgroundColor: '#f3f4f6' }}></div>
        </div>

        {/* Chart 5: Full Time Scholars by Faculty */}
        <div className="glassmorphic-card p-4 hover:bg-white/15 transition-all duration-300" style={{ border: '2px solid #e5e7eb' }}>
          <h3 className="text-lg font-bold text-black mb-4 text-center">Eligible Full Time Scholars by Faculty</h3>
          <div className="relative h-56 mb-3" style={{ minHeight: '224px', backgroundColor: '#f9fafb' }}>
            <canvas id="fullTimeScholarsChart" width="400" height="224" style={{ border: '1px solid #d1d5db' }}></canvas>
          </div>
          <div id="fullTimeScholarsLegend" className="space-y-1 text-black text-sm" style={{ minHeight: '80px', backgroundColor: '#f3f4f6' }}></div>
        </div>

        {/* Chart 6: Part Time Scholars by Faculty */}
        <div className="glassmorphic-card p-4 hover:bg-white/15 transition-all duration-300" style={{ border: '2px solid #e5e7eb' }}>
          <h3 className="text-lg font-bold text-black mb-4 text-center">Eligible Part Time Scholars by Faculty</h3>        <div className="relative h-56 mb-3" style={{ minHeight: '224px', backgroundColor: '#f9fafb' }}>
            <canvas id="partTimeScholarsChart" width="400" height="224" style={{ border: '1px solid #d1d5db' }}></canvas>
          </div>
          <div id="partTimeScholarsLegend" className="space-y-1 text-black text-sm" style={{ minHeight: '80px', backgroundColor: '#f3f4f6' }}></div>
        </div>
      </div>

      {/* Faculty & Department Section - All Faculties with Dropdown Tables */}
      <div className="mt-8">
        <h3 className="text-xl font-bold text-gray-900 mb-6">Faculty Departments & Scholar Distribution</h3>
        <div id="facultyDeptAccordionContainer" className="space-y-4">
          {renderFacultyAccordion()}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;