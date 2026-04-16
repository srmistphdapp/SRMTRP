import React, { useState } from 'react';
import { MdAssignment, MdSchool, MdCheckCircle, MdHourglassEmpty } from 'react-icons/md';
import { useAppContext } from '../../context/AppContext.js';
import './ScholarManagement.css';

const WorkflowExamination = ({ onModalStateChange }) => {
  const { scholarsData } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFaculty, setSelectedFaculty] = useState('');
  const [selectedType, setSelectedType] = useState('');

  // Calculate examination statistics
  const totalExams = scholarsData?.length || 0;
  const scheduledExams = scholarsData?.filter(s => s.exam_date).length || 0;
  const completedExams = scholarsData?.filter(s => s.dept_result).length || 0;
  const pendingResults = scheduledExams - completedExams;

  // Filter scholars for examination view
  const filteredScholars = scholarsData?.filter(scholar => {
    const matchesSearch = !searchTerm || 
      scholar.registered_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      scholar.application_no?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFaculty = !selectedFaculty || scholar.institution === selectedFaculty;
    const matchesType = !selectedType || scholar.program_type === selectedType;
    
    return matchesSearch && matchesFaculty && matchesType;
  }) || [];

  // Get unique faculties for filter
  const faculties = [...new Set(scholarsData?.map(s => s.institution).filter(Boolean))] || [];
  const programTypes = ['Full Time', 'Part Time Internal', 'Part Time External', 'Part Time Industry'];

  return (
    <div className="scholar-management-container">
      <div className="scholar-main-content">
        <div className="p-6">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">Examination Workflow</h1>
            <p className="text-gray-600">Manage examination scheduling, conduct, and results publication</p>
          </div>

          {/* Statistics Tiles */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg p-4 border-l-4 border-purple-600 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Total Scholars</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{totalExams}</p>
                </div>
                <div className="bg-purple-200 p-3 rounded-full">
                  <MdAssignment className="text-2xl text-purple-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg p-4 border-l-4 border-blue-600 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Scheduled Exams</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{scheduledExams}</p>
                </div>
                <div className="bg-blue-200 p-3 rounded-full">
                  <MdSchool className="text-2xl text-blue-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-lg p-4 border-l-4 border-green-600 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Results Published</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{completedExams}</p>
                </div>
                <div className="bg-green-200 p-3 rounded-full">
                  <MdCheckCircle className="text-2xl text-green-700" />
                </div>
              </div>
            </div>

            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg p-4 border-l-4 border-orange-600 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 font-medium">Pending Results</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{pendingResults}</p>
                </div>
                <div className="bg-orange-200 p-3 rounded-full">
                  <MdHourglassEmpty className="text-2xl text-orange-700" />
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
                  placeholder="Search by name, application no..."
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

          {/* Examination Table */}
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="scholar-table">
                <thead>
                  <tr>
                    <th>S.No</th>
                    <th>Application No</th>
                    <th>Scholar Name</th>
                    <th>Faculty</th>
                    <th>Program Type</th>
                    <th>Exam Date</th>
                    <th>Result Status</th>
                    <th>Result</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredScholars.length > 0 ? (
                    filteredScholars.map((scholar, index) => (
                      <tr key={scholar.id || index}>
                        <td className="text-center">{index + 1}</td>
                        <td>{scholar.application_no || 'N/A'}</td>
                        <td>{scholar.registered_name || scholar.name || 'N/A'}</td>
                        <td>{scholar.institution || 'N/A'}</td>
                        <td>{scholar.program_type || 'N/A'}</td>
                        <td>{scholar.exam_date ? new Date(scholar.exam_date).toLocaleDateString() : 'Not Scheduled'}</td>
                        <td>
                          <span className={`status-pill ${
                            scholar.dept_result ? 'verified' :
                            scholar.exam_date ? 'pending' :
                            'rejected'
                          }`}>
                            {scholar.dept_result ? 'Published' : scholar.exam_date ? 'Pending' : 'Not Scheduled'}
                          </span>
                        </td>
                        <td>{scholar.dept_result || 'N/A'}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="8" className="text-center py-8">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <MdAssignment className="text-5xl mb-2 opacity-50" />
                          <p className="text-lg font-medium">No examination records found</p>
                          <p className="text-sm">Examination records will appear here when scheduled</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WorkflowExamination;
