import React, { useState, useEffect } from 'react';

const EvaluatorModal = ({ isOpen, onClose, onSave, evaluators = [], selectedEvaluators = [] }) => {
  const [selected, setSelected] = useState(selectedEvaluators);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setSelected(selectedEvaluators);
  }, [selectedEvaluators]);

  const toggleEvaluator = (evaluatorId) => {
    setSelected(prev => {
      if (prev.includes(evaluatorId)) {
        return prev.filter(id => id !== evaluatorId);
      } else {
        return [...prev, evaluatorId];
      }
    });
  };

  const filteredEvaluators = evaluators.filter(evaluator =>
    evaluator.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    evaluator.department.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    onSave(selected);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col">
        <div className="p-6 pb-0">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Select Evaluators</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <span className="sr-only">Close</span>
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Search evaluators..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-y-auto px-6 py-2">
          {filteredEvaluators.length > 0 ? (
            <ul className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredEvaluators.map(evaluator => (
                <li key={evaluator.id} className="py-3">
                  <label className="flex items-center space-x-3">
                    <input
                      type="checkbox"
                      checked={selected.includes(evaluator.id)}
                      onChange={() => toggleEvaluator(evaluator.id)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {evaluator.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {evaluator.department} • {evaluator.designation}
                      </p>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                      {evaluator.available ? 'Available' : 'Busy'}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-6">
              <p className="text-gray-500 dark:text-gray-400">No evaluators found</p>
            </div>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 rounded-b-lg flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={selected.length === 0}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${selected.length > 0 ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-400 cursor-not-allowed'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500`}
          >
            {selected.length > 0 ? `Select ${selected.length} Evaluator${selected.length > 1 ? 's' : ''}` : 'Select Evaluators'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EvaluatorModal;
