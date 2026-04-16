import { useState } from 'react';
import { Building2, GraduationCap, User, UserCheck, ChevronRight } from 'lucide-react';
import { useAppContext } from '../App';
import { getDepartmentFromProgram } from '../utils/departmentMapping';
import './Dashboard.css';

const Dashboard = () => {
  const { scholarsData, departmentsData, isLoadingSupabase, assignedFaculty } = useAppContext();
  const [isExpanded, setIsExpanded] = useState(false);

  // Helper function to check if type is full time or part time
  const isFullTime = (type) => {
    if (!type) return false;
    const lowerType = type.toLowerCase();
    // Check for "ft" anywhere in the string (fti, fte, full time, etc)
    return /\bft[a-z]*\b|full\s*time/.test(lowerType);
  };

  const isPartTime = (type) => {
    if (!type) return false;
    const lowerType = type.toLowerCase();
    // Check for "pt" anywhere in the string (pti, pte, part time, etc)
    return /\bpt[a-z]*\b|part\s*time/.test(lowerType);
  };

  // Calculate stats from Supabase data only
  const totalScholars = scholarsData.length;
  const totalDepartments = departmentsData.length;
  const totalFullTime = scholarsData.filter(s => isFullTime(s.type)).length;
  const totalPartTime = scholarsData.filter(s => isPartTime(s.type)).length;

  const stats = [
    {
      label: 'No. of Departments',
      value: totalDepartments,
      icon: Building2,
      borderColor: 'stat-card-blue',
      iconColor: 'text-blue-600'
    },
    {
      label: 'No. of Scholars',
      value: totalScholars,
      icon: GraduationCap,
      borderColor: 'stat-card-green',
      iconColor: 'text-green-600'
    },
    {
      label: 'Full Time Scholars',
      value: totalFullTime,
      icon: User,
      borderColor: 'stat-card-purple',
      iconColor: 'text-purple-600'
    },
    {
      label: 'Part Time Scholars',
      value: totalPartTime,
      icon: UserCheck,
      borderColor: 'stat-card-yellow',
      iconColor: 'text-yellow-600'
    },
    {
      label: 'Forwarded Scholars',
      value: scholarsData.filter(s => s.faculty_status && s.faculty_status.startsWith('FORWARDED_TO_')).length,
      icon: User,
      borderColor: 'stat-card-red',
      iconColor: 'text-red-600'
    },
    {
      label: 'Pending Scholars',
      value: scholarsData.filter(s => !s.faculty_status || !s.faculty_status.startsWith('FORWARDED_TO_')).length,
      icon: UserCheck,
      borderColor: 'stat-card-cyan',
      iconColor: 'text-cyan-600'
    },
  ];

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  // Group scholars by department extracted from program field
  // Extract ONLY the department name, removing all extra info
  const scholarsByDepartment = {};

  scholarsData.forEach(scholar => {
    const program = scholar.program || '';
    
    // Extract department name from program field
    // Strategy: Get the first word(s) before any dash, parenthesis, or bracket
    let departmentName = program.trim();
    
    // Remove everything after and including parentheses
    departmentName = departmentName.split('(')[0].trim();
    
    // Remove everything after and including brackets
    departmentName = departmentName.split('[')[0].trim();
    
    // Remove "Ph.d." prefix and any leading dashes
    departmentName = departmentName.replace(/^Ph\.d\.\s*[-–]\s*/i, '').trim();
    departmentName = departmentName.replace(/^Ph\.d\.\s*/i, '').trim();
    
    // Remove trailing dashes
    departmentName = departmentName.replace(/\s*[-–]\s*$/i, '').trim();
    
    // If still empty, use "Other"
    if (!departmentName || departmentName.length === 0) {
      departmentName = 'Other';
    }
    
    // Normalize department name: convert to title case for consistent grouping
    // This handles "Computer Science and Engineering" vs "Computer Science And Engineering"
    departmentName = departmentName
      .split(/\s+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
    
    // Initialize department if not exists
    if (!scholarsByDepartment[departmentName]) {
      scholarsByDepartment[departmentName] = [];
    }
    
    // Add scholar to department
    scholarsByDepartment[departmentName].push(scholar);
  });

  // Sort departments alphabetically for consistent display (Other goes to end)
  const sortedDepartmentEntries = Object.entries(scholarsByDepartment)
    .sort(([deptA], [deptB]) => {
      // Put "Other" at the end
      if (deptA === 'Other') return 1;
      if (deptB === 'Other') return -1;
      return deptA.localeCompare(deptB);
    });

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1 className="dashboard-title">Dashboard{assignedFaculty ? ` - ${assignedFaculty}` : ''}</h1>
        <p className="dashboard-subtitle">Faculty Overview and Statistics</p>
      </div>

      {/* Stats Cards - exactly 3 tiles per row */}
      <div className="dashboard-stats-grid">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className={`stat-card ${stat.borderColor}`}>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                </div>
                <div className={`stat-icon-wrapper ${stat.iconColor}`}>
                  <IconComponent className="w-5 h-5" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Faculty & Department Overview */}
      <div className="chart-card">
        <div className="chart-header">
          <h3 className="chart-title">Faculty & Department Overview</h3>
        </div>
        <div>
          <div
            className="activity-item"
            onClick={toggleExpanded}
            style={{ cursor: 'pointer', padding: '1rem', border: '1px solid #e2e8f0', borderRadius: '0.5rem', marginBottom: '1rem' }}
          >
            <div className="activity-icon new">
              <ChevronRight className={`transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`} style={{ width: '1rem', height: '1rem' }} />
            </div>
            <div className="activity-content" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span style={{ fontWeight: '700', fontSize: '1.125rem', color: 'var(--secondary-blue)' }}>
                {assignedFaculty || 'Faculty'}
              </span>
            </div>
          </div>

          {/* Department Table */}
          <div className={`${isExpanded ? 'block' : 'hidden'} transition-all duration-500 ease-in-out`}>
            <div className="department-table-container">
              <div className="faculty-info">
                <strong>{assignedFaculty || 'Faculty'}</strong>
              </div>
              <table className="department-table">
                <thead>
                  <tr>
                    <th>DEPARTMENT</th>
                    <th>FULL TIME</th>
                    <th>PART TIME</th>
                    <th>FORWARDED</th>
                    <th>PENDING</th>
                    <th>TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedDepartmentEntries
                    .filter(([dept, scholars]) => scholars.length > 0) // Only show departments with scholars
                    .map(([department, scholars]) => {
                      const fullTime = scholars.filter(s => isFullTime(s.type)).length;
                      const partTime = scholars.filter(s => isPartTime(s.type)).length;
                      const forwarded = scholars.filter(s => s.faculty_status && s.faculty_status.startsWith('FORWARDED_TO_')).length;
                      const pending = scholars.filter(s => !s.faculty_status || !s.faculty_status.startsWith('FORWARDED_TO_')).length;
                      const total = scholars.length;

                      return (
                        <tr key={department}>
                          <td>{department}</td>
                          <td>{fullTime}</td>
                          <td>{partTime}</td>
                          <td>{forwarded}</td>
                          <td>{pending}</td>
                          <td>{total}</td>
                        </tr>
                      );
                    })}
                  <tr className="faculty-total-row">
                    <td>FACULTY TOTAL</td>
                    <td>{totalFullTime}</td>
                    <td>{totalPartTime}</td>
                    <td>{scholarsData.filter(s => s.faculty_status && s.faculty_status.startsWith('FORWARDED_TO_')).length}</td>
                    <td>{scholarsData.filter(s => !s.faculty_status || !s.faculty_status.startsWith('FORWARDED_TO_')).length}</td>
                    <td>{totalScholars}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;