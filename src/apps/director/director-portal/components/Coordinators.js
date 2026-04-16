// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { MdVisibility, MdEdit, MdDelete } from 'react-icons/md';
import {
  createCoordinatorWithAuth,
  fetchCoordinators,
  updateCoordinator,
  deleteCoordinator
} from '../../../../services/coordinatorService';

const Coordinators = ({ onModalStateChange }) => {
  // Coordinators will be loaded from Supabase
  const [coordinators, setCoordinators] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editingCoordinator, setEditingCoordinator] = useState(null);
  const [viewingCoordinator, setViewingCoordinator] = useState(null);
  const [deletingCoordinator, setDeletingCoordinator] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    assignedFaculty: ''
  });

  // Track modal states and notify parent
  useEffect(() => {
    const hasModal = showModal || showViewModal || showDeleteModal;
    if (onModalStateChange) {
      onModalStateChange(hasModal);
    }
  }, [showModal, showViewModal, showDeleteModal, onModalStateChange]);

  const faculties = [
    'Faculty of Engineering & Technology',
    'Faculty of Science & Humanities',
    'Faculty of Medical & Health Science',
    'Faculty of Management'
  ];

  // Load coordinators on mount
  useEffect(() => {
    loadCoordinators();
  }, []);

  // Load coordinators from Supabase
  const loadCoordinators = async () => {
    setLoading(true);
    const { data, error } = await fetchCoordinators();
    if (error) {
      showMessage('Error loading coordinators', 'error');
      console.error(error);
    } else {
      // Map database fields to component fields
      const mappedData = (data || []).map(coord => ({
        id: coord.id,
        name: coord.name,
        email: coord.email,
        phone: coord.phone,
        assignedFaculty: coord.assigned_faculty
      }));
      setCoordinators(mappedData);
    }
    setLoading(false);
  };

  // Handle form input changes
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Open modal for adding new coordinator
  const openAddModal = () => {
    setEditingCoordinator(null);
    setFormData({ name: '', email: '', phone: '', assignedFaculty: '' });
    setShowModal(true);
  };

  // Open modal for editing coordinator
  const openEditModal = (coordinator) => {
    setEditingCoordinator(coordinator);
    setFormData({
      name: coordinator.name,
      email: coordinator.email,
      phone: coordinator.phone,
      assignedFaculty: coordinator.assignedFaculty
    });
    setShowModal(true);
  };

  // Close modal
  const closeModal = () => {
    setShowModal(false);
    setEditingCoordinator(null);
    setFormData({ name: '', email: '', phone: '', assignedFaculty: '' });
  };

  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.email || !formData.phone || !formData.assignedFaculty) {
      showMessage('Please fill in all fields', 'error');
      return;
    }

    if (editingCoordinator) {
      // Update existing coordinator
      const { data, error } = await updateCoordinator(editingCoordinator.id, {
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        assigned_faculty: formData.assignedFaculty
      });

      if (error) {
        showMessage(`Error updating coordinator: ${error.message}`, 'error');
      } else {
        showMessage('Coordinator updated successfully!', 'success');
        loadCoordinators();
        closeModal();
      }
    } else {
      // Add new coordinator WITH authentication
      const { data, error } = await createCoordinatorWithAuth({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        assigned_faculty: formData.assignedFaculty,
        campus: 'Ramapuram',
        status: 'Active'
      });

      if (error) {
        showMessage(`Error creating coordinator: ${error.message}`, 'error');
      } else {
        showMessage(
          `Coordinator created successfully!\n\nLogin Credentials:\nEmail: ${formData.email}\nPassword: 1234\n\nThe coordinator can now login to access their faculty portal.`,
          'success'
        );
        loadCoordinators();
        closeModal();
      }
    }
  };

  // Confirm delete coordinator
  const confirmDelete = async () => {
    if (deletingCoordinator) {
      const { data, error } = await deleteCoordinator(deletingCoordinator.id);

      if (error) {
        showMessage(`Error deleting coordinator: ${error.message}`, 'error');
      } else {
        showMessage('Coordinator and login access deleted successfully!', 'success');
        loadCoordinators();
        setShowDeleteModal(false);
        setDeletingCoordinator(null);
      }
    }
  };

  // Handle delete coordinator - open confirmation modal
  const openDeleteModal = (coordinator) => {
    setDeletingCoordinator(coordinator);
    setShowDeleteModal(true);
  };

  // Cancel delete
  const cancelDelete = () => {
    setShowDeleteModal(false);
    setDeletingCoordinator(null);
  };

  // Handle view coordinator - open view modal
  const handleView = (coordinator) => {
    setViewingCoordinator(coordinator);
    setShowViewModal(true);
  };

  // Close view modal
  const closeViewModal = () => {
    setShowViewModal(false);
    setViewingCoordinator(null);
  };

  // Show message function
  const showMessage = (message, type = 'info') => {
    const messageDiv = document.createElement('div');
    messageDiv.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${type === 'success' ? 'bg-green-100 text-green-800 border border-green-200' :
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

  // Filter coordinators based on search term
  const filteredCoordinators = coordinators.filter(coordinator =>
    coordinator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coordinator.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coordinator.phone.toLowerCase().includes(searchTerm.toLowerCase()) ||
    coordinator.assignedFaculty.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6 overflow-x-hidden" style={{ maxWidth: '100%', width: '100%', boxSizing: 'border-box' }}>
      <div className="glassmorphic-card">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-2xl font-bold font-size text-gray-900">Coordinators</h3>
          <button
            onClick={openAddModal}
            className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-sm hover:shadow flex items-center gap-2"
          >
            <span className="text-lg">+</span>
            Add New Coordinator
          </button>
        </div>

        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative text-left">
            <input
              type="text"
              placeholder="Search Coordinators..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Coordinators Table */}
        <div className="overflow-x-auto">
          <table className="w-full border-collapse bg-white rounded-lg overflow-hidden shadow-sm" style={{ tableLayout: 'fixed', minWidth: '1100px' }}>
            <thead>
              <tr className="bg-gray-50">
                <th className="text-center p-4 font-semibold text-gray-700 border-b whitespace-nowrap" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>S.NO</th>
                <th className="text-center p-4 font-semibold text-gray-700 border-b whitespace-nowrap" style={{ width: '140px', minWidth: '140px' }}>NAME</th>
                <th className="text-center p-4 font-semibold text-gray-700 border-b whitespace-nowrap" style={{ width: '200px', minWidth: '200px' }}>EMAIL</th>
                <th className="text-center p-4 font-semibold text-gray-700 border-b whitespace-nowrap" style={{ width: '130px', minWidth: '130px' }}>PHONE</th>
                <th className="faculty-column-header p-4 font-semibold text-gray-700 border-b whitespace-nowrap" style={{ width: '250px', minWidth: '250px' }}>FACULTY</th>
                <th className="text-center p-4 font-semibold text-gray-700 border-b whitespace-nowrap" style={{ width: '140px', minWidth: '140px' }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {filteredCoordinators.map((coordinator, index) => (
                <tr key={coordinator.id} className={`hover:bg-gray-50 ${index !== filteredCoordinators.length - 1 ? 'border-b' : ''}`}>
                  <td className="text-center p-4 text-sm font-medium text-gray-900 whitespace-nowrap" style={{ width: '60px', minWidth: '60px', maxWidth: '60px' }}>{index + 1}</td>
                  <td className="text-center p-4 text-sm text-gray-900 whitespace-nowrap" style={{ width: '140px', minWidth: '140px' }}>{coordinator.name}</td>
                  <td className="text-center p-4 text-sm text-gray-600 whitespace-nowrap" style={{ width: '200px', minWidth: '200px' }}>{coordinator.email}</td>
                  <td className="text-center p-4 text-sm text-gray-600 whitespace-nowrap" style={{ width: '130px', minWidth: '130px' }}>{coordinator.phone}</td>
                  <td className="faculty-column-cell p-4 text-sm text-gray-600 whitespace-nowrap" style={{ width: '250px', minWidth: '250px' }}>{coordinator.assignedFaculty}</td>
                  <td className="p-4" style={{ width: '140px', minWidth: '140px' }}>
                    <div className="flex justify-center gap-2">
                      <button
                        onClick={() => handleView(coordinator)}
                        className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded flex items-center justify-center transition-all duration-200 hover:transform hover:scale-105"
                        title="View"
                      >
                        <MdVisibility size={16} />
                      </button>
                      <button
                        onClick={() => openEditModal(coordinator)}
                        className="w-8 h-8 bg-purple-500 hover:bg-purple-600 text-white rounded flex items-center justify-center transition-all duration-200 hover:transform hover:scale-105"
                        title="Edit"
                      >
                        <MdEdit size={16} />
                      </button>
                      <button
                        onClick={() => openDeleteModal(coordinator)}
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

          {filteredCoordinators.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              {searchTerm ? 'No coordinators found matching your search.' : 'No coordinators available.'}
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-90vh overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingCoordinator ? 'Edit Coordinator' : 'Add New Coordinator'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
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
                    placeholder="Enter coordinator name"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter email address"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter phone number"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Faculty *
                  </label>
                  <select
                    name="assignedFaculty"
                    value={formData.assignedFaculty}
                    onChange={handleInputChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  >
                    <option value="">Select Faculty</option>
                    {faculties.map(faculty => (
                      <option key={faculty} value={faculty}>{faculty}</option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    {editingCoordinator ? 'Update Coordinator' : 'Add Coordinator'}
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

      {/* View Modal - Simple version matching the image */}
      {showViewModal && viewingCoordinator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold text-gray-900">Coordinator Details</h3>
                <button
                  onClick={closeViewModal}
                  className="text-gray-400 hover:text-gray-600 text-2xl font-bold"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-gray-600">Name:</p>
                  <p className="text-gray-900 font-medium">{viewingCoordinator.name}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">Email:</p>
                  <p className="text-gray-900">{viewingCoordinator.email}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">Phone:</p>
                  <p className="text-gray-900">{viewingCoordinator.phone}</p>
                </div>

                <div>
                  <p className="text-sm font-medium text-gray-600">Faculty:</p>
                  <p className="text-gray-900">{viewingCoordinator.assignedFaculty}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && deletingCoordinator && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mr-4">
                  <span className="text-red-600 text-xl">⚠</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Confirm Delete</h3>
                  <p className="text-sm text-gray-500">This action cannot be undone</p>
                </div>
              </div>

              <div className="mb-6">
                <p className="text-gray-700">
                  Are you sure you want to delete <strong>{deletingCoordinator.name}</strong>?
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  This will permanently remove the coordinator from {deletingCoordinator.assignedFaculty}.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                >
                  Yes, Delete
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

export default Coordinators;