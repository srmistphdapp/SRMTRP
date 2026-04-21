import { useState, useEffect } from 'react';
import { ArrowUpDown, SlidersHorizontal, Download, Send, X, Eye, Check } from 'lucide-react';
import { useAppContext } from '../App';
import * as XLSX from 'xlsx';
import { getDepartmentFromProgram, constructFacultyStatus, validateScholarForForwarding } from '../utils/departmentMapping';
import { updateScholarFacultyStatus, batchUpdateScholarsFacultyStatus } from '../services/supabaseService';
import { supabase } from '../../../supabaseClient';
import './AdminForwardPage.css';
import './QueryScholar.css';

const QueryScholar = ({ onBackToDepartment, activeToggle, onToggleChange }) => {
  const {
    scholarSortOrder,
    setScholarSortOrder,
    showMessageBox,
    queryScholarsData,
    setQueryScholarsData,
    isLoadingSupabase,
    assignedFaculty,
    coordinatorInfo
  } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [filteredScholars, setFilteredScholars] = useState([]);
  const [selectedScholarIds, setSelectedScholarIds] = useState([]);

  // Modal states
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState('');
  const [confirmAction, setConfirmAction] = useState(null);
  const [selectedScholar, setSelectedScholar] = useState(null);
  const [actionType, setActionType] = useState('');
  const [confirmAgreed, setConfirmAgreed] = useState(false);

  // added for edit
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingScholar, setEditingScholar] = useState(null);
  const [editFormData, setEditFormData] = useState({});

  // Filter states
  const [tempFilters, setTempFilters] = useState({
    type: 'All Types',
    status: 'All Status'
  });

  const [activeFilters, setActiveFilters] = useState({
    type: 'All Types',
    status: 'All Status'
  });

  // Helper function to determine status based on query resolution and forwarding
  const getScholarStatus = (scholar) => {
    if (!scholar) return 'Pending';
    if (scholar.status === 'Forwarded') return 'Forwarded';
    return 'Pending';
  };

  // Filter and sort Supabase data only
  useEffect(() => {
    if (!queryScholarsData || queryScholarsData.length === 0) {
      setFilteredScholars([]);
      return;
    }

    let scholars = [...queryScholarsData].map(s => ({
      ...s,
      status: getScholarStatus(s)
    }));

    // Apply active filters
    if (activeFilters.type !== 'All Types') {
      scholars = scholars.filter(s => {
        if (activeFilters.type === 'Full Time') return s.type === 'Full Time';
        if (activeFilters.type === 'Part Time') return s.type === 'Part Time';
        return true;
      });
    }

    if (activeFilters.status !== 'All Status') {
      scholars = scholars.filter(s => {
        if (activeFilters.status === 'Pending') return s.status === 'Pending';
        if (activeFilters.status === 'Forwarded') return s.status === 'Forwarded';
        return true;
      });
    }

    // Apply search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      scholars = scholars.filter(s =>
        (s.registered_name || '').toLowerCase().includes(searchLower) ||
        (s.application_no || '').toLowerCase().includes(searchLower) ||
        (s.faculty || '').toLowerCase().includes(searchLower) ||
        (s.program || '').toLowerCase().includes(searchLower)
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
  }, [activeFilters, searchTerm, scholarSortOrder, queryScholarsData]);

  // Filter Handlers
  const handleApplyFilters = () => {
    setActiveFilters({ ...tempFilters });
    setShowFilterModal(false);
  };

  const handleClearFilters = () => {
    const clearedFilters = {
      type: 'All Types',
      status: 'All Status'
    };
    setTempFilters(clearedFilters);
    setActiveFilters(clearedFilters);
    setShowFilterModal(false);
  };

  // Get unique filter options
  const getUniqueTypes = () => {
    return ['All Types', 'Full Time', 'Part Time'];
  };

  const getUniqueStatuses = () => {
    return ['All Status', 'Pending', 'Forwarded'];
  };

  // Checkbox Handlers
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allSelectableIds = filteredScholars
        .filter(s => getScholarStatus(s) !== 'Forwarded')
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

  const handleDownloadExcel = () => {
    try {
      // Define all column headers that should always be present in the Excel
      const columnHeaders = {
        'Form Name': '',
        'Registered Name': '',
        'Application No': '',
        'Have You Graduated From India?': '',
        'Course': '',
        'Select Institution': '',
        'Select Program': '',
        'Certificates': '',
        '1 - Employee Id': '',
        '1 - Designation': '',
        '1 - Organization Name': '',
        '1 - Organization Address': '',
        'Mobile Number': '',
        'Email ID': '',
        'Date Of Birth': '',
        'Gender': '',
        'Are You Differently Abled ?': '',
        'Nature Of Deformity': '',
        'Percentage Of Deformity': '',
        'Nationality': '',
        'Aadhaar Card No.': '',
        'Mode Of Profession (Industry/Academic)': '',
        'Area Of Interest': '',
        'UG - Current Education Qualification': '',
        'UG - Institute Name': '',
        'UG - Degree': '',
        'UG - Specialization': '',
        'UG - Marking Scheme': '',
        'UG - CGPA Or Percentage': '',
        'UG - Month & Year': '',
        'UG - Registration No.': '',
        'UG - Mode Of Study': '',
        'UG - Place Of The Institution': '',
        'PG - Current Education Qualification': '',
        'PG - Institute Name': '',
        'PG - Degree': '',
        'PG - Specialization': '',
        'PG - Marking Scheme': '',
        'PG - CGPA Or Percentage': '',
        'PG - Month & Year': '',
        'PG - Registration No.': '',
        'PG - Mode Of Study': '',
        'PG - Place Of The Institution': '',
        'Other Degree - Current Education Qualification': '',
        'Other Degree - Institute Name': '',
        'Other Degree - Degree': '',
        'Other Degree - Specialization': '',
        'Other Degree - Marking Scheme': '',
        'Other Degree - CGPA Or Percentage': '',
        'Other Degree - Month & Year': '',
        'Other Degree - Registration No.': '',
        'Other Degree - Mode Of Study': '',
        'Other Degree - Place Of The Institution': '',
        'Have You Taken Any Competitive Exam?': '',
        '1. - Name Of The Exam': '',
        '1. - Registration No./Roll No.': '',
        '1. - Score Obtained': '',
        '1. - Max Score': '',
        '1. - Year Appeared': '',
        '1. - AIR/Overall Rank': '',
        '1. - Qualified/Not Qualified': '',
        '2. - Name Of The Exam': '',
        '2. - Registration No./Roll No.': '',
        '2. - Score Obtained': '',
        '2. - Max Score': '',
        '2. - Year Appeared': '',
        '2. - AIR/Overall Rank': '',
        '2. - Qualified/Not Qualified': '',
        '3. - Name Of The Exam': '',
        '3. - Registration No./Roll No.': '',
        '3. - Score Obtained': '',
        '3. - Max Score': '',
        '3. - Year Appeared': '',
        '3. - AIR/Overall Rank': '',
        '3. - Qualified/Not Qualified': '',
        'Describe In 300 Words; Your Reasons For Applying To The Proposed Program; Your Study Interests/future Career Plans, And Other Interests That Drives You To Apply To The Program.': '',
        'Title And Abstract Of The Master Degree Thesis And Your Research Interest In 500 Words': '',
        'Admin Review': '',
        'Status': '',
        'User ID': ''
      };

      let excelData = [];

      if (filteredScholars && filteredScholars.length > 0) {
        // If scholars exist, map their data
        excelData = filteredScholars.map((scholar) => ({
          'Form Name': scholar.form_name || 'PhD Application Form',
          'Registered Name': scholar.registered_name || '-',
          'Application No': scholar.application_no || '-',
          'Have You Graduated From India?': scholar.graduated_from_india || 'Yes',
          'Course': scholar.course || scholar.program || '-',
          'Select Institution': scholar.faculty || '-',
          'Select Program': cleanProgramName(scholar.program) || scholar.program || '-',
          'Certificates': scholar.certificates || '-',
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
          'Admin Review': scholar.query_resolved || scholar.dept_review || '-',
          'Status': getScholarStatus(scholar) || '-',
          'User ID': scholar.user_id || '-'
        }));
      } else {
        // If no scholars exist, create one row with column headers and default values
        excelData = [columnHeaders];
      }

      const ws = XLSX.utils.json_to_sheet(excelData);
      ws['!cols'] = Array(Object.keys(columnHeaders).length).fill({ wch: 20 });
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Query Scholars');
      XLSX.writeFile(wb, `Query_Scholars_${new Date().toISOString().split('T')[0]}.xlsx`);
      showMessageBox('Excel file downloaded successfully!', 'success');
    } catch (error) {
      console.error('Error downloading Excel file:', error);
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

    // For Query Scholar page, we're forwarding BACK to director
    // No validation needed - just prepare the data
    const forwardingData = scholarsToForward.map(scholar => ({
      id: scholar.id,
      name: scholar.registered_name,
      faculty: scholar.faculty,
      program: scholar.program
    }));

    // Show confirmation
    const scholarList = forwardingData
      .map(d => `${d.name} (${d.program})`)
      .join('\n');

    setConfirmMessage(
      scholarsToForward.length === 1 ? `for ${scholarsToForward[0].registered_name}` : `for ${scholarsToForward.length} scholars`
    );
    setActionType('forward');
    setConfirmAction(() => async () => {
      await performForwarding(forwardingData);
    });
    setShowConfirmModal(true);
  };

  const handleResolveQuery = async (scholar) => {
    setConfirmAgreed(false);
    setActionType('resolve');
    setConfirmMessage(`for ${scholar.registered_name}`);
    setConfirmAction(() => async () => {
      try {
        const { error } = await supabase
          .from('scholar_applications')
          .update({ query_resolved: 'Query Resolved' })
          .eq('id', scholar.id);
        
        if (error) throw error;
        
        setQueryScholarsData(prev => prev.map(s => s.id === scholar.id ? { ...s, query_resolved: 'Query Resolved' } : s));
        showMessageBox('Query marked as resolved!', 'success');
      } catch (err) {
        console.error('Error resolving query:', err);
        showMessageBox('Failed to mark query as resolved.', 'error');
      }
      setShowConfirmModal(false);
      setSelectedScholarIds([]);
    });
    setShowConfirmModal(true);
  };

  const performForwarding = async (forwardingData) => {
    try {
      console.log('🔄 Starting forward process for resolved query scholars:', forwardingData);

      // Update each scholar individually to "Query Resolved"
      const updatePromises = forwardingData.map(async (data) => {
        // Find the scholar from loaded data
        const fullScholar = queryScholarsData.find(s => s.id === data.id);
        
        // Construct the forwardText
        let forwardText = 'Forward';
        if (fullScholar && fullScholar.institution) {
          const parts = [
            fullScholar.institution, 
            fullScholar.department, 
            fullScholar.program_type || extractProgramType(fullScholar.program)
          ].filter(Boolean);
          forwardText = parts.length > 0 ? parts.join(' | ') : 'Forward';
        }

        return supabase
          .from('scholar_applications')
          .update({ 
            query_resolved: 'Query Resolved',
            query_resolved_dept: 'Query Resolved',
            query_faculty: forwardText,
            status: 'Forwarded',
            forwarded_at: new Date().toISOString()
          })
          .eq('id', data.id)
          .select();
      });

      const results = await Promise.all(updatePromises);

      // Log all results for debugging
      results.forEach((result, index) => {
        if (result.error) {
          console.error(`❌ Error updating scholar ${forwardingData[index].id}:`, result.error);
        } else {
          console.log(`✅ Successfully updated scholar ${forwardingData[index].id}:`, result.data);
        }
      });

      // Check for errors
      const errors = results.filter(r => r.error);
      if (errors.length > 0) {
        console.error('❌ Errors during forwarding:', errors);
        showMessageBox(
          `${errors.length} scholar(s) failed to forward. Please check console for details.`,
          'error'
        );
        return;
      }

      // Success
      console.log(`✅ Successfully marked ${forwardingData.length} queries as resolved`);
      showMessageBox(
        `${forwardingData.length} query(ies) successfully resolved and updated!`,
        'success'
      );
      setSelectedScholarIds([]);
      setShowConfirmModal(false);
    } catch (err) {
      console.error('❌ Exception during forwarding:', err);
      showMessageBox('An error occurred while forwarding scholars. Check console for details.', 'error');
    }
  };

  const handleViewScholar = (scholar) => {
    setSelectedScholar(scholar);
    setShowViewModal(true);
  };

  const openEditModal = (scholar) => {
    setEditingScholar(scholar);
    setEditFormData({ ...scholar });
    setShowEditModal(true);
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      const updatePayload = {
        registered_name: editFormData.registered_name,
        mobile_number: editFormData.mobile_number,
        email: editFormData.email,
        ug_cgpa: editFormData.ug_cgpa,
        pg_cgpa: editFormData.pg_cgpa,
        institution: editFormData.institution,
        department: editFormData.department,
        father_name: editFormData.father_name,
        type: editFormData.type,
        exam1_name: editFormData.exam1_name,
        exam1_qualified: editFormData.exam1_qualified,
        certificates: editFormData.certificates
      };

      const { error } = await supabase
        .from('scholar_applications')
        .update(updatePayload)
        .eq('id', editingScholar.id);

      if (error) throw error;
      
      showMessageBox('Scholar details updated successfully!', 'success');
      
      // Update local state
      setQueryScholarsData(prev => prev.map(s => s.id === editingScholar.id ? { ...s, ...updatePayload } : s));
      // filteredScholars is recomputed automatically from queryScholarsData in useEffect, 
      // but if not, we can force a sync. The useEffect handles it, so we don't strictly need to set filteredScholars.
      
      setShowEditModal(false);
    } catch (err) {
      console.error('Error updating scholar:', err);
      showMessageBox('Error updating scholar details.', 'error');
    }
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

  // Only allow selecting scholars that are not fully processed
  const selectableScholars = filteredScholars.filter(s =>
    getScholarStatus(s) !== 'Forwarded'
  );
  const isAllSelected = selectableScholars.length > 0 && selectedScholarIds.length === selectableScholars.length;

  return (
    <div className="scholar-management-wrapper admin-forward-page query-scholar-page">
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
          onClick={handleDownloadExcel}
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
                  <input type="checkbox" className="table-checkbox" onChange={handleSelectAll} checked={isAllSelected} style={{ margin: '0', transform: 'scale(1.1)' }} />
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
              <th>REVIEW</th>
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
                        disabled={getScholarStatus(scholar) === 'Forwarded'}
                        style={{ margin: '0', transform: 'scale(1.1)' }}
                      />
                    </td>
                    <td className="text-center">{index + 1}</td>
                    <td>{scholar.registered_name}</td>
                    <td>{scholar.application_no}</td>
                    <td>{scholar.faculty}</td>
                    <td>{cleanProgramName(scholar.program) || scholar.program}</td>
                    <td>{scholar.program_type || extractProgramType(scholar.program) || '-'}</td>
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
                      {scholar.query_resolved === 'Query Resolved' ? (
                        <span style={{ backgroundColor: '#d1fae5', color: '#065f46', padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', border: '1px solid #a7f3d0' }}>
                          Query Resolved
                        </span>
                      ) : (
                        <span className={`department-review-badge ${(scholar.dept_review || '').toLowerCase().replace(' ', '-')}`}>
                          {scholar.dept_review === 'Query' ? 'Query' : (scholar.dept_review || 'Pending')}
                        </span>
                      )}
                    </td>
                    <td className="text-center"><span className={`status-badge ${getStatusInfo(scholar).className}`}>{getStatusInfo(scholar).text}</span></td>
                    <td className="text-center">
                      <div className="table-actions" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px' }}>
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
                        <button
                          onClick={() => openEditModal(scholar)}
                          className="table-action-btn btn-edit"
                          title={scholar.status === 'Forwarded' ? 'Cannot edit resolved scholar' : 'Edit Scholar'}
                          disabled={scholar.status === 'Forwarded'}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '12px',
                            backgroundColor: scholar.status === 'Forwarded' ? '#9CA3AF' : '#3B82F6',
                            color: 'white',
                            border: 'none',
                            cursor: scholar.status === 'Forwarded' ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            boxShadow: scholar.status === 'Forwarded' ? 'none' : '0 2px 8px rgba(59, 130, 246, 0.3)',
                            opacity: scholar.status === 'Forwarded' ? 0.5 : 1
                          }}
                        >
                          <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleResolveQuery(scholar)}
                          className="table-action-btn btn-forward"
                          title={scholar.query_resolved === 'Query Resolved' ? 'Query Already Resolved' : 'Mark Query Resolved'}
                          disabled={scholar.query_resolved === 'Query Resolved' || scholar.status === 'Forwarded'}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '12px',
                            backgroundColor: (scholar.query_resolved === 'Query Resolved' || scholar.status === 'Forwarded') ? '#9CA3AF' : '#10B981',
                            color: 'white',
                            border: 'none',
                            cursor: (scholar.query_resolved === 'Query Resolved' || scholar.status === 'Forwarded') ? 'not-allowed' : 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.2s ease',
                            boxShadow: scholar.status === 'Forwarded' ? 'none' : '0 2px 8px rgba(16, 185, 129, 0.3)',
                            opacity: scholar.status === 'Forwarded' ? 0.5 : 1
                          }}
                        >
                          <Check size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr><td colSpan="14" className="text-center p-8 text-gray-400">
                <div style={{ padding: '2rem', textAlign: 'center' }}>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: '600', color: '#6b7280', marginBottom: '0.5rem' }}>
                    No Resolved Query Scholars Available
                  </h3>
                  <p style={{ fontSize: '0.9rem', color: '#9ca3af' }}>
                    Scholars with resolved queries from admin will appear here.
                  </p>
                </div>
              </td></tr>
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
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.course || selectedScholar.program || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Select Institution:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.faculty || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Select Program:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{cleanProgramName(selectedScholar.program) || selectedScholar.faculty || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Type:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.program_type || extractProgramType(selectedScholar.program) || '-'}</span>
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

              {/* Application Status & Review */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 bg-gray-100 p-3 border-b border-gray-300">Application Status & Review</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Current Status:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{getScholarStatus(selectedScholar) || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Faculty:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.faculty || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Department:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.program || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Type:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.type || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Department Review:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.dept_review || 'Pending'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Faculty Status:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.faculty_status || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Overall Status:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.status || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Research & Academic Information */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 bg-gray-100 p-3 border-b border-gray-300">Research & Academic Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Research Topic:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.research_topic || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Guide Name:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.guide_name || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>UG CGPA:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.ug_cgpa || 'N/A'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>PG CGPA:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block' }}>{selectedScholar.pg_cgpa || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Documents & Certificates */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 bg-gray-100 p-3 border-b border-gray-300">Documents & Certificates</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="view-field">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Certificates Link:</label>
                    <span className="view-value" style={{ fontSize: '0.9375rem', color: '#1f2937', fontWeight: '500', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', padding: '0.75rem', borderRadius: '16px', display: 'block', wordBreak: 'break-all' }}>{selectedScholar.certificates || 'Not provided'}</span>
                  </div>
                  <div className="view-field flex flex-col gap-1 justify-center">
                    <label className="view-label" style={{ fontSize: '0.65rem', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.08em' }}>View Documents:</label>
                    <button
                      onClick={() => {
                        if (selectedScholar.certificates) {
                          window.open(selectedScholar.certificates, '_blank', 'noopener');
                        }
                      }}
                      disabled={!selectedScholar.certificates}
                      className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${selectedScholar.certificates ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200 cursor-pointer' : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'}`}
                    >
                      {selectedScholar.certificates ? 'Open Documents' : 'No Documents'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Other Degree Education Details */}
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
                <div className="mb-4">
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
                    <label className="view-label">Describe In 300 Words; Your Reasons For Applying To The Proposed Program; Your Study Interests/future Career Plans, And Other Interests That Drives You To Apply To The Program.:</label>
                    <span className="view-value" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{selectedScholar.reasons_for_applying || '-'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Title And Abstract Of The Master Degree Thesis And Your Research Interest In 500 Words:</label>
                    <span className="view-value" style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>{selectedScholar.research_interest || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Admin Review */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 bg-gray-100 p-3 border-b border-gray-300">Admin Review</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div className="view-field">
                    <label className="view-label">Admin Review Status:</label>
                    <span className="view-value" style={{ fontWeight: '600', color: selectedScholar.query_resolved === 'Query Resolved' ? '#059669' : selectedScholar.dept_review === 'Rejected' ? '#dc2626' : '#b45309' }}>{selectedScholar.query_resolved || selectedScholar.dept_review || 'Pending'}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Query Faculty:</label>
                    <span className="view-value">{selectedScholar.query_faculty || ''}</span>
                  </div>
                  <div className="view-field">
                    <label className="view-label">Original Query:</label>
                    <span className="view-value">{selectedScholar.dept_query || ''}</span>
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
                  <label>Status</label>
                  <select
                    value={tempFilters.status}
                    onChange={(e) => setTempFilters(prev => ({ ...prev, status: e.target.value }))}
                    className="examination-filter-select"
                  >
                    {getUniqueStatuses().map(status => (
                      <option key={status} value={status}>{status}</option>
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
              <h3 className="text-2xl font-bold mb-3">{actionType === 'resolve' ? 'Confirm Query Resolved' : 'Confirm Forward'}</h3>
              <div className="mb-4 border rounded-lg p-4 bg-gray-50">
                <div className="text-sm text-gray-600">Coordinator Name: <span className="font-semibold">{coordinatorInfo?.name || 'Research Coordinator'}</span></div>
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
              <div className="mb-6 text-sm text-gray-700">You are about to <span className="font-bold whitespace-nowrap">{actionType === 'resolve' ? 'MARK AS QUERY RESOLVED' : 'FORWARD SCHOLAR(S)'}</span> {confirmMessage}. This will update their status.</div>
              <div className="flex justify-end gap-3">
                <button onClick={() => { setShowConfirmModal(false); setConfirmAgreed(false); }} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                <button onClick={confirmAction} disabled={!confirmAgreed} className={`py-2 px-4 rounded-lg font-bold text-white ${confirmAgreed ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-95' : 'bg-gray-300 cursor-not-allowed'}`}>Confirm</button>
              </div>
            </div>
          </div>
        )
      }

      {/* Edit Modal */}
      {showEditModal && editingScholar && (
        <div className="modal-overlay" style={{ display: 'flex', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 9999, backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
          <div className="bg-white w-full max-w-3xl max-h-[90vh] overflow-y-auto" style={{ margin: 'auto', position: 'relative', zIndex: 10000, border: '1px solid #d1d5db', borderRadius: '12px' }}>
            <div className="sticky top-0 bg-white border-b border-gray-300 p-6 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-gray-900">Edit Scholar Details</h2>
              <button onClick={() => setShowEditModal(false)} className="text-gray-400 hover:text-gray-600 transition-colors">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="form-group mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Registered Name</label>
                  <input type="text" name="registered_name" value={editFormData.registered_name || ''} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="form-group mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mobile Number</label>
                  <input type="text" name="mobile_number" value={editFormData.mobile_number || ''} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="form-group mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email ID</label>
                  <input type="email" name="email" value={editFormData.email || ''} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="form-group mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">UG Marks / CGPA </label>
                  <input type="text" name="ug_cgpa" value={editFormData.ug_cgpa || ''} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="form-group mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">PG Marks / CGPA </label>
                  <input type="text" name="pg_cgpa" value={editFormData.pg_cgpa || ''} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="form-group mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
                  <input type="text" name="institution" value={editFormData.institution || ''} onChange={handleEditChange} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed" />
                </div>
                <div className="form-group mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input type="text" name="department" value={editFormData.department || ''} onChange={handleEditChange} disabled className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600 cursor-not-allowed" />
                </div>
                <div className="form-group mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Father Name</label>
                  <input type="text" name="father_name" value={editFormData.father_name || ''} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="form-group mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mode Of Study (Type)</label>
                  <input type="text" name="type" value={editFormData.type || ''} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="form-group mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Exam Name</label>
                  <input type="text" name="exam1_name" value={editFormData.exam1_name || ''} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="form-group mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Qualified Status</label>
                  <input type="text" name="exam1_qualified" value={editFormData.exam1_qualified || ''} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
                <div className="form-group mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Certificate Link</label>
                  <input type="text" name="certificates" value={editFormData.certificates || ''} onChange={handleEditChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg" />
                </div>
              </div>
              <div className="mt-6 flex justify-end gap-3">
                <button type="button" onClick={() => setShowEditModal(false)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div >
  );
};

export default QueryScholar;