import React, { useState, useEffect } from 'react';
import { MdSchool, MdPeople, MdCheckCircle, MdHourglassEmpty, MdCancel, MdVisibility, MdTimeline } from 'react-icons/md';
import { FaExpand, FaCompress } from 'react-icons/fa';
import { supabase } from '../../../../supabaseClient';
import './ScholarManagement.css';

const WorkflowScholarAdmin = ({ onModalStateChange, onFullscreenChange }) => {
  const [scholarsData, setScholarsData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [selectedScholar, setSelectedScholar] = useState(null);

  // Fetch all scholars from scholar_applications table
  useEffect(() => {
    fetchScholars();
  }, []);

  const fetchScholars = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('scholar_applications')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching scholars:', error);
        return;
      }

      console.log(`✅ Fetched ${data?.length || 0} scholars from scholar_applications`);
      setScholarsData(data || []);
    } catch (err) {
      console.error('Exception fetching scholars:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleView = (scholar) => {
    setSelectedScholar(scholar);
    setShowViewModal(true);
    if (onModalStateChange) onModalStateChange(true);
  };

  const handleCloseModal = () => {
    setShowViewModal(false);
    setSelectedScholar(null);
    if (onModalStateChange) onModalStateChange(false);
  };

  const handleTimeline = (scholar) => {
    setSelectedScholar(scholar);
    setShowTimelineModal(true);
    if (onModalStateChange) onModalStateChange(true);
  };

  const handleCloseTimelineModal = () => {
    setShowTimelineModal(false);
    setSelectedScholar(null);
    if (onModalStateChange) onModalStateChange(false);
  };

  const toggleFullscreen = () => {
    const newFullscreenState = !isFullscreen;
    setIsFullscreen(newFullscreenState);
    if (onFullscreenChange) onFullscreenChange(newFullscreenState);
  };

  // Calculate statistics from scholars data
  const totalScholars = scholarsData?.length || 0;
  const verifiedScholars = scholarsData?.filter(s => s.faculty_forward?.includes('Back_To_Director')).length || 0;
  const pendingScholars = scholarsData?.filter(s => s.status === 'Pending' || s.status?.includes('Forwarded')).length || 0;
  const rejectedScholars = scholarsData?.filter(s => s.dept_review?.toLowerCase().includes('reject')).length || 0;

  // Filter scholars based on search and filters
  const filteredScholars = scholarsData?.filter(scholar => {
    const matchesSearch = !searchTerm || 
      scholar.registered_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scholar.application_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scholar.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFaculty = !selectedFaculty || 
      scholar.institution === selectedFaculty || 
      scholar.faculty === selectedFaculty;
    
    const matchesType = !selectedType || 
      scholar.program_type === selectedType || 
      scholar.type === selectedType;
    
    return matchesSearch && matchesFaculty && matchesType;
  }) || [];

  // Get unique faculties for filter
  const faculties = [...new Set(scholarsData?.map(s => s.institution || s.faculty).filter(Boolean))] || [];
  const programTypes = ['Full Time', 'Part Time Internal', 'Part Time External', 'Part Time External (Industry)'];

  return (
    <div className={`scholar-management-container ${isFullscreen ? 'fullscreen-active' : ''}`}>
      <div className="scholar-main-content">
        <div className={`${isFullscreen ? 'p-4' : 'p-6'}`}>
          {/* Header */}
          <div className="mb-6 flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold text-gray-800 mb-2">Scholar Administration Workflow</h1>
              <p className="text-gray-600">Manage scholar applications and track their progress through the workflow</p>
            </div>
            <button 
              onClick={toggleFullscreen} 
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 transition-colors"
              title={isFullscreen ? "Exit Fullscreen" : "Enter Fullscreen"}
            >
              {isFullscreen ? <FaCompress className="w-4 h-4" /> : <FaExpand className="w-4 h-4" />}
              {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
            </button>
          </div>

          {/* Statistics Tiles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-l-4 border-blue-600 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Scholars</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{totalScholars}</p>
                </div>
                <div className="bg-blue-200 p-3 rounded-full">
                  <MdPeople className="text-2xl text-blue-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-l-4 border-green-600 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Verified Scholars</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{verifiedScholars}</p>
                </div>
                <div className="bg-green-200 p-3 rounded-full">
                  <MdCheckCircle className="text-2xl text-green-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border-l-4 border-orange-600 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Pending Review</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{pendingScholars}</p>
                </div>
                <div className="bg-orange-200 p-3 rounded-full">
                  <MdHourglassEmpty className="text-2xl text-orange-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-red-50 to-red-100 rounded-lg p-4 border-l-4 border-red-600 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Rejected</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{rejectedScholars}</p>
                </div>
                <div className="bg-red-200 p-3 rounded-full">
                  <MdCancel className="text-2xl text-red-700" />
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filters */}
          <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
                <input
                  type="text"
                  placeholder="Search by name, application no, email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Faculty</label>
                <select
                  value={selectedFaculty}
                  onChange={(e) => setSelectedFaculty(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Faculties</option>
                  {faculties.map(faculty => (
                    <option key={faculty} value={faculty}>{faculty}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Program Type</label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Types</option>
                  {programTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Scholars Table */}
          <div className={`bg-white rounded-lg shadow-sm overflow-hidden ${isFullscreen ? 'fullscreen-table-container' : ''}`}>
            {loading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className={`scholar-table ${isFullscreen ? 'fullscreen-table' : ''}`}>
                  <thead>
                    <tr>
                      <th>S.NO</th>
                      <th>REGISTERED NAME</th>
                      <th>APPLICATION NO</th>
                      <th>SELECT INSTITUTION</th>
                      <th>DEPARTMENT</th>
                      <th>TYPE</th>
                      <th>DEPARTMENT STATUS</th>
                      <th>REJECT REASON</th>
                      <th>ACTION</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredScholars.length > 0 ? (
                      filteredScholars.map((scholar, index) => (
                        <tr key={scholar.id || index}>
                          <td className="text-center">{index + 1}</td>
                          <td>{scholar.registered_name || scholar.name || 'N/A'}</td>
                          <td>{scholar.application_no || 'N/A'}</td>
                          <td>{scholar.institution || scholar.faculty || 'N/A'}</td>
                          <td>
                            <div className="program-cell" title={scholar.department || 'N/A'}>
                              {scholar.department || 'N/A'}
                            </div>
                          </td>
                          <td>{scholar.program_type || scholar.type || 'N/A'}</td>
                          <td>
                            <span className={`status-pill ${
                              scholar.dept_review?.toLowerCase().includes('approve') ? 'verified' :
                              scholar.dept_review?.toLowerCase().includes('forward') ? 'forwarded' :
                              scholar.dept_review?.toLowerCase().includes('reject') ? 'rejected' :
                              'pending'
                            }`}>
                              {scholar.dept_review || 'Pending'}
                            </span>
                          </td>
                          <td>
                            {scholar.rejection_reason || scholar.reject_reason || '-'}
                          </td>
                          <td>
                            <div className="action-buttons-container">
                              <button
                                onClick={() => handleView(scholar)}
                                className="action-view-btn"
                                title="View Details"
                              >
                                <MdVisibility className="action-icon" />
                              </button>
                              <button
                                onClick={() => handleTimeline(scholar)}
                                className="action-timeline-btn"
                                title="View Timeline"
                              >
                                <MdTimeline className="action-icon" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="9" className="text-center py-8">
                          <div className="flex flex-col items-center justify-center text-gray-500">
                            <MdSchool className="text-5xl mb-2 opacity-50" />
                            <p className="text-lg font-medium">No scholars found</p>
                            <p className="text-sm">Scholars will appear here when applications are submitted</p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* View Scholar Modal */}
      {showViewModal && selectedScholar && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          <div className="modal-content-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Scholar Details</h2>
              <button onClick={handleCloseModal} className="modal-close-btn">×</button>
            </div>
            
            <div className="modal-body-scroll">
              {/* Basic Information */}
              <div className="detail-section">
                <h3 className="section-title">Basic Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Application No</label>
                    <span>{selectedScholar.application_no || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Registered Name</label>
                    <span>{selectedScholar.registered_name || selectedScholar.name || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Email</label>
                    <span>{selectedScholar.email || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Mobile Number</label>
                    <span>{selectedScholar.mobile_number || selectedScholar.mobile || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Date of Birth</label>
                    <span>{selectedScholar.date_of_birth || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Gender</label>
                    <span>{selectedScholar.gender || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Nationality</label>
                    <span>{selectedScholar.nationality || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Aadhaar No</label>
                    <span>{selectedScholar.aadhaar_no || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Academic Information */}
              <div className="detail-section">
                <h3 className="section-title">Academic Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Institution</label>
                    <span>{selectedScholar.institution || selectedScholar.faculty || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Department</label>
                    <span>{selectedScholar.department || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Department</label>
                    <span>{selectedScholar.dept_name || selectedScholar.department || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Program Type</label>
                    <span>{selectedScholar.program_type || selectedScholar.type || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Area of Interest</label>
                    <span>{selectedScholar.area_of_interest || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Graduated from India</label>
                    <span>{selectedScholar.graduated_from_india || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* UG Details */}
              <div className="detail-section">
                <h3 className="section-title">Undergraduate (UG) Details</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>UG Qualification</label>
                    <span>{selectedScholar.ug_qualification || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>UG Institute</label>
                    <span>{selectedScholar.ug_institute || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>UG Degree</label>
                    <span>{selectedScholar.ug_degree || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>UG Specialization</label>
                    <span>{selectedScholar.ug_specialization || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>UG CGPA/Percentage</label>
                    <span>{selectedScholar.ug_cgpa || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>UG Marking Scheme</label>
                    <span>{selectedScholar.ug_marking_scheme || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>UG Month & Year</label>
                    <span>{selectedScholar.ug_month_year || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>UG Registration No</label>
                    <span>{selectedScholar.ug_registration_no || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>UG Mode of Study</label>
                    <span>{selectedScholar.ug_mode_of_study || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>UG Place of Institution</label>
                    <span>{selectedScholar.ug_place_of_institution || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* PG Details */}
              <div className="detail-section">
                <h3 className="section-title">Postgraduate (PG) Details</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>PG Qualification</label>
                    <span>{selectedScholar.pg_qualification || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>PG Institute</label>
                    <span>{selectedScholar.pg_institute || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>PG Degree</label>
                    <span>{selectedScholar.pg_degree || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>PG Specialization</label>
                    <span>{selectedScholar.pg_specialization || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>PG CGPA/Percentage</label>
                    <span>{selectedScholar.pg_cgpa || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>PG Marking Scheme</label>
                    <span>{selectedScholar.pg_marking_scheme || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>PG Month & Year</label>
                    <span>{selectedScholar.pg_month_year || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>PG Registration No</label>
                    <span>{selectedScholar.pg_registration_no || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>PG Mode of Study</label>
                    <span>{selectedScholar.pg_mode_of_study || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>PG Place of Institution</label>
                    <span>{selectedScholar.pg_place_of_institution || 'N/A'}</span>
                  </div>
                </div>
              </div>

              {/* Employment Details (if applicable) */}
              {(selectedScholar.employee_id || selectedScholar.designation || selectedScholar.organization_name) && (
                <div className="detail-section">
                  <h3 className="section-title">Employment Details</h3>
                  <div className="detail-grid">
                    <div className="detail-item">
                      <label>Employee ID</label>
                      <span>{selectedScholar.employee_id || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Designation</label>
                      <span>{selectedScholar.designation || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Organization Name</label>
                      <span>{selectedScholar.organization_name || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Organization Address</label>
                      <span>{selectedScholar.organization_address || 'N/A'}</span>
                    </div>
                    <div className="detail-item">
                      <label>Mode of Profession</label>
                      <span>{selectedScholar.mode_of_profession || 'N/A'}</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Competitive Exams */}
              {(selectedScholar.exam1_name || selectedScholar.exam2_name || selectedScholar.exam3_name) && (
                <div className="detail-section">
                  <h3 className="section-title">Competitive Exams</h3>
                  
                  {selectedScholar.exam1_name && (
                    <div className="exam-subsection">
                      <h4 className="subsection-title">Exam 1</h4>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <label>Exam Name</label>
                          <span>{selectedScholar.exam1_name}</span>
                        </div>
                        <div className="detail-item">
                          <label>Registration No</label>
                          <span>{selectedScholar.exam1_reg_no || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Score</label>
                          <span>{selectedScholar.exam1_score || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Max Score</label>
                          <span>{selectedScholar.exam1_max_score || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Year</label>
                          <span>{selectedScholar.exam1_year || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Rank</label>
                          <span>{selectedScholar.exam1_rank || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Qualified</label>
                          <span>{selectedScholar.exam1_qualified || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedScholar.exam2_name && (
                    <div className="exam-subsection">
                      <h4 className="subsection-title">Exam 2</h4>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <label>Exam Name</label>
                          <span>{selectedScholar.exam2_name}</span>
                        </div>
                        <div className="detail-item">
                          <label>Registration No</label>
                          <span>{selectedScholar.exam2_reg_no || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Score</label>
                          <span>{selectedScholar.exam2_score || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Max Score</label>
                          <span>{selectedScholar.exam2_max_score || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Year</label>
                          <span>{selectedScholar.exam2_year || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Rank</label>
                          <span>{selectedScholar.exam2_rank || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Qualified</label>
                          <span>{selectedScholar.exam2_qualified || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedScholar.exam3_name && (
                    <div className="exam-subsection">
                      <h4 className="subsection-title">Exam 3</h4>
                      <div className="detail-grid">
                        <div className="detail-item">
                          <label>Exam Name</label>
                          <span>{selectedScholar.exam3_name}</span>
                        </div>
                        <div className="detail-item">
                          <label>Registration No</label>
                          <span>{selectedScholar.exam3_reg_no || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Score</label>
                          <span>{selectedScholar.exam3_score || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Max Score</label>
                          <span>{selectedScholar.exam3_max_score || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Year</label>
                          <span>{selectedScholar.exam3_year || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Rank</label>
                          <span>{selectedScholar.exam3_rank || 'N/A'}</span>
                        </div>
                        <div className="detail-item">
                          <label>Qualified</label>
                          <span>{selectedScholar.exam3_qualified || 'N/A'}</span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Research Interest */}
              {(selectedScholar.reasons_for_applying || selectedScholar.research_interest) && (
                <div className="detail-section">
                  <h3 className="section-title">Research & Motivation</h3>
                  {selectedScholar.reasons_for_applying && (
                    <div className="detail-item-full">
                      <label>Reasons for Applying</label>
                      <p className="detail-text">{selectedScholar.reasons_for_applying}</p>
                    </div>
                  )}
                  {selectedScholar.research_interest && (
                    <div className="detail-item-full">
                      <label>Research Interest</label>
                      <p className="detail-text">{selectedScholar.research_interest}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Status Information */}
              <div className="detail-section">
                <h3 className="section-title">Status Information</h3>
                <div className="detail-grid">
                  <div className="detail-item">
                    <label>Department Status</label>
                    <span className={`status-pill ${
                      selectedScholar.dept_review?.toLowerCase().includes('approve') ? 'verified' :
                      selectedScholar.dept_review?.toLowerCase().includes('forward') ? 'forwarded' :
                      selectedScholar.dept_review?.toLowerCase().includes('reject') ? 'rejected' :
                      'pending'
                    }`}>
                      {selectedScholar.dept_review || 'Pending'}
                    </span>
                  </div>
                  <div className="detail-item">
                    <label>Current Owner</label>
                    <span>{selectedScholar.current_owner || 'N/A'}</span>
                  </div>
                  <div className="detail-item">
                    <label>Faculty Forward</label>
                    <span>{selectedScholar.faculty_forward || 'N/A'}</span>
                  </div>
                  {selectedScholar.rejection_reason && (
                    <div className="detail-item">
                      <label>Rejection Reason</label>
                      <span className="text-red-600">{selectedScholar.rejection_reason}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Certificates */}
              {selectedScholar.certificates && (
                <div className="detail-section">
                  <h3 className="section-title">Documents</h3>
                  <div className="detail-item">
                    <label>Certificates</label>
                    <a 
                      href={selectedScholar.certificates} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="certificate-link"
                    >
                      View Certificates
                    </a>
                  </div>
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button onClick={handleCloseModal} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Modal */}
      {showTimelineModal && selectedScholar && (
        <div className="modal-overlay" onClick={handleCloseTimelineModal}>
          <div className="modal-content-timeline" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Application Timeline</h2>
              <button onClick={handleCloseTimelineModal} className="modal-close-btn">×</button>
            </div>
            
            <div className="modal-body-scroll">
              {/* Scholar Info Header */}
              <div className="timeline-header-info">
                <div className="timeline-info-item">
                  <span className="timeline-info-label">Application No:</span>
                  <span className="timeline-info-value">{selectedScholar.application_no || 'N/A'}</span>
                </div>
                <div className="timeline-info-item">
                  <span className="timeline-info-label">Scholar Name:</span>
                  <span className="timeline-info-value">{selectedScholar.registered_name || selectedScholar.name || 'N/A'}</span>
                </div>
                <div className="timeline-info-item">
                  <span className="timeline-info-label">Program:</span>
                  <span className="timeline-info-value">{selectedScholar.department || selectedScholar.program || 'N/A'}</span>
                </div>
              </div>

              {/* Timeline Container */}
              <div className="timeline-container">
                {/* Timeline Item 1 - Admin Upload/Forward */}
                <div className="timeline-item completed">
                  <div className="timeline-marker">
                    <div className="timeline-marker-icon">1</div>
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-stage">
                      <h3 className="timeline-stage-title">Admin Upload & Forward</h3>
                      <span className="timeline-status-badge status-completed">Completed</span>
                    </div>
                    <p className="timeline-description">Application uploaded by admin and forwarded to Research Coordinator</p>
                    <div className="timeline-meta">
                      <span className="timeline-timestamp">
                        {/* Replace with actual column name */}
                        {selectedScholar.admin_forward_timestamp ? new Date(selectedScholar.admin_forward_timestamp).toLocaleString() : 'Pending'}
                      </span>
                      <span className="timeline-note">Status: Forwarded</span>
                    </div>
                  </div>
                </div>

                {/* Timeline Item 2 - Research Coordinator Forward */}
                <div className={`timeline-item ${selectedScholar.rc_forward_timestamp ? 'completed' : selectedScholar.current_owner === 'research_coordinator' ? 'active' : 'pending'}`}>
                  <div className="timeline-marker">
                    <div className="timeline-marker-icon">2</div>
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-stage">
                      <h3 className="timeline-stage-title">Research Coordinator Forward</h3>
                      <span className={`timeline-status-badge ${selectedScholar.rc_forward_timestamp ? 'status-completed' : selectedScholar.current_owner === 'research_coordinator' ? 'status-active' : 'status-pending'}`}>
                        {selectedScholar.rc_forward_timestamp ? 'Completed' : selectedScholar.current_owner === 'research_coordinator' ? 'In Progress' : 'Pending'}
                      </span>
                    </div>
                    <p className="timeline-description">Research Coordinator forwarded to respective department</p>
                    <div className="timeline-meta">
                      <span className="timeline-timestamp">
                        {/* Replace with actual column name */}
                        {selectedScholar.rc_forward_timestamp ? new Date(selectedScholar.rc_forward_timestamp).toLocaleString() : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timeline Item 3 - Department Review */}
                <div className={`timeline-item ${selectedScholar.dept_review_timestamp ? 'completed' : selectedScholar.current_owner === 'department' ? 'active' : 'pending'}`}>
                  <div className="timeline-marker">
                    <div className="timeline-marker-icon">3</div>
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-stage">
                      <h3 className="timeline-stage-title">Department Review</h3>
                      <span className={`timeline-status-badge ${
                        selectedScholar.dept_review?.toLowerCase().includes('approve') ? 'status-approved' :
                        selectedScholar.dept_review?.toLowerCase().includes('reject') ? 'status-rejected' :
                        selectedScholar.dept_review?.toLowerCase().includes('query') ? 'status-active' :
                        selectedScholar.current_owner === 'department' ? 'status-active' :
                        'status-pending'
                      }`}>
                        {selectedScholar.dept_review?.toLowerCase().includes('approve') ? 'Approved' :
                         selectedScholar.dept_review?.toLowerCase().includes('reject') ? 'Rejected' :
                         selectedScholar.dept_review?.toLowerCase().includes('query') ? 'Query' :
                         selectedScholar.current_owner === 'department' ? 'In Progress' :
                         'Pending'}
                      </span>
                    </div>
                    <p className="timeline-description">Department reviewed and provided decision</p>
                    <div className="timeline-meta">
                      <span className="timeline-timestamp">
                        {/* Replace with actual column name */}
                        {selectedScholar.dept_review_timestamp ? new Date(selectedScholar.dept_review_timestamp).toLocaleString() : 'Pending'}
                      </span>
                      {selectedScholar.dept_review && (
                        <span className={`timeline-note ${selectedScholar.dept_review?.toLowerCase().includes('reject') ? 'timeline-note-error' : ''}`}>
                          Decision: {selectedScholar.dept_review}
                        </span>
                      )}
                      {selectedScholar.rejection_reason && (
                        <span className="timeline-note timeline-note-error">
                          Reason: {selectedScholar.rejection_reason}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Timeline Item 4 - Back to Research Coordinator */}
                <div className={`timeline-item ${selectedScholar.back_to_rc_timestamp ? 'completed' : selectedScholar.dept_review_timestamp && selectedScholar.current_owner === 'research_coordinator' ? 'active' : 'pending'}`}>
                  <div className="timeline-marker">
                    <div className="timeline-marker-icon">4</div>
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-stage">
                      <h3 className="timeline-stage-title">Back to Research Coordinator</h3>
                      <span className={`timeline-status-badge ${selectedScholar.back_to_rc_timestamp ? 'status-completed' : selectedScholar.dept_review_timestamp && selectedScholar.current_owner === 'research_coordinator' ? 'status-active' : 'status-pending'}`}>
                        {selectedScholar.back_to_rc_timestamp ? 'Completed' : selectedScholar.dept_review_timestamp && selectedScholar.current_owner === 'research_coordinator' ? 'In Progress' : 'Pending'}
                      </span>
                    </div>
                    <p className="timeline-description">Application returned to Research Coordinator</p>
                    <div className="timeline-meta">
                      <span className="timeline-timestamp">
                        {/* Replace with actual column name */}
                        {selectedScholar.back_to_rc_timestamp ? new Date(selectedScholar.back_to_rc_timestamp).toLocaleString() : 'Pending'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Timeline Item 5 - Back to Admin */}
                <div className={`timeline-item ${selectedScholar.back_to_admin_timestamp ? 'completed' : selectedScholar.back_to_rc_timestamp && selectedScholar.current_owner === 'admin' ? 'active' : 'pending'}`}>
                  <div className="timeline-marker">
                    <div className="timeline-marker-icon">5</div>
                  </div>
                  <div className="timeline-content">
                    <div className="timeline-stage">
                      <h3 className="timeline-stage-title">Back to Admin</h3>
                      <span className={`timeline-status-badge ${selectedScholar.back_to_admin_timestamp ? 'status-completed' : selectedScholar.back_to_rc_timestamp && selectedScholar.current_owner === 'admin' ? 'status-active' : 'status-pending'}`}>
                        {selectedScholar.back_to_admin_timestamp ? 'Completed' : selectedScholar.back_to_rc_timestamp && selectedScholar.current_owner === 'admin' ? 'In Progress' : 'Pending'}
                      </span>
                    </div>
                    <p className="timeline-description">Application returned to Admin for final processing</p>
                    <div className="timeline-meta">
                      <span className="timeline-timestamp">
                        {/* Replace with actual column name */}
                        {selectedScholar.back_to_admin_timestamp ? new Date(selectedScholar.back_to_admin_timestamp).toLocaleString() : 'Pending'}
                      </span>
                      {selectedScholar.back_to_admin_timestamp && (
                        <span className="timeline-note">Process Completed</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button onClick={handleCloseTimelineModal} className="btn-secondary">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkflowScholarAdmin;
