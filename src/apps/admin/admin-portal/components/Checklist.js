import React, { useMemo, useState, useEffect } from 'react';
import { MdFullscreen, MdFullscreenExit } from 'react-icons/md';
import './Checklist.css';
import { useAppContext } from '../../context/AppContext.js';
import { fetchAdmittedScholars, updateScholarChecklist } from '../../../../services/scholarService';
import { normalizeFacultyName } from '../../../../utils/departmentUtils';

// MODIFICATION: Added new fields at the top as requested.
// Helper: default checklist structure for a scholar
const defaultChecklistFor = (isCompleted = false) => ({
  // --- NEW FIELDS (First 3) ---
  registrationFee: { label: 'Registration Fee', status: isCompleted ? 'Verified' : 'Pending', checked: isCompleted, type: 'mandatory' },
  semesterFee: { label: 'Semester Fee', status: isCompleted ? 'Verified' : 'Pending', checked: isCompleted, type: 'mandatory' },
  offerLetter: { label: 'Offer Letter', status: isCompleted ? 'Verified' : 'Pending', checked: isCompleted, type: 'mandatory' },
  // --- EXISTING FIELDS ---
  applicationForm: { label: 'Application Form', status: isCompleted ? 'Verified' : 'Pending', checked: isCompleted, type: 'mandatory' },
  ugDc: { label: 'UG - Degree Certificate', status: isCompleted ? 'Verified' : 'Pending', checked: isCompleted, type: 'mandatory' },
  pgDc: { label: 'PG - Degree Certificate', status: isCompleted ? 'Verified' : 'Pending', checked: isCompleted, type: 'mandatory' },
  ugCms: { label: 'UG - Consolidated MarkSheet', status: isCompleted ? 'Verified' : 'Pending', checked: isCompleted, type: 'mandatory' },
  pgCms: { label: 'PG - Consolidated MarkSheet', status: isCompleted ? 'Verified' : 'Pending', checked: isCompleted, type: 'mandatory' },
  aadhar: { label: 'Aadhar', status: isCompleted ? 'Verified' : 'Pending', checked: isCompleted, type: 'mandatory' },
  pan: { label: 'PAN', status: isCompleted ? 'Verified' : 'Pending', checked: isCompleted, type: 'mandatory' },
  docCopies: { label: 'All the above Docs (4 copy)', status: isCompleted ? 'Verified' : 'Pending', checked: isCompleted, type: 'mandatory' },
  photos: { label: 'Photo (5 copy)', status: isCompleted ? 'Verified' : 'Pending', checked: isCompleted, type: 'mandatory' },
  researchProposal: { label: 'Research Proposal (Mandatory for Full Time scholars)', status: isCompleted ? 'Verified' : 'Pending', checked: isCompleted, type: 'mandatory' },
  experienceCertificate: { label: 'Experience Certificate (Mandatory for Full Time scholars)', status: isCompleted ? 'Verified' : 'Pending', checked: isCompleted, type: 'mandatory' },
  netSlet: { label: 'NET/SLET', status: isCompleted ? 'Verified' : 'Pending', checked: isCompleted, type: 'optional' },
  communityCert: { label: 'Community Certificate', status: isCompleted ? 'Verified' : 'Pending', checked: isCompleted, type: 'optional' },
  noc: { label: 'No Objection Certificate', status: isCompleted ? 'Verified' : 'Pending', checked: isCompleted, type: 'optional' }
});

// Helper function to extract program type from program string
const extractProgramType = (programString) => {
  if (!programString) return '';
  const typeMatch = programString.match(/\(([^)]+)\)/);
  if (typeMatch) {
    return typeMatch[1].trim();
  }
  return '';
};

// Helper function to extract department from program string
const extractDepartmentFromProgram = (programString) => {
  if (!programString) return '';
  const deptMatch = programString.match(/Ph\.d\.\s*-\s*([^(]+)/i);
  if (deptMatch) {
    const deptName = deptMatch[1].trim();
    return deptName.replace(/\s*\([^)]*\)\s*$/, '').trim();
  }
  return '';
};

// Using centralized normalizeFacultyName from departmentUtils

