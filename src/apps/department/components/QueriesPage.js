import React, { useMemo, useState, useEffect } from 'react';
import { MessageSquare, Maximize2 } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

// Helper to format date for display
const formatDate = (dateString) => {
    try {
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return dateString;
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return dateString;
    }
};

// Helper function to format text: lowercase common words and replace underscores with spaces
const formatText = (text) => {
    if (!text) return '';
    
    // Replace underscores with spaces
    let formatted = text.replace(/_/g, ' ');
    
    // Split into words and process each word
    const words = formatted.split(' ');
    const commonWords = ['to', 'and', 'of', 'in', 'on', 'at', 'by', 'for', 'with', 'from', 'the', 'a', 'an'];
    
    const formattedWords = words.map((word, index) => {
        // Keep first word capitalized, lowercase common words (except first word)
        if (index === 0) {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        } else if (commonWords.includes(word.toLowerCase())) {
            return word.toLowerCase();
        } else {
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        }
    });
    
    return formattedWords.join(' ');
};

// Helper functions for program name processing
const extractProgramType = (programString) => {
    if (!programString) return '';
    const typeMatch = programString.match(/\(([^)]+)\)/);
    return typeMatch ? typeMatch[1].trim() : '';
};

const cleanProgramName = (programString) => {
    if (!programString) return '';
    const cleanMatch = programString.match(/^([^(]+)/);
    return cleanMatch ? cleanMatch[1].trim() : programString;
};

export default function QueriesPage() {
    // useAppContext should provide scholarList which contains all queries
    const { scholarList, toggleFullScreen, currentUser, setScholarList, refreshScholarData } = useAppContext();
    const [search, setSearch] = useState('');
    
    // Modal states
    const [viewModal, setViewModal] = useState({ open: false, scholar: null });
    const [confirmModal, setConfirmModal] = useState({ open: false, scholar: null, action: null });
    const [rejectionModal, setRejectionModal] = useState({ open: false, scholar: null, reason: '' });
    const [messageBox, setMessageBox] = useState({ open: false, message: '' });
    const [loadingStates, setLoadingStates] = useState({});

    // Refresh data when component mounts or when user changes
    useEffect(() => {
        if (currentUser?.faculty && currentUser?.department && refreshScholarData) {
            console.log('🔄 QueriesPage: Refreshing scholar data to get latest query_resolved_dept status');
            refreshScholarData();
        }
    }, [currentUser, refreshScholarData]);

    // Helper function to find the full scholar object from scholarList
    const findScholarById = (scholarId) => {
        return scholarList.find(s => s.id === scholarId);
    };

    // Helper function to set loading state for a specific scholar
    const setScholarLoading = (scholarId, isLoading) => {
        setLoadingStates(prev => ({
            ...prev,
            [scholarId]: isLoading
        }));
    };

    // Helper function to update scholar in local state
    const updateScholarInState = (scholarId, updates) => {
        setScholarList(prev => 
            prev.map(scholar => 
                scholar.id === scholarId 
                    ? { ...scholar, ...updates }
                    : scholar
            )
        );
    };

    // Action handlers
    const handleView = (query) => {
        const scholar = findScholarById(query.scholarId);
        setViewModal({ open: true, scholar });
    };

    const handleApprove = (query) => {
        const scholar = findScholarById(query.scholarId);
        setConfirmModal({ open: true, scholar, action: 'approve' });
    };

    const handleReject = (query) => {
        const scholar = findScholarById(query.scholarId);
        setRejectionModal({ open: true, scholar, reason: '' });
    };

    const handleConfirmApprove = async () => {
        if (!confirmModal.scholar) return;
        
        const scholar = confirmModal.scholar;
        const scholarId = scholar._supabaseData?.originalId || scholar.id;
        const departmentCode = currentUser?.departmentCode || 'UNKNOWN';

        try {
            setScholarLoading(scholar.id, true);
            
            console.log(`🔄 Approving scholar ${scholarId} from queries page`);
            
            const { approveScholar } = await import('../services/departmentScholarService');
            const result = await approveScholar(scholarId, departmentCode, {
                approvedBy: currentUser?.name || 'Department HOD'
            });

            if (result.error) {
                console.error('❌ Error approving scholar:', result.error);
                setMessageBox({ open: true, message: `Failed to approve scholar: ${result.error.message}` });
                return;
            }

            // Update local state - clear query data and set to approved
            // NOTE: query_resolved_dept is preserved to maintain resolution history
            updateScholarInState(scholar.id, {
                deptReview: 'Approved',
                verificationStatus: 'Approved',
                approvalTimestamp: new Date().toISOString(),
                // Clear query-related fields (but preserve query_resolved_dept)
                queryText: null,
                queryTimestamp: null,
                _supabaseData: {
                    ...scholar._supabaseData,
                    deptReview: 'Approved',
                    // Clear query-related fields in supabase data (but preserve query_resolved_dept)
                    dept_query: null,
                    query_timestamp: null
                }
            });

            setMessageBox({ open: true, message: 'Scholar approved successfully!' });
            setConfirmModal({ open: false, scholar: null, action: null });
            
            // Refresh scholar data to ensure UI is updated and scholar moves to approved list
            setTimeout(() => {
                if (refreshScholarData) {
                    refreshScholarData();
                }
            }, 500);
            
        } catch (err) {
            console.error('❌ Exception approving scholar:', err);
            setMessageBox({ open: true, message: `Failed to approve scholar: ${err.message}` });
        } finally {
            setScholarLoading(scholar.id, false);
        }
    };

    const handleConfirmReject = async () => {
        if (!rejectionModal.scholar || !rejectionModal.reason.trim()) {
            setMessageBox({ open: true, message: 'Please provide a rejection reason.' });
            return;
        }

        const scholar = rejectionModal.scholar;
        const scholarId = scholar._supabaseData?.originalId || scholar.id;
        const departmentCode = currentUser?.departmentCode || 'UNKNOWN';
        const rejectionReason = rejectionModal.reason.trim();

        try {
            setScholarLoading(scholar.id, true);
            
            console.log(`🔄 Rejecting scholar ${scholarId} from queries page`);
            
            const { rejectScholar } = await import('../services/departmentScholarService');
            const result = await rejectScholar(scholarId, departmentCode, rejectionReason, {
                rejectedBy: currentUser?.name || 'Department HOD'
            });

            if (result.error) {
                console.error('❌ Error rejecting scholar:', result.error);
                setMessageBox({ open: true, message: `Failed to reject scholar: ${result.error.message}` });
                return;
            }

            // Update local state - clear query data and set to rejected
            // NOTE: query_resolved_dept is preserved to maintain resolution history
            updateScholarInState(scholar.id, {
                deptReview: 'Rejected',
                verificationStatus: 'Rejected',
                rejectionReason: rejectionReason,
                rejectionTimestamp: new Date().toISOString(),
                // Clear query-related fields (but preserve query_resolved_dept)
                queryText: null,
                queryTimestamp: null,
                _supabaseData: {
                    ...scholar._supabaseData,
                    deptReview: 'Rejected',
                    // Clear query-related fields in supabase data (but preserve query_resolved_dept)
                    dept_query: null,
                    query_timestamp: null
                }
            });

            setMessageBox({ open: true, message: 'Scholar rejected successfully!' });
            setRejectionModal({ open: false, scholar: null, reason: '' });
            
            // Refresh scholar data to ensure UI is updated and scholar moves to rejected list
            setTimeout(() => {
                if (refreshScholarData) {
                    refreshScholarData();
                }
            }, 500);
            
        } catch (err) {
            console.error('❌ Exception rejecting scholar:', err);
            setMessageBox({ open: true, message: `Failed to reject scholar: ${err.message}` });
        } finally {
            setScholarLoading(scholar.id, false);
        }
    };

    // Aggregate ALL queries from ALL scholars and prepare them for display
    const allQueriesList = useMemo(() => {
        const all = [];
        // Iterate through all scholars in the list
        (scholarList || []).forEach(scholar => {
            // Check if the scholar has dept_review = 'Query' (new query system)
            const deptReview = scholar.deptReview || scholar._supabaseData?.deptReview;
            if (deptReview === 'Query') {
                // Create a query entry from the dept_query field
                const queryText = scholar.queryText || scholar._supabaseData?.dept_query || 'Query sent to scholar';
                const queryTimestamp = scholar.queryTimestamp || scholar._supabaseData?.query_timestamp || new Date().toISOString();
                
                all.push({
                    id: `dept_query_${scholar.id}`,
                    text: queryText,
                    timestamp: queryTimestamp,
                    scholarName: scholar.name,
                    regNo: scholar.regNo,
                    scholarId: scholar.id,
                    type: 'department_query' // Mark as department query
                });
            }
            
            // Also check if the scholar has any queries in the legacy queries array
            if (scholar.queries && scholar.queries.length > 0) {
                scholar.queries.forEach(query => {
                    // Create a flattened object for each individual query
                    all.push({
                        ...query,
                        scholarName: scholar.name,
                        regNo: scholar.regNo, // Application Number
                        scholarId: scholar.id,
                        type: 'legacy_query' // Mark as legacy query
                    });
                });
            }
        });

        // Apply Search Filter
        const filtered = all.filter(q =>
            // Search across name, registration number, and query text
            q.scholarName.toLowerCase().includes(search.toLowerCase()) ||
            q.regNo.toLowerCase().includes(search.toLowerCase()) ||
            q.text.toLowerCase().includes(search.toLowerCase())
        );

        return filtered;

    }, [scholarList, search]);



    return (
        <div id="panel-queries" className="panel-fullscreen w-full flex flex-col items-center bg-gray-50 p-6">
            <div className="w-full max-w-7xl">
                <div className="flex items-center justify-between mb-6">
                    <h1 className="text-3xl font-bold leading-tight flex items-center gap-3 text-gray-800">
                        <MessageSquare className="w-7 h-7 text-indigo-600" />
                        All Scholar Queries
                    </h1>
                    <div className="flex gap-4 items-center">
                        {/* Search Input */}
                        <input
                            type="text"
                            placeholder="Search queries, scholars, or ID..."
                            className="pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition pl-3"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <button className="mb-7 ml-4 p-2 rounded-md text-gray-600 hover:bg-gray-100 fullscreen-btn" title="Fullscreen queries" onClick={() => toggleFullScreen && toggleFullScreen('panel-queries')}>
                            <Maximize2 className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="bg-white rounded-xl shadow-lg overflow-hidden min-h-[70vh]">
                    <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                        <p className="text-gray-600">
                            Total queries submitted: <span className="font-bold text-indigo-700">{allQueriesList.length}</span>
                        </p>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[1800px] border-collapse bg-white text-sm text-left table-fixed">
                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 border-r border-gray-100 text-center w-[60px] sticky left-0 bg-slate-50 z-20">
                                        S.NO
                                    </th>
                                    <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 border-r border-gray-100 w-[180px] sticky left-[60px] bg-slate-50 z-20">
                                        REGISTERED NAME
                                    </th>
                                    <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 border-r border-gray-100 w-[120px] sticky left-[240px] bg-slate-50 z-20">
                                        APPLICATION NUMBER
                                    </th>
                                    <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 border-r border-gray-100 w-[280px]">
                                        SELECT INSTITUTION
                                    </th>
                                    <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 border-r border-gray-100 w-[280px]">
                                        DEPARTMENT
                                    </th>
                                    <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 border-r border-gray-100 w-[150px]">
                                        TYPE
                                    </th>
                                    <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 border-r border-gray-100 w-[180px]">
                                        MOBILE NUMBER
                                    </th>
                                    <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 border-r border-gray-100 w-[250px]">
                                        EMAIL ID
                                    </th>
                                    <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 border-r border-gray-100 text-center w-[100px]">
                                        GENDER
                                    </th>
                                    <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 border-r border-gray-100 text-center w-[120px]">
                                        CERTIFICATES
                                    </th>
                                    <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 border-r border-gray-100 w-[200px]">
                                        QUERY
                                    </th>
                                    <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 border-r border-gray-100 text-center w-[120px]">
                                        STATUS
                                    </th>
                                    <th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 text-center w-[150px]">
                                        ACTIONS
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {allQueriesList.length === 0 ? (
                                    <tr>
                                        <td colSpan={13} className="text-center py-20 text-gray-500">
                                            <div className="flex flex-col items-center justify-center">
                                                <MessageSquare className="w-12 h-12 text-gray-300 mb-3" />
                                                <p className="text-lg font-medium text-gray-700">No queries found</p>
                                                <p className="text-sm text-gray-400 mt-1">
                                                    {search ? 'Try adjusting your search terms' : 'No scholars have been sent queries yet'}
                                                </p>
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    allQueriesList.map((q, idx) => {
                                        const scholar = findScholarById(q.scholarId);
                                        const isLoading = loadingStates[q.scholarId];
                                        const deptReview = scholar?.deptReview || scholar?._supabaseData?.deptReview;
                                        const queryResolvedDept = scholar?.query_resolved_dept || scholar?._supabaseData?.query_resolved_dept;
                                        // Show as active query if it's a department query AND (has Query status OR is resolved)
                                        const isActiveQuery = q.type === 'department_query' && (deptReview === 'Query' || queryResolvedDept);
                                        // Query is resolved when query_resolved_dept column has any value (like "resolved_to_science", etc.)
                                        const isQueryResolved = queryResolvedDept && queryResolvedDept.trim() !== '';
                                        
                                        // Helper functions for program name processing
                                        const extractProgramType = (programString) => {
                                            if (!programString) return '';
                                            const typeMatch = programString.match(/\(([^)]+)\)/);
                                            return typeMatch ? typeMatch[1].trim() : '';
                                        };

                                        const cleanProgramName = (programString) => {
                                            if (!programString) return '';
                                            const cleanMatch = programString.match(/^([^(]+)/);
                                            return cleanMatch ? cleanMatch[1].trim() : programString;
                                        };
                                        
                                        // Debug logging to help troubleshoot
                                        if (q.type === 'department_query') {
                                            console.log(`🔍 Query Debug for ${q.scholarName}:`, {
                                                scholarId: q.scholarId,
                                                deptReview: deptReview,
                                                queryResolvedDept: queryResolvedDept,
                                                isQueryResolved: isQueryResolved,
                                                isActiveQuery: isActiveQuery,
                                                statusWillShow: isQueryResolved ? 'Query Resolved' : 'Query Pending',
                                                buttonsEnabled: isQueryResolved
                                            });
                                        }
                                        
                                        return (
                                            <tr key={q.id || idx} className="hover:bg-blue-50/30 transition-colors group">
                                                <td className="px-5 py-4 whitespace-nowrap text-gray-900 border-r border-gray-100 text-center sticky left-0 bg-white group-hover:bg-blue-50/30 z-10">{idx + 1}</td>
                                                <td className="px-5 py-4 whitespace-nowrap text-gray-900 border-r border-gray-100 sticky left-[60px] bg-white group-hover:bg-blue-50/30 z-10 font-medium">{q.scholarName}</td>
                                                <td className="px-5 py-4 whitespace-nowrap text-indigo-800 border-r border-gray-100 sticky left-[240px] bg-white group-hover:bg-blue-50/30 z-10 font-medium">{q.regNo}</td>
                                                <td className="px-5 py-4 whitespace-nowrap text-gray-900 border-r border-gray-100">{scholar?.institution || '-'}</td>
                                                <td className="px-5 py-4 whitespace-nowrap text-gray-900 border-r border-gray-100" title={scholar?.specialization}>{scholar?.specialization || '-'}</td>
                                                <td className="px-5 py-4 whitespace-nowrap text-gray-900 border-r border-gray-100">{scholar?.type || 'Full Time'}</td>
                                                <td className="px-5 py-4 whitespace-nowrap text-gray-900 border-r border-gray-100">{scholar?.mobile || 'N/A'}</td>
                                                <td className="px-5 py-4 whitespace-nowrap text-gray-900 border-r border-gray-100">{scholar?.email || 'N/A'}</td>
                                                <td className="px-5 py-4 whitespace-nowrap text-gray-900 border-r border-gray-100 text-center">{scholar?.gender || 'N/A'}</td>
                                                <td className="px-5 py-4 whitespace-nowrap border-r border-gray-100 text-center">
                                                    {scholar?.certificatesLink && scholar.certificatesLink !== '#' ? (
                                                        <a 
                                                            href={scholar.certificatesLink} 
                                                            target="_blank" 
                                                            rel="noopener noreferrer" 
                                                            className="text-blue-600 hover:text-blue-800 underline text-sm"
                                                        >
                                                            View
                                                        </a>
                                                    ) : (
                                                        <span className="text-gray-400 text-sm">N/A</span>
                                                    )}
                                                </td>
                                                <td className="px-5 py-4 border-r border-gray-100 max-w-xl text-sm text-gray-700 whitespace-pre-wrap line-clamp-3" title={q.text}>{q.text}</td>
                                                <td className="px-5 py-4 whitespace-nowrap border-r border-gray-100 text-center">
                                                    {q.type === 'department_query' 
                                                        ? (isQueryResolved 
                                                            ? <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-200">Query Resolved</span>
                                                            : <span className="px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 border border-purple-200">Query Pending</span>)
                                                        : <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">Legacy Query</span>}
                                                </td>
                                                <td className="px-5 py-4 whitespace-nowrap text-center">
                                                    <div className="flex gap-2 justify-center">
                                                        {/* View Button - Always available */}
                                                        <button
                                                            onClick={() => handleView(q)}
                                                            title="View Details"
                                                            className="p-1.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-lg shadow-sm transition-all hover:scale-105 active:scale-95"
                                                        >
                                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M21 12s-4-7-9-7-9 7-9 7 4 7 9 7 9-7 9-7z"></path>
                                                                <circle cx="12" cy="12" r="3"></circle>
                                                            </svg>
                                                        </button>
                                                        
                                                        {/* Approve/Reject buttons - Only for active queries and only when query is resolved */}
                                                        {isActiveQuery && (
                                                            <>
                                                                <button
                                                                    onClick={() => handleApprove(q)}
                                                                    disabled={isLoading || !isQueryResolved}
                                                                    title={!isQueryResolved ? "Query must be resolved before approval" : "Approve"}
                                                                    className={`p-1.5 rounded-lg shadow-sm transition-all ${
                                                                        isLoading || !isQueryResolved
                                                                            ? 'bg-gray-300 cursor-not-allowed opacity-50' 
                                                                            : 'bg-emerald-500 hover:bg-emerald-600 text-white hover:scale-105 active:scale-95'
                                                                    }`}
                                                                >
                                                                    {isLoading ? (
                                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                    ) : (
                                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                            <path d="M20 6L9 17l-5-5"></path>
                                                                        </svg>
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={() => handleReject(q)}
                                                                    disabled={isLoading || !isQueryResolved}
                                                                    title={!isQueryResolved ? "Query must be resolved before rejection" : "Reject"}
                                                                    className={`p-1.5 rounded-lg shadow-sm transition-all ${
                                                                        isLoading || !isQueryResolved
                                                                            ? 'bg-gray-300 cursor-not-allowed opacity-50'
                                                                            : 'bg-red-500 hover:bg-red-600 text-white hover:scale-105 active:scale-95'
                                                                    }`}
                                                                >
                                                                    {isLoading ? (
                                                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                                    ) : (
                                                                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                            <line x1="18" y1="6" x2="6" y2="18"></line>
                                                                            <line x1="6" y1="6" x2="18" y2="18"></line>
                                                                        </svg>
                                                                    )}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* View Modal */}
            {viewModal.open && viewModal.scholar && (
                <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl p-6 relative animate-modal-in max-h-[90vh] overflow-y-auto">
                        <button onClick={() => setViewModal({ open: false, scholar: null })} className="absolute top-3 right-4 text-2xl text-gray-400 hover:text-pink-400 font-bold">&times;</button>
                        <h3 className="text-2xl font-bold mb-6">Scholar Details - {viewModal.scholar.name}</h3>
                        
                        {/* Reusable Field Component */}
                        {(() => {
                            const ViewField = ({ label, value }) => (
                                <div className="flex flex-col gap-1">
                                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{label}</label>
                                    <span className="block text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200 min-h-[38px] flex items-center">
                                        {value || 'N/A'}
                                    </span>
                                </div>
                            );

                            const extractProgramType = (programString) => {
                                if (!programString) return '';
                                const typeMatch = programString.match(/\(([^)]+)\)/);
                                return typeMatch ? typeMatch[1].trim() : '';
                            };

                            const cleanProgramName = (programString) => {
                                if (!programString) return '';
                                const cleanMatch = programString.match(/^([^(]+)/);
                                return cleanMatch ? cleanMatch[1].trim() : programString;
                            };

                            return (
                                <div className="space-y-8 overflow-y-auto max-h-[70vh] pr-2">
                                    {/* Basic Information */}
                                    <section>
                                        <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Basic Information</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <ViewField label="Form Name" value={viewModal.scholar?.formName || 'PhD Application Form'} />
                                            <ViewField label="Registered Name" value={viewModal.scholar?.name} />
                                            <ViewField label="Application No" value={viewModal.scholar?.regNo} />
                                            <ViewField label="Have You Graduated From India?" value={viewModal.scholar?.graduatedFromIndia || 'Yes'} />
                                            <ViewField label="Course" value={formatText(viewModal.scholar?.course || viewModal.scholar?.program)} />
                                            <ViewField label="Select Institution" value={formatText(viewModal.scholar?.institution || '-')} />
                                            <ViewField label="Department" value={formatText(viewModal.scholar?.specialization || '-')} />
                                            <ViewField label="Type" value={formatText(extractProgramType(viewModal.scholar?.program) || viewModal.scholar?.type)} />
                                            <div className="flex flex-col gap-1">
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Certificates Drive Link:</label>
                                                {viewModal.scholar?.certificatesLink && viewModal.scholar.certificatesLink !== '#' ? (
                                                    <a 
                                                        href={viewModal.scholar.certificatesLink} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                        className="block text-sm font-medium text-blue-600 hover:text-blue-800 underline cursor-pointer bg-gray-50 px-3 py-2 rounded-md border border-gray-200 min-h-[38px] flex items-center"
                                                    >
                                                        View Certificates
                                                    </a>
                                                ) : (
                                                    <span className="block text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200 min-h-[38px] flex items-center">N/A</span>
                                                )}
                                            </div>
                                        </div>
                                    </section>

                                    {/* Employment Information */}
                                    <section>
                                        <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Employment Information</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <ViewField label="1 - Employee Id" value={viewModal.scholar?.employeeId || viewModal.scholar?.employee1Id} />
                                            <ViewField label="1 - Designation" value={formatText(viewModal.scholar?.designation || viewModal.scholar?.employee1Designation)} />
                                            <ViewField label="1 - Organization Name" value={formatText(viewModal.scholar?.organizationName || viewModal.scholar?.employee1Organization)} />
                                            <ViewField label="1 - Organization Address" value={formatText(viewModal.scholar?.organizationAddress || viewModal.scholar?.employee1Address)} />
                                        </div>
                                    </section>

                                    {/* Personal Information */}
                                    <section>
                                        <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Personal Information</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <ViewField label="Mobile Number" value={viewModal.scholar?.mobile} />
                                            <ViewField label="Email ID" value={viewModal.scholar?.email} />
                                            <ViewField label="Date Of Birth" value={viewModal.scholar?.dateOfBirth} />
                                            <ViewField label="Gender" value={viewModal.scholar?.gender} />
                                            <ViewField label="Are You Differently Abled?" value={viewModal.scholar?.differentlyAbled || 'No'} />
                                            <ViewField label="Nature Of Deformity" value={viewModal.scholar?.natureOfDeformity || 'N/A'} />
                                            <ViewField label="Percentage Of Deformity" value={viewModal.scholar?.percentageOfDeformity || 'N/A'} />
                                            <ViewField label="Nationality" value={viewModal.scholar?.nationality} />
                                            <ViewField label="Aadhaar Card No." value={viewModal.scholar?.aadhaarNo} />
                                            <ViewField label="Mode Of Profession (Industry/Academic)" value={formatText(viewModal.scholar?.modeOfProfession)} />
                                            <ViewField label="Area Of Interest" value={formatText(viewModal.scholar?.areaOfInterest)} />
                                        </div>
                                    </section>

                                    {/* UG Education */}
                                    <section>
                                        <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">UG - Education Qualification</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <ViewField label="UG - Current Education Qualification" value={formatText(viewModal.scholar?.ugQualification || viewModal.scholar?.ugDegree)} />
                                            <ViewField label="UG - Institute Name" value={formatText(viewModal.scholar?.ugInstitute)} />
                                            <ViewField label="UG - Degree" value={formatText(viewModal.scholar?.ugDegree)} />
                                            <ViewField label="UG - Specialization" value={formatText(viewModal.scholar?.ugSpecialization)} />
                                            <ViewField label="UG - Marking Scheme" value={formatText(viewModal.scholar?.ugMarkingScheme)} />
                                            <ViewField label="UG - CGPA Or Percentage" value={viewModal.scholar?.ugCgpa || (viewModal.scholar?.cgpa && viewModal.scholar.cgpa.ug)} />
                                            <ViewField label="UG - Month & Year" value={viewModal.scholar?.ugMonthYear} />
                                            <ViewField label="UG - Registration No." value={viewModal.scholar?.ugRegistrationNo} />
                                            <ViewField label="UG - Mode Of Study" value={formatText(viewModal.scholar?.ugModeOfStudy || 'Full Time')} />
                                            <ViewField label="UG - Place Of The Institution" value={formatText(viewModal.scholar?.ugPlace)} />
                                        </div>
                                    </section>

                                    {/* PG Education */}
                                    <section>
                                        <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">PG - Education Qualification</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <ViewField label="PG - Current Education Qualification" value={formatText(viewModal.scholar?.pgQualification || viewModal.scholar?.pgDegree)} />
                                            <ViewField label="PG - Institute Name" value={formatText(viewModal.scholar?.pgInstitute)} />
                                            <ViewField label="PG - Degree" value={formatText(viewModal.scholar?.pgDegree)} />
                                            <ViewField label="PG - Specialization" value={formatText(viewModal.scholar?.pgSpecialization)} />
                                            <ViewField label="PG - Marking Scheme" value={formatText(viewModal.scholar?.pgMarkingScheme)} />
                                            <ViewField label="PG - CGPA Or Percentage" value={viewModal.scholar?.pgCgpa || (viewModal.scholar?.cgpa && viewModal.scholar.cgpa.pg)} />
                                            <ViewField label="PG - Month & Year" value={viewModal.scholar?.pgMonthYear} />
                                            <ViewField label="PG - Registration No." value={viewModal.scholar?.pgRegistrationNo} />
                                            <ViewField label="PG - Mode Of Study" value={formatText(viewModal.scholar?.pgModeOfStudy || 'Full Time')} />
                                            <ViewField label="PG - Place Of The Institution" value={formatText(viewModal.scholar?.pgPlace)} />
                                        </div>
                                    </section>

                                    {/* Other Degree Education */}
                                    <section>
                                        <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Other Degree - Education Qualification</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <ViewField label="Current Education Qualification" value={formatText(viewModal.scholar?.otherQualification)} />
                                            <ViewField label="Institute Name" value={formatText(viewModal.scholar?.otherInstitute)} />
                                            <ViewField label="Degree" value={formatText(viewModal.scholar?.otherDegree)} />
                                            <ViewField label="Specialization" value={formatText(viewModal.scholar?.otherSpecialization)} />
                                            <ViewField label="Marking Scheme" value={formatText(viewModal.scholar?.otherMarkingScheme)} />
                                            <ViewField label="CGPA / Percentage" value={viewModal.scholar?.otherCgpa} />
                                            <ViewField label="Month & Year" value={viewModal.scholar?.otherMonthYear} />
                                            <ViewField label="Registration No" value={viewModal.scholar?.otherRegistrationNo} />
                                            <ViewField label="Mode Of Study" value={formatText(viewModal.scholar?.otherModeOfStudy)} />
                                            <ViewField label="Place Of Institution" value={formatText(viewModal.scholar?.otherPlace)} />
                                        </div>
                                    </section>

                                    {/* Competitive Exams */}
                                    <section>
                                        <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Competitive Exams</h4>
                                        <div className="mb-4">
                                            <ViewField label="Have You Taken Any Competitive Exam?" value={viewModal.scholar?.competitiveExam || 'No'} />
                                        </div>
                                        {viewModal.scholar?.competitiveExam === 'Yes' && (
                                            <>
                                                <div className="mb-6">
                                                    <h5 className="text-md font-medium text-gray-800 mb-3">1. Exam Details</h5>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                        <ViewField label="Name Of The Exam" value={formatText(viewModal.scholar?.exam1Name)} />
                                                        <ViewField label="Registration No./Roll No." value={viewModal.scholar?.exam1RegNo} />
                                                        <ViewField label="Score Obtained" value={viewModal.scholar?.exam1Score} />
                                                        <ViewField label="Max Score" value={viewModal.scholar?.exam1MaxScore} />
                                                        <ViewField label="Year Appeared" value={viewModal.scholar?.exam1Year} />
                                                        <ViewField label="AIR/Overall Rank" value={viewModal.scholar?.exam1Rank} />
                                                        <ViewField label="Qualified/Not Qualified" value={formatText(viewModal.scholar?.exam1Qualified)} />
                                                    </div>
                                                </div>
                                                <div className="mb-6">
                                                    <h5 className="text-md font-medium text-gray-800 mb-3">2. Exam Details</h5>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                        <ViewField label="Name Of The Exam" value={formatText(viewModal.scholar?.exam2Name)} />
                                                        <ViewField label="Registration No./Roll No." value={viewModal.scholar?.exam2RegNo} />
                                                        <ViewField label="Score Obtained" value={viewModal.scholar?.exam2Score} />
                                                        <ViewField label="Max Score" value={viewModal.scholar?.exam2MaxScore} />
                                                        <ViewField label="Year Appeared" value={viewModal.scholar?.exam2Year} />
                                                        <ViewField label="AIR/Overall Rank" value={viewModal.scholar?.exam2Rank} />
                                                        <ViewField label="Qualified/Not Qualified" value={formatText(viewModal.scholar?.exam2Qualified)} />
                                                    </div>
                                                </div>
                                                <div className="mb-6">
                                                    <h5 className="text-md font-medium text-gray-800 mb-3">3. Exam Details</h5>
                                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                                        <ViewField label="Name Of The Exam" value={formatText(viewModal.scholar?.exam3Name)} />
                                                        <ViewField label="Registration No./Roll No." value={viewModal.scholar?.exam3RegNo} />
                                                        <ViewField label="Score Obtained" value={viewModal.scholar?.exam3Score} />
                                                        <ViewField label="Max Score" value={viewModal.scholar?.exam3MaxScore} />
                                                        <ViewField label="Year Appeared" value={viewModal.scholar?.exam3Year} />
                                                        <ViewField label="AIR/Overall Rank" value={viewModal.scholar?.exam3Rank} />
                                                        <ViewField label="Qualified/Not Qualified" value={formatText(viewModal.scholar?.exam3Qualified)} />
                                                    </div>
                                                </div>
                                            </>
                                        )}
                                    </section>

                                    {/* Research Interest & Essays */}
                                    <section>
                                        <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Research Interest & Essays</h4>
                                        <div className="space-y-4">
                                            <div className="flex flex-col gap-1">
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Describe In 300 Words; Your Reasons For Applying To The Proposed Program; Your Study Interests/future Career Plans, And Other Interests That Drives You To Apply To The Program.:</label>
                                                <div className="block text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200 min-h-[80px] whitespace-pre-wrap">
                                                    {viewModal.scholar?.reasonsForApplying || viewModal.scholar?.essay1 || 'N/A'}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Title And Abstract Of The Master Degree Thesis And Your Research Interest In 500 Words:</label>
                                                <div className="block text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200 min-h-[80px] whitespace-pre-wrap">
                                                    {viewModal.scholar?.researchInterest || viewModal.scholar?.essay2 || 'N/A'}
                                                </div>
                                            </div>
                                            <ViewField label="Area Of Interest" value={formatText(viewModal.scholar?.areaOfInterest)} />
                                            <ViewField label="User Id" value={viewModal.scholar?.userId} />
                                        </div>
                                    </section>

                                    {/* Query Information */}
                                    <section>
                                        <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Query & Communication</h4>
                                        <div className="grid grid-cols-1 gap-4">
                                            <div className="flex flex-col gap-1">
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Query Text</label>
                                                <span className="block text-sm font-medium text-gray-900 bg-gray-50 px-3 py-2 rounded-md border border-gray-200 min-h-[80px] whitespace-pre-wrap">
                                                    {viewModal.scholar?.queryText || viewModal.scholar?._supabaseData?.dept_query || 'No query text available'}
                                                </span>
                                            </div>
                                            <ViewField label="Query Timestamp" value={viewModal.scholar?.queryTimestamp || viewModal.scholar?._supabaseData?.query_timestamp ? new Date(viewModal.scholar?.queryTimestamp || viewModal.scholar?._supabaseData?.query_timestamp).toLocaleString() : 'N/A'} />
                                            <div className="flex flex-col gap-1">
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Query Resolution Status</label>
                                                <span className={`inline-flex px-3 py-2 rounded-full text-xs font-medium border w-fit ${
                                                    (viewModal.scholar?.query_resolved_dept || viewModal.scholar?._supabaseData?.query_resolved_dept) 
                                                        ? 'bg-green-100 text-green-800 border-green-200' 
                                                        : 'bg-purple-100 text-purple-800 border-purple-200'
                                                }`}>
                                                    {(viewModal.scholar?.query_resolved_dept || viewModal.scholar?._supabaseData?.query_resolved_dept) 
                                                        ? 'Query Resolved' 
                                                        : 'Query Pending'}
                                                </span>
                                            </div>
                                        </div>
                                    </section>

                                    {/* Application Status */}
                                    <section>
                                        <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Application Status & Review</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <div className="flex flex-col gap-1 items-start">
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Current Status</label>
                                                <span className={`inline-flex px-3 py-2 rounded-full text-xs font-medium border ${
                                                    // Priority 1: If query is resolved, show as resolved (green)
                                                    (viewModal.scholar?.query_resolved_dept || viewModal.scholar?._supabaseData?.query_resolved_dept) ? 'bg-green-100 text-green-800 border-green-200' :
                                                    // Priority 2: Check dept_review status
                                                    viewModal.scholar?.deptReview === 'Approved' ? 'bg-green-100 text-green-800 border-green-200' :
                                                    viewModal.scholar?.deptReview === 'Rejected' ? 'bg-red-100 text-red-800 border-red-200' :
                                                    viewModal.scholar?.deptReview === 'Query' ? 'bg-purple-100 text-purple-800 border-purple-200' :
                                                    'bg-yellow-100 text-yellow-800 border-yellow-200'
                                                }`}>
                                                    {/* Priority 1: Show "Query Resolved" if query_resolved_dept has any value */}
                                                    {(viewModal.scholar?.query_resolved_dept || viewModal.scholar?._supabaseData?.query_resolved_dept) ? 'Query Resolved' : 
                                                     /* Priority 2: Show dept_review status */
                                                     viewModal.scholar?.deptReview || 'Pending'}
                                                </span>
                                            </div>
                                            <ViewField label="Faculty" value={formatText(viewModal.scholar?.faculty)} />
                                            <ViewField label="Department" value={formatText(viewModal.scholar?.program || viewModal.scholar?.specialization)} />
                                            <ViewField label="Type" value={formatText(viewModal.scholar?.type)} />
                                            <ViewField label="Department Review" value={formatText(viewModal.scholar?.deptReview || 'Pending')} />
                                            <ViewField label="Faculty Status" value={formatText(viewModal.scholar?._supabaseData?.facultyStatus || 'N/A')} />
                                            <ViewField label="Overall Status" value={formatText(viewModal.scholar?._supabaseData?.status || 'N/A')} />
                                        </div>
                                    </section>

                                    {/* Research & Academic Information */}
                                    <section>
                                        <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Research & Academic Information</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            <ViewField label="Research Topic" value={formatText(viewModal.scholar?.researchTopic)} />
                                            <ViewField label="Guide Name" value={formatText(viewModal.scholar?.guideName)} />
                                            <ViewField label="UG CGPA" value={viewModal.scholar?.cgpa?.ug || 'N/A'} />
                                            <ViewField label="PG CGPA" value={viewModal.scholar?.cgpa?.pg || 'N/A'} />
                                        </div>
                                    </section>

                                    {/* Documents & Links */}
                                    <section>
                                        <h4 className="text-lg font-bold text-gray-900 mb-4 border-b border-gray-200 pb-2">Documents & Certificates</h4>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <ViewField label="Certificates Link" value={viewModal.scholar?.certificatesLink !== '#' ? viewModal.scholar?.certificatesLink : 'Not provided'} />
                                            <div className="flex flex-col gap-1">
                                                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">View Documents</label>
                                                <button
                                                    onClick={() => {
                                                        if (viewModal.scholar?.certificatesLink && viewModal.scholar.certificatesLink !== '#') {
                                                            window.open(viewModal.scholar.certificatesLink, '_blank', 'noopener');
                                                        }
                                                    }}
                                                    disabled={!viewModal.scholar?.certificatesLink || viewModal.scholar.certificatesLink === '#'}
                                                    className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                                                        viewModal.scholar?.certificatesLink && viewModal.scholar.certificatesLink !== '#'
                                                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200 border border-blue-200'
                                                            : 'bg-gray-100 text-gray-400 cursor-not-allowed border border-gray-200'
                                                    }`}
                                                >
                                                    {viewModal.scholar?.certificatesLink && viewModal.scholar.certificatesLink !== '#' ? 'Open Documents' : 'No Documents'}
                                                </button>
                                            </div>
                                        </div>
                                    </section>
                                </div>
                            );
                        })()}
                        
                        <div className="mt-8 pt-4 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setViewModal({ open: false, scholar: null })}
                                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium shadow-sm"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Confirm Approve Modal */}
            {confirmModal.open && confirmModal.action === 'approve' && (
                <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative animate-modal-in">
                        <h3 className="text-xl font-bold mb-4">Confirm Approval</h3>
                        <p className="text-gray-600 mb-6">
                            Are you sure you want to approve <strong>{confirmModal.scholar?.name}</strong>?
                        </p>
                        <div className="flex justify-end gap-3">
                            <button 
                                className="px-5 py-2.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors" 
                                onClick={() => setConfirmModal({ open: false, scholar: null, action: null })}
                            >
                                Cancel
                            </button>
                            <button 
                                className="px-5 py-2.5 rounded-lg bg-green-600 text-white hover:bg-green-700 font-medium shadow-md transition-all active:scale-95" 
                                onClick={handleConfirmApprove}
                            >
                                Approve
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Rejection Modal */}
            {rejectionModal.open && (
                <div className="fixed inset-0 z-[100001] flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-6 relative animate-modal-in">
                        <h3 className="text-xl font-bold mb-4">Reject Scholar</h3>
                        <p className="text-gray-600 mb-4">
                            Please provide a reason for rejecting <strong>{rejectionModal.scholar?.name}</strong>:
                        </p>
                        <textarea
                            className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                            rows="4"
                            placeholder="Enter rejection reason..."
                            value={rejectionModal.reason}
                            onChange={e => setRejectionModal(prev => ({ ...prev, reason: e.target.value }))}
                        />
                        <div className="flex justify-end gap-3 mt-4">
                            <button 
                                className="px-5 py-2.5 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 font-medium transition-colors" 
                                onClick={() => setRejectionModal({ open: false, scholar: null, reason: '' })}
                            >
                                Cancel
                            </button>
                            <button 
                                className="px-5 py-2.5 rounded-lg bg-red-600 text-white hover:bg-red-700 font-medium shadow-md transition-all active:scale-95" 
                                onClick={handleConfirmReject}
                            >
                                Reject
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Message Box */}
            {messageBox.open && (
                <div className="fixed top-6 right-6 z-50">
                    <div className="bg-white border-l-4 border-blue-700 shadow-lg rounded-lg p-4 max-w-sm animate-modal-in">
                        <div className="flex justify-between items-center">
                            <span className="text-base">{messageBox.message}</span>
                            <button 
                                onClick={() => setMessageBox({ open: false, message: '' })} 
                                className="ml-4 px-2 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
