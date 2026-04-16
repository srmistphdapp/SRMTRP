import { useState, useEffect } from 'react';
import { ArrowUpDown, SlidersHorizontal, Download, Send, X, Eye, Check } from 'lucide-react';
import { useAppContext } from '../../../App';
import * as XLSX from 'xlsx';
import { getDepartmentFromProgram, constructFacultyStatus, validateScholarForForwarding } from '../../../utils/departmentMapping';
import { updateScholarFacultyStatus, batchUpdateScholarsFacultyStatus } from '../../../services/supabaseService';
import { supabase } from '../../../../../supabaseClient';

const AdminForwardPage = ({ onBackToDepartment, activeToggle, onToggleChange }) => {
  const {
    scholarSortOrder,
    setScholarSortOrder,
    showMessageBox,
    adminScholarsData,
    setAdminScholarsData,
    isLoadingSupabase,
    assignedFaculty,
    coordinatorInfo,
    refreshScholarsData
  } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredScholars, setFilteredScholars] = useState([]);
  const [selectedScholarIds, setSelectedScholarIds] = useState([]);

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedScholar, setSelectedScholar] = useState(null);
  const [actionType, setActionType] = useState('');
  const [confirmAgreed, setConfirmAgreed] = useState(false);
  const [forwardingCount, setForwardingCount] = useState(0);

  // Filter states
  const [tempFilters, setTempFilters] = useState({
    type: 'All Types',
    departmentReview: 'All Reviews',
    department: 'All Departments'
  });

  const [activeFilters, setActiveFilters] = useState({
    type: 'All Types',
    departmentReview: 'All Reviews',
    department: 'All Departments'
  });

  // Helper function to determine status based on faculty_forward column
  const getScholarStatus = (scholar) => {
    // If faculty_forward has a value (like "Back_To_Director"), status is "Forwarded"
    // Otherwise, status is "Pending"
    if (!scholar) return 'Pending';
    return scholar.faculty_forward ? 'Forwarded' : 'Pending';
  };

  // Filter and sort Supabase data only
  useEffect(() => {
    if (!adminScholarsData || adminScholarsData.length === 0) {
      setFilteredScholars([]);
      return;
    }

    let scholars = [...adminScholarsData].map(s => ({
      ...s,
      status: getScholarStatus(s)
    }));

    // Apply active filters
    if (activeFilters.type !== 'All Types') {
      scholars = scholars.filter(s => {
        const scholarType = (s.type || s.program_type || '').toLowerCase();
        if (activeFilters.type === 'Full Time') return scholarType.includes('full time') || scholarType === 'ft';
        if (activeFilters.type === 'Part Time') return scholarType.includes('part time') || scholarType === 'pt';
        return true;
      });
    }

    if (activeFilters.departmentReview !== 'All Reviews') {
      scholars = scholars.filter(s => {
        const review = (s.dept_review || 'Pending').toLowerCase();
        const filterValue = activeFilters.departmentReview.toLowerCase();
        if (filterValue === 'approved') return review === 'approved' || review === 'accepted';
        if (filterValue === 'rejected') return review === 'rejected';
        if (filterValue === 'query') return review === 'query';
        return true;
      });
    }

    if (activeFilters.department !== 'All Departments') {
      scholars = scholars.filter(s => (s.department || '') === activeFilters.department);
    }

    // Apply search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      scholars = scholars.filter(s =>
        (s.registered_name || '').toLowerCase().includes(searchLower) ||
        (s.application_no || '').toLowerCase().includes(searchLower) ||
        (s.institution || s.faculty || '').toLowerCase().includes(searchLower) ||
        (s.department || '').toLowerCase().includes(searchLower) ||
        (s.type || '').toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting by status - Forwarded first, Pending last
    scholars.sort((a, b) => {
      const statusA = a.status; // 'Forwarded' or 'Pending'
      const statusB = b.status;

      if (scholarSortOrder === 'asc') {
        // Forwarded first, Pending last
        if (statusA === 'Forwarded' && statusB === 'Pending') return -1;
        if (statusA === 'Pending' && statusB === 'Forwarded') return 1;
        return 0;
      } else {
        // Pending first, Forwarded last (reversed)
        if (statusA === 'Pending' && statusB === 'Forwarded') return -1;
        if (statusA === 'Forwarded' && statusB === 'Pending') return 1;
        return 0;
      }
    });

    setFilteredScholars(scholars);
  }, [activeFilters, searchTerm, scholarSortOrder, adminScholarsData]);

  // Filter Handlers
  const handleApplyFilters = () => {
    setActiveFilters({ ...tempFilters });
    setShowFilterModal(false);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      type: 'All Types',
      departmentReview: 'All Reviews',
      department: 'All Departments'
    };
    setTempFilters(clearedFilters);
    setActiveFilters(clearedFilters);
    setShowFilterModal(false);
  };

  // Get unique filter options
  const getUniqueTypes = () => {
    return ['All Types', 'Full Time', 'Part Time'];
  };

  const getUniqueDepartmentReviews = () => {
    return ['All Reviews', 'Approved', 'Rejected', 'Query'];
  };

  const getUniqueDepartments = () => {
    const depts = new Set(['All Departments']);
    adminScholarsData.forEach(s => {
      const dept = (s.department || '').trim();
      if (dept) depts.add(dept);
    });
    return Array.from(depts).sort();
  };

  // Checkbox Handlers — only scholars with faculty_forward === null are selectable
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allSelectableIds = filteredScholars
        .filter(s => !s.faculty_forward)
        .map(s => s.id);
      setSelectedScholarIds(allSelectableIds);
    } else {
      setSelectedScholarIds([]);
    }
  };

  const handleSelectOne = (e, scholarId) => {
    if (e.target.checked) {
      setSelectedScholarIds(prev => [...prev, scholarId]);
    } else {
      setSelectedScholarIds(prev => prev.filter(id => id !== scholarId));
    }
  };

  const handleDownloadExcel = (mode = 'all') => {
    try {
      const scholarsToDownload = mode === 'selected'
        ? filteredScholars.filter(s => selectedScholarIds.includes(s.id))
        : filteredScholars;

      if (scholarsToDownload.length === 0) {
        showMessageBox('No scholars available to download', 'warning');
        return;
      }

      const excelData = scholarsToDownload.map((scholar) => ({
        'Form Name': scholar.form_name || 'PhD Application Form',
        'Registered Name': scholar.registered_name || '-',
        'Application No': scholar.application_no || '-',
        'Have You Graduated From India?': scholar.graduated_from_india || 'Yes',
        'Course': scholar.course || '-',
        'Select Institution': scholar.institution || scholar.faculty || '-',
        'Department': scholar.department || '-',
        'Type': scholar.type || scholar.program_type || '-',
        'Certificates (Link)': scholar.certificates || '-',
        '1 - Employee Id': scholar.employee_id || '-',
        '1 - Designation': scholar.designation || '-',
        '1 - Organization Name': scholar.organization_name || '-',
        '1 - Organization Address': scholar.organization_address || '-',
        'Mobile Number': scholar.mobile_number || '-',
        'Email ID': scholar.email || '-',
        'Date Of Birth': scholar.date_of_birth || '-',
        'Gender': scholar.gender || '-',
        'Are You Differently Abled ?': scholar.differently_abled ? 'Yes' : 'No',
        'Nature Of Deformity': scholar.nature_of_deformity || '-',
        'Percentage Of Deformity': scholar.percentage_of_deformity || '-',
        'Nationality': scholar.nationality || 'Indian',
        'Aadhaar Card No.': scholar.aadhaar_no || '-',
        'Mode Of Profession (Industry/Academic)': scholar.mode_of_profession || '-',
        'Area Of Interest': scholar.area_of_interest || '-',
        'UG - Current Education Qualification': scholar.ug_qualification || '-',
        'UG - Institute Name': scholar.ug_institute || '-',
        'UG - Degree': scholar.ug_degree || '-',
        'UG - Specialization': scholar.ug_specialization || '-',
        'UG - Marking Scheme': scholar.ug_marking_scheme || '-',
        'UG - CGPA Or Percentage': scholar.ug_cgpa || '-',
        'UG - Month & Year': scholar.ug_month_year || '-',
        'UG - Registration No.': scholar.ug_registration_no || '-',
        'UG - Mode Of Study': scholar.ug_mode_of_study || '-',
        'UG - Place Of The Institution': scholar.ug_place_of_institution || '-',
        'PG - Current Education Qualification': scholar.pg_qualification || '-',
        'PG - Institute Name': scholar.pg_institute || '-',
        'PG - Degree': scholar.pg_degree || '-',
        'PG - Specialization': scholar.pg_specialization || '-',
        'PG - Marking Scheme': scholar.pg_marking_scheme || '-',
        'PG - CGPA Or Percentage': scholar.pg_cgpa || '-',
        'PG - Month & Year': scholar.pg_month_year || '-',
        'PG - Registration No.': scholar.pg_registration_no || '-',
        'PG - Mode Of Study': scholar.pg_mode_of_study || '-',
        'PG - Place Of The Institution': scholar.pg_place_of_institution || '-',
        'Other Degree - Current Education Qualification': scholar.other_qualification || '-',
        'Other Degree - Institute Name': scholar.other_institute || '-',
        'Other Degree - Degree': scholar.other_degree || '-',
        'Other Degree - Specialization': scholar.other_specialization || '-',
        'Other Degree - Marking Scheme': scholar.other_marking_scheme || '-',
        'Other Degree - CGPA Or Percentage': scholar.other_cgpa || '-',
        'Other Degree - Month & Year': scholar.other_month_year || '-',
        'Other Degree - Registration No.': scholar.other_registration_no || '-',
        'Other Degree - Mode Of Study': scholar.other_mode_of_study || '-',
        'Other Degree - Place Of The Institution': scholar.other_place_of_institution || '-',
        'Have You Taken Any Competitive Exam?': scholar.competitive_exam || 'No',
        '1. - Name Of The Exam': scholar.exam1_name || '-',
        '1. - Registration No./Roll No.': scholar.exam1_reg_no || '-',
        '1. - Score Obtained': scholar.exam1_score || '-',
        '1. - Max Score': scholar.exam1_max_score || '-',
        '1. - Year Appeared': scholar.exam1_year || '-',
        '1. - AIR/Overall Rank': scholar.exam1_rank || '-',
        '1. - Qualified/Not Qualified': scholar.exam1_qualified || '-',
        '2. - Name Of The Exam': scholar.exam2_name || '-',
        '2. - Registration No./Roll No.': scholar.exam2_reg_no || '-',
        '2. - Score Obtained': scholar.exam2_score || '-',
        '2. - Max Score': scholar.exam2_max_score || '-',
        '2. - Year Appeared': scholar.exam2_year || '-',
        '2. - AIR/Overall Rank': scholar.exam2_rank || '-',
        '2. - Qualified/Not Qualified': scholar.exam2_qualified || '-',
        '3. - Name Of The Exam': scholar.exam3_name || '-',
        '3. - Registration No./Roll No.': scholar.exam3_reg_no || '-',
        '3. - Score Obtained': scholar.exam3_score || '-',
        '3. - Max Score': scholar.exam3_max_score || '-',
        '3. - Year Appeared': scholar.exam3_year || '-',
        '3. - AIR/Overall Rank': scholar.exam3_rank || '-',
        '3. - Qualified/Not Qualified': scholar.exam3_qualified || '-',
        'Describe In 300 Words; Your Reasons For Applying To The Proposed Program; Your Study Interests/future Career Plans, And Other Interests That Drives You To Apply To The Program.': scholar.reasons_for_applying || '-',
        'Title And Abstract Of The Master Degree Thesis And Your Research Interest In 500 Words': scholar.research_interest || '-',
        'Department Review': scholar.dept_review || '-',
        'Reject Reason': scholar.reject_reason || '-',
        'Queries': (scholar.dept_review === 'Query' ? (scholar.dept_query || '-') : '-'),
        'Status': getScholarStatus(scholar) || '-',
        'User Id': scholar.user_id || '-'
      }));
      const ws = XLSX.utils.json_to_sheet(excelData);
      ws['!cols'] = Array(Object.keys(excelData[0] || {}).length).fill({ wch: 20 });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Verified Scholars');

      const fileNameStr = mode === 'selected' ? 'Selected_Verified_Scholars' : 'All_Verified_Scholars';
      XLSX.writeFile(wb, `${fileNameStr}_${new Date().toISOString().split('T')[0]}.xlsx`);

      showMessageBox('Excel file downloaded successfully!', 'success');
    } catch (error) {
      showMessageBox('Error downloading Excel file.', 'error');
    }
  };

  // Toggle handlers
  const handleDepartment = () => {
    onToggleChange('department');
    showMessageBox('Switched to Department view...', 'info');
  };

  const handleAdminForward = () => {
    onToggleChange('admin');
    showMessageBox('Switched to Admin Forward view...', 'info');
  };
  const handleForwardAll = async () => {
    if (selectedScholarIds.length === 0) {
      showMessageBox('Please select scholars to forward.', 'warning');
      return;
    }

    const scholarsToForward = filteredScholars.filter(s =>
      selectedScholarIds.includes(s.id)
    );

    if (scholarsToForward.length === 0) {
      showMessageBox('No scholars selected to forward.', 'warning');
      return;
    }

    setForwardingCount(scholarsToForward.length);
    setSelectedScholar(null); // Clear selectedScholar for bulk forwarding
    setConfirmAgreed(false);
    setActionType('forward');
    setConfirmAction(() => async () => {
      await performForwarding(scholarsToForward);
    });
    setShowConfirmModal(true);
  };

  const handleForwardSingle = async (scholar) => {
    setSelectedScholar(scholar);
    setForwardingCount(1);
    setConfirmAgreed(false);
    setActionType('forward');
    setConfirmAction(() => async () => {
      await performForwarding([scholar]);
    });
    setShowConfirmModal(true);
  };

  const performForwarding = async (scholarsToForward) => {
    try {
      console.log('🔄 Starting forward process for scholars:', scholarsToForward);

      const updatePromises = scholarsToForward.map(scholar => {
        console.log(`📝 Updating scholar ${scholar.id} (${scholar.registered_name}) - setting faculty_forward to 'Back_To_Director'`);
        return supabase
          .from('scholar_applications')
          .update({ faculty_forward: 'Back_To_Director' })
          .eq('id', scholar.id)
          .select();
      });

      const results = await Promise.all(updatePromises);

      results.forEach((result, index) => {
        if (result.error) {
          console.error(`❌ Error updating scholar ${scholarsToForward[index].id}:`, result.error);
        } else {
          console.log(`✅ Successfully updated scholar ${scholarsToForward[index].id}:`, result.data);
        }
      });

      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('❌ Errors during forwarding:', errors);
        showMessageBox(
          `${errors.length} scholar(s) failed to forward. Please check console for details.`,
          'error'
        );
        return;
      }

      console.log(`✓ Successfully forwarded ${scholarsToForward.length} scholars to admin`);
      showMessageBox(
        `${scholarsToForward.length} scholar(s) successfully forwarded back to admin!`,
        'success'
      );
      setSelectedScholarIds([]);
      setShowConfirmModal(false);
      setConfirmAgreed(false);

      // Refresh data from server to show updated statuses
      await refreshScholarsData();
    } catch (err) {
      console.error('❌ Exception during forwarding:', err);
      showMessageBox('An error occurred while forwarding scholars. Check console for details.', 'error');
    }
  };

  const handleViewScholar = (scholar) => {
    setSelectedScholar(scholar);
    setShowViewModal(true);
  };

  const getStatusInfo = (scholar) => {
    const status = getScholarStatus(scholar);
    const className = status.toLowerCase();
    return { text: status, className };
  };

  // Helper function to clean program name (remove brackets and content)
  const cleanProgramName = (programString) => {
    if (!programString) return '';
    const cleanMatch = programString.match(/^([^(]+)/);
    if (cleanMatch) {
      return cleanMatch[1].trim();
    }
    return programString;
  };

  // Helper function to extract program type from program string
  const extractProgramType = (programString) => {
    if (!programString) return '';
    const typeMatch = programString.match(/\(([^)]+)\)/);
    if (typeMatch) {
      return typeMatch[1].trim();
    }
    return '';
  };

  // Only allow selecting scholars where faculty_forward is null
  const selectableScholars = filteredScholars.filter(s => !s.faculty_forward);
  const isAllSelected = selectableScholars.length > 0 && selectableScholars.every(s => selectedScholarIds.includes(s.id));

  return (
    <div className="scholar-management-wrapper admin-forward-page">
      <div className="scholar-header-section">
        <h1 className="scholar-page-title">Scholar Administration</h1>
        <div className="scholar-controls-section">
          <div className="scholar-search-container">
            <input
              type="text"
              placeholder="Search scholars..."
              className="scholar-search-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <button
            title="Sort"
            className="scholar-control-button"
            onClick={() => {
              const newOrder = scholarSortOrder === 'asc' ? 'desc' : 'asc';
              setScholarSortOrder(newOrder);
            }}
          >
            <ArrowUpDown size={20} />
          </button>
          <button
            title="Filter"
            className="scholar-control-button"
            onClick={() => setShowFilterModal(true)}
          >
            <SlidersHorizontal size={20} />
          </button>
        </div>
      </div>

      <div className="scholar-action-buttons">
        <button
          onClick={handleForwardAll}
          className="action-btn forward-btn"
          style={{
            backgroundColor: '#16a34a',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '0.875rem'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#15803d';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#16a34a';
          }}
        >
          <Send size={16} /> Forward
        </button>
        <button
          onClick={() => setShowDownloadModal(true)}
          className="action-btn download-btn-orange"
          style={{
            backgroundColor: '#ea580c',
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.75rem 1rem',
            border: 'none',
            borderRadius: '0.5rem',
            fontWeight: '600',
            cursor: 'pointer',
            fontSize: '0.875rem',
            opacity: '1',
            visibility: 'visible'
          }}
          onMouseEnter={(e) => {
            e.target.style.backgroundColor = '#c2410c';
            e.target.style.opacity = '1';
            e.target.style.visibility = 'visible';
          }}
          onMouseLeave={(e) => {
            e.target.style.backgroundColor = '#ea580c';
            e.target.style.opacity = '1';
            e.target.style.visibility = 'visible';
          }}
        >
          <Download size={16} /> Download
        </button>
      </div>

      <div className="scholar-table-container">
        <table className="scholars-table">
          <thead>
            <tr>
              <th className="select-col-header">
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                  <input type="checkbox" className="table-checkbox" onChange={handleSelectAll} checked={isAllSelected} style={{ margin: '0' }} />
                </div>
              </th>
              <th>S.NO</th>
              <th>REGISTERED NAME</th>
              <th>APPLICATION NO</th>
              <th>SELECT INSTITUTION</th>
              <th>SELECT PROGRAM</th>
              <th>TYPE</th>
              <th>MOBILE NUMBER</th>
              <th>EMAIL ID</th>
              <th>GENDER</th>
              <th>CERTIFICATES</th>
              <th>DEPARTMENT REVIEW</th>
              <th>REJECT REASON</th>
              <th>QUERIES</th>
              <th>STATUS</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {filteredScholars.length > 0 ? (
              filteredScholars.map((scholar, index) => {
                const status = getStatusInfo(scholar);
                return (
                  <tr key={scholar.id}>
                    <td className="text-center">
                      <input
                        type="checkbox"
                        className="table-checkbox"
                        checked={selectedScholarIds.includes(scholar.id)}
                        onChange={(e) => handleSelectOne(e, scholar.id)}
                        disabled={!!scholar.faculty_forward}
                        style={{ margin: '0', transform: 'scale(1.1)', cursor: scholar.faculty_forward ? 'not-allowed' : 'pointer', opacity: scholar.faculty_forward ? 0.4 : 1 }}
                      />
                    </td>
                    <td className="text-center">{index + 1}</td>
                    <td>{scholar.registered_name}</td>
                    <td>{scholar.application_no}</td>
                    <td>{scholar.institution || scholar.faculty}</td>
                    <td>{scholar.department || '-'}</td>
                    <td>{scholar.type || scholar.program_type || '-'}</td>
                    <td>{scholar.mobile_number}</td>
                    <td>{scholar.email}</td>
                    <td>{scholar.gender}</td>
                    <td className="text-center">
                      {scholar.certificates ? (
                        <a href={scholar.certificates} target="_blank" rel="noopener noreferrer" className="certificate-link">View Docs</a>
                      ) : (
                        <span className="text-gray-400"></span>
                      )}
                    </td>
                    <td className="text-center">
                      <span className={`department-review-badge ${(scholar.dept_review || '').toLowerCase().replace(' ', '-')}`}>
                        {scholar.dept_review || 'Pending'}
                      </span>
                    </td>
                    <td className="reason-column">
                      {scholar.reject_reason ? (
                        <span className="reason-text">
                          {scholar.reject_reason}
                        </span>
                      ) : (
                        <span className="no-reason"></span>
                      )}
                    </td>
                    <td className="reason-column">
                      {scholar.dept_review === 'Query' && scholar.dept_query ? (
                        <span className="reason-text">
                          {scholar.dept_query}
                        </span>
                      ) : (
                        <span className="no-reason"></span>
                      )}
                    </td>
                    <td className="text-center"><span className={`status-badge ${getStatusInfo(scholar).className}`}>{getStatusInfo(scholar).text}</span></td>
                    <td className="text-center">
                      <button
                        onClick={() => handleViewScholar(scholar)}
                        className="table-action-btn view-btn"
                        title="View Details"
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '12px',
                          backgroundColor: '#A855F7',
                          color: 'white',
                          border: 'none',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 2px 8px rgba(168, 85, 247, 0.3)'
                        }}
                      >
                        <Eye size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="16" className="text-center" style={{ padding: '4rem 2rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
                    <svg
                      width="64"
                      height="64"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      style={{ color: '#9ca3af', opacity: 0.5 }}
                    >
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                    <div>
                      <p style={{ fontSize: '1.125rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                        No Scholars Found
                      </p>
                      <p style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
                        {searchTerm || activeFilters.type !== 'All Types' || activeFilters.departmentReview !== 'All Reviews' || activeFilters.department !== 'All Departments'
                          ? 'Try adjusting your search or filter criteria'
                          : 'No scholars ready to forward back to admin'}
                      </p>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODALS --- */}
      {showViewModal && selectedScholar && (
        <div className="modal-overlay" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white w-full max-w-6xl max-h-[90vh] overflow-y-auto" style={{ margin: 'auto', position: 'relative', zIndex: 10000, border: '1px solid #d1d5db' }}>
            <div className="sticky top-0 bg-white border-b border-gray-300 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Scholar Details</h2>
              <button onClick={() => setShowViewModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6">
              {/* Basic Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 bg-gray-100 p-3 border-b border-gray-300">Basic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Form Name:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.form_name || 'PhD Application Form'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Registered Name:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.registered_name || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Application No:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.application_no || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Have You Graduated From India?:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.graduated_from_india || 'Yes'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Course:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.course || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Select Institution:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.institution || selectedScholar.faculty || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Department:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.department || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Type:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.type || selectedScholar.program_type || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Certificates Drive Link:</label>
                    {selectedScholar.certificates ? (
                      <a href={selectedScholar.certificates} target="_blank" rel="noopener noreferrer" className="view-value" style={{ fontSize: '0.9375rem', color: '#2563eb', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block', textDecoration: 'underline' }}>View Certificates</a>
                    ) : (
                      <span className="view-value" style={{ fontSize: '0.9375rem', color: '#9ca3af', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>-</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Employment Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 bg-gray-100 p-3 border-b border-gray-300">Employment Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>1 - Employee Id:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.employee_id || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>1 - Designation:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.designation || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>1 - Organization Name:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.organization_name || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>1 - Organization Address:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.organization_address || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 bg-gray-100 p-3 border-b border-gray-300">Personal Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mobile Number:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.mobile_number || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Email ID:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.email || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Date Of Birth:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.date_of_birth || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Gender:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.gender || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Are You Differently Abled?:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.differently_abled ? 'Yes' : 'No'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nature Of Deformity:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.nature_of_deformity || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Percentage Of Deformity:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.percentage_of_deformity || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Nationality:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.nationality || 'Indian'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Aadhaar Card No.:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.aadhaar_no || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Mode Of Profession (Industry/Academic):</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.mode_of_profession || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Area Of Interest:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.area_of_interest || '-'}</span>
                  </div>
                </div>
              </div>

              {/* UG Education Details */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 bg-gray-100 p-3 border-b border-gray-300">UG - Education Qualification</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>UG - Current Education Qualification:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.ug_qualification || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>UG - Institute Name:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.ug_institute || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>UG - Degree:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.ug_degree || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>UG - Specialization:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.ug_specialization || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>UG - Marking Scheme:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.ug_marking_scheme || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>UG - CGPA Or Percentage:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.ug_cgpa || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>UG - Month & Year:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.ug_month_year || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>UG - Registration No.:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.ug_registration_no || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>UG - Mode Of Study:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.ug_mode_of_study || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>UG - Place Of The Institution:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.ug_place_of_institution || '-'}</span>
                  </div>
                </div>
              </div>

              {/* PG Education Details */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 bg-gray-100 p-3 border-b border-gray-300">PG - Education Qualification</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PG - Current Education Qualification:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.pg_qualification || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PG - Institute Name:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.pg_institute || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PG - Degree:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.pg_degree || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PG - Specialization:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.pg_specialization || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PG - Marking Scheme:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.pg_marking_scheme || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PG - CGPA Or Percentage:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.pg_cgpa || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PG - Month & Year:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.pg_month_year || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PG - Registration No.:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.pg_registration_no || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PG - Mode Of Study:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.pg_mode_of_study || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PG - Place Of The Institution:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.pg_place_of_institution || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Application Status */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 bg-gray-100 p-3 border-b border-gray-300">Application Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Status:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.status || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Faculty:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.faculty || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Department:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.department || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Type:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.type || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>User Id:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.user_id || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Other Degree Education */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 bg-gray-100 p-3 border-b border-gray-300">Other Degree - Education Qualification</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Other Degree - Current Education Qualification:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.other_qualification || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Other Degree - Institute Name:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.other_institute || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Other Degree - Degree:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.other_degree || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Other Degree - Specialization:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.other_specialization || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Other Degree - Marking Scheme:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.other_marking_scheme || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Other Degree - CGPA Or Percentage:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.other_cgpa || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Other Degree - Month & Year:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.other_month_year || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Other Degree - Registration No.:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.other_registration_no || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Other Degree - Mode Of Study:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.other_mode_of_study || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Other Degree - Place Of The Institution:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.other_place_of_institution || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Competitive Exams */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 bg-gray-100 p-3 border-b border-gray-300">Competitive Exams</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Have You Taken Any Competitive Exam?:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.competitive_exam || 'No'}</span>
                  </div>
                </div>

                {/* Exam 1 */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-800 mb-3">1. Exam Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-4">
                    <div className="view-field">
                      <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>1. - Name Of The Exam:</label>
                      <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.exam1_name || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>1. - Registration No./Roll No.:</label>
                      <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.exam1_reg_no || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>1. - Score Obtained:</label>
                      <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.exam1_score || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>1. - Max Score:</label>
                      <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.exam1_max_score || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>1. - Year Appeared:</label>
                      <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.exam1_year || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>1. - AIR/Overall Rank:</label>
                      <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.exam1_rank || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>1. - Qualified/Not Qualified:</label>
                      <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.exam1_qualified || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Exam 2 */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-800 mb-3">2. Exam Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-4">
                    <div className="view-field">
                      <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>2. - Name Of The Exam:</label>
                      <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.exam2_name || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>2. - Registration No./Roll No.:</label>
                      <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.exam2_reg_no || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>2. - Score Obtained:</label>
                      <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.exam2_score || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>2. - Max Score:</label>
                      <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.exam2_max_score || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>2. - Year Appeared:</label>
                      <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.exam2_year || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>2. - AIR/Overall Rank:</label>
                      <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.exam2_rank || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>2. - Qualified/Not Qualified:</label>
                      <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.exam2_qualified || '-'}</span>
                    </div>
                  </div>
                </div>

                {/* Exam 3 */}
                <div className="mb-6">
                  <h4 className="text-md font-medium text-gray-800 mb-3">3. Exam Details</h4>
                  <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-4 gap-4">
                    <div className="view-field">
                      <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>3. - Name Of The Exam:</label>
                      <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.exam3_name || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>3. - Registration No./Roll No.:</label>
                      <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.exam3_reg_no || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>3. - Score Obtained:</label>
                      <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.exam3_score || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>3. - Max Score:</label>
                      <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.exam3_max_score || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>3. - Year Appeared:</label>
                      <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.exam3_year || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>3. - AIR/Overall Rank:</label>
                      <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.exam3_rank || '-'}</span>
                    </div>
                    <div className="view-field">
                      <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>3. - Qualified/Not Qualified:</label>
                      <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.exam3_qualified || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Research Interest & Essays */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 bg-gray-100 p-3 border-b border-gray-300">Research Interest & Essays</h3>
                <div className="grid grid-cols-1 gap-4">
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Describe In 300 Words; Your Reasons For Applying To The Proposed Program; Your Study Interests/future Career Plans, And Other Interests That Drives You To Apply To The Program.:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{selectedScholar.reasons_for_applying || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Title And Abstract Of The Master Degree Thesis And Your Research Interest In 500 Words:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block', whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{selectedScholar.research_interest || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )
      }

      {/* Filter Modal */}
      {
        showFilterModal && (
          <div className="examination-modal-overlay">
            <div className="examination-modal">
              <div className="examination-modal-header">
                <h3>Filter Options</h3>
                <button className="examination-modal-close" onClick={() => setShowFilterModal(false)}>✕</button>
              </div>
              <div className="examination-modal-body">
                <div className="examination-filter-group">
                  <label>Department</label>
                  <select
                    value={tempFilters.department}
                    onChange={(e) => setTempFilters(prev => ({ ...prev, department: e.target.value }))}
                    className="examination-filter-select"
                  >
                    {getUniqueDepartments().map(dept => (
                      <option key={dept} value={dept}>{dept}</option>
                    ))}
                  </select>
                </div>

                <div className="examination-filter-group">
                  <label>Type</label>
                  <select
                    value={tempFilters.type}
                    onChange={(e) => setTempFilters(prev => ({ ...prev, type: e.target.value }))}
                    className="examination-filter-select"
                  >
                    {getUniqueTypes().map(type => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </div>

                <div className="examination-filter-group">
                  <label>Department Review</label>
                  <select
                    value={tempFilters.departmentReview}
                    onChange={(e) => setTempFilters(prev => ({ ...prev, departmentReview: e.target.value }))}
                    className="examination-filter-select"
                  >
                    {getUniqueDepartmentReviews().map(review => (
                      <option key={review} value={review}>{review}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="examination-modal-footer">
                <button className="examination-btn examination-btn-clear" onClick={handleClearFilters}>Clear All</button>
                <button className="examination-btn examination-btn-apply" onClick={handleApplyFilters}>Apply Filters</button>
              </div>
            </div>
          </div>
        )
      }

      {
        showConfirmModal && (
          <div className="modal-overlay" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="modal-content max-w-md w-full">
              <h3 className="text-2xl font-bold mb-3">Confirm Forwarding</h3>
              <div className="mb-4 border rounded-lg p-4 bg-gray-50">
                <div className="text-sm text-gray-600">Admin Name: <span className="font-semibold">{coordinatorInfo?.name || 'Research Coordinator'}</span></div>
                <div className="text-sm text-gray-600">Role: <span className="font-semibold">Research Coordinator, {coordinatorInfo?.faculty || 'Faculty'}</span></div>
                <div className="text-sm text-gray-600">Email: <a href={`mailto:${coordinatorInfo?.email || ''}`} className="text-sky-600">{coordinatorInfo?.email || 'Not available'}</a></div>
              </div>
              <div className="mb-4">
                <h4 className="font-bold">Consent & Confirmation</h4>
                <ul className="list-disc list-inside text-sm text-gray-700 mt-2 space-y-1">
                  <li>I have thoroughly reviewed all submitted data</li>
                  <li>I have verified the authenticity of documents</li>
                  <li>This action will be recorded in the system</li>
                </ul>
              </div>
              <div className="mb-4">
                <label className="inline-flex items-center gap-2">
                  <input type="checkbox" className="mt-1" checked={confirmAgreed} onChange={e => setConfirmAgreed(e.target.checked)} />
                  <span className="text-sm whitespace-nowrap">I confirm I have read and agree to the above terms</span>
                </label>
              </div>
              <div className="mb-6 text-sm text-gray-700">You are about to <span className="font-bold">FORWARD</span> records {forwardingCount === 1 ? `for ${(() => {
                const s = selectedScholar || filteredScholars.find(x => selectedScholarIds.includes(x.id));
                return s ? s.registered_name : 'this scholar';
              })()}` : `for ${forwardingCount} scholars`} to the admin for further processing.</div>
              <div className="flex justify-end gap-3">
                <button onClick={() => { setShowConfirmModal(false); setConfirmAgreed(false); setSelectedScholar(null); }} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                <button onClick={confirmAction} disabled={!confirmAgreed} className={`py-2 px-4 rounded-lg font-bold text-white ${confirmAgreed ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-95' : 'bg-gray-300 cursor-not-allowed'}`}>Confirm Forward</button>
              </div>
            </div>
          </div>
        )
      }

      {/* Download Modal */}
      {showDownloadModal && (
        <div className="modal-overlay">
          <div className="download-modal-content">
            <div className="download-modal-header">
              <h3>Download Options</h3>
              <button onClick={() => setShowDownloadModal(false)} className="download-modal-close">
                <X size={20} />
              </button>
            </div>
            <p className="download-modal-description">Choose how you would like to download the scholar data.</p>
            <div className="download-options-list">
              <button
                className="download-option-btn download-option-all"
                onClick={() => {
                  handleDownloadExcel('all');
                  setShowDownloadModal(false);
                }}
              >
                <span>Download All Filtered</span>
                <span className="download-badge-all">{filteredScholars.length}</span>
              </button>
              <button
                className="download-option-btn download-option-selected"
                onClick={() => {
                  if (selectedScholarIds.length > 0) {
                    handleDownloadExcel('selected');
                    setShowDownloadModal(false);
                  }
                }}
                disabled={selectedScholarIds.length === 0}
              >
                <span>Download Selected Rows</span>
                <span className="download-badge-selected">{selectedScholarIds.length}</span>
              </button>
            </div>
            <div className="messagebox-buttons" style={{ marginTop: '20px' }}>
              <button onClick={() => setShowDownloadModal(false)} className="messagebox-btn messagebox-btn-cancel">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div >
  );
};

export default AdminForwardPage;