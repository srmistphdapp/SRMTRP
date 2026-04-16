import React, { useState, useEffect } from "react";
import { createPortal } from 'react-dom';
import { MdVisibility, MdEdit, MdDelete, MdBusiness, MdPerson } from 'react-icons/md';
import { 
  fetchDepartments, 
  createDepartment, 
  updateDepartment, 
  deleteDepartment 
} from '../../../../services/departmentService';
import "./Faculties.css";

const facultyOptions = [
  "Faculty of Engineering & Technology",
  "Faculty of Science & Humanities",
  "Faculty of Medical and Health Sciences",
  "Faculty of Management",
];

export default function Faculties({ onModalStateChange }) {
  const [departments, setDepartments] = useState([]);
  const [faculties, setFaculties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [isClient, setIsClient] = useState(false);
  const [modal, setModal] = useState("");
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedFaculty, setSelectedFaculty] = useState("");
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  const [formData, setFormData] = useState({
    department_name: "",
    faculty: facultyOptions[0],
    head_of_department: "",
    hod_email: "",
    phone_no: "",
  });

  // Toast notification function
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Load departments from Supabase
  useEffect(() => {
    loadDepartments();
  }, []);

  // Track modal states and notify parent
  useEffect(() => {
    const hasModal = modal !== "";
    if (onModalStateChange) {
      onModalStateChange(hasModal);
    }
  }, [modal, onModalStateChange]);

  const loadDepartments = async () => {
    setLoading(true);
    const { data, error } = await fetchDepartments();
    
    if (error) {
      console.error('Failed to load departments:', error);
      showToast('Failed to load departments. Please try again.', 'error');
      setLoading(false);
      return;
    }

    if (data) {
      setDepartments(data);
      // Group departments by faculty
      groupDepartmentsByFaculty(data);
    }
    setLoading(false);
  };

  const groupDepartmentsByFaculty = (depts) => {
    const grouped = {};
    
    depts.forEach(dept => {
      if (!grouped[dept.faculty]) {
        grouped[dept.faculty] = {
          name: dept.faculty,
          departments: []
        };
      }
      grouped[dept.faculty].departments.push({
        id: dept.id,
        name: dept.department_name,
        head: dept.head_of_department || 'N/A',
        hodEmail: dept.hod_email || '',
        phoneNo: dept.phone_no || '',
      });
    });

    setFaculties(Object.values(grouped));
  };

  const filterFaculties = () => {
    if (!search.trim()) return faculties;
    const lower = search.toLowerCase();
    return faculties
      .map((fac) => ({
        ...fac,
        departments: fac.departments.filter(
          (d) =>
            d.name.toLowerCase().includes(lower) ||
            d.head.toLowerCase().includes(lower)
        ),
      }))
      .filter((fac) => fac.departments.length > 0);
  };

  const filteredFaculties = filterFaculties();
  const totalFilteredDepartments = filteredFaculties.reduce((sum, fac) => sum + (fac.departments?.length || 0), 0);

  const openModal = (type, dept, facultyName) => {
    setModal(type);
    setSelectedDept(dept);
    setSelectedFaculty(facultyName);

    if (type === "edit") {
      setFormData({
        department_name: dept.name,
        faculty: facultyName,
        head_of_department: dept.head === 'N/A' ? '' : dept.head,
        hod_email: dept.hodEmail,
        phone_no: dept.phoneNo,
      });
    } else if (type === "add") {
      setFormData({
        department_name: "",
        faculty: facultyName || facultyOptions[0],
        head_of_department: "",
        hod_email: "",
        phone_no: "",
      });
    } else if (type === "view") {
      setFormData({
        department_name: dept.name,
        faculty: facultyName,
        head_of_department: dept.head,
        hod_email: dept.hodEmail,
        phone_no: dept.phoneNo,
      });
    } else if (type === "delete") {
      setFormData({
        department_name: dept.name,
        faculty: facultyName,
        head_of_department: dept.head,
        hod_email: dept.hodEmail,
        phone_no: dept.phoneNo,
      });
    }

    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setModal("");
    setSelectedDept(null);
    setSelectedFaculty("");
    setFormData({
      department_name: "",
      faculty: facultyOptions[0],
      head_of_department: "",
      hod_email: "",
      phone_no: "",
    });
    document.body.style.overflow = 'unset';
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const confirmDelete = async () => {
    if (!selectedDept) return;

    const { error } = await deleteDepartment(selectedDept.id);
    
    if (error) {
      showToast('Failed to delete department. Please try again.', 'error');
      return;
    }

    showToast('Department deleted successfully!', 'success');
    closeModal();
    loadDepartments(); // Reload data
  };

  const saveDepartment = async (e) => {
    e.preventDefault();

    if (!formData.department_name.trim()) {
      showToast('Please enter a department name', 'error');
      return;
    }

    if (modal === "edit") {
      // Store original email to check if it changed
      const originalEmail = selectedDept.hodEmail;
      const newEmail = formData.hod_email;
      const emailChanged = originalEmail && newEmail && originalEmail !== newEmail;

      // Update existing department
      const { error, emailUpdated } = await updateDepartment(selectedDept.id, formData);
      
      if (error) {
        showToast('Failed to update department. Please try again.', 'error');
        return;
      }

      // Show appropriate success message
      if (emailChanged && emailUpdated) {
        showToast('Department updated! Email synced with authentication.', 'success');
      } else if (emailChanged && !emailUpdated) {
        showToast('Department updated, but email sync failed. Check console.', 'error');
      } else {
        showToast('Department updated successfully!', 'success');
      }
    } else if (modal === "add") {
      // Add new department with auth
      const { data, error, authCreated, credentials, warning } = await createDepartment(formData);
      
      if (error) {
        if (error.code === '23505') {
          showToast('A department with this name already exists in this faculty.', 'error');
        } else {
          showToast('Failed to create department. Please try again.', 'error');
        }
        return;
      }

      // Show success message with credentials if auth was created
      if (authCreated && credentials) {
        showToast(`Department created! HOD login: ${credentials.email} / Password: ${credentials.password}`, 'success');
      } else if (warning) {
        showToast(`Department created with warning: ${warning}`, 'success');
      } else {
        showToast('Department created successfully!', 'success');
      }
    }
    
    closeModal();
    loadDepartments(); // Reload data
  };

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return null;
  }

  if (loading) {
    return (
      <div className="faculties-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '24px', marginBottom: '16px' }}>⏳</div>
          <div style={{ color: '#6b7280' }}>Loading departments...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="faculties-container faculties-compact overflow-x-hidden" style={{ maxWidth: '100%', width: '100%', boxSizing: 'border-box' }}>
      {/* Toast Notification */}
      {toast.show && (
        <div style={{
          position: 'fixed',
          top: '20px',
          right: '20px',
          backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
          color: 'white',
          padding: '16px 24px',
          borderRadius: '8px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          animation: 'slideIn 0.3s ease-out',
          minWidth: '300px',
          maxWidth: '500px'
        }}>
          <span style={{ fontSize: '20px' }}>
            {toast.type === 'success' ? '✓' : '✕'}
          </span>
          <span style={{ fontWeight: '500', fontSize: '15px' }}>{toast.message}</span>
        </div>
      )}
      
      <h1 className="faculties-title font-size flex justify-left">Faculties</h1>
      <div className="header-row flex justify-between">
        <button
          className="add-department-btn"
          onClick={() => openModal("add", null, facultyOptions[0])}
        >
          + Add Department
        </button>
        <input
          type="search"
          placeholder="Search Departments..."
          className="faculty-search-input w-10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="summary-row">
        <span className="summary-text">Total departments: {totalFilteredDepartments}</span>
      </div>

      {filteredFaculties.length === 0 && (
        <div className="faculty-card empty-state">
          <div className="empty-state-inner">
            <div className="empty-emoji">🔎</div>
            <h3>No matching departments</h3>
            <p>Try a different search term or clear the filter.</p>
          </div>
        </div>
      )}

      {filteredFaculties.map((fac) => (
        <div key={fac.name} className="faculty-card">
          <div className="faculty-card-header">
            <span className="faculty-title">{fac.name}</span>
            <span className="faculty-count">{fac.departments.length} {fac.departments.length === 1 ? 'Department' : 'Departments'}</span>
          </div>
          <table className="faculty-table">
            <thead>
              <tr>
                <th>DEPARTMENT NAME</th>
                <th>HEAD OF DEPARTMENT</th>
                <th>PHONE NO.</th>
                <th style={{ textAlign: 'left' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {fac.departments.map((dep) => (
                <tr key={dep.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MdBusiness style={{ color: '#3B82F6', fontSize: '18px' }} />
                      <span>{dep.name}</span>
                    </div>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <MdPerson style={{ color: '#10B981', fontSize: '18px' }} />
                      <span>{dep.head}</span>
                    </div>
                  </td>
                  <td>
                    <span style={{ color: '#6b7280' }}>{dep.phoneNo || 'N/A'}</span>
                  </td>
                  <td style={{ textAlign: 'left' }}>
                    <div className="action-buttons">
                      <button
                        className="icon-btn view"
                        onClick={() => openModal("view", dep, fac.name)}
                        title="View"
                        aria-label="View"
                      >
                        <MdVisibility />
                      </button>
                      <button
                        className="icon-btn edit"
                        onClick={() => openModal("edit", dep, fac.name)}
                        title="Edit"
                        aria-label="Edit"
                      >
                        <MdEdit />
                      </button>
                      <button
                        className="icon-btn delete"
                        onClick={() => openModal("delete", dep, fac.name)}
                        title="Delete"
                        aria-label="Delete"
                      >
                        <MdDelete />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {/* Modals - View, Edit, Add, Delete */}
      {isClient && (modal === "view" || modal === "edit" || modal === "add" || modal === "delete") &&
        createPortal(
          <div className="modal-overlay" onClick={closeModal}>
            <div className={`modal-content ${modal === 'delete' ? 'delete-modal' : ''}`} onClick={e => e.stopPropagation()}>
              {modal !== "delete" && (
                <div className="modal-header">
                  <h2 className="modal-title">
                    {modal === "view" ? "Department Details" :
                      modal === "edit" ? "Edit Department" :
                        "Add Department"}
                  </h2>
                  <div className="modal-actions">
                    <button className="close-btn" onClick={closeModal}>
                      &times;
                    </button>
                  </div>
                </div>
              )}
              
              {modal === "view" && selectedDept && (
                <div className="modal-body" style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', fontSize: '16px', color: '#374151' }}>
                    <div>
                      <div style={{ fontWeight: '600', color: '#6b7280', marginBottom: '8px', fontSize: '14px' }}>
                        Department Name:
                      </div>
                      <div style={{ fontWeight: '500', fontSize: '18px', color: '#1f2937' }}>
                        {formData.department_name}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontWeight: '600', color: '#6b7280', marginBottom: '8px', fontSize: '14px' }}>
                        Faculty:
                      </div>
                      <div style={{ fontWeight: '500', fontSize: '16px', color: '#1f2937' }}>
                        {selectedFaculty}
                      </div>
                    </div>

                    <div>
                      <div style={{ fontWeight: '600', color: '#6b7280', marginBottom: '8px', fontSize: '14px' }}>
                        Head of Department:
                      </div>
                      <div style={{ fontWeight: '500', fontSize: '16px', color: '#1f2937' }}>
                        {formData.head_of_department || 'N/A'}
                      </div>
                    </div>

                    {formData.hod_email && (
                      <div>
                        <div style={{ fontWeight: '600', color: '#6b7280', marginBottom: '8px', fontSize: '14px' }}>
                          HOD Email:
                        </div>
                        <div style={{ fontWeight: '500', fontSize: '16px', color: '#1f2937' }}>
                          {formData.hod_email}
                        </div>
                      </div>
                    )}

                    {formData.phone_no && (
                      <div>
                        <div style={{ fontWeight: '600', color: '#6b7280', marginBottom: '8px', fontSize: '14px' }}>
                          Phone No.:
                        </div>
                        <div style={{ fontWeight: '500', fontSize: '16px', color: '#1f2937' }}>
                          {formData.phone_no}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {(modal === "edit" || modal === "add") && (
                <div className="modal-body" style={{ padding: '24px' }}>
                  <form onSubmit={saveDepartment} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                    <div>
                      <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px', fontSize: '14px' }}>
                        Department Name *
                      </label>
                      <input
                        name="department_name"
                        value={formData.department_name}
                        onChange={handleFormChange}
                        required
                        style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px', color: '#1f2937', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px', fontSize: '14px' }}>
                        Faculty *
                      </label>
                      <select
                        name="faculty"
                        value={formData.faculty}
                        onChange={handleFormChange}
                        style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px', color: '#1f2937', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                      >
                        {facultyOptions.map((fac) => (
                          <option key={fac} value={fac}>
                            {fac}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px', fontSize: '14px' }}>
                        Head of Department
                      </label>
                      <input
                        name="head_of_department"
                        value={formData.head_of_department}
                        onChange={handleFormChange}
                        style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px', color: '#1f2937', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px', fontSize: '14px' }}>
                        HOD Email
                      </label>
                      <input
                        name="hod_email"
                        type="email"
                        value={formData.hod_email}
                        onChange={handleFormChange}
                        style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px', color: '#1f2937', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div>
                      <label style={{ display: 'block', fontWeight: '600', color: '#374151', marginBottom: '8px', fontSize: '14px' }}>
                        Phone No.
                      </label>
                      <input
                        name="phone_no"
                        type="tel"
                        value={formData.phone_no}
                        onChange={handleFormChange}
                        placeholder="+91 XXXXX XXXXX"
                        style={{ width: '100%', padding: '12px 16px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '16px', color: '#1f2937', backgroundColor: '#ffffff', boxSizing: 'border-box' }}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        onClick={closeModal}
                        style={{ padding: '12px 24px', backgroundColor: '#9ca3af', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', minWidth: '120px' }}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        style={{ padding: '12px 24px', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '16px', fontWeight: '600', cursor: 'pointer', minWidth: '120px' }}
                      >
                        {modal === "edit" ? "Update Department" : "Add Department"}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {modal === "delete" && selectedDept && (
                <div style={{ padding: '24px' }}>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '8px' }}>
                    <button onClick={closeModal} style={{ background: 'none', border: 'none', fontSize: '24px', color: '#6b7280', cursor: 'pointer', padding: '0', lineHeight: '1' }}>
                      ×
                    </button>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                    <div style={{ width: '48px', height: '48px', backgroundColor: '#fecaca', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', marginRight: '16px' }}>
                      <span style={{ color: '#dc2626', fontSize: '20px' }}>⚠</span>
                    </div>
                    <div>
                      <h3 style={{ fontSize: '18px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Confirm Delete</h3>
                      <p style={{ fontSize: '14px', color: '#6b7280', margin: 0 }}>This action cannot be undone</p>
                    </div>
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <p style={{ color: '#374151', margin: 0, whiteSpace: 'nowrap' }}>
                      Are you sure you want to delete <strong>{formData.department_name}</strong>?
                    </p>
                    <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '8px', margin: '8px 0 0 0' }}>
                      This will permanently remove the department from {selectedFaculty}.
                    </p>
                  </div>

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                      onClick={confirmDelete}
                      style={{ flex: 1, backgroundColor: '#ef4444', color: 'white', fontWeight: '500', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
                    >
                      Yes, Delete
                    </button>
                    <button
                      onClick={closeModal}
                      style={{ flex: 1, backgroundColor: '#d1d5db', color: '#374151', fontWeight: '500', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', transition: 'background-color 0.2s' }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
