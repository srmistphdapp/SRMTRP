import { useState, useEffect } from 'react';
import { Send, Undo2, SlidersHorizontal, Maximize2, MessageSquare, Clock, User } from 'lucide-react';
import { useAppContext } from '../contexts/AppContext';

// Helper component functions for Modals and MessageBox (duplicated for self-containment)

function Modal({ open, onClose, children, maxWidth = 'max-w-lg' }) {
	if (!open) return null;
	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
			<div className={`bg-white rounded-lg shadow-lg w-full ${maxWidth} p-6 relative animate-modal-in max-h-[90vh] overflow-y-auto`}>
				<button onClick={onClose} className="absolute top-3 right-4 text-2xl text-gray-400 hover:text-pink-400 font-bold">&times;</button>
				{children}
			</div>
		</div>
	);
}

function MessageBox({ open, message, onClose }) {
	if (!open) return null;
	return (
		<div className="fixed top-6 right-6 z-50">
			<div className="bg-white border-l-4 border-blue-700 shadow-lg rounded-lg p-4 max-w-sm animate-modal-in">
				<div className="flex justify-between items-center">
					<span className="text-base">{message}</span>
					<button onClick={onClose} className="ml-4 px-2 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg">Close</button>
				</div>
			</div>
		</div>
	);
}

// Helper to format date for display
const formatDate = (dateString) => {
    try {
        const date = new Date(dateString);
        // Fallback for demo data which might not have ISO strings
        if (isNaN(date.getTime())) return dateString; 
        return date.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' }) + ' ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } catch (e) {
        return dateString;
    }
};

