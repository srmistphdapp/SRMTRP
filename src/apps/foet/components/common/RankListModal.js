
import { FaDownload } from 'react-icons/fa';
import { X } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useState } from 'react';
import MessageBox from './Modals/MessageBox';
import { createPortal } from 'react-dom';
import './Results.css'; // This applies the custom styling you uploaded

export default function RankListModal({ modalData, closeModal }) {
  const [messageBox, setMessageBox] = useState({ show: false, title: '', message: '', type: 'info' });
  if (!modalData) return null;

  const { deptName, scholarType, rows } = modalData;

  // --- Modal Width Logic ---
  const modalWidthClass = 'max-w-6xl';

  // --- Download Logic ---
  const downloadRankings = () => {
    const data = rows.map((scholar, index) => {
      let rowData = {
        'Rank': index + 1,
        'Name': scholar.name || scholar['Registered Name'] || scholar.registered_name || 'N/A',
        'Application Number': scholar.applicationNo || scholar['Application Number'] || scholar.application_no || 'N/A',
      };
      if (scholarType === 'Part Time') rowData['Type'] = scholar.partTimeDetails || scholar['Mode of Study'] || 'Internal';
      rowData = {
        ...rowData,
        'Written Marks': Math.round(scholar.written || scholar.writtenMarks || scholar.written_marks || 0),
        'Interview Marks': Math.round(scholar.viva || scholar.vivaMarks || scholar.interview_marks || 0),
        'Total Marks': Math.round(scholar.total || scholar.totalMarks || scholar.total_marks || 0),
        'Status': (scholar.qualified || scholar.status === 'Qualified' || (scholar.total || scholar.totalMarks || scholar.total_marks || 0) >= 50) ? 'Qualified' : 'Not Qualified'
      };
      return rowData;
    });

    if (data.length === 0) {
      setMessageBox({ show: true, title: 'Notification', message: 'No ranking data available.', type: 'warning' });
      return;
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, "Rankings");
    XLSX.writeFile(wb, `Rankings_${deptName}.xlsx`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4" style={{ zIndex: 99999 }}>
      {/* UI Layout Container - Uses the dynamic width class to match your screenshot size
          - max-h-[90vh] ensures it fits on screen */}
      <div className={`rank-list-modal bg-white rounded-lg shadow-lg p-6 w-full ${modalWidthClass} max-h-[90vh] flex flex-col`}>
        
        {/* Header */}
        <div className="flex justify-between items-center mb-4 pb-4 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-800">
              {deptName} - {scholarType} Rank List
            </h2>
            {rows.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">
                {rows.length} scholar{rows.length !== 1 ? 's' : ''} found
              </p>
            )}
          </div>
          <button 
            onClick={closeModal} 
            className="text-gray-400 hover:text-gray-600 transition-colors p-1 hover:bg-gray-100 rounded-md"
            title="Close"
          >
            <X size={24} />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="overflow-y-auto flex-1">
          <table className="min-w-full border-collapse">
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-b border-gray-200 w-16">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">Name</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">App No</th>
                {scholarType === 'Part Time' && (
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">Type</th>
                )}
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">Written Marks</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">Interview Marks</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">Total Marks</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase border-b border-gray-200">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {/* Empty State */}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={scholarType === 'Part Time' ? "8" : "7"} className="text-center py-8 text-gray-500">
                    No scholars found.
                  </td>
                </tr>
              ) : (
                rows.map((row, i) => (
                  <tr key={row.id} className="hover:bg-gray-50">
                    {/* Rank Column */}
                    <td className="px-4 py-4 text-center border-b border-gray-100">
                      <span className={`inline-flex items-center justify-center h-8 w-8 rounded-full font-medium ${i < 3 ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-700'}`}>
                        {i + 1}
                      </span>
                    </td>

                    {/* Name */}
                    <td className="px-4 py-4 border-b border-gray-100">
                      <div className="text-gray-800">{row.name || row['Registered Name'] || row.registered_name || 'N/A'}</div>
                    </td>

                    {/* App No */}
                    <td className="px-4 py-4 text-center border-b border-gray-100">
                      <div className="text-sm text-gray-600">{row.applicationNo || row['Application Number'] || row.application_no || 'N/A'}</div>
                    </td>

                    {/* Type Column - Only for Part Time */}
                    {scholarType === 'Part Time' && (
                      <td className="px-4 py-4 text-center border-b border-gray-100">
                        <div className="text-gray-700">
                          {row.program || 'N/A'}
                        </div>
                      </td>
                    )}

                    {/* Written Marks */}
                    <td className="px-4 py-4 text-center border-b border-gray-100">
                      <div className={`font-semibold ${
                        (row.written || row.writtenMarks || row.written_marks || 0) === 'Ab' ? 'text-red-600' :
                        (row.written || row.writtenMarks || row.written_marks || 0) >= 35 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {row.written || row.writtenMarks || row.written_marks || 0}
                      </div>
                    </td>

                    {/* Interview Marks */}
                    <td className="px-4 py-4 text-center border-b border-gray-100">
                      <div className={`font-semibold ${
                        (row.viva || row.vivaMarks || row.interview_marks || 0) === 'Ab' ? 'text-red-600' :
                        (row.viva || row.vivaMarks || row.interview_marks || 0) >= 15 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {row.viva || row.vivaMarks || row.interview_marks || 0}
                      </div>
                    </td>

                    {/* Total Marks */}
                    <td className="px-4 py-4 text-center border-b border-gray-100">
                      <div className={`font-semibold ${
                        (row.total || row.totalMarks || row.total_marks || 0) === 'Absent' ? 'text-red-600' :
                        (row.total || row.totalMarks || row.total_marks || 0) >= 50 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {row.total || row.totalMarks || row.total_marks || 0}
                      </div>
                    </td>

                    {/* Status */}
                    <td className="px-4 py-4 text-center border-b border-gray-100">
                      {(row.qualified || row.status === 'Qualified' || (row.total || row.totalMarks || row.total_marks || 0) >= 50) ? (
                        <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm font-semibold inline-block">Qualified</span>
                      ) : (
                        <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold inline-block">Not Qualified</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-5 mt-2 border-t border-gray-100">
          <button
            onClick={downloadRankings}
            disabled={rows.length === 0}
            style={
              rows.length === 0 
                ? { backgroundColor: '#f3f4f6', color: '#9ca3af', cursor: 'not-allowed' }
                : { background: 'linear-gradient(to right, #10b981, #14b8a6)', color: 'white' }
            }
            className="download-excel-btn flex items-center gap-2 px-8 py-2.5 rounded-full font-medium text-sm transition-all shadow-md hover:shadow-lg"
          >
            <FaDownload />
            Download Excel
          </button>
          <button 
            onClick={closeModal} 
            className="px-8 py-2.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 font-medium text-sm shadow-sm hover:shadow transition-all"
          >
            Close
          </button>
        </div>
      </div>

      {/* Message Box - Rendered as Portal to appear on top */}
      {createPortal(
        <MessageBox 
          show={messageBox.show}
          title={messageBox.title}
          message={messageBox.message}
          type={messageBox.type}
          onClose={() => setMessageBox({ show: false, title: '', message: '', type: 'info' })}
        />,
        document.body
      )}
    </div>
  );
}