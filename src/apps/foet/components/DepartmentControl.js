import React, { useState, useEffect } from 'react';
import { ArrowUpDown } from 'lucide-react';
import { MdVisibility } from 'react-icons/md';
import { useAppContext } from '../App';
import './DepartmentControl.css';

const DepartmentControl = () => {
    const {
        getFacultyDetails,
        departmentSortOrder,
        setDepartmentSortOrder,
        departmentsData,
        isLoadingSupabase,
        assignedFaculty
    } = useAppContext();

    const [searchTerm, setSearchTerm] = useState('');
    const [filteredDepartments, setFilteredDepartments] = useState([]);
    const [viewDepartmentModal, setViewDepartmentModal] = useState({ show: false, department: null });

    const faculty = getFacultyDetails();

    // Use Supabase departments data if available, otherwise use faculty departments
    // Map Supabase field names to component field names
    const departments = React.useMemo(() => {
        return departmentsData.length > 0
            ? departmentsData.map(dept => ({
                id: dept.id,
                name: dept.department_name,
                staffName: dept.head_of_department,
                staffEmail: dept.hod_email,
                staffContact: dept.phone_no,
                faculty: dept.faculty
            }))
            : faculty.departments;
    }, [departmentsData, faculty.departments]);

    // Filter and render departments
    useEffect(() => {
        let allDepts = [...departments];

        // Apply search filter
        if (searchTerm) {
            const searchLower = searchTerm.toLowerCase();
            allDepts = allDepts.filter(d =>
                d.name.toLowerCase().includes(searchLower) ||
                (d.staffName && d.staffName.toLowerCase().includes(searchLower))
            );
        }

        // Apply sorting with null safety
        allDepts.sort((a, b) => {
            const nameA = (a.name || '').toString();
            const nameB = (b.name || '').toString();
            if (departmentSortOrder === 'asc') return nameA.localeCompare(nameB);
            else return nameB.localeCompare(nameA);
        });

        setFilteredDepartments(allDepts);
    }, [departments, searchTerm, departmentSortOrder]);

    const handleViewDepartment = (dept) => {
        setViewDepartmentModal({ show: true, department: dept });
    };

    const closeViewModal = () => {
        setViewDepartmentModal({ show: false, department: null });
    };

    // Function to generate staff posting based on staff name or department
    const getStaffPosting = (staffName) => {
        const postings = [
            'Assistant Professor',
            'Associate Professor',
            'Professor',
            'Assistant Professor',
            'Associate Professor',
            'Professor',
            'Assistant Professor',
            'Associate Professor',
            'Assistant Professor',
            'Professor',
            'Associate Professor'
        ];

        // Generate posting based on staff name hash to ensure consistency
        if (!staffName) return 'Assistant Professor';
        const hash = staffName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
        return postings[hash % postings.length];
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="department-header-section">
                <h1 className="department-page-title">Departments{assignedFaculty ? ` - ${assignedFaculty}` : ''}</h1>
                <div className="department-controls-section">
                    <div className="department-search-container">
                        <input
                            type="text"
                            placeholder="Search..."
                            className="department-search-input"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => setDepartmentSortOrder(departmentSortOrder === 'asc' ? 'desc' : 'asc')}
                        title="Sort A-Z / Z-A"
                        className="department-control-button"
                    >
                        <ArrowUpDown className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="table-container">
                <table className="departments-table">
                    <thead>
                        <tr>
                            <th>S.NO</th>
                            <th>DEPARTEMENT</th>
                            <th>STAFF NAME</th>
                            <th>STAFF EMAIL</th>
                            <th>ACTIONS</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredDepartments.length > 0 ? (
                            filteredDepartments.map((dept, index) => (
                                <tr key={dept.id}>
                                    <td>{index + 1}</td>
                                    <td>{dept.name}</td>
                                    <td>{dept.staffName || 'N/A'}</td>
                                    <td>{dept.staffEmail || 'N/A'}</td>
                                    <td>
                                        <button className="view-button" title="View Details" onClick={() => handleViewDepartment(dept)}>
                                            <div className="eye-icon-container">
                                                <MdVisibility size={16} />
                                            </div>
                                        </button>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="5" className="no-data-message">
                                    No matching departments found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* View Department Modal */}
            {viewDepartmentModal.show && viewDepartmentModal.department && (
                <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '32rem' }}>
                        <button
                            className="modal-close-button"
                            onClick={closeViewModal}
                        >
                            &times;
                        </button>

                        <div className="modal-title-section">
                            <h3>Department Details</h3>
                        </div>

                        <div className="department-details-list">
                            <div className="department-detail-item">
                                <span className="department-detail-label">Staff Name:</span>
                                <span className="department-detail-value">{viewDepartmentModal.department.staffName || 'N/A'}</span>
                            </div>
                            <div className="department-detail-item">
                                <span className="department-detail-label">Staff Email:</span>
                                <span className="department-detail-value">{viewDepartmentModal.department.staffEmail || 'N/A'}</span>
                            </div>
                            <div className="department-detail-item">
                                <span className="department-detail-label">Staff Number:</span>
                                <span className="department-detail-value">{viewDepartmentModal.department.staffContact || 'N/A'}</span>
                            </div>
                            <div className="department-detail-item">
                                <span className="department-detail-label">Affiliation:</span>
                                <span className="department-detail-value">
                                    {getStaffPosting(viewDepartmentModal.department.staffName)}
                                </span>
                            </div>
                            <div className="department-detail-item">
                                <span className="department-detail-label">Department:</span>
                                <span className="department-detail-value">{viewDepartmentModal.department.name || 'N/A'}</span>
                            </div>
                            <div className="department-detail-item">
                                <span className="department-detail-label">Faculty:</span>
                                <span className="department-detail-value">{faculty.name || 'N/A'}</span>
                            </div>
                        </div>

                        <div className="modal-actions">
                            <button
                                onClick={closeViewModal}
                                className="cancel-button"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DepartmentControl;