// New Modal for viewing scholar queries
function ViewQueriesModal({ open, onClose, scholar }) {
    if (!open || !scholar) return null;
    const queries = scholar.queries || [];

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-3xl">
            <h3 className="text-2xl font-bold mb-6 text-indigo-700">Queries for {scholar.name} ({scholar.regNo})</h3>
            <div className="space-y-4 max-h-[60vh] overflow-y-auto p-2">
                {queries.length === 0 ? (
                    <div className="text-center py-10 text-gray-500 border border-dashed rounded-lg">
                        <MessageSquare className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                        <p>No previous queries found for this scholar.</p>
                    </div>
                ) : (
                    queries.map((query, index) => (
                        <div key={query.id || index} className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg shadow-sm">
                            <p className="text-gray-800 text-base italic line-clamp-3">{query.text}</p>
                            <div className="mt-3 flex items-center justify-between text-xs text-gray-500 border-t pt-2">
                                <span className="flex items-center gap-1 font-medium"><User className="w-3 h-3" /> Admin</span>
                                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(query.timestamp)}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
            <div className="flex justify-end pt-6 mt-6 border-t">
                <button onClick={onClose} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Close</button>
            </div>
        </Modal>
    );
}


export default function ApprovedScholars() {
	const { scholarList, setScholarList, toggleFullScreen, currentUser, refreshScholarData } = useAppContext();
	const [search, setSearch] = useState('');
	const [selected, setSelected] = useState([]);
	const [forwardModal, setForwardModal] = useState({ open: false, ids: [] });
	const [consentChecked, setConsentChecked] = useState(false);
	const [revertModal, setRevertModal] = useState({ open: false, id: null });
	const [messageBox, setMessageBox] = useState({ open: false, message: '' });
	const [viewModal, setViewModal] = useState({ open: false, scholar: null });
	const [filterModalOpen, setFilterModalOpen] = useState(false);
	const [filterStatus, setFilterStatus] = useState('All');

    // New state for viewing queries modal
    const [viewQueriesModal, setViewQueriesModal] = useState({ open: false, scholar: null });

	// Refresh data when component becomes active (but not immediately to avoid overwriting recent changes)
	useEffect(() => {
		// Add a delay to avoid overwriting recent bulk operations
		const refreshTimer = setTimeout(() => {
			if (currentUser?.faculty && currentUser?.department && refreshScholarData) {
				console.log('🔄 ApprovedScholars: Refreshing data after delay');
				refreshScholarData();
			}
		}, 2000); // 2 second delay to allow bulk operations to complete

		return () => clearTimeout(refreshTimer);
	}, [currentUser?.faculty, currentUser?.department]); // Remove refreshScholarData from dependencies

	// Automatic refresh on data changes
	useEffect(() => {
		if (refreshScholarData) {
			refreshScholarData();
		}
	}, [scholarList.length, refreshScholarData]);

	// Helper function to check if action buttons should be disabled
	const areActionButtonsDisabled = (scholar) => {
		// Check if scholar is already forwarded
		if (scholar.forwarded) {
			return true;
		}
		
		// Check if dept_status indicates scholar has been forwarded back (Back_To_* or Rejected)
		const deptStatus = scholar._supabaseData?.deptStatus || scholar.deptStatus;
		if (deptStatus && (deptStatus.startsWith('Back_To_') || deptStatus === 'Rejected')) {
			return true;
		}
		
		// Check dept_review status - disable if not Approved
		const deptReview = scholar.deptReview || scholar._supabaseData?.deptReview;
		if (deptReview !== 'Approved') {
			return true;
		}
		
		return false;
	};

	// Helper function to get the reason why buttons are disabled
	const getDisabledReason = (scholar) => {
		if (scholar.forwarded) {
			return "Already Forwarded";
		}
		
		const deptStatus = scholar._supabaseData?.deptStatus || scholar.deptStatus;
		if (deptStatus === 'Rejected') {
			return "Forwarded as Rejected";
		}
		if (deptStatus && deptStatus.startsWith('Back_To_')) {
			return `Forwarded ${deptStatus.replace('Back_To_', 'to ')}`;
		}
		
		const deptReview = scholar.deptReview || scholar._supabaseData?.deptReview;
		if (deptReview !== 'Approved') {
			return `Status: ${deptReview}`;
		}
		
		return "";
	};

	// Only show scholars with dept_review 'Approved' (including forwarded ones)
	const filtered = scholarList.filter(s => {
		// Base filter: only approved scholars
		if (s.deptReview !== 'Approved') return false;
		
		// Search filter
		const searchMatch = s.name.toLowerCase().includes(search.toLowerCase()) ||
			s.regNo.toLowerCase().includes(search.toLowerCase());
		
		// Status filter
		let statusMatch = true;
		if (filterStatus !== 'All') {
			if (filterStatus === 'Approved') {
				// Approved but not forwarded
				statusMatch = !s.forwarded && !areActionButtonsDisabled(s);
			} else if (filterStatus === 'Forwarded') {
				// Already forwarded
				statusMatch = s.forwarded === true;
			} else if (filterStatus === 'Disabled') {
				// Action buttons are disabled (various reasons)
				statusMatch = areActionButtonsDisabled(s) && !s.forwarded;
			}
		}
		
		return searchMatch && statusMatch;
	});

	// Only count selectable scholars (not forwarded and not with Back_To_* dept_status)
	const selectableScholars = filtered.filter(s => !areActionButtonsDisabled(s));
	const allSelected = selected.length === selectableScholars.length && selectableScholars.length > 0;

	const handleSelect = (id) => {
		// Only allow selection of scholars with enabled action buttons
		const scholar = scholarList.find(s => s.id === id);
		if (scholar && areActionButtonsDisabled(scholar)) {
			return; // Don't allow selection of scholars with disabled buttons
		}
		setSelected(sel => sel.includes(id) ? sel.filter(x => x !== id) : [...sel, id]);
	};
	
	const handleSelectAll = () => {
		if (allSelected) setSelected([]);
		else setSelected(selectableScholars.map(s => s.id)); // Only select scholars with enabled buttons
	};
	const handleForward = (ids) => {
		setConsentChecked(false);
		setForwardModal({ open: true, ids });
	};
	const handleConfirmForward = async () => {
		if (!consentChecked) return;
		
		try {
			// Import the service functions
			const { forwardScholar } = await import('../services/departmentScholarService');
			
			let successCount = 0;
			let errorCount = 0;
			
			// Process each scholar individually
			for (const scholarId of forwardModal.ids) {
				const scholar = scholarList.find(s => s.id === scholarId);
				if (scholar) {
					console.log(`🔄 Forwarding scholar ${scholarId} (${scholar.name}) with status: ${scholar.status}`);
					
					// Get the Supabase ID and current status
					const supabaseId = scholar._supabaseData?.originalId || scholar.id;
					const currentStatus = scholar.status || scholar._supabaseData?.status;
					
					// Call the service function to update dept_status
					const result = await forwardScholar(supabaseId, currentStatus);
					
					if (result.error) {
						console.error(`❌ Error forwarding scholar ${scholarId}:`, result.error);
						setMessageBox({ open: true, message: `Failed to forward ${scholar.name}: ${result.error.message}` });
						errorCount++;
					} else {
						console.log(`✅ Successfully forwarded scholar ${scholarId}:`, result.data);
						successCount++;
						
						// Update local state to reflect the change - ensure dept_status is updated
						const updatedDeptStatus = result.data?.[0]?.dept_status || 'Back_To_Engineering';
						
						setScholarList(prev =>
							prev.map(s =>
								s.id === scholarId
									? { 
										...s, 
										forwarded: true,
										forwardingTimestamp: new Date().toISOString(),
										deptStatus: updatedDeptStatus, // Update local deptStatus
										_supabaseData: {
											...s._supabaseData,
											deptStatus: updatedDeptStatus // Update supabase data deptStatus
										}
									}
									: s
							)
						);
					}
				}
			}
			
			setSelected([]);
			setForwardModal({ open: false, ids: [] });
			setConsentChecked(false);
			
			// Show appropriate success/error message
			if (successCount > 0 && errorCount === 0) {
				setMessageBox({ open: true, message: `Successfully forwarded ${successCount} scholar(s)` });
			} else if (successCount > 0 && errorCount > 0) {
				setMessageBox({ open: true, message: `Forwarded ${successCount} scholar(s), ${errorCount} failed` });
			} else {
				setMessageBox({ open: true, message: 'Failed to forward scholars. Please try again.' });
			}
			
			// Refresh data to ensure UI is in sync with backend
			if (refreshScholarData) {
				setTimeout(() => {
					refreshScholarData();
				}, 1000);
			}
			
		} catch (err) {
			console.error('❌ Exception in handleConfirmForward:', err);
			setMessageBox({ open: true, message: 'Failed to forward scholars. Please try again.' });
		}
	};
	const handleRevert = (id) => {
		setRevertModal({ open: true, id });
	};
	const handleConfirmRevert = async () => {
		setSelected([]);
		setRevertModal({ open: false, id: null });
		
		if (revertModal.id) {
			try {
				// Import the service function
				const { revertScholar } = await import('../services/departmentScholarService');
				
				const scholar = scholarList.find(s => s.id === revertModal.id);
				if (scholar) {
					console.log(`🔄 Reverting scholar ${revertModal.id}`);
					
					// Get the Supabase ID
					const supabaseId = scholar._supabaseData?.originalId || scholar.id;
					
					// Call the service function to update dept_status to "Revert" and dept_review to "Pending"
					const result = await revertScholar(supabaseId);
					
					if (result.error) {
						console.error(`❌ Error reverting scholar ${revertModal.id}:`, result.error);
						setMessageBox({ open: true, message: `Failed to revert ${scholar.name}: ${result.error.message}` });
					} else {
						console.log(`✅ Successfully reverted scholar ${revertModal.id}`);
						
						// Update local state to reflect the change
						const updates = {
							verificationStatus: 'Pending',
							deptReview: 'Pending',
							approvalTimestamp: null,
							rejectionReason: null,
							forwarded: false,
							forwardingTimestamp: null,
							approved: false,
							_supabaseData: {
								...scholar._supabaseData,
								deptStatus: 'Revert',
								deptReview: 'Pending'
							}
						};
						
						setScholarList(prev =>
							prev.map(s =>
								s.id === revertModal.id
									? { ...s, ...updates }
									: s
							)
						);
						
						setMessageBox({ open: true, message: `Scholar status reverted to pending.` });
						
						// Refresh data to ensure UI is in sync with backend
						if (refreshScholarData) {
							setTimeout(() => {
								refreshScholarData();
							}, 1000);
						}
					}
				}
			} catch (err) {
				console.error('❌ Exception in handleConfirmRevert:', err);
				setMessageBox({ open: true, message: 'Failed to revert scholar. Please try again.' });
			}
		}
	};

	const handleOpenFilter = () => setFilterModalOpen(true);
	const handleCloseFilter = () => setFilterModalOpen(false);
	const handleApplyFilter = () => {
		setFilterModalOpen(false);
	};

	return (
			<div id="panel-approved" className="panel-fullscreen w-full">
				<div className="w-full px-6">
					<div className="mb-8">
						<div className="flex justify-between items-center mb-4">
							<h1 className="p-4 text-3xl font-bold leading-tight">Eligible Scholars</h1>
							<button className="p-2 rounded-md text-gray-600 hover:bg-gray-100 fullscreen-btn" title="Fullscreen approved scholars" onClick={() => toggleFullScreen && toggleFullScreen('panel-approved')}>
								<Maximize2 className="w-5 h-5" />
							</button>
						</div>
						<div className="flex gap-2 items-center justify-start">
							<div>
								<input
									type="text"
									placeholder="Search in Approved..."
									className="pr-4 py-2 w-64 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition bg-[url('data:image/svg+xml;utf8,<svg xmlns=\'http://www.w3.org/2000/svg\' width=\'20\' height=\'20\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'gray\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'><circle cx=\'11\' cy=\'11\' r=\'8\'/><line x1=\'21\' y1=\'21\' x2=\'16.65\' y2=\'16.65\'/></svg>')] bg-no-repeat bg-[length:20px_20px] bg-[left_8px_center] pl-10"
									value={search}
									onChange={e => setSearch(e.target.value)}
								/>
							</div>
						<button className="p-2.5 rounded-lg border bg-white hover:bg-gray-100 text-gray-600" title="Filter" onClick={handleOpenFilter}>
							<SlidersHorizontal className="w-5 h-5" />
						</button>
						<button
							className="ml-2 px-4 py-2 rounded-lg font-bold text-white bg-green-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 whitespace-nowrap"
							disabled={selected.length === 0 || selected.every(id => {
								const scholar = scholarList.find(s => s.id === id);
								return scholar && areActionButtonsDisabled(scholar);
							})}
							onClick={() => {
								// Only forward scholars with enabled action buttons
								const enabledSelected = selected.filter(id => {
									const scholar = scholarList.find(s => s.id === id);
									return scholar && !areActionButtonsDisabled(scholar);
								});
								if (enabledSelected.length > 0) {
									handleForward(enabledSelected);
								}
							}}
						>
							<Send className="w-5 h-5" /> Forward Selected
						</button>
					</div>
				</div>
				<div className="bg-white rounded-lg shadow">
					<div className="overflow-x-auto">
						<table className="w-full min-w-[1800px] border-collapse bg-white text-sm text-left table-fixed">
							<thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
								<tr>
									<th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 text-center w-[60px] sticky left-0 bg-slate-50 z-20">
										<input 
											type="checkbox" 
											checked={allSelected} 
											onChange={handleSelectAll} 
											className="h-5 w-5"
											disabled={selectableScholars.length === 0}
										/>
									</th>
									<th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 border-r border-gray-100 text-center w-[60px] sticky left-[60px] bg-slate-50 z-20">S.NO</th>
									<th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 border-r border-gray-100 w-[200px] sticky left-[120px] bg-slate-50 z-20">REGISTERED NAME</th>
									<th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 border-r border-gray-100 w-[150px] sticky left-[320px] bg-slate-50 z-20">APPLICATION NO.</th>
									<th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 border-r border-gray-100 w-[280px]">SELECT INSTITUTION</th>
									<th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 border-r border-gray-100 w-[280px]">DEPARTMENT</th>
									<th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 border-r border-gray-100 w-[150px]">TYPE</th>
									<th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 border-r border-gray-100 w-[180px]">MOBILE NUMBER</th>
									<th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 border-r border-gray-100 w-[250px]">EMAIL ID</th>
									<th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 border-r border-gray-100 text-center w-[100px]">GENDER</th>
									<th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 border-r border-gray-100 text-center w-[120px]">CERTIFICATES</th>
									<th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 border-r border-gray-100 text-center w-[120px]">STATUS</th>
									<th className="px-5 py-4 font-bold text-gray-700 uppercase text-xs tracking-wider border-b border-gray-200 text-center w-[150px]">ACTIONS</th>
								</tr>
							</thead>
							<tbody className="divide-y divide-gray-100">
								{filtered.length === 0 ? (
									<tr>
										<td colSpan={13} className="text-center py-12 text-gray-500">
											<div className="flex flex-col items-center justify-center">
												<svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
												</svg>
												<p className="text-lg font-medium text-gray-700">
													{scholarList.filter(s => s.deptReview === 'Approved').length === 0 && !search
														? 'No approved scholars yet'
														: 'No eligible scholars found'}
												</p>
												<p className="text-sm text-gray-400 mt-1">
													{scholarList.filter(s => s.deptReview === 'Approved').length === 0 && !search
														? 'Approved scholars will appear here'
														: 'Try adjusting your search terms'}
												</p>
											</div>
										</td>
									</tr>
								) : (
									filtered.map((s, idx) => {
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

										return (
											<tr key={s.id} className="hover:bg-blue-50/30 transition-colors group">
												<td className="px-5 py-4 whitespace-nowrap text-center sticky left-0 bg-white group-hover:bg-blue-50/30 z-10">
													<input 
														type="checkbox" 
														checked={selected.includes(s.id)} 
														onChange={() => handleSelect(s.id)} 
														className={`h-5 w-5 ${areActionButtonsDisabled(s) ? 'opacity-50 cursor-not-allowed' : ''}`}
														disabled={areActionButtonsDisabled(s)}
													/>
												</td>
												<td className="px-5 py-4 whitespace-nowrap text-gray-900 border-r border-gray-100 text-center sticky left-[60px] bg-white group-hover:bg-blue-50/30 z-10">{idx + 1}</td>
												<td className="px-5 py-4 whitespace-nowrap text-gray-900 border-r border-gray-100 sticky left-[120px] bg-white group-hover:bg-blue-50/30 z-10">
													<span>{s.name}</span>
												</td>
												<td className="px-5 py-4 whitespace-nowrap text-gray-600 border-r border-gray-100 sticky left-[320px] bg-white group-hover:bg-blue-50/30 z-10">{s.regNo}</td>
												<td className="px-5 py-4 text-gray-900 border-r border-gray-100">{s.institution || '-'}</td>
												<td className="px-5 py-4 text-gray-900 border-r border-gray-100" title={s.specialization}>{s.specialization || '-'}</td>
												<td className="px-5 py-4 whitespace-nowrap text-gray-900 border-r border-gray-100">{s.type || 'Full Time'}</td>
												<td className="px-5 py-4 whitespace-nowrap text-gray-900 border-r border-gray-100">{s.mobile || 'N/A'}</td>
												<td className="px-5 py-4 whitespace-nowrap text-gray-900 border-r border-gray-100">{s.email || 'N/A'}</td>
												<td className="px-5 py-4 whitespace-nowrap text-gray-900 border-r border-gray-100 text-center">{s.gender || 'N/A'}</td>
												<td className="px-5 py-4 whitespace-nowrap border-r border-gray-100 text-center">
													{s.certificatesLink && s.certificatesLink !== '#' ? (
														<a 
															href={s.certificatesLink} 
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
												<td className="px-5 py-4 whitespace-nowrap border-r border-gray-100 text-center">
													<span className={`px-3 py-1 rounded-full text-xs font-medium ${
														s.forwarded 
															? 'bg-blue-100 text-blue-800 border border-blue-200' 
															: (s._supabaseData?.deptStatus === 'Rejected' || s.deptStatus === 'Rejected')
																? 'bg-red-100 text-red-800 border border-red-200'
															: (s._supabaseData?.deptStatus && s._supabaseData.deptStatus.startsWith('Back_To_')) || (s.deptStatus && s.deptStatus.startsWith('Back_To_'))
																? 'bg-orange-100 text-orange-800 border border-orange-200'
																: 'bg-green-100 text-green-800 border border-green-200'
													}`}>
														{s.forwarded 
															? 'Forwarded' 
															: (s._supabaseData?.deptStatus === 'Rejected' || s.deptStatus === 'Rejected')
																? 'Rejected'
															: (s._supabaseData?.deptStatus && s._supabaseData.deptStatus.startsWith('Back_To_')) || (s.deptStatus && s.deptStatus.startsWith('Back_To_'))
																? 'Forwarded'
																: 'Approved'
														}
													</span>
												</td>
												<td className="px-5 py-4 whitespace-nowrap text-center">
													<div className="flex justify-center items-center gap-2">
														<button 
															title={getDisabledReason(s) || "Forward"} 
															className={`p-2 rounded-lg transition-colors ${
																areActionButtonsDisabled(s)
																	? 'bg-gray-300 cursor-not-allowed opacity-50' 
																	: 'bg-emerald-500 hover:bg-emerald-600'
															}`} 
															onClick={() => !areActionButtonsDisabled(s) && handleForward([s.id])} 
															disabled={areActionButtonsDisabled(s)}
														>
															<Send className="w-5 h-5 text-white" />
														</button>
														<button 
															title={areActionButtonsDisabled(s) ? getDisabledReason(s) : "Revert to Pending"} 
															className={`p-2 rounded-full transition-colors ${
																areActionButtonsDisabled(s)
																	? 'bg-gray-300 cursor-not-allowed opacity-50'
																	: 'bg-red-500 hover:bg-red-600'
															}`} 
															onClick={() => !areActionButtonsDisabled(s) && handleRevert(s.id)}
															disabled={areActionButtonsDisabled(s)}
														>
															<Undo2 className="w-5 h-5 text-white" />
														</button>
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
				{/* Scholar Details Modal */}
				<Modal open={viewModal.open} onClose={() => setViewModal({ open: false, scholar: null })} maxWidth="max-w-2xl">
					<h3 className="text-2xl font-bold mb-6">Scholar Details</h3>
					{viewModal.scholar && (
						<div className="space-y-2">
							<div><strong>Application No.:</strong> {viewModal.scholar.regNo}</div>
							<div><strong>Name:</strong> {viewModal.scholar.name}</div>
							<div><strong>Type:</strong> {viewModal.scholar.type}</div>
							<div><strong>Status:</strong> {viewModal.scholar.verificationStatus}</div>
							{viewModal.scholar.forwarded && viewModal.scholar.forwardedOn && (
								<div><strong>Forwarded On:</strong> {new Date(viewModal.scholar.forwardingTimestamp || viewModal.scholar.forwardedOn).toLocaleString()}</div>
							)}
						</div>
					)}
					<div className="flex justify-end pt-6 mt-6 border-t">
						<button onClick={() => setViewModal({ open: false, scholar: null })} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Close</button>
					</div>
				</Modal>
				{/* Forward Modal */}
				<Modal open={forwardModal.open} onClose={() => { setForwardModal({ open: false, ids: [] }); setConsentChecked(false); }}>
					<h3 className="text-2xl font-bold mb-3">Confirm Forwarding {forwardModal.ids.length === 1 ? `for ${(() => {
						const s = scholarList.find(x => x.id === forwardModal.ids[0]);
						return s ? s.name : '';
					})()}` : ''}</h3>
					{/* Removed Duplicate Button Here */}
					<div className="mb-4 border rounded-lg p-4 bg-gray-50">
						<div className="text-sm text-gray-600">Admin Name: <span className="font-semibold">{currentUser?.name || 'Department HOD'}</span></div>
						<div className="text-sm text-gray-600">Role: <span className="font-semibold">{currentUser?.role || `HOD, ${currentUser?.department || 'Department'}`}</span></div>
						<div className="text-sm text-gray-600">Email: <a href={`mailto:${currentUser?.email || ''}`} className="text-sky-600">{currentUser?.email || 'Not available'}</a></div>
					</div>
					<div className="mb-4">
						<h4 className="font-bold">Consent & Confirmation</h4>
						<ul className="list-disc list-inside text-sm text-gray-700 mt-2 space-y-1">
							<li>I have thoroughly reviewed all submitted data</li>
							<li>I have verified the authenticity of documents</li>
							<li>This action will be recorded in the system</li>
						</ul>
					</div>
					<div className="mb-4">
						<label className="inline-flex items-center gap-2">
							<input type="checkbox" className="mt-1" checked={consentChecked} onChange={e => setConsentChecked(e.target.checked)} />
							<span className="text-sm whitespace-nowrap">I confirm I have read and agree to the above terms</span>
						</label>
					</div>
					<div className="mb-6 text-sm text-gray-700">You are about to <span className="font-bold">FORWARD</span> records {forwardModal.ids.length === 1 ? `for ${(() => {
						const s = scholarList.find(x => x.id === forwardModal.ids[0]);
						return s ? s.name : 'this scholar';
					})()}` : `for ${forwardModal.ids.length} scholars`} to the Research Coordinator for further processing.</div>
					<div className="flex justify-end gap-3">
						<button onClick={() => { setForwardModal({ open: false, ids: [] }); setConsentChecked(false); }} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
						<button onClick={handleConfirmForward} disabled={!consentChecked} className={`py-2 px-4 rounded-lg font-bold text-white ${consentChecked ? 'bg-gradient-to-r from-purple-500 to-pink-500 hover:opacity-95' : 'bg-gray-300 cursor-not-allowed'}`}>Confirm Forward</button>
					</div>
				</Modal>
				{/* Revert Modal */}
				<Modal open={revertModal.open} onClose={() => setRevertModal({ open: false, id: null })}>
					<h3 className="text-2xl font-bold mb-4">Revert to Pending</h3>
					<div className="mb-6">Are you sure you want to revert this scholar to pending?</div>
					<div className="flex justify-end gap-3">
						<button onClick={() => setRevertModal({ open: false, id: null })} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
						<button onClick={handleConfirmRevert} className="bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-2 px-4 rounded-lg">Confirm Revert</button>
					</div>
				</Modal>
				{/* Message Box */}
				<MessageBox open={messageBox.open} message={messageBox.message} onClose={() => setMessageBox({ open: false, message: '' })} />
				{/* Filter Modal */}
				{filterModalOpen && (
					<Modal open={true} onClose={handleCloseFilter} maxWidth="max-w-md">
						<h3 className="text-2xl font-bold mb-4">Filter Eligible Scholars</h3>
						<div className="mb-4">
							<label className="block text-sm font-bold mb-2">Status</label>
							<select className="w-full border rounded px-3 py-2" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
								<option value="All">All Status</option>
								<option value="Approved">Approved (Ready to forward)</option>
								<option value="Forwarded">Forwarded</option>
								<option value="Disabled">Action Disabled</option>
							</select>
							<p className="text-xs text-gray-500 mt-1">Filter scholars by their current status</p>
						</div>
						<div className="flex justify-end gap-3">
							<button onClick={handleCloseFilter} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Close</button>
						</div>
					</Modal>
				)}

                {/* View Queries Modal */}
                <ViewQueriesModal
                    open={viewQueriesModal.open}
                    onClose={() => setViewQueriesModal({ open: false, scholar: null })}
                    scholar={viewQueriesModal.scholar}
                />
			</div>
		</div>
	);
}