// Helper function to find matching department in faculty's department list
const findMatchingDepartment = (extractedDept, facultyName, facultiesData) => {
  if (!extractedDept || !facultyName) return null;

  const normalizedFacultyName = normalizeFacultyName(facultyName);
  const faculty = facultiesData.find(f => normalizeFacultyName(f.name) === normalizedFacultyName);
  if (!faculty || !faculty.departments) return null;

  const normalizedExtracted = extractedDept.toLowerCase().trim();

  const exactMatch = faculty.departments.find(d =>
    d.name.toLowerCase().trim() === normalizedExtracted
  );
  if (exactMatch) return exactMatch.name;

  const partialMatch = faculty.departments.find(d =>
    d.name.toLowerCase().includes(normalizedExtracted) ||
    normalizedExtracted.includes(d.name.toLowerCase())
  );
  if (partialMatch) return partialMatch.name;

  return null;
};

// Helper function to get department for display
const getDisplayDepartment = (scholar, facultiesData) => {
  if (scholar.department && scholar.department !== 'Unknown Department') {
    return scholar.department;
  }

  if (scholar.program && scholar.faculty) {
    const extractedDept = extractDepartmentFromProgram(scholar.program);
    return findMatchingDepartment(extractedDept, scholar.faculty, facultiesData) || null;
  }

  return null;
};

