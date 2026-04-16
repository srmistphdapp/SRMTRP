// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { MdVisibility, MdEdit, MdDelete } from 'react-icons/md';
import {
  fetchAdmins,
  createAdminWithAuth,
  updateAdmin,
  deleteAdmin,
  checkEmailExists
} from '../../../../services/adminService';

const AdminManagement = ({ onModalStateChange }) => {
  const [admins, setAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingAdmin, setEditingAdmin] = useState(null);
  const [viewingAdmin, setViewingAdmin] = useState(null);
  const [deletingAdmin, setDeletingAdmin] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });

  // Load admins on component mount
  useEffect(() => {
    loadAdmins();
  }, []);

  // Track modal states and notify parent
  useEffect(() => {
    const hasModal = showModal || showViewModal || showDeleteModal;
    if (onModalStateChange) {
      onModalStateChange(hasModal);
    }
  }, [showModal, showViewModal, showDeleteModal, onModalStateChange]);

  const loadAdmins = async () => {
    setLoading(false);
    const { data, error } = await fetchAdmins();
    if (error) {
      showMessage('Error loading admins', 'error');
      console.error('Error:', error);
    } else {
      setAdmins(data || []);
    }
    setLoading(false);
  };

  const showMessage = (message, type = 'info') => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
      type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
      type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' :
      'bg-blue-100 text-blue-800 border border-blue-200'
    }`;
    messageDiv.innerHTML = `
      <div class="flex items-center gap-2">
        <span>${message}</span>
      </div>
    `;

    document.body.appendChild(messageDiv);

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const openAddModal = () => {
    setEditingAdmin(null);
    setFormData({
      name: '',
      email: '',
      phone: ''
    });
    setShowModal(true);
  };

  const openEditModal = (admin) => {
    setEditingAdmin(admin);
    setFormData({
      name: admin.name,
      email: admin.email,
      phone: admin.phone || ''
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingAdmin(null);
    setFormData({
      name: '',
      email: '',
      phone: ''
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.name || !formData.email) {
      showMessage('Please fill in all required fields', 'error');
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showMessage('Please enter a valid email address', 'error');
      return;
    }

    if (!editingAdmin) {
      // Creating new admin - use default password
      // Check if email already exists
      const { exists } = await checkEmailExists(formData.email);
      if (exists) {
        showMessage('Email already exists', 'error');
        return;
      }

      // Create new admin with default password
      const { error } = await createAdminWithAuth({
        name: formData.name,
        email: formData.email,
        password: '1234', // Default password
        phone: formData.phone,
        role: 'Admin',
        campus: 'Trichy',
        created_by: 'Director'
      });

      if (error) {
        showMessage('Error creating admin: ' + error.message, 'error');
        return;
      }

      showMessage('Admin created successfully! Default password is "1234".', 'success');
      loadAdmins();
      closeModal();
    } else {
      // Updating existing admin - no password changes allowed
      const updates = {
        name: formData.name,
        phone: formData.phone
      };

      const { error } = await updateAdmin(editingAdmin.id, updates);

      if (error) {
        showMessage('Error updating admin: ' + error.message, 'error');
        return;
      }

      showMessage('Admin updated successfully!', 'success');
      loadAdmins();
      closeModal();
    }
  };

  const handleView = (admin) => {
    setViewingAdmin(admin);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setViewingAdmin(null);
  };

  const handleDelete = (admin) => {
    setDeletingAdmin(admin);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deletingAdmin) return;

    const { error } = await deleteAdmin(deletingAdmin.id);

    if (error) {
      showMessage('Error deleting admin: ' + error.message, 'error');
      return;
    }

    showMessage('Admin deleted successfully!', 'success');
    loadAdmins();
    setShowDeleteModal(false);
    setDeletingAdmin(null);
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeletingAdmin(null);
  };

  // Filter admins based on search
  const filteredAdmins = admins.filter(admin =>
    admin.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (admin.role && admin.role.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (admin.campus && admin.campus.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="p-6 overflow-x-hidden" style={{ maxWidth: '100%', width: '100%', boxSizing: 'border-box' }}>
      <div className="glassmorphic-card">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold font-size text-gray-900">Admin Administration</h3>
          <button
            onClick={openAddModal}
            className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-sm hover:shadow flex items-center gap-2"
          >
            <span className="text-lg">+</span>
            Add New Admin
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative text-left">
            <input
              type="text"
              placeholder="Search Admins..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Admins Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm" style={{ tableLayout: 'fixed', minWidth: '1000px' }}>
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left p-4 font-semibold text-gray-700 border-b whitespace-nowrap" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>S.NO</th>
                <th className="text-left p-4 font-semibold text-gray-700 border-b whitespace-nowrap" style={{ width: '140px', minWidth: '140px' }}>NAME</th>
                <th className="text-left p-4 font-semibold text-gray-700 border-b whitespace-nowrap" style={{ width: '200px', minWidth: '200px' }}>EMAIL</th>
                <th className="text-left p-4 font-semibold text-gray-700 border-b whitespace-nowrap" style={{ width: '130px', minWidth: '130px' }}>PHONE</th>
                <th className="text-left p-4 font-semibold text-gray-700 border-b whitespace-nowrap" style={{ width: '100px', minWidth: '100px' }}>ROLE</th>
                <th className="text-left p-4 font-semibold text-gray-700 border-b whitespace-nowrap" style={{ width: '120px', minWidth: '120px' }}>CAMPUS</th>
                <th className="text-left p-4 font-semibold text-gray-700 border-b whitespace-nowrap" style={{ width: '180px', minWidth: '180px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredAdmins.map((admin, index) => (
                <tr key={admin.id} className={`hover:bg-gray-50 ${index !== filteredAdmins.length - 1 ? 'border-b' : ''}`}>
                  <td className="text-left p-4 text-sm font-medium text-gray-900 whitespace-nowrap" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>{index + 1}</td>
                  <td className="text-left p-4 text-sm text-gray-900 whitespace-nowrap" style={{ width: '140px', minWidth: '140px' }}>{admin.name}</td>
                  <td className="text-left p-4 text-sm text-gray-600 whitespace-nowrap" style={{ width: '200px', minWidth: '200px' }}>{admin.email}</td>
                  <td className="text-left p-4 text-sm text-gray-600 whitespace-nowrap" style={{ width: '130px', minWidth: '130px' }}>{admin.phone || '-'}</td>
                  <td className="text-left p-4 text-sm text-gray-600 whitespace-nowrap" style={{ width: '100px', minWidth: '100px' }}>{admin.role || 'Admin'}</td>
                  <td className="text-left p-4 text-sm text-gray-600 whitespace-nowrap" style={{ width: '120px', minWidth: '120px' }}>{admin.campus || 'Trichy'}</td>
                  <td className="text-left p-4">
                    <div className="flex justify-start gap-2">
                      <button
                        onClick={() => handleView(admin)}
                        className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center justify-center transition-all duration-200 hover:transform hover:scale-105"
                        title="View"
                      >
                        <MdVisibility size={16} />
                      </button>
                      <button
                        onClick={() => openEditModal(admin)}
                        className="w-8 h-8 bg-purple-500 hover:bg-purple-600 text-white rounded flex items-center justify-center transition-all duration-200 hover:transform hover:scale-105"
                        title="Edit"
                      >
                        <MdEdit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(admin)}
                        className="w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded flex items-center justify-center transition-all duration-200 hover:transform hover:scale-105"
                        title="Delete"
                      >
                        <MdDelete size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAdmins.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No admins found matching your search.' : 'No admins available.'}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-90vh overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingAdmin ? 'Edit Admin' : 'Add New Admin'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="grid grid-cols-2 gap-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Name *
                    </label>
                    <input
                      type="text"
                      name="name"
                      value={formData.name}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter admin name"
                      required
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email * {editingAdmin && '(Cannot be changed)'}
                    </label>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      disabled={!!editingAdmin}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                      placeholder="Enter email address"
                      required
                    />
                  </div>

                  {/* Phone */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter phone number"
                    />
                  </div>

                  {/* Role */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Role
                    </label>
                    <input
                      type="text"
                      value="Admin"
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    />
                  </div>

                  {/* Campus */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Campus
                    </label>
                    <input
                      type="text"
                      value="Trichy"
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
                    />
                  </div>

                  {/* Password fields completely removed */}
                </div>

                {/* Info box completely removed */}

                {/* Buttons */}
                <div className="flex gap-3 mt-6">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    {editingAdmin ? 'Update Admin' : 'Add Admin'}
                  </button>
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && viewingAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Admin Details</h3>
                <button
                  onClick={closeViewModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex border-b pb-2">
                  <span className="font-medium text-gray-700 w-32">Name:</span>
                  <span className="text-gray-900">{viewingAdmin.name}</span>
                </div>
                <div className="flex border-b pb-2">
                  <span className="font-medium text-gray-700 w-32">Email:</span>
                  <span className="text-gray-900">{viewingAdmin.email}</span>
                </div>
                <div className="flex border-b pb-2">
                  <span className="font-medium text-gray-700 w-32">Phone:</span>
                  <span className="text-gray-900">{viewingAdmin.phone || '-'}</span>
                </div>
                <div className="flex border-b pb-2">
                  <span className="font-medium text-gray-700 w-32">Role:</span>
                  <span className="text-gray-900">{viewingAdmin.role || 'Admin'}</span>
                </div>
                <div className="flex border-b pb-2">
                  <span className="font-medium text-gray-700 w-32">Campus:</span>
                  <span className="text-gray-900">{viewingAdmin.campus || 'Trichy'}</span>
                </div>
                <div className="flex border-b pb-2">
                  <span className="font-medium text-gray-700 w-32">Created By:</span>
                  <span className="text-gray-900">{viewingAdmin.created_by || '-'}</span>
                </div>
                <div className="flex border-b pb-2">
                  <span className="font-medium text-gray-700 w-32">Created At:</span>
                  <span className="text-gray-900">
                    {new Date(viewingAdmin.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Confirm Delete</h3>
                <button
                  onClick={cancelDelete}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="mb-6">
                <p className="text-gray-700 mb-2">Are you sure you want to delete this admin?</p>
                <p className="font-medium text-gray-900">
                  {deletingAdmin.name} ({deletingAdmin.email})
                </p>
                <p className="text-sm text-red-600 mt-2">
                  This action cannot be undone and will remove their login access.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Delete Admin
                </button>
                <button
                  onClick={cancelDelete}
                  className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminManagement;
