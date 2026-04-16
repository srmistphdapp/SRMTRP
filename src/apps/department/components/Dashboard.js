import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FileText, UserCheck, UserX, Send, Search, Filter, ChevronDown, ChevronRight, Maximize2, Building2, GraduationCap, User
} from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';
import { recentApplications } from '../data/demoData';

const Dashboard = () => {
  const { showMessage, toggleFullScreen, currentUser } = useAppContext();
  const navigate = useNavigate();
  
  // State for search and pagination
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage] = useState(5);
  const [activeTab, setActiveTab] = useState('all');
  const [facultyExpanded, setFacultyExpanded] = useState(false);
  
  // Mock data for stats - updated to match the provided structure
  const stats = [
    { 
      title: 'No. of Departments', 
      value: '8', 
      icon: <Building2 className="w-5 h-5" />,
      cardClass: 'stat-card-blue',
      iconClass: 'text-blue-600'
    },
    { 
      title: 'No. of Scholars', 
      value: '156', 
      icon: <GraduationCap className="w-5 h-5" />,
      cardClass: 'stat-card-green',
      iconClass: 'text-green-600'
    },
    { 
      title: 'Full Time Scholars', 
      value: '89', 
      icon: <User className="w-5 h-5" />,
      cardClass: 'stat-card-purple',
      iconClass: 'text-purple-600'
    },
    { 
      title: 'Part Time Scholars', 
      value: '67', 
      icon: <UserCheck className="w-5 h-5" />,
      cardClass: 'stat-card-yellow',
      iconClass: 'text-yellow-600'
    },
    { 
      title: 'Forwarded Scholars', 
      value: '134', 
      icon: <User className="w-5 h-5" />,
      cardClass: 'stat-card-red',
      iconClass: 'text-red-600'
    },
    { 
      title: 'Pending Scholars', 
      value: '22', 
      icon: <UserCheck className="w-5 h-5" />,
      cardClass: 'stat-card-cyan',
      iconClass: 'text-cyan-600'
    }
  ];

  // Mock department data
  const departmentData = [
    { name: 'Computer Science Engineering', fullTime: 15, partTime: 12, forwarded: 25, pending: 2, total: 27 },
    { name: 'Mechanical Engineering', fullTime: 12, partTime: 8, forwarded: 18, pending: 2, total: 20 },
    { name: 'Electrical and Electronics Engineering', fullTime: 10, partTime: 9, forwarded: 17, pending: 2, total: 19 },
    { name: 'Electronics and Communication Engineering', fullTime: 8, partTime: 7, forwarded: 13, pending: 2, total: 15 },
    { name: 'Civil Engineering', fullTime: 9, partTime: 6, forwarded: 13, pending: 2, total: 15 },
    { name: 'Biomedical Engineering', fullTime: 7, partTime: 5, forwarded: 11, pending: 1, total: 12 },
    { name: 'Chemical Engineering', fullTime: 6, partTime: 4, forwarded: 9, pending: 1, total: 10 },
    { name: 'Biotechnology', fullTime: 5, partTime: 3, forwarded: 7, pending: 1, total: 8 }
  ];

  const facultyTotals = departmentData.reduce((acc, dept) => ({
    fullTime: acc.fullTime + dept.fullTime,
    partTime: acc.partTime + dept.partTime,
    forwarded: acc.forwarded + dept.forwarded,
    pending: acc.pending + dept.pending,
    total: acc.total + dept.total
  }), { fullTime: 0, partTime: 0, forwarded: 0, pending: 0, total: 0 });
  
  // recentApplications now imported from centralized demo data (src/data/demoData.js)
  
  // Filter applications based on search term
  const filteredApplications = recentApplications.filter(app => 
    Object.values(app).some(
      val => typeof val === 'string' && 
      val.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );
  
  // Get current applications for pagination
  const indexOfLastApp = currentPage * rowsPerPage;
  const indexOfFirstApp = indexOfLastApp - rowsPerPage;
  const currentApplications = filteredApplications.slice(indexOfFirstApp, indexOfLastApp);
  
  // Change page
  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  // Format date
  const formatDate = (dateString) => {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('en-US', options);
  };

  // Convert shared Drive URLs to preview/embed URLs where possible
  const getDrivePreviewUrl = (url) => {
    if (!url) return null;
    try {
      const u = new URL(url);
      const hostname = u.hostname.toLowerCase();
      // Google Drive: /file/d/<id>/view or open?id=<id>
      if (hostname.includes('drive.google.com')) {
        const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (fileIdMatch && fileIdMatch[1]) return `https://drive.google.com/file/d/${fileIdMatch[1]}/preview`;
        const idParam = u.searchParams.get('id');
        if (idParam) return `https://drive.google.com/file/d/${idParam}/preview`;
      }
      // Google Docs/Sheets/Slides: convert /d/<id>/... to preview where possible
      if (hostname.includes('docs.google.com')) {
        const fileIdMatch = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
        if (fileIdMatch && fileIdMatch[1]) return `https://docs.google.com/document/d/${fileIdMatch[1]}/preview`;
      }
      // OneDrive short links or live links typically redirect to a preview — return as-is
      if (hostname.includes('1drv.ms') || hostname.includes('onedrive.live.com')) {
        return url;
      }
      // If it's a direct link to a PDF or common doc, return as-is
      return url;
    } catch (e) {
      return url;
    }
  };

  const openDocument = (e, app) => {
    e.preventDefault();
    const url = app.certificateUrl || app.docUrl || app.documentUrl;
    if (!url) {
      if (typeof showMessage === 'function') showMessage('No document available for this application.');
      return;
    }
    const preview = getDrivePreviewUrl(url) || url;
    // Use a safe anchor element to open with rel="noopener noreferrer"
    const a = document.createElement('a');
    a.href = preview;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    // Ensure opening in new tab even if the link also has target/rel on the DOM
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div id="panel-dashboard" className="panel-fullscreen min-h-screen bg-gray-50">
      <style>{`
        .content-wrapper {
          padding: 1.5rem;
        }
        .dashboard-container {
          max-width: 1200px;
          margin: 0 auto;
        }
        .dashboard-header {
          margin-bottom: 2rem;
        }
        .dashboard-title {
          font-size: 2rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.5rem;
        }
        .dashboard-subtitle {
          color: #6b7280;
          font-size: 1rem;
        }
        .dashboard-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }
        .stat-card {
          background: white;
          border-radius: 0.75rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e7eb;
        }
        .stat-card-blue { border-left: 4px solid #3b82f6; }
        .stat-card-green { border-left: 4px solid #10b981; }
        .stat-card-purple { border-left: 4px solid #8b5cf6; }
        .stat-card-yellow { border-left: 4px solid #f59e0b; }
        .stat-card-red { border-left: 4px solid #ef4444; }
        .stat-card-cyan { border-left: 4px solid #06b6d4; }
        .stat-icon-wrapper {
          background: #f9fafb;
          border-radius: 0.5rem;
          padding: 0.75rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .chart-card {
          background: white;
          border-radius: 0.75rem;
          padding: 1.5rem;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06);
          border: 1px solid #e5e7eb;
        }
        .chart-header {
          margin-bottom: 1.5rem;
        }
        .chart-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
        }
        .activity-item {
          cursor: pointer;
          padding: 1rem;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          transition: all 0.2s;
        }
        .activity-item:hover {
          background: #f8fafc;
        }
        .activity-icon {
          margin-right: 0.75rem;
        }
        .activity-content {
          display: flex;
          justify-content: space-between;
          align-items: center;
          width: 100%;
        }
        .department-table-container {
          margin-top: 1rem;
          padding: 1rem;
          background: #f8fafc;
          border-radius: 0.5rem;
        }
        .faculty-info {
          margin-bottom: 1rem;
          font-weight: 700;
          color: #1e40af;
        }
        .department-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
          border-radius: 0.5rem;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        .department-table th {
          background: #f1f5f9;
          padding: 0.75rem;
          text-align: left;
          font-weight: 600;
          color: #374151;
          border-bottom: 1px solid #e5e7eb;
        }
        .department-table td {
          padding: 0.75rem;
          border-bottom: 1px solid #f1f5f9;
        }
        .faculty-total-row {
          background: #eff6ff;
          font-weight: 600;
        }
        .faculty-total-row td {
          border-top: 2px solid #3b82f6;
        }
      `}</style>

      <div className="content-wrapper">
        <div className="dashboard-container">
          <div className="dashboard-header">
            <h1 className="dashboard-title">Dashboard - Faculty of Engineering & Technology</h1>
            <p className="dashboard-subtitle">Faculty Overview and Statistics</p>
          </div>

          <div className="dashboard-stats-grid">
            {stats.map((stat, index) => (
              <div key={index} className={`stat-card ${stat.cardClass}`}>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                    <p className="text-2xl font-semibold text-gray-900">{stat.value}</p>
                  </div>
                  <div className={`stat-icon-wrapper ${stat.iconClass}`}>
                    {stat.icon}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="chart-card">
            <div className="chart-header">
              <h3 className="chart-title">Faculty & Department Overview</h3>
            </div>
            <div>
              <div 
                className="activity-item" 
                onClick={() => setFacultyExpanded(!facultyExpanded)}
              >
                <div className="activity-icon">
                  <ChevronRight 
                    className={`transition-transform duration-300 ${facultyExpanded ? 'rotate-90' : ''}`} 
                    style={{ width: '1rem', height: '1rem' }}
                  />
                </div>
                <div className="activity-content">
                  <span style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--secondary-blue, #1e40af)' }}>
                    Faculty of Engineering & Technology
                  </span>
                </div>
              </div>
              
              <div className={`${facultyExpanded ? 'block' : 'hidden'} transition-all duration-500 ease-in-out`}>
                <div className="department-table-container">
                  <div className="faculty-info">
                    <strong>Faculty of Engineering & Technology</strong>
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
                      {departmentData.map((dept, index) => (
                        <tr key={index}>
                          <td>{dept.name}</td>
                          <td>{dept.fullTime}</td>
                          <td>{dept.partTime}</td>
                          <td>{dept.forwarded}</td>
                          <td>{dept.pending}</td>
                          <td>{dept.total}</td>
                        </tr>
                      ))}
                      <tr className="faculty-total-row">
                        <td>FACULTY TOTAL</td>
                        <td>{facultyTotals.fullTime}</td>
                        <td>{facultyTotals.partTime}</td>
                        <td>{facultyTotals.forwarded}</td>
                        <td>{facultyTotals.pending}</td>
                        <td>{facultyTotals.total}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