export default function Checklist({ onModalStateChange }) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All');
  const [page, setPage] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [expandedFaculties, setExpandedFaculties] = useState({});
  const [expandedDepartments, setExpandedDepartments] = useState({});
  const [expandedTypes, setExpandedTypes] = useState({}); // New state for type expansion
  const [selectedScholar, setSelectedScholar] = useState(null);
  const [showVerification, setShowVerification] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [scholars, setScholars] = useState([]);
  const [loading, setLoading] = useState(true);
  const { scholarFilters, facultiesData } = useAppContext();
  const pageSize = 10;

  useEffect(() => {
    const loadScholars = async () => {
      setLoading(true);
      try {
        // Fetch only scholars who have been admitted by supervisors from examination_records
        const { data, error } = await fetchAdmittedScholars();
        if (error) {
          console.error('Error fetching admitted scholars:', error);
          showSuccessNotification('Error loading scholars. Please refresh the page.');
        } else {
          console.log(`📊 Admitted scholars fetched: ${data?.length || 0}`);

          const mappedData = (data || []).map((scholar, index) => {
            const faculty = scholar.faculty || '';
            const department = scholar.department || extractDepartmentFromProgram(scholar.program) || '';

            // --- FIX: Safely parse JSON from checklist_verification column and MERGE with default structure ---
            let parsedChecklist = scholar.checklist_verification; // Changed from scholar.checklist
            if (typeof parsedChecklist === 'string') {
              try {
                parsedChecklist = JSON.parse(parsedChecklist);
              } catch (e) {
                console.warn('Failed to parse checklist_verification JSON for scholar:', scholar.id, e);
                parsedChecklist = null;
              }
            }

            // Determine if scholar is verified to set default state for NEW fields
            const isVerifiedOrCompleted = scholar.checklist_status === 'Completed' || scholar.checklist_status === 'Verified' || scholar.checklist_status === 'Approved';

            // Merge default checklist (with new fields) with the saved checklist.
            // Spread order matters: default first ensures new keys exist and order is preserved,
            // saved second ensures existing data overwrites default.
            parsedChecklist = {
              ...defaultChecklistFor(isVerifiedOrCompleted),
              ...(parsedChecklist || {})
            };

            return {
              id: scholar.id,
              sNo: index + 1,
              applicationNo: scholar.application_no,
              name: scholar.registered_name || scholar.name,
              email: scholar.email,
              phone: scholar.mobile_number || scholar.phone,
              mobile: scholar.mobile_number || scholar.phone,
              faculty: faculty,
              department: department,
              program: scholar.program,
              type: scholar.program_type || scholar.type,
              status: scholar.checklist_status || 'Pending', // Changed from scholar.status
              supervisorName: scholar.supervisor_name, // Add supervisor info
              supervisorStatus: scholar.supervisor_status, // Add supervisor status
              dateOfBirth: scholar.date_of_birth,
              gender: scholar.gender,
              category: scholar.nationality,
              address: scholar.organization_address,
              ugDegree: scholar.ug_degree,
              ugInstitution: scholar.ug_institute,
              ugSpecialization: scholar.ug_specialization,
              ugYear: scholar.ug_month_year,
              ugMarks: scholar.ug_cgpa,
              ugCgpa: scholar.ug_cgpa,
              pgDegree: scholar.pg_degree,
              pgInstitution: scholar.pg_institute,
              pgSpecialization: scholar.pg_specialization,
              pgYear: scholar.pg_month_year,
              pgMarks: scholar.pg_cgpa,
              pgCgpa: scholar.pg_cgpa,
              checklist: parsedChecklist,
              additionalNotes: scholar.checklist_notes || '', // Changed from scholar.additional_notes
              eligible_checklist: scholar.eligible_checklist
            };
          });

          setScholars(mappedData);
        }
      } catch (err) {
        console.error('Exception loading scholars:', err);
        showSuccessNotification('Error loading scholars. Please refresh the page.');
      } finally {
        setLoading(false);
      }
    };

    loadScholars();
  }, []);

  // Track modal states and notify parent
  useEffect(() => {
    const hasModal = showVerification;
    if (onModalStateChange) {
      onModalStateChange(hasModal);
    }
  }, [showVerification, onModalStateChange]);

  const showSuccessNotification = (message) => {
    setNotificationMessage(message);
    setShowNotification(true);
    setTimeout(() => { setShowNotification(false); }, 3000);
  };


  const filtered = useMemo(() => {
    const localQ = (query || '').toString().toLowerCase();
    const ctxQ = (scholarFilters && scholarFilters.searchTerm) ? scholarFilters.searchTerm.toString().toLowerCase() : '';
    const effectiveQ = localQ || ctxQ;
    const localStatus = status || 'All';
    const ctxStatus = (scholarFilters && scholarFilters.status) ? scholarFilters.status : 'All';
    const effectiveStatus = localStatus !== 'All' ? localStatus : ctxStatus;

    const ctxFaculty = scholarFilters && scholarFilters.faculty ? scholarFilters.faculty : '';
    const ctxType = scholarFilters && scholarFilters.type ? scholarFilters.type : '';

    return scholars.filter((s) => {
      const name = (s.name || s.fullName || '').toString().toLowerCase();
      const email = (s.email || '').toString().toLowerCase();
      const application = (s.applicationNo || s.application || s.applicationNumber || '').toString().toLowerCase();
      const matchesQuery = !effectiveQ || name.includes(effectiveQ) || email.includes(effectiveQ) || application.includes(effectiveQ);
      const matchesStatus = effectiveStatus === 'All' || (s.status || 'Pending') === effectiveStatus;
      const matchesFaculty = !ctxFaculty || s.faculty === ctxFaculty;
      const matchesType = !ctxType || (s.type || '').toString() === ctxType;
      return matchesQuery && matchesStatus && matchesFaculty && matchesType;
    });
  }, [query, status, scholars, scholarFilters]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));

  const facultyDeptTypeGroups = useMemo(() => {
    const groups = {};
    // Map from normalized faculty name -> canonical faculty name (from facultiesData)
    const normalizedFacultyMap = {};

    // Initialize structure: Faculty -> Department -> Type -> Scholars[]
    facultiesData.forEach(faculty => {
      groups[faculty.name] = {};
      normalizedFacultyMap[normalizeFacultyName(faculty.name)] = faculty.name;
      faculty.departments.forEach(dept => {
        groups[faculty.name][dept.name] = {
          'Full Time': [],
          'Part Time Internal': [],
          'Part Time External': [],
          'Part Time Industry': []
        };
      });
    });

    filtered.forEach(s => {
      // Resolve canonical faculty name via normalization to handle variants like
      // "Faculty of Medical & Health Science" vs "Faculty of Medical and Health Sciences"
      const canonicalFaculty = normalizedFacultyMap[normalizeFacultyName(s.faculty)] || s.faculty;
      let deptKey = s.department;

      if (!deptKey || deptKey.trim() === '') {
        deptKey = getDisplayDepartment(s, facultiesData);
      }

      if (!canonicalFaculty || !deptKey) {
        return;
      }

      // Determine scholar type
      let scholarType = s.type || s.program_type || '';

      // Normalize type to match our four categories
      // IMPORTANT: Check for 'industry' FIRST before 'external' to properly separate them
      if (scholarType.toLowerCase().includes('full')) {
        scholarType = 'Full Time';
      } else if (scholarType.toLowerCase().includes('internal')) {
        scholarType = 'Part Time Internal';
      } else if (scholarType.toLowerCase().includes('industry')) {
        // Check for industry FIRST - this catches "Part Time External (Industry)"
        scholarType = 'Part Time Industry';
      } else if (scholarType.toLowerCase().includes('external')) {
        // This now only catches pure "Part Time External" without industry
        scholarType = 'Part Time External';
      } else {
        // Default to Full Time if type is unclear
        scholarType = 'Full Time';
      }

      if (groups[canonicalFaculty] && groups[canonicalFaculty][deptKey]) {
        groups[canonicalFaculty][deptKey][scholarType].push(s);
      } else {
        const matchedDept = findMatchingDepartment(deptKey, canonicalFaculty, facultiesData);
        if (matchedDept && groups[canonicalFaculty] && groups[canonicalFaculty][matchedDept]) {
          groups[canonicalFaculty][matchedDept][scholarType].push(s);
        }
      }
    });

    return groups;
  }, [filtered, facultiesData]);

  const setPageSafe = (p) => setPage(Math.min(Math.max(1, p), totalPages));

  const handleScholarClick = (scholar) => {
    let checklist = scholar.checklist;
    if (typeof checklist === 'string') {
      try { checklist = JSON.parse(checklist); } catch (e) { checklist = null; }
    }

    const isVerifiedOrCompleted = scholar.status === 'Completed' || scholar.status === 'Verified' || scholar.status === 'Approved';

    // Merge logic: ensure new fields appear even if checklist exists
    checklist = {
      ...defaultChecklistFor(isVerifiedOrCompleted),
      ...(checklist || {})
    };

    if (checklist && checklist.aadharPan) {
      const ap = checklist.aadharPan;
      checklist = {
        ...checklist,
        aadhar: { label: 'Aadhar', status: ap.status || (ap.checked ? 'Verified' : 'Pending'), checked: !!ap.checked, type: ap.type || 'mandatory' },
        pan: { label: 'PAN', status: ap.status || (ap.checked ? 'Verified' : 'Pending'), checked: !!ap.checked, type: ap.type || 'mandatory' }
      };
      delete checklist.aadharPan;
    }

    const displayDepartment = getDisplayDepartment(scholar, facultiesData) || scholar.department || '—';

    setSelectedScholar({
      ...scholar,
      checklist,
      additionalNotes: scholar.additionalNotes || scholar.notes || '',
      displayDepartment
    });
    setShowVerification(true);
  };

  const handleBackToList = () => {
    setShowVerification(false);
    setSelectedScholar(null);
  };

  const handleCheckboxChange = (checklistItem) => {
    setSelectedScholar(prev => ({
      ...prev,
      checklist: {
        ...prev.checklist,
        [checklistItem]: {
          ...prev.checklist[checklistItem],
          checked: !prev.checklist[checklistItem].checked,
          status: !prev.checklist[checklistItem].checked ? 'Verified' : 'Pending'
        }
      }
    }));
  };

  const handleSelectAll = () => {
    if (!selectedScholar) return;

    const updatedChecklist = { ...selectedScholar.checklist };

    // Check all mandatory items
    for (const key in updatedChecklist) {
      if (updatedChecklist[key].type === 'mandatory') {
        updatedChecklist[key] = {
          ...updatedChecklist[key],
          checked: true,
          status: 'Verified'
        };
      }
    }

    setSelectedScholar(prev => ({
      ...prev,
      checklist: updatedChecklist
    }));
  };

  const handleNotesChange = (e) => {
    setSelectedScholar(prev => ({
      ...prev,
      additionalNotes: e.target.value
    }));
  };

  const handleSaveChanges = async () => {
    if (!selectedScholar) return;

    try {
      const { error } = await updateScholarChecklist(selectedScholar.id, {
        checklist_verification: selectedScholar.checklist,
        checklist_notes: selectedScholar.additionalNotes
      });

      if (error) {
        console.error('Error saving checklist:', error);
        showSuccessNotification('❌ Error saving checklist. Please try again.');
        return;
      }

      setScholars(prev => prev.map(s =>
        s.id === selectedScholar.id
          ? { ...s, checklist: selectedScholar.checklist, additionalNotes: selectedScholar.additionalNotes }
          : s
      ));

      showSuccessNotification('✓ Checklist saved successfully!');
    } catch (err) {
      console.error('Exception saving checklist:', err);
      showSuccessNotification('❌ Error saving checklist. Please try again.');
    }
  };

  const handleCompleteVerification = async () => {
    if (!selectedScholar) return;

    const completedChecklist = { ...selectedScholar.checklist };
    for (const key in completedChecklist) {
      if (completedChecklist[key].type === 'mandatory') {
        completedChecklist[key] = { ...completedChecklist[key], checked: true, status: 'Verified' };
      }
    }

    try {
      const { error } = await updateScholarChecklist(selectedScholar.id, {
        checklist_status: 'Completed',
        checklist_verification: completedChecklist,
        checklist_notes: selectedScholar.additionalNotes,
        eligible_checklist: 'Checked'
      });

      if (error) {
        console.error('Error completing verification:', error);
        showSuccessNotification('❌ Error completing verification. Please try again.');
        return;
      }

      // Update main list
      setScholars(prev => prev.map(s =>
        s.id === selectedScholar.id
          ? { ...s, status: 'Completed', checklist: completedChecklist, additionalNotes: selectedScholar.additionalNotes, eligible_checklist: 'Checked' }
          : s
      ));

      // Update local state to immediately freeze inputs
      setSelectedScholar(prev => ({
        ...prev,
        status: 'Completed',
        checklist: completedChecklist
      }));

      showSuccessNotification('✓ Verification completed successfully! Scholar is now eligible.');
      setTimeout(() => {
        setShowVerification(false);
        setSelectedScholar(null);
      }, 3000);
    } catch (err) {
      console.error('Exception completing verification:', err);
      showSuccessNotification('❌ Error completing verification. Please try again.');
    }
  };

  if (showVerification && selectedScholar) {
    // --- STRICT IMMUTABILITY CHECK ---
    const sStatus = (selectedScholar.status || '').toString();
    const isFrozen =
      sStatus === 'Completed' ||
      sStatus === 'Verified' ||
      sStatus === 'Approved' ||
      selectedScholar.eligible_checklist === 'Checked';

    const allMandatoryChecked = selectedScholar.checklist && Object.values(selectedScholar.checklist).every(item =>
      item && (item.type === 'optional' || item.checked)
    );

    return (
      <div className={`checklist-page ${isFullscreen ? 'fullscreen-mode' : ''}`}>
        <button
          onClick={() => setIsFullscreen(!isFullscreen)}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
          style={isFullscreen ? {
            position: 'fixed',
            top: 12,
            right: 12,
            zIndex: 11001,
            width: 44,
            height: 44,
            borderRadius: 8,
            border: '1px solid #e5e7eb',
            background: '#ffffff',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 6px 18px rgba(15, 23, 42, 0.08)'
          } : {
            position: 'absolute',
            top: 12,
            right: 12,
            zIndex: 11001,
            width: 40,
            height: 40,
            borderRadius: 8,
            border: '1px solid transparent',
            background: 'transparent',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {isFullscreen ? <MdFullscreenExit /> : <MdFullscreen />}
        </button>
        <div className="checklist-header">
          <h1 className="title">Checklist Module</h1>
          <div className="actions" />
        </div>
        <div style={{ padding: '20px 20px 0 20px', display: 'flex', justifyContent: 'flex-end' }}>
          <button
            onClick={handleBackToList}
            style={isFullscreen ? {
              position: 'fixed',
              top: 12,
              right: 64,
              zIndex: 11001,
              backgroundColor: '#3b82f6',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '8px 14px',
              textDecoration: 'none',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            } : {
              backgroundColor: '#3b82f6',
              color: 'white',
              cursor: 'pointer',
              fontSize: '14px',
              padding: '8px 14px',
              textDecoration: 'none',
              fontWeight: 600,
              borderRadius: '8px',
              border: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            ← Back to Scholar List
          </button>
        </div>
        <div style={{ padding: '10px 20px 20px 20px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', margin: '0', color: '#374151' }}>
            {isFrozen ? 'Checklist (View Only)' : 'Checklist Verification'}
          </h2>
        </div>
        <div style={{ padding: '0 20px 20px 20px', backgroundColor: '#f8f9fa' }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', border: '1px solid #e5e7eb', maxWidth: '800px', margin: '0 auto' }}>
            <h3 style={{ marginBottom: '8px', fontSize: '18px', fontWeight: '600', color: '#111827' }}>
              Verification Checklist
            </h3>
            <p style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
              {isFrozen ? 'This scholar has been verified. Data is read-only.' : 'Please verify all the documents and details'}
            </p>

            {/* Select All Button */}
            {!isFrozen && (
              <div style={{ marginBottom: '20px' }}>
                <button
                  onClick={handleSelectAll}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: '#3b82f6',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '500',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="20 6 9 17 4 12"></polyline>
                  </svg>
                  Select All Mandatory
                </button>
              </div>
            )}

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '18px', padding: '12px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #eef2ff' }}>
              <div style={{ width: 56, height: 56, borderRadius: 28, background: '#eef2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: '#1e3a8a' }}>
                {(selectedScholar.name || '').charAt(0) || 'S'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>{selectedScholar.name}</div>
                <div style={{ fontSize: '13px', color: '#6b7280' }}>{selectedScholar.email || selectedScholar.mobile || ''}</div>
                <div style={{ marginTop: 6, fontSize: '13px', color: '#4b5563' }}>
                  <span style={{ fontWeight: 600 }}>Application:</span> {selectedScholar.applicationNo || selectedScholar.application || '—'} &nbsp; • &nbsp;
                  <span style={{ fontWeight: 600 }}>Program:</span> {selectedScholar.program || selectedScholar.type || '—'}
                </div>
                <div style={{ fontSize: '13px', color: '#4b5563' }}>
                  <span style={{ fontWeight: 600 }}>Faculty:</span> {selectedScholar.faculty || '—'} &nbsp; • &nbsp;
                  <span style={{ fontWeight: 600 }}>Department:</span> {selectedScholar.displayDepartment || '—'}
                </div>
              </div>
            </div>
            {selectedScholar.checklist && Object.entries(selectedScholar.checklist).map(([key, value], index) => {
              if (!value || typeof value !== 'object') return null;

              const label = value.label || key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase());
              const isOptional = value.type === 'optional';
              const nocNote = 'Mandatory to fill this for Part Time Industry and Part Time External';
              const noteText = (key && key.toString().toLowerCase() === 'noc') ? nocNote : (value.note || '');

              return (
                <div key={key} style={{ marginBottom: '16px', display: 'flex', alignItems: 'center' }}>
                  <span style={{ fontSize: '16px', fontWeight: '600', color: '#374151', marginRight: '16px', minWidth: '24px' }}>
                    {index + 1}.
                  </span>
                  <input
                    type="checkbox"
                    checked={!!value.checked}
                    onChange={() => handleCheckboxChange(key)}
                    disabled={isFrozen}
                    style={{
                      marginRight: '12px',
                      width: '18px',
                      height: '18px',
                      cursor: isFrozen ? 'not-allowed' : 'pointer'
                    }}
                  />
                  <span style={{ fontSize: '15px', color: '#111827', flex: '1' }}>
                    {label}
                    {noteText ? (
                      <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px', fontWeight: 'normal', fontStyle: 'italic' }}>
                        ({noteText})
                      </span>
                    ) : (
                      isOptional && (
                        <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px', fontWeight: 'normal', fontStyle: 'italic' }}>
                          (Optional)
                        </span>
                      )
                    )}
                  </span>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    fontWeight: '500',
                    backgroundColor: value.checked ? '#dcfce7' : '#fef3c7',
                    color: value.checked ? '#166534' : '#92400e'
                  }}>
                    {value.checked ? 'Verified' : 'Pending'}
                  </span>
                </div>
              );
            })}
            <div>
              <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#111827' }}>
                Additional Notes
              </h4>
              <textarea
                placeholder="Add any additional notes or comments here..."
                value={selectedScholar.additionalNotes || ''}
                onChange={handleNotesChange}
                disabled={isFrozen}
                style={{
                  width: '100%',
                  height: '80px',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  backgroundColor: isFrozen ? '#f3f4f6' : 'white'
                }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button
                onClick={handleSaveChanges}
                disabled={isFrozen}
                style={{
                  padding: '10px 20px',
                  backgroundColor: isFrozen ? '#9ca3af' : '#3b82f6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: isFrozen ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: isFrozen ? 0.7 : 1
                }}
              >
                Save Changes
              </button>
              <button
                onClick={handleCompleteVerification}
                disabled={!allMandatoryChecked || isFrozen}
                style={{
                  padding: '10px 20px',
                  backgroundColor: (!allMandatoryChecked || isFrozen) ? '#9ca3af' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: (!allMandatoryChecked || isFrozen) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  opacity: (!allMandatoryChecked || isFrozen) ? 0.7 : 1
                }}
              >
                {isFrozen ? 'Verified' : 'Complete Verification'}
              </button>
            </div>
          </div>
        </div>
        {showNotification && (
          <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: '#10b981',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            fontSize: '14px',
            fontWeight: '500',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            minWidth: '300px',
            justifyContent: 'center'
          }}>
            {notificationMessage}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`checklist-page ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      <button
        onClick={() => setIsFullscreen(!isFullscreen)}
        title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        style={isFullscreen ? {
          position: 'fixed',
          top: 12,
          right: 12,
          zIndex: 11001,
          width: 44,
          height: 44,
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          background: '#ffffff',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 6px 18px rgba(15, 23, 42, 0.08)'
        } : {
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 11001,
          width: 40,
          height: 40,
          borderRadius: 8,
          border: '1px solid transparent',
          background: 'transparent',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {isFullscreen ? <MdFullscreenExit /> : <MdFullscreen />}
      </button>
      <div className="checklist-header">
        <h1 className="title">Checklist Module</h1>
        <div className="actions" />
      </div>
      <div className="flex flex-col gap-3 mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="relative">
              <input
                type="text"
                placeholder="Search scholars..."
                value={query}
                onChange={(e) => { setPage(1); setQuery(e.target.value); }}
                className="pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
              />
              <svg
                className="absolute w-4 h-4 text-gray-400"
                style={{ left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </div>
            <select
              value={status}
              onChange={(e) => { setPage(1); setStatus(e.target.value); }}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-32"
            >
              <option value="All">All</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
            </select>
          </div>
        </div>
      </div>
      <div className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          {/* Loading state */}
          {loading ? (
            <div className="p-6 text-center text-sm text-gray-500">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <div>Loading scholars...</div>
            </div>
          ) : Object.keys(facultyDeptTypeGroups).length === 0 ? (
            <div className="p-6 text-center text-sm text-gray-500">{query || status !== 'All' ? 'No scholars found matching your criteria.' : 'No scholars available.'}</div>
          ) : (
            Object.entries(facultyDeptTypeGroups).map(([facultyName, depts], fidx) => {
              // Calculate total count across all departments and types
              const count = Object.values(depts).reduce((total, types) =>
                total + Object.values(types).reduce((sum, list) => sum + list.length, 0), 0
              );
              const facultyKey = facultyName;
              const facultyExpanded = !!expandedFaculties[facultyKey];
              const colorClass = `faculty-color-${(fidx % 4) + 1}`;
              return (
                <div key={facultyName} className={`faculty-section ${facultyExpanded ? 'expanded' : ''} ${colorClass}`}>
                  <div className="faculty-header" onClick={() => setExpandedFaculties(prev => ({ ...prev, [facultyKey]: !prev[facultyKey] }))}>
                    <div className="faculty-left">
                      <svg className={`faculty-icon ${facultyExpanded ? 'rotated' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      <div>
                        <div className="faculty-title">{facultyName}</div>
                        <div className="text-xs text-gray-500">{count} scholars</div>
                      </div>
                    </div>
                    <div className="faculty-right">
                      <svg className={`faculty-toggle ${facultyExpanded ? 'rotated' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </div>

                  {facultyExpanded && (
                    <div className="department-list">
                      {count === 0 ? (
                        <div className="p-6 text-center text-sm text-gray-500 italic bg-gray-50 rounded-lg mx-4 my-2">
                          <svg className="w-12 h-12 mx-auto mb-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                          </svg>
                          <p className="font-semibold text-gray-700">No scholars have been admitted</p>
                          <p className="text-xs text-gray-500 mt-1">There are no admitted scholars in this faculty yet</p>
                        </div>
                      ) : (
                        Object.entries(depts).map(([deptName, types]) => {
                          const deptKey = facultyKey + '::' + deptName;
                          const deptExpanded = !!expandedDepartments[deptKey];
                          // Calculate total scholars in this department across all types
                          const deptCount = Object.values(types).reduce((sum, list) => sum + list.length, 0);

                          // Skip departments with no scholars
                          if (deptCount === 0) return null;

                          return (
                            <div key={deptName} className="mb-4">
                              <div
                                className={`department-item ${deptExpanded ? 'expanded' : ''}`}
                                onClick={() => setExpandedDepartments(prev => ({ ...prev, [deptKey]: !prev[deptKey] }))}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setExpandedDepartments(prev => ({ ...prev, [deptKey]: !prev[deptKey] })); } }}
                                style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 12px', cursor: 'pointer', justifyContent: 'flex-start', width: '100%' }}
                              >
                                <svg
                                  className="department-icon"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  style={{ width: 20, height: 20, transform: deptExpanded ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.18s ease' }}
                                >
                                  <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                </svg>
                                <div style={{ fontSize: '15px', fontWeight: 600, color: '#111827', flex: 1, textAlign: 'left' }} className="department-name">
                                  {deptName} <span className="text-xs text-gray-500 ml-2">({deptCount})</span>
                                </div>
                              </div>

                              {deptExpanded && (
                                <div className="type-list" style={{ paddingLeft: '32px' }}>
                                  {Object.entries(types).map(([typeName, list]) => {
                                    const typeKey = deptKey + '::' + typeName;
                                    const typeExpanded = !!expandedTypes[typeKey];

                                    // Skip types with no scholars
                                    if (list.length === 0) return null;

                                    return (
                                      <div key={typeName} className="mb-3">
                                        <div
                                          className={`type-item ${typeExpanded ? 'expanded' : ''}`}
                                          onClick={() => setExpandedTypes(prev => ({ ...prev, [typeKey]: !prev[typeKey] }))}
                                          role="button"
                                          tabIndex={0}
                                          onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setExpandedTypes(prev => ({ ...prev, [typeKey]: !prev[typeKey] })); } }}
                                          style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '10px',
                                            padding: '8px 10px',
                                            cursor: 'pointer',
                                            background: '#f9fafb',
                                            borderRadius: '6px',
                                            border: '1px solid #e5e7eb'
                                          }}
                                        >
                                          <svg
                                            viewBox="0 0 24 24"
                                            fill="none"
                                            stroke="currentColor"
                                            style={{
                                              width: 16,
                                              height: 16,
                                              transform: typeExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                                              transition: 'transform 0.18s ease',
                                              color: '#6b7280'
                                            }}
                                          >
                                            <path strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                                          </svg>
                                          <div style={{ fontSize: '14px', fontWeight: 600, color: '#374151', flex: 1, textAlign: 'left' }}>
                                            {typeName} <span className="text-xs text-gray-500 ml-2">({list.length})</span>
                                          </div>
                                        </div>

                                        {typeExpanded && (() => {
                                          const rows = list.map((s, idx) => {
                                            let checklist = s.checklist;
                                            if (typeof checklist === 'string') {
                                              try { checklist = JSON.parse(checklist); } catch (e) { checklist = null; }
                                            }

                                            const isVerifiedOrCompleted = s.status === 'Completed' || s.status === 'Verified' || s.status === 'Approved';
                                            checklist = {
                                              ...defaultChecklistFor(isVerifiedOrCompleted),
                                              ...(checklist || {})
                                            };

                                            const rowStatus = s.status === 'Completed' || s.status === 'Verified' || s.status === 'Approved' ? 'Verified' : 'Pending';

                                            return (
                                              <div key={s.id} className="table-row">
                                                <div className="table-cell">{idx + 1}</div>
                                                <div className="table-cell">
                                                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                    <div style={{ width: 40, height: 40, borderRadius: 20, background: '#ebf5ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                      <span style={{ color: '#2563eb', fontWeight: 700 }}>{(s.name || '').charAt(0)}</span>
                                                    </div>
                                                    <div>
                                                      <div style={{ fontWeight: 600, color: '#111827' }}>{s.name}</div>
                                                      <div style={{ fontSize: 13, color: '#6b7280' }}>{s.email}</div>
                                                    </div>
                                                  </div>
                                                </div>
                                                <div className="table-cell">{s.applicationNo || s.application || ''}</div>
                                                <div className="table-cell">{s.mobile || s.phone || ''}</div>
                                                <div className="table-cell">{s.supervisorName || 'N/A'}</div>
                                                <div className="table-cell">
                                                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${rowStatus === 'Verified' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                                    {rowStatus}
                                                  </span>
                                                </div>
                                                <div className="table-cell" style={{ textAlign: 'center' }}>
                                                  <button onClick={() => handleScholarClick(s)} className="action-btn view-btn" title="View Details">View</button>
                                                </div>
                                              </div>
                                            );
                                          });

                                          return (
                                            <div className="department-table" style={{ marginTop: '8px' }}>
                                              <div className="table-row table-header" style={{ background: '#f9fafb', fontWeight: 600 }}>
                                                <div className="table-cell">#</div>
                                                <div className="table-cell">Scholar</div>
                                                <div className="table-cell">Application</div>
                                                <div className="table-cell">Phone</div>
                                                <div className="table-cell">Supervisor</div>
                                                <div className="table-cell">Status</div>
                                                <div className="table-cell">Actions</div>
                                              </div>
                                              {rows}
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}