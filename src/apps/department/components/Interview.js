import React, { useState, useEffect, useCallback } from 'react';
import { Users, Send, Download, Pencil, SlidersHorizontal, Trash2, Maximize2 } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { useAppContext } from '../contexts/AppContext';

// Modified: Calculate average based on actual number of evaluators (1, 2, or 3)
// If absent for any evaluator, scholar is marked absent overall
function calcAverage(marks, numEvaluators = 1) {
    if (!marks || !marks.length) return 0;
    
    // Only consider marks up to the number of evaluators in the panel
    const relevantMarks = marks.slice(0, numEvaluators);
    
    // Check if ANY mark is absent - if so, scholar is absent overall
    // Check for: "A", "Ab", "ab", "a" (limited to 2 characters max)
    const hasAnyAbsent = relevantMarks.some(m => {
        if (typeof m === 'string') {
            const lowerM = m.toLowerCase().trim();
            return lowerM === 'a' || lowerM === 'ab';
        }
        return false;
    });
    
    if (hasAnyAbsent) return 'Ab'; // Return "Ab" if any mark is absent
    
    // Filter out empty/null values and convert to numbers
    const numericMarks = relevantMarks.filter(m => {
        if (m === '' || m === null || m === undefined) return false;
        return !isNaN(Number(m));
    }).map(m => Number(m));
    
    // If no numeric marks, return 0
    if (numericMarks.length === 0) return 0;
    
    // Calculate average of numeric marks
    const avg = numericMarks.reduce((a, b) => a + b, 0) / numericMarks.length;
    return Math.round(avg); // Return integer average
}

// Helper function to determine faculty interview status based on department
function getFacultyInterviewStatus(userDepartment, userFaculty) {
    // Medical department codes that should forward to Medical faculty
    const medicalDepartments = ['BMS', 'CDE', 'OMPM', 'OMS', 'OMR', 'ORTHO', 'PPD', 'POI', 'PROSTH', 'PHD'];
    const engineeringDepartments = ['BME', 'ENGBIO', 'ENGCHEM', 'CIVIL', 'CSE', 'EEE', 'ECE', 'ENGENG', 'ENGMATH', 'MECH', 'ENGPHYS'];
    const scienceDepartments = ['BIO', 'COMM', 'CS', 'EFL', 'FASHION', 'MATH', 'TAMIL', 'VISCOM'];
    const managementDepartments = ['MBA'];
    
    // Helper function to get department short code
    const getDepartmentShortCode = (departmentName) => {
        const departmentMap = {
            'Department of Orthodontics': 'ORTHO',
            'Orthodontics': 'ORTHO',
            'Department of Basic Medical Sciences': 'BMS',
            'Basic Medical Sciences': 'BMS',
            'Department of Conservative Dentistry & Endodontics': 'CDE',
            'Conservative Dentistry & Endodontics': 'CDE',
            'Department of Oral and Maxillofacial Pathology and Microbiology': 'OMPM',
            'Oral and Maxillofacial Pathology and Microbiology': 'OMPM',
            'Department of Oral and Maxillofacial Surgery': 'OMS',
            'Oral and Maxillofacial Surgery': 'OMS',
            'Department of Oral Medicine and Radiology': 'OMR',
            'Oral Medicine and Radiology': 'OMR',
            'Department of Pediatric and Preventive Dentistry': 'PPD',
            'Pediatric and Preventive Dentistry': 'PPD',
            'Department of Periodontics and Oral Implantology': 'POI',
            'Periodontics and Oral Implantology': 'POI',
            'Department of Prosthodontics': 'PROSTH',
            'Prosthodontics': 'PROSTH',
            'Department of Public Health Dentistry': 'PHD',
            'Public Health Dentistry': 'PHD',
            'Computer Science and Engineering': 'CSE',
            'Computer Science Engineering': 'CSE',
            'Mechanical Engineering': 'MECH',
            'Electrical and Electronics Engineering': 'EEE',
            'Management Studies': 'MBA'
        };
        
        return departmentMap[departmentName] || departmentName?.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 6) || 'UNKNOWN';
    };
    
    const departmentCode = getDepartmentShortCode(userDepartment);
    
    // Debug logging
    console.log(`🔍 Faculty Status Debug:`, {
        userDepartment,
        userFaculty,
        departmentCode,
        isMedical: medicalDepartments.includes(departmentCode)
    });
    
    // Determine faculty based on department code first, then fall back to faculty name
    if (medicalDepartments.includes(departmentCode)) {
        console.log(`✅ Medical department detected: ${departmentCode} -> Forwarded_To_Medical`);
        return 'Forwarded_To_Medical';
    } else if (engineeringDepartments.includes(departmentCode)) {
        console.log(`✅ Engineering department detected: ${departmentCode} -> Forwarded_To_Engineering`);
        return 'Forwarded_To_Engineering';
    } else if (scienceDepartments.includes(departmentCode)) {
        console.log(`✅ Science department detected: ${departmentCode} -> Forwarded_To_Science`);
        return 'Forwarded_To_Science';
    } else if (managementDepartments.includes(departmentCode)) {
        console.log(`✅ Management department detected: ${departmentCode} -> Forwarded_To_Management`);
        return 'Forwarded_To_Management';
    } else if (userFaculty?.includes('Engineering')) {
        console.log(`✅ Faculty fallback: Engineering -> Forwarded_To_Engineering`);
        return 'Forwarded_To_Engineering';
    } else if (userFaculty?.includes('Science')) {
        console.log(`✅ Faculty fallback: Science -> Forwarded_To_Science`);
        return 'Forwarded_To_Science';
    } else if (userFaculty?.includes('Medical')) {
        console.log(`✅ Faculty fallback: Medical -> Forwarded_To_Medical`);
        return 'Forwarded_To_Medical';
    } else if (userFaculty?.includes('Management')) {
        console.log(`✅ Faculty fallback: Management -> Forwarded_To_Management`);
        return 'Forwarded_To_Management';
    } else {
        console.log(`⚠️ Default fallback: -> Forwarded_To_Engineering`);
        return 'Forwarded_To_Engineering'; // Default fallback
    }
}

const Interview = () => {
    const { toggleFullScreen, currentUser } = useAppContext();
    const [editingId, setEditingId] = useState(null);
    const [editMarks, setEditMarks] = useState([0, 0, 0]);
    
    // Auto-save functionality with debounce
    const [autoSaveTimeout, setAutoSaveTimeout] = useState(null);

    // State for examination records from examination_records table
    const [examinationRecords, setExaminationRecords] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Initialize panels state - now backend-connected
    const [panels, setPanels] = useState([]);

    // Initialize active panel state - now backend-connected
    const [activePanel, setActivePanel] = useState(null);

    // Initialize panel scholars state - now backend-connected to examination_records
    const [panelScholars, setPanelScholars] = useState({});

    const [filterModalOpen, setFilterModalOpen] = useState(false);
    const [addPanelModalOpen, setAddPanelModalOpen] = useState(false);
    const [removePanelModalOpen, setRemovePanelModalOpen] = useState(false);
    const [editPanelModalOpen, setEditPanelModalOpen] = useState(false);
    const [newPanelEvaluators, setNewPanelEvaluators] = useState([
        { name: '', designation: '', affiliation: '' }
    ]);
    const [editPanelEvaluators, setEditPanelEvaluators] = useState([
        { name: '', designation: '', affiliation: '' }
    ]);
    const [filterName, setFilterName] = useState('');
    const [filterAppNo, setFilterAppNo] = useState('');
    const [filterStatus, setFilterStatus] = useState('All');
    const [forwardModal, setForwardModal] = useState({ open: false, id: null });
    const [consentChecked, setConsentChecked] = useState(false);
    const [forwardAllModal, setForwardAllModal] = useState(false);
    const [consentAllChecked, setConsentAllChecked] = useState(false);
    const [messageBox, setMessageBox] = useState({ open: false, message: '' });
    const [sortMenuOpen, setSortMenuOpen] = useState(false);

    // Fetch examination records on component mount
    useEffect(() => {
        const loadExaminationRecords = async () => {
            if (!currentUser?.department) {
                setError('Department information not available');
                setLoading(false);
                return;
            }

            try {
                setLoading(true);
                setError(null);

                const { fetchExaminationRecordsForInterview } = await import('../services/departmentScholarService');
                const { data, error: fetchError } = await fetchExaminationRecordsForInterview(
                    currentUser.department,
                    currentUser.faculty || 'Faculty of Engineering & Technology'
                );

                if (fetchError) {
                    console.error('❌ Error loading examination records:', fetchError);
                    console.error('❌ Full error details:', fetchError);
                    setError(`Failed to load examination records: ${fetchError.message || fetchError}`);
                } else {
                    console.log(`📊 Raw examination records data:`, data);
                    console.log(`📊 Number of records found:`, data?.length || 0);
                    if (data && data.length > 0) {
                        console.log(`📊 Sample record structure:`, data[0]);
                        console.log(`📊 Available fields:`, Object.keys(data[0]));
                    }
                    // Transform examination records to match expected format
                    const transformedRecords = (data || []).map((record, index) => ({
                        id: record.id || `exam_${index}`,
                        name: record.registered_name || record.name || 'Unknown',
                        appNo: record.application_no || record.app_no || `APP${index}`,
                        marks: [
                            record.examiner1_marks || 0,  // Keep original value (could be "Ab" or number)
                            record.examiner2_marks || 0,  // Keep original value (could be "Ab" or number)
                            record.examiner3_marks || 0   // Keep original value (could be "Ab" or number)
                        ],
                        average: record.interview_marks ? 
                            ((() => {
                                const interviewMark = record.interview_marks;
                                if (typeof interviewMark === 'string') {
                                    const lowerMark = interviewMark.toLowerCase().trim();
                                    if (lowerMark === 'a' || lowerMark === 'ab') {
                                        return 'Ab';
                                    }
                                }
                                return Math.round(parseFloat(interviewMark));
                            })()) : 
                            calcAverage([
                                record.examiner1_marks || 0,
                                record.examiner2_marks || 0,
                                record.examiner3_marks || 0
                            ]),
                        // Extract panel and evaluator information from database
                        assignedPanel: record.panel ? record.panel.replace('Panel ', '') : null,
                        evaluators: {
                            examiner1: record.examiner1,
                            examiner2: record.examiner2,
                            examiner3: record.examiner3
                        },
                        // Check if interview is already forwarded (any faculty-specific forwarded status)
                        forwarded: record.faculty_interview && record.faculty_interview.startsWith('Forwarded_To_'),
                        _originalData: record // Store original examination record data
                    }));

                    setExaminationRecords(transformedRecords);
                    
                    // If there are existing panel assignments, reconstruct panels from database
                    const existingPanels = new Map();
                    transformedRecords.forEach(record => {
                        if (record.assignedPanel && record.evaluators.examiner1) {
                            const panelId = parseInt(record.assignedPanel);
                            if (!existingPanels.has(panelId)) {
                                // Parse evaluator information back from "name | designation | affiliation" format
                                const parseEvaluator = (examinerStr, defaultName) => {
                                    if (!examinerStr || examinerStr.trim() === '') return null; // Return null if evaluator doesn't exist or is empty
                                    const parts = examinerStr.split(' | ');
                                    const name = parts[0]?.trim();
                                    const designation = parts[1]?.trim();
                                    const affiliation = parts[2]?.trim();
                                    
                                    // Only return evaluator if all required fields are present and not empty
                                    if (!name || !designation || !affiliation || 
                                        name === '' || designation === '' || affiliation === '') {
                                        return null;
                                    }
                                    
                                    return {
                                        name: name,
                                        designation: designation,
                                        affiliation: affiliation
                                    };
                                };

                                // Only include evaluators that actually exist in the database
                                const evaluators = [];
                                
                                // Always include evaluator 1 if it exists
                                const eval1 = parseEvaluator(record.evaluators.examiner1, 'Evaluator1');
                                if (eval1) evaluators.push(eval1);
                                
                                // Only include evaluator 2 if it exists
                                const eval2 = parseEvaluator(record.evaluators.examiner2, 'Evaluator2');
                                if (eval2) evaluators.push(eval2);
                                
                                // Only include evaluator 3 if it exists
                                const eval3 = parseEvaluator(record.evaluators.examiner3, 'Evaluator3');
                                if (eval3) evaluators.push(eval3);

                                existingPanels.set(panelId, {
                                    id: panelId,
                                    evaluators: evaluators
                                });
                            }
                        }
                    });

                    // Set panels from database if they exist
                    if (existingPanels.size > 0) {
                        const panelsArray = Array.from(existingPanels.values()).sort((a, b) => a.id - b.id);
                        setPanels(panelsArray);
                        setActivePanel(panelsArray[0].id);
                        
                        // IMPORTANT: Populate panelScholars state with existing assignments from database
                        const initialPanelScholars = {};
                        panelsArray.forEach(panel => {
                            initialPanelScholars[panel.id] = [];
                        });
                        
                        // Assign scholars to their existing panels based on database data
                        transformedRecords.forEach(record => {
                            if (record.assignedPanel) {
                                const panelId = parseInt(record.assignedPanel);
                                if (initialPanelScholars[panelId]) {
                                    initialPanelScholars[panelId].push({
                                        id: record.id,
                                        name: record.name,
                                        appNo: record.appNo,
                                        marks: record.marks,
                                        average: record.average,
                                        forwarded: record.forwarded,
                                        panel: panelId
                                    });
                                }
                            }
                        });
                        
                        setPanelScholars(initialPanelScholars);
                        
                        console.log(`✅ Loaded ${panelsArray.length} existing panels from database`);
                        console.log(`📋 Panel scholar assignments:`, Object.entries(initialPanelScholars).map(([panelId, scholars]) => 
                            `Panel ${panelId}: ${scholars.length} scholars`
                        ).join(', '));
                    } else {
                        // No existing panels, initialize empty panelScholars
                        setPanelScholars({});
                    }

                    console.log(`✅ Loaded ${transformedRecords.length} examination records for interview`);
                }
            } catch (err) {
                console.error('❌ Exception loading examination records:', err);
                setError('Failed to load examination records');
            } finally {
                setLoading(false);
            }
        };

        loadExaminationRecords();
    }, [currentUser]);

    // Note: Panel data is managed through backend services
    // Data will be saved to Supabase

    const handleRemovePanel = () => {
        if (panels.length <= 1) {
            setMessageBox({ open: true, message: 'The last panel cannot be deleted.' });
            return;
        }
        setRemovePanelModalOpen(true);
    };
    
    const handleConfirmRemovePanel = async () => {
        const removeId = activePanel;
        
        try {
            // Get scholars assigned to this panel
            const scholarsInPanel = panelScholars[removeId] || [];
            
            if (scholarsInPanel.length > 0) {
                // Get the original scholar IDs from the database
                const scholarIds = scholarsInPanel
                    .map(scholar => {
                        const originalRecord = examinationRecords.find(r => r.id === scholar.id);
                        return originalRecord?._originalData?.id || originalRecord?.id;
                    })
                    .filter(Boolean);

                if (scholarIds.length > 0) {
                    console.log(`🔄 Removing Panel ${removeId} with ${scholarIds.length} scholars`);
                    
                    const { removeScholarsFromPanel } = await import('../services/departmentScholarService');
                    const { data, error } = await removeScholarsFromPanel(scholarIds);

                    if (error) {
                        console.error('❌ Error removing panel from database:', error);
                        setMessageBox({ open: true, message: `Failed to remove panel: ${error.message}` });
                        return;
                    }

                    console.log(`✅ Panel ${removeId} removed from database for ${scholarIds.length} scholars`);
                    
                    // Update examination records to reflect the changes
                    setExaminationRecords(prev => prev.map(record => {
                        const updatedRecord = data?.find(d => d.id === (record._originalData?.id || record.id));
                        if (updatedRecord) {
                            return {
                                ...record,
                                assignedPanel: null, // Remove panel assignment
                                evaluators: {
                                    // Use updated evaluator data from database (may be preserved or cleared)
                                    examiner1: updatedRecord.examiner1 || null,
                                    examiner2: updatedRecord.examiner2 || null,
                                    examiner3: updatedRecord.examiner3 || null
                                },
                                _originalData: updatedRecord
                            };
                        }
                        return record;
                    }));
                }
            }

            // Update local panel state and redistribute scholars
            setPanels(prev => {
                const remainingPanels = prev.filter(p => p.id !== removeId);
                const { panels: renumberedPanels, panelScholars: newMap, active: newActive } = renumberPanels(remainingPanels, panelScholars, activePanel);
                
                // After renumbering, redistribute all scholars among remaining panels
                if (renumberedPanels.length > 0) {
                    console.log(`🔄 Redistributing scholars after removing Panel ${removeId}`);
                    
                    // Get all scholars from examination records
                    const allScholars = examinationRecords.map(record => ({
                        id: record.id,
                        name: record.name,
                        appNo: record.appNo,
                        marks: record.marks,
                        average: record.average,
                        forwarded: record.forwarded,
                        assignedPanel: record.assignedPanel,
                        _originalData: record._originalData
                    }));

                    // Separate scholars into fixed and redistributable
                    const fixedScholars = [];
                    const redistributableScholars = [];

                    allScholars.forEach(scholar => {
                        const originalData = scholar._originalData;
                        if (!originalData) {
                            fixedScholars.push(scholar);
                            return;
                        }
                        
                        // Check if ALL examiner marks are null (only then can be redistributed)
                        const allExaminerMarksAreNull = (
                            originalData.examiner1_marks === null &&
                            originalData.examiner2_marks === null &&
                            originalData.examiner3_marks === null
                        );
                        
                        // Check if forwarded in backend
                        const isForwardedInBackend = originalData.faculty_interview && 
                            originalData.faculty_interview.startsWith('Forwarded_To_');
                        
                        if (allExaminerMarksAreNull && !isForwardedInBackend) {
                            redistributableScholars.push(scholar);
                        } else {
                            fixedScholars.push(scholar);
                        }
                    });

                    // Initialize new panel scholars mapping
                    const redistributedPanelScholars = {};
                    renumberedPanels.forEach(panel => {
                        redistributedPanelScholars[panel.id] = [];
                    });

                    // First, place fixed scholars back in their original panels (if panel still exists)
                    fixedScholars.forEach(scholar => {
                        if (scholar.assignedPanel) {
                            const originalPanelId = parseInt(scholar.assignedPanel);
                            // Find the renumbered panel that corresponds to this scholar's original panel
                            const targetPanel = renumberedPanels.find(p => {
                                // Check if this panel existed before renumbering
                                const originalPanel = prev.find(op => op.id === originalPanelId);
                                return originalPanel && p.evaluators === originalPanel.evaluators;
                            });
                            
                            if (targetPanel && redistributedPanelScholars[targetPanel.id] !== undefined) {
                                redistributedPanelScholars[targetPanel.id].push({
                                    id: scholar.id,
                                    name: scholar.name,
                                    appNo: scholar.appNo,
                                    marks: scholar.marks,
                                    average: scholar.average,
                                    forwarded: scholar.forwarded,
                                    panel: targetPanel.id
                                });
                            }
                        }
                    });

                    // Then, redistribute the redistributable scholars to achieve equal TOTAL distribution
                    if (redistributableScholars.length > 0) {
                        // Calculate current panel sizes (including fixed scholars)
                        const currentPanelSizes = renumberedPanels.map(panel => ({
                            id: panel.id,
                            currentCount: redistributedPanelScholars[panel.id].length,
                            evaluators: panel.evaluators
                        }));
                        
                        // Calculate target size per panel for equal TOTAL distribution
                        const totalScholars = allScholars.length;
                        const targetPerPanel = Math.floor(totalScholars / renumberedPanels.length);
                        const remainder = totalScholars % renumberedPanels.length;
                        
                        // Calculate how many redistributable scholars each panel needs
                        const panelNeeds = renumberedPanels.map((panel, index) => {
                            const targetSize = targetPerPanel + (index < remainder ? 1 : 0);
                            const currentSize = currentPanelSizes[index].currentCount;
                            const needsMore = Math.max(0, targetSize - currentSize);
                            
                            return {
                                panelId: panel.id,
                                panel: panel,
                                needsMore: needsMore
                            };
                        });
                        
                        // Distribute redistributable scholars based on panel needs
                        let redistributableIndex = 0;
                        
                        for (const panelNeed of panelNeeds) {
                            if (panelNeed.needsMore > 0 && redistributableIndex < redistributableScholars.length) {
                                const scholarsToAssign = redistributableScholars.slice(
                                    redistributableIndex, 
                                    redistributableIndex + panelNeed.needsMore
                                );
                                
                                // Add to panel scholars mapping
                                scholarsToAssign.forEach(scholar => {
                                    redistributedPanelScholars[panelNeed.panelId].push({
                                        id: scholar.id,
                                        name: scholar.name,
                                        appNo: scholar.appNo,
                                        marks: scholar.marks,
                                        average: scholar.average,
                                        forwarded: scholar.forwarded,
                                        panel: panelNeed.panelId
                                    });
                                });
                                
                                redistributableIndex += scholarsToAssign.length;
                            }
                        }
                    }

                    // Update panel scholars with redistributed mapping
                    setPanelScholars(redistributedPanelScholars);
                    console.log(`✅ Redistributed scholars after removing Panel ${removeId}`);
                } else {
                    setPanelScholars({});
                }
                
                setActivePanel(newActive);
                return renumberedPanels;
            });

            setRemovePanelModalOpen(false);
            setMessageBox({ 
                open: true, 
                message: `Panel ${removeId} removed successfully! Scholars with saved marks kept their evaluator data.` 
            });

        } catch (err) {
            console.error('❌ Exception removing panel:', err);
            setMessageBox({ open: true, message: 'Failed to remove panel' });
        }
    };

    const handleAddPanel = () => {
        setNewPanelEvaluators([
            { name: '', designation: '', affiliation: '' }
        ]);
        setAddPanelModalOpen(true);
    };

    // Automatic redistribution function
    const redistributeScholarsAutomatically = useCallback(async () => {
        if (panels.length === 0 || examinationRecords.length === 0) {
            return;
        }

        try {
            console.log('🔄 Automatic redistribution triggered');
            
            // Get ALL scholars and categorize them for redistribution
            const allScholars = examinationRecords.map(record => ({
                id: record.id,
                name: record.name,
                appNo: record.appNo,
                marks: record.marks,
                average: record.average,
                forwarded: record.forwarded,
                assignedPanel: record.assignedPanel,
                _originalData: record._originalData
            }));

            // Separate scholars into fixed and redistributable
            const fixedScholars = [];
            const redistributableScholars = [];

            allScholars.forEach(scholar => {
                const originalData = scholar._originalData;
                if (!originalData) {
                    fixedScholars.push(scholar);
                    return;
                }
                
                // Check if ALL examiner marks are null (only then can be redistributed)
                const allExaminerMarksAreNull = (
                    originalData.examiner1_marks === null &&
                    originalData.examiner2_marks === null &&
                    originalData.examiner3_marks === null
                );
                
                // Check if forwarded in backend
                const isForwardedInBackend = originalData.faculty_interview && 
                    originalData.faculty_interview.startsWith('Forwarded_To_');
                
                if (allExaminerMarksAreNull && !isForwardedInBackend) {
                    redistributableScholars.push(scholar);
                    console.log(`🔄 Scholar ${scholar.name} can be redistributed (all marks null, not forwarded)`);
                } else {
                    fixedScholars.push(scholar);
                    console.log(`✅ Scholar ${scholar.name} is fixed (has marks: ${!allExaminerMarksAreNull}, forwarded: ${isForwardedInBackend})`);
                }
            });

            console.log(`📊 Automatic redistribution - Total: ${allScholars.length}, Fixed: ${fixedScholars.length}, Redistributable: ${redistributableScholars.length}`);

            // Initialize panel scholars mapping
            const newPanelScholars = {};
            panels.forEach(panel => {
                newPanelScholars[panel.id] = [];
            });

            // First, place fixed scholars back in their original panels
            fixedScholars.forEach(scholar => {
                if (scholar.assignedPanel) {
                    const panelId = parseInt(scholar.assignedPanel);
                    if (newPanelScholars[panelId] !== undefined) {
                        newPanelScholars[panelId].push({
                            id: scholar.id,
                            name: scholar.name,
                            appNo: scholar.appNo,
                            marks: scholar.marks,
                            average: scholar.average,
                            forwarded: scholar.forwarded,
                            panel: panelId
                        });
                        console.log(`✅ Kept fixed scholar ${scholar.name} in Panel ${panelId}`);
                    }
                }
            });

            // Then, redistribute the redistributable scholars to achieve equal TOTAL distribution
            if (redistributableScholars.length > 0) {
                console.log(`🔄 Redistributing ${redistributableScholars.length} scholars among ${panels.length} panels for equal TOTAL distribution`);
                
                // Calculate current panel sizes (including fixed scholars)
                const currentPanelSizes = panels.map(panel => ({
                    id: panel.id,
                    currentCount: newPanelScholars[panel.id].length,
                    evaluators: panel.evaluators
                }));
                
                console.log(`📋 Current panel sizes (fixed scholars only):`, currentPanelSizes.map(p => `Panel ${p.id}: ${p.currentCount} scholars`).join(', '));
                
                // Calculate target size per panel for equal TOTAL distribution
                const totalScholars = allScholars.length;
                const targetPerPanel = Math.floor(totalScholars / panels.length);
                const remainder = totalScholars % panels.length;
                
                console.log(`🎯 Target TOTAL distribution: ${targetPerPanel} scholars per panel, ${remainder} panels get +1 extra`);
                console.log(`📊 Total scholars to distribute: ${totalScholars}`);
                
                // Calculate how many redistributable scholars each panel needs
                const panelNeeds = panels.map((panel, index) => {
                    const targetSize = targetPerPanel + (index < remainder ? 1 : 0);
                    const currentSize = currentPanelSizes[index].currentCount;
                    const needsMore = Math.max(0, targetSize - currentSize);
                    
                    console.log(`🔄 Panel ${panel.id}: current=${currentSize}, target=${targetSize}, needs=${needsMore}`);
                    
                    return {
                        panelId: panel.id,
                        panel: panel,
                        needsMore: needsMore
                    };
                });
                
                // Distribute redistributable scholars based on panel needs
                let redistributableIndex = 0;
                
                for (const panelNeed of panelNeeds) {
                    if (panelNeed.needsMore > 0 && redistributableIndex < redistributableScholars.length) {
                        const scholarsToAssign = redistributableScholars.slice(
                            redistributableIndex, 
                            redistributableIndex + panelNeed.needsMore
                        );
                        
                        console.log(`🔄 Panel ${panelNeed.panelId} gets ${scholarsToAssign.length} redistributable scholars:`, 
                            scholarsToAssign.map(s => s.name));
                        
                        // Add to panel scholars mapping
                        scholarsToAssign.forEach(scholar => {
                            newPanelScholars[panelNeed.panelId].push({
                                id: scholar.id,
                                name: scholar.name,
                                appNo: scholar.appNo,
                                marks: scholar.marks,
                                average: scholar.average,
                                forwarded: scholar.forwarded,
                                panel: panelNeed.panelId
                            });
                        });
                        
                        // Update database for this panel
                        if (scholarsToAssign.length > 0) {
                            try {
                                const scholarIds = scholarsToAssign.map(s => s._originalData?.id || s.id).filter(Boolean);
                                
                                console.log(`🔄 Updating database: Assigning ${scholarIds.length} scholars to Panel ${panelNeed.panelId}`);
                                
                                const { assignScholarsToPanel } = await import('../services/departmentScholarService');
                                const { data, error } = await assignScholarsToPanel(scholarIds, panelNeed.panelId, panelNeed.panel.evaluators);

                                if (error) {
                                    console.error(`❌ Error assigning scholars to Panel ${panelNeed.panelId}:`, error);
                                } else {
                                    console.log(`✅ Successfully assigned ${scholarIds.length} scholars to Panel ${panelNeed.panelId} in database`);
                                }
                            } catch (err) {
                                console.error(`❌ Exception assigning scholars to Panel ${panelNeed.panelId}:`, err);
                            }
                        }
                        
                        redistributableIndex += scholarsToAssign.length;
                    }
                }

                // Update examination records to reflect the new panel assignments
                setExaminationRecords(prev => {
                    console.log('🔄 Updating examination records with new panel assignments...');
                    
                    return prev.map(record => {
                        // Find which panel this scholar was assigned to
                        for (const [panelId, assignedScholars] of Object.entries(newPanelScholars)) {
                            if (assignedScholars.some(s => s.id === record.id)) {
                                const targetPanel = panels.find(p => p.id === parseInt(panelId));
                                if (targetPanel) {
                                    console.log(`🔄 Updating ${record.name} assignment to Panel ${targetPanel.id}`);
                                    
                                    return {
                                        ...record,
                                        assignedPanel: targetPanel.id.toString(),
                                        evaluators: {
                                            examiner1: targetPanel.evaluators[0] ? `${targetPanel.evaluators[0].name} | ${targetPanel.evaluators[0].designation} | ${targetPanel.evaluators[0].affiliation}` : null,
                                            examiner2: targetPanel.evaluators[1] ? `${targetPanel.evaluators[1].name} | ${targetPanel.evaluators[1].designation} | ${targetPanel.evaluators[1].affiliation}` : null,
                                            examiner3: targetPanel.evaluators[2] ? `${targetPanel.evaluators[2].name} | ${targetPanel.evaluators[2].designation} | ${targetPanel.evaluators[2].affiliation}` : null
                                        },
                                        _originalData: {
                                            ...record._originalData,
                                            panel: `Panel ${targetPanel.id}`,
                                            examiner1: targetPanel.evaluators[0] ? `${targetPanel.evaluators[0].name} | ${targetPanel.evaluators[0].designation} | ${targetPanel.evaluators[0].affiliation}` : null,
                                            examiner2: targetPanel.evaluators[1] ? `${targetPanel.evaluators[1].name} | ${targetPanel.evaluators[1].designation} | ${targetPanel.evaluators[1].affiliation}` : null,
                                            examiner3: targetPanel.evaluators[2] ? `${targetPanel.evaluators[2].name} | ${targetPanel.evaluators[2].designation} | ${targetPanel.evaluators[2].affiliation}` : null
                                        }
                                    };
                                }
                            }
                        }
                        return record;
                    });
                });

                console.log(`✅ Automatically redistributed ${redistributableScholars.length} scholars among ${panels.length} panels`);
            }

            // Update panel scholars state
            setPanelScholars(newPanelScholars);
            
            // Log final distribution
            console.log('🔄 Final panel distribution after automatic redistribution:');
            Object.entries(newPanelScholars).forEach(([panelId, scholars]) => {
                const fixedCount = scholars.filter(s => s.forwarded || (s.marks && s.marks.some(mark => mark > 0))).length;
                const redistributableCount = scholars.length - fixedCount;
                console.log(`   Panel ${panelId}: ${scholars.length} total (${fixedCount} fixed + ${redistributableCount} redistributable)`);
            });

        } catch (err) {
            console.error('❌ Exception during automatic redistribution:', err);
        }
    }, [panels, examinationRecords]);

    // Automatic redistribution when panels or examination records change
    useEffect(() => {
        // Add a small delay to ensure all state updates are complete
        const timer = setTimeout(() => {
            redistributeScholarsAutomatically();
        }, 100);
        
        return () => clearTimeout(timer);
    }, [redistributeScholarsAutomatically]);

    // Additional trigger when panels length changes
    useEffect(() => {
        if (panels.length > 0 && examinationRecords.length > 0) {
            console.log('🔄 Panels or records changed, triggering redistribution');
            const timer = setTimeout(() => {
                redistributeScholarsAutomatically();
            }, 200);
            
            return () => clearTimeout(timer);
        }
    }, [panels.length, examinationRecords.length, redistributeScholarsAutomatically]);

    const handleNewEvalChange = (index, field, value) => {
        setNewPanelEvaluators(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
    };

    const handleEditEvalChange = (index, field, value) => {
        setEditPanelEvaluators(prev => prev.map((e, i) => i === index ? { ...e, [field]: value } : e));
    };

    // Add evaluator (max 3)
    const handleAddEvaluator = () => {
        if (newPanelEvaluators.length < 3) {
            setNewPanelEvaluators(prev => [
                ...prev,
                { name: '', designation: '', affiliation: '' }
            ]);
        }
    };

    // Remove evaluator (min 1)
    const handleRemoveEvaluator = (index) => {
        if (newPanelEvaluators.length > 1) {
            setNewPanelEvaluators(prev => prev.filter((_, i) => i !== index));
        }
    };

    // Add evaluator for edit panel (max 3)
    const handleAddEditEvaluator = () => {
        if (editPanelEvaluators.length < 3) {
            setEditPanelEvaluators(prev => [
                ...prev,
                { name: '', designation: '', affiliation: '' }
            ]);
        }
    };

    // Remove evaluator for edit panel (min 1)
    const handleRemoveEditEvaluator = (index) => {
        if (editPanelEvaluators.length > 1) {
            setEditPanelEvaluators(prev => prev.filter((_, i) => i !== index));
        }
    };

    const handleSaveNewPanel = async () => {
        // Validate that all evaluators have complete information
        const invalid = newPanelEvaluators.some(ev => 
            !ev.name || !ev.designation || !ev.affiliation || 
            !ev.name.toString().trim() || !ev.designation.toString().trim() || !ev.affiliation.toString().trim()
        );
        
        if (invalid) {
            setMessageBox({ open: true, message: 'Please fill all evaluator Name, Designation and Affiliation fields before creating a panel.' });
            return;
        }

        // Additional validation: check for placeholder/test data
        const hasPlaceholderData = newPanelEvaluators.some(ev => {
            const name = ev.name.toString().trim().toLowerCase();
            const designation = ev.designation.toString().trim().toLowerCase();
            const affiliation = ev.affiliation.toString().trim().toLowerCase();
            
            // Check for common placeholder patterns
            return name.includes('test') || name.includes('placeholder') ||
                   designation.includes('test') || designation.includes('placeholder') ||
                   affiliation.includes('test') || affiliation.includes('placeholder') ||
                   name.length < 2 || designation.length < 2 || affiliation.length < 2;
        });
        
        if (hasPlaceholderData) {
            setMessageBox({ open: true, message: 'Please enter real evaluator information. Avoid placeholder or test data.' });
            return;
        }

        try {
            const nextId = (panels.length > 0 ? Math.max(...panels.map(p => p.id)) : 0) + 1;
            
            console.log(`🔍 Creating Panel ${nextId} - Current examination records:`, examinationRecords.length);
            console.log(`🔍 Current panel scholars:`, panelScholars);
            
            // Create new panel object first
            const newPanel = { id: nextId, evaluators: [...newPanelEvaluators] };
            
            // Update panels state
            setPanels(prev => [...prev, newPanel]);

            // Get ALL scholars and categorize them for redistribution
            const allScholars = examinationRecords.map(record => ({
                id: record.id,
                name: record.name,
                appNo: record.appNo,
                marks: record.marks,
                average: record.average,
                forwarded: record.forwarded,
                assignedPanel: record.assignedPanel,
                _originalData: record._originalData
            }));

            // Separate scholars into fixed and redistributable
            const fixedScholars = [];
            const redistributableScholars = [];

            allScholars.forEach(scholar => {
                const originalData = scholar._originalData;
                if (!originalData) {
                    fixedScholars.push(scholar);
                    return;
                }
                
                // Check if ALL examiner marks are null (only then can be redistributed)
                const allExaminerMarksAreNull = (
                    originalData.examiner1_marks === null &&
                    originalData.examiner2_marks === null &&
                    originalData.examiner3_marks === null
                );
                
                // Check if forwarded in backend
                const isForwardedInBackend = originalData.faculty_interview && 
                    originalData.faculty_interview.startsWith('Forwarded_To_');
                
                if (allExaminerMarksAreNull && !isForwardedInBackend) {
                    redistributableScholars.push(scholar);
                    console.log(`🔄 Scholar ${scholar.name} can be redistributed (all marks null, not forwarded)`);
                } else {
                    fixedScholars.push(scholar);
                    console.log(`✅ Scholar ${scholar.name} is fixed (has marks: ${!allExaminerMarksAreNull}, forwarded: ${isForwardedInBackend})`);
                }
            });

            console.log(`📊 Total scholars: ${allScholars.length}`);
            console.log(`📊 Fixed scholars: ${fixedScholars.length}`);
            console.log(`📊 Redistributable scholars: ${redistributableScholars.length}`);

            // Get all panels (including the new one)
            const allPanels = [...panels, newPanel];
            
            // Initialize panel scholars mapping
            const newPanelScholars = {};
            allPanels.forEach(panel => {
                newPanelScholars[panel.id] = [];
            });

            // First, place fixed scholars back in their original panels
            fixedScholars.forEach(scholar => {
                if (scholar.assignedPanel) {
                    const panelId = parseInt(scholar.assignedPanel);
                    if (newPanelScholars[panelId] !== undefined) {
                        newPanelScholars[panelId].push({
                            id: scholar.id,
                            name: scholar.name,
                            appNo: scholar.appNo,
                            marks: scholar.marks,
                            average: scholar.average,
                            forwarded: scholar.forwarded,
                            panel: panelId
                        });
                        console.log(`✅ Kept fixed scholar ${scholar.name} in Panel ${panelId}`);
                    }
                }
            });

            // Then, redistribute the redistributable scholars to achieve equal TOTAL distribution
            if (redistributableScholars.length > 0) {
                console.log(`🔄 Redistributing ${redistributableScholars.length} scholars among ${allPanels.length} panels for equal TOTAL distribution`);
                
                // Calculate current panel sizes (including fixed scholars)
                const currentPanelSizes = allPanels.map(panel => ({
                    id: panel.id,
                    currentCount: newPanelScholars[panel.id].length, // Fixed scholars already placed
                    evaluators: panel.evaluators
                }));
                
                console.log(`📋 Current panel sizes (fixed scholars only):`, currentPanelSizes.map(p => `Panel ${p.id}: ${p.currentCount} scholars`).join(', '));
                
                // Calculate target size per panel for equal TOTAL distribution
                const totalScholars = allScholars.length;
                const targetPerPanel = Math.floor(totalScholars / allPanels.length);
                const remainder = totalScholars % allPanels.length;
                
                console.log(`🎯 Target TOTAL distribution: ${targetPerPanel} scholars per panel, ${remainder} panels get +1 extra`);
                console.log(`📊 Total scholars to distribute: ${totalScholars}`);
                
                // Calculate how many redistributable scholars each panel needs
                const panelNeeds = allPanels.map((panel, index) => {
                    const targetSize = targetPerPanel + (index < remainder ? 1 : 0);
                    const currentSize = currentPanelSizes[index].currentCount;
                    const needsMore = Math.max(0, targetSize - currentSize); // Can't be negative
                    
                    console.log(`🔄 Panel ${panel.id}: current=${currentSize}, target=${targetSize}, needs=${needsMore}`);
                    
                    return {
                        panelId: panel.id,
                        panel: panel,
                        currentSize: currentSize,
                        targetSize: targetSize,
                        needsMore: needsMore
                    };
                });
                
                // Distribute redistributable scholars based on panel needs
                let redistributableIndex = 0;
                
                for (const panelNeed of panelNeeds) {
                    if (panelNeed.needsMore > 0 && redistributableIndex < redistributableScholars.length) {
                        const scholarsToAssign = redistributableScholars.slice(
                            redistributableIndex, 
                            redistributableIndex + panelNeed.needsMore
                        );
                        
                        console.log(`🔄 Panel ${panelNeed.panelId} gets ${scholarsToAssign.length} redistributable scholars:`, 
                            scholarsToAssign.map(s => s.name));
                        
                        // Add to panel scholars mapping
                        scholarsToAssign.forEach(scholar => {
                            newPanelScholars[panelNeed.panelId].push({
                                id: scholar.id,
                                name: scholar.name,
                                appNo: scholar.appNo,
                                marks: scholar.marks,
                                average: scholar.average,
                                forwarded: scholar.forwarded,
                                panel: panelNeed.panelId
                            });
                        });
                        
                        // Update database for this panel
                        if (scholarsToAssign.length > 0) {
                            try {
                                const scholarIds = scholarsToAssign.map(s => s._originalData?.id || s.id).filter(Boolean);
                                
                                console.log(`🔄 Updating database: Assigning ${scholarIds.length} scholars to Panel ${panelNeed.panelId}`);
                                
                                const { assignScholarsToPanel } = await import('../services/departmentScholarService');
                                const { data, error } = await assignScholarsToPanel(scholarIds, panelNeed.panelId, panelNeed.panel.evaluators);

                                if (error) {
                                    console.error(`❌ Error assigning scholars to Panel ${panelNeed.panelId}:`, error);
                                    setMessageBox({ open: true, message: `Failed to assign scholars to Panel ${panelNeed.panelId}: ${error.message}` });
                                    return;
                                } else {
                                    console.log(`✅ Successfully assigned ${scholarIds.length} scholars to Panel ${panelNeed.panelId} in database`);
                                }
                            } catch (err) {
                                console.error(`❌ Exception assigning scholars to Panel ${panelNeed.panelId}:`, err);
                                setMessageBox({ open: true, message: `Failed to assign scholars to Panel ${panelNeed.panelId}` });
                                return;
                            }
                        }
                        
                        redistributableIndex += scholarsToAssign.length;
                    }
                }

                // Update examination records to reflect the new panel assignments
                setExaminationRecords(prev => {
                    console.log('🔄 Updating examination records with new panel assignments...');
                    
                    return prev.map(record => {
                        // Find which panel this scholar was assigned to
                        for (const [panelId, assignedScholars] of Object.entries(newPanelScholars)) {
                            if (assignedScholars.some(s => s.id === record.id)) {
                                const targetPanel = allPanels.find(p => p.id === parseInt(panelId));
                                if (targetPanel) {
                                    console.log(`🔄 Updating ${record.name} assignment to Panel ${targetPanel.id}`);
                                    
                                    return {
                                        ...record,
                                        assignedPanel: targetPanel.id.toString(),
                                        evaluators: {
                                            examiner1: targetPanel.evaluators[0] ? `${targetPanel.evaluators[0].name} | ${targetPanel.evaluators[0].designation} | ${targetPanel.evaluators[0].affiliation}` : null,
                                            examiner2: targetPanel.evaluators[1] ? `${targetPanel.evaluators[1].name} | ${targetPanel.evaluators[1].designation} | ${targetPanel.evaluators[1].affiliation}` : null,
                                            examiner3: targetPanel.evaluators[2] ? `${targetPanel.evaluators[2].name} | ${targetPanel.evaluators[2].designation} | ${targetPanel.evaluators[2].affiliation}` : null
                                        },
                                        _originalData: {
                                            ...record._originalData,
                                            panel: `Panel ${targetPanel.id}`,
                                            examiner1: targetPanel.evaluators[0] ? `${targetPanel.evaluators[0].name} | ${targetPanel.evaluators[0].designation} | ${targetPanel.evaluators[0].affiliation}` : null,
                                            examiner2: targetPanel.evaluators[1] ? `${targetPanel.evaluators[1].name} | ${targetPanel.evaluators[1].designation} | ${targetPanel.evaluators[1].affiliation}` : null,
                                            examiner3: targetPanel.evaluators[2] ? `${targetPanel.evaluators[2].name} | ${targetPanel.evaluators[2].designation} | ${targetPanel.evaluators[2].affiliation}` : null
                                        }
                                    };
                                }
                            }
                        }
                        return record;
                    });
                });

                console.log(`✅ Redistributed ${redistributableScholars.length} scholars among ${allPanels.length} panels`);
            } else {
                console.log(`⚠️ No redistributable scholars found. Panel ${nextId} created empty.`);
            }

            // Update panel scholars state
            setPanelScholars(newPanelScholars);
            
            // Log final distribution
            console.log('🔄 Final panel distribution:');
            Object.entries(newPanelScholars).forEach(([panelId, scholars]) => {
                console.log(`   Panel ${panelId}: ${scholars.length} scholars (${scholars.map(s => s.name).join(', ')})`);
            });
            
            // Set active panel
            setActivePanel(nextId);

            // Close modal and show success message
            setAddPanelModalOpen(false);
            setMessageBox({ open: true, message: `Panel ${nextId} created successfully with evaluator details saved to database!` });

        } catch (err) {
            console.error('❌ Exception creating panel:', err);
            setMessageBox({ open: true, message: 'Failed to create panel' });
        }
    };

    const handleEditPanel = () => {
        const currentPanel = panels.find(p => p.id === activePanel);
        if (currentPanel && currentPanel.evaluators) {
            // Load current evaluators into edit state
            setEditPanelEvaluators([...currentPanel.evaluators]);
            setEditPanelModalOpen(true);
        }
    };

    const handleSaveEditPanel = async () => {
        // Validate that all evaluators have complete information
        const invalid = editPanelEvaluators.some(ev => 
            !ev.name || !ev.designation || !ev.affiliation || 
            !ev.name.toString().trim() || !ev.designation.toString().trim() || !ev.affiliation.toString().trim()
        );
        
        if (invalid) {
            setMessageBox({ open: true, message: 'Please fill all evaluator Name, Designation and Affiliation fields before saving.' });
            return;
        }

        // Additional validation: check for placeholder/test data
        const hasPlaceholderData = editPanelEvaluators.some(ev => {
            const name = ev.name.toString().trim().toLowerCase();
            const designation = ev.designation.toString().trim().toLowerCase();
            const affiliation = ev.affiliation.toString().trim().toLowerCase();
            
            // Check for common placeholder patterns
            return name.includes('test') || name.includes('placeholder') ||
                   designation.includes('test') || designation.includes('placeholder') ||
                   affiliation.includes('test') || affiliation.includes('placeholder') ||
                   name.length < 2 || designation.length < 2 || affiliation.length < 2;
        });
        
        if (hasPlaceholderData) {
            setMessageBox({ open: true, message: 'Please enter real evaluator information. Avoid placeholder or test data.' });
            return;
        }

        try {
            // Get scholars assigned to this panel
            const scholarsInPanel = panelScholars[activePanel] || [];
            
            if (scholarsInPanel.length > 0) {
                // Get the original scholar IDs from the database
                const scholarIds = scholarsInPanel
                    .map(scholar => {
                        const originalRecord = examinationRecords.find(r => r.id === scholar.id);
                        return originalRecord?._originalData?.id || originalRecord?.id;
                    })
                    .filter(Boolean);

                if (scholarIds.length > 0) {
                    console.log(`🔄 Updating Panel ${activePanel} evaluators for ${scholarIds.length} scholars`);
                    
                    const { assignScholarsToPanel } = await import('../services/departmentScholarService');
                    const { data, error } = await assignScholarsToPanel(scholarIds, activePanel, editPanelEvaluators);

                    if (error) {
                        console.error('❌ Error updating panel evaluators in database:', error);
                        setMessageBox({ open: true, message: `Failed to update panel: ${error.message}` });
                        return;
                    }

                    console.log(`✅ Panel ${activePanel} evaluators updated in database`);
                    
                    // Update examination records to reflect the changes
                    setExaminationRecords(prev => prev.map(record => {
                        const updatedRecord = data?.find(d => d.id === (record._originalData?.id || record.id));
                        if (updatedRecord) {
                            return {
                                ...record,
                                evaluators: {
                                    examiner1: updatedRecord.examiner1 || null,
                                    examiner2: updatedRecord.examiner2 || null,
                                    examiner3: updatedRecord.examiner3 || null
                                },
                                _originalData: updatedRecord
                            };
                        }
                        return record;
                    }));
                }
            }

            // Update local panel state
            setPanels(prev => prev.map(panel => 
                panel.id === activePanel 
                    ? { ...panel, evaluators: [...editPanelEvaluators] }
                    : panel
            ));

            setEditPanelModalOpen(false);
            setMessageBox({ 
                open: true, 
                message: `Panel ${activePanel} evaluators updated successfully!` 
            });

        } catch (err) {
            console.error('❌ Exception updating panel:', err);
            setMessageBox({ open: true, message: 'Failed to update panel' });
        }
    };

    const renumberPanels = (rawPanels, rawPanelScholars, oldActive) => {
        const newPanels = rawPanels.map((p, i) => ({ ...p, id: i + 1 }));
        const newMap = {};
        for (let i = 0; i < rawPanels.length; i++) {
            const oldId = rawPanels[i].id;
            const newId = i + 1;
            const arr = Array.isArray(rawPanelScholars[oldId]) ? rawPanelScholars[oldId].map(v => ({ ...v, panel: newId })) : [];
            newMap[newId] = arr;
        }
        for (let i = 0; i < newPanels.length; i++) {
            if (!Array.isArray(newMap[i + 1])) newMap[i + 1] = [];
        }
        
        let newActive = null; 
        if (newPanels.length > 0) {
            const oldActiveIndex = rawPanels.findIndex(p => p.id === oldActive);
            if (oldActiveIndex !== -1) {
                 newActive = oldActiveIndex > 0 ? oldActiveIndex : 1;
            } else {
                 newActive = 1;
            }
        }
        return { panels: newPanels, panelScholars: newMap, active: newActive };
    };

    const handleEdit = (interview) => {
        setEditingId(interview.id);
        // Load marks as they are, but convert 0 to empty string for better UX
        setEditMarks(interview.marks.map(m => {
            if (m === null || m === undefined) return '';
            if (m === 0 || m === '0') return ''; // Clear zeros for better input experience
            return m; // Keep original value (string or number)
        }));
    };

    const handleSave = async (id) => {
        try {
            console.log('🔄 handleSave called for scholar ID:', id);
            console.log('🔄 Current editMarks:', editMarks);
            
            // Find the examination record to get the original ID
            const record = examinationRecords.find(r => r.id === id);
            if (!record) {
                console.error('❌ Examination record not found for ID:', id);
                setMessageBox({ open: true, message: 'Examination record not found' });
                return;
            }

            // Get the actual database ID - use _originalData.id if available, otherwise use the record.id
            const databaseId = record._originalData?.id || record.id;
            console.log('🔄 Database ID to update:', databaseId);

            // Get current panel info to determine number of evaluators
            const currentPanel = panels.find(p => p.id === activePanel);
            const numEvaluators = currentPanel ? currentPanel.evaluators.length : 1;
            console.log('🔄 Number of evaluators:', numEvaluators);

            // Prepare updates for examination_records table - handle alphanumeric input
            const marks = editMarks.slice(0, numEvaluators).map(m => {
                if (m === '' || m === null || m === undefined) return 0;
                // If it's any variation of absent (limited to 2 chars), standardize to "Ab"
                if (typeof m === 'string') {
                    const lowerM = m.toLowerCase().trim();
                    if (lowerM === 'a' || lowerM === 'ab') {
                        return 'Ab'; // Standardize to "Ab"
                    }
                }
                // If it's numeric (including string numbers), convert to integer and validate range
                if (!isNaN(Number(m))) {
                    let num = Math.round(parseFloat(m));
                    if (num < 0) num = 0;
                    if (num > 30) num = 30; // Max mark cap
                    return num;
                }
                // For any other string, keep as is
                return m;
            });
            
            console.log('🔄 Processed marks:', marks);
            
            const averageMarks = calcAverage(marks, numEvaluators);
            console.log('🔄 Calculated average:', averageMarks);
            
            // Only update the evaluator columns that are actually used
            const updates = {
                examiner1_marks: numEvaluators >= 1 ? (marks[0] || 0) : null,  // Only if 1+ evaluators
                examiner2_marks: numEvaluators >= 2 ? (marks[1] || 0) : null,  // Only if 2+ evaluators
                examiner3_marks: numEvaluators >= 3 ? (marks[2] || 0) : null,  // Only if 3 evaluators
                interview_marks: averageMarks // Save average as integer or "Ab" for all absent
            };

            console.log(`🔄 Auto-saving interview marks to examiner columns:`, updates);

            // Save to examination_records table with retry logic
            const { updateExaminationRecord } = await import('../services/departmentScholarService');
            
            let saveAttempts = 0;
            const maxAttempts = 3;
            let saveResult = null;
            
            while (saveAttempts < maxAttempts) {
                saveAttempts++;
                console.log(`🔄 Save attempt ${saveAttempts}/${maxAttempts} for scholar ${databaseId}`);
                
                try {
                    saveResult = await updateExaminationRecord(databaseId, updates);
                    
                    if (saveResult.error) {
                        console.error(`❌ Save attempt ${saveAttempts} failed:`, saveResult.error);
                        
                        // If it's a network error, retry
                        if (saveResult.error.message?.includes('fetch') || 
                            saveResult.error.message?.includes('network') ||
                            saveResult.error.message?.includes('Failed to fetch')) {
                            
                            if (saveAttempts < maxAttempts) {
                                console.log(`🔄 Network error detected, retrying in ${saveAttempts}s...`);
                                await new Promise(resolve => setTimeout(resolve, saveAttempts * 1000));
                                continue;
                            }
                        }
                        
                        // If it's not a network error or we've exhausted retries, break
                        break;
                    } else {
                        // Success!
                        console.log(`✅ Save successful on attempt ${saveAttempts}`);
                        break;
                    }
                } catch (err) {
                    console.error(`❌ Exception on save attempt ${saveAttempts}:`, err);
                    saveResult = { data: null, error: err };
                    
                    // If it's a network error, retry
                    if (err.message?.includes('fetch') || 
                        err.message?.includes('network') ||
                        err.message?.includes('Failed to fetch')) {
                        
                        if (saveAttempts < maxAttempts) {
                            console.log(`🔄 Network exception detected, retrying in ${saveAttempts}s...`);
                            await new Promise(resolve => setTimeout(resolve, saveAttempts * 1000));
                            continue;
                        }
                    }
                    
                    break;
                }
            }

            if (saveResult.error) {
                console.error('❌ Error saving marks to examination_records after all attempts:', saveResult.error);
                console.error('❌ Full error details:', saveResult.error);
                console.error('❌ Database ID that failed:', databaseId);
                console.error('❌ Updates that failed:', updates);
                
                // Show user-friendly error message
                const errorMessage = saveResult.error.message?.includes('fetch') || 
                                   saveResult.error.message?.includes('network') ||
                                   saveResult.error.message?.includes('Failed to fetch')
                    ? 'Network connection issue. Please check your internet connection and try again.'
                    : `Failed to save marks: ${saveResult.error.message || saveResult.error}`;
                
                setMessageBox({ open: true, message: errorMessage });
                return;
            }

            // Update local state with correct number of evaluators (reuse existing variables)
            setPanelScholars(prev => ({
                ...prev,
                [activePanel]: prev[activePanel].map(v =>
                    v.id === id ? { ...v, marks: marks, average: calcAverage(marks, numEvaluators) } : v
                )
            }));

            // Update examination records state
            setExaminationRecords(prev => 
                prev.map(r => 
                    r.id === id ? { ...r, marks: marks, average: calcAverage(marks, numEvaluators) } : r
                )
            );

            // Exit edit mode after successful save
            setEditingId(null);
            setEditMarks([0, 0, 0]);

            console.log('✅ Interview marks auto-saved successfully and edit mode closed');

        } catch (err) {
            console.error('❌ Exception auto-saving marks:', err);
            setMessageBox({ open: true, message: 'Failed to auto-save marks' });
        }
    };

    // Auto-save function with debounce
    const autoSaveMarks = useCallback((id, immediate = false) => {
        // Clear existing timeout
        if (autoSaveTimeout) {
            clearTimeout(autoSaveTimeout);
        }
        
        // If immediate save requested (like from Enter key), save right away
        if (immediate) {
            handleSave(id);
            return;
        }

        // Set new timeout for auto-save (3 seconds after user stops typing - increased from 2 seconds)
        const timeoutId = setTimeout(() => {
            handleSave(id);
        }, 3000);

        setAutoSaveTimeout(timeoutId);
    }, [autoSaveTimeout, editMarks, activePanel, panels]);

    // Clean up timeout on component unmount
    useEffect(() => {
        return () => {
            if (autoSaveTimeout) {
                clearTimeout(autoSaveTimeout);
            }
        };
    }, [autoSaveTimeout]);

    // Modified: Handles alphanumeric input including "Ab" for A but does NOT trigger auto-save
    const handleMarkChange = (idx, val) => {
        if (val === '') {
            setEditMarks(m => m.map((x, i) => (i === idx ? '' : x)));
            // No auto-save - only save on Enter or blur
            return;
        }
        
        // For text input, limit to maximum 2 characters
        if (isNaN(Number(val))) {
            if (val.length > 2) {
                return; // Don't allow more than 2 characters for text
            }
            
            // Allow any variation of absent: "A", "Ab", "ab", "a"
            const lowerVal = val.toLowerCase().trim();
            if (lowerVal === 'a' || lowerVal === 'ab') {
                setEditMarks(m => m.map((x, i) => (i === idx ? 'Ab' : x)));
                // No auto-save - only save on Enter or blur
                return;
            }
            
            // For any other text input up to 2 characters
            setEditMarks(m => m.map((x, i) => (i === idx ? val : x)));
            // No auto-save - only save on Enter or blur
            return;
        }
        
        // For numeric input, allow multi-digit numbers and validate range
        const numVal = Number(val);
        if (!isNaN(numVal)) {
            // Allow the input as string first, then validate on save
            if (val.length <= 2) { // Max 2 digits (0-30)
                setEditMarks(m => m.map((x, i) => (i === idx ? val : x)));
                // No auto-save - only save on Enter or blur
            }
            return;
        }
        
        // For any other alphanumeric input, allow it (but limit to 2 characters)
        if (val.length <= 2) { // Limit text input to 2 characters max
            setEditMarks(m => m.map((x, i) => (i === idx ? val : x)));
            // No auto-save - only save on Enter or blur
        }
    };

    // INPUT HANDLER - Enhanced to handle Enter key reliably across different keyboards
    const preventNonAlphanumericInput = (e) => {
        // Handle Enter key for immediate save - multiple detection methods
        if ((e.key === 'Enter' || e.keyCode === 13 || e.which === 13) && editingId) {
            e.preventDefault();
            e.stopPropagation();
            
            console.log('🔄 Enter key detected - triggering immediate save for scholar:', editingId);
            console.log('🔄 Key details:', { key: e.key, keyCode: e.keyCode, which: e.which });
            console.log('🔄 Current marks to save:', editMarks);
            
            // Clear any pending auto-save timeout
            if (autoSaveTimeout) {
                clearTimeout(autoSaveTimeout);
                setAutoSaveTimeout(null);
            }
            
            // Trigger immediate save with a small delay to ensure the input value is captured
            setTimeout(() => {
                handleSave(editingId);
            }, 50);
            return false; // Prevent any further processing
        }

        // Allowed keys: Backspace, Tab, Escape, Arrow keys, Delete
        const allowedKeys = ['Backspace', 'Tab', 'Escape', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Delete'];
        
        // If it's a control key combination (Ctrl+A, Ctrl+C etc), allow it
        if (e.ctrlKey || e.metaKey) {
            return;
        }

        // If it's one of the allowed navigation/editing keys, allow it
        if (allowedKeys.includes(e.key)) {
            return;
        }

        // Allow alphanumeric characters (letters and numbers)
        if (/^[a-zA-Z0-9]$/.test(e.key)) {
            return;
        }

        // Block all other characters
        e.preventDefault();
    };

    const handleForward = (id) => {
        setConsentChecked(false);
        setForwardModal({ open: true, id });
    };
    const handleConfirmForward = async () => {
        if (!consentChecked) return;
        
        try {
            // Find the scholar record to get the original database ID
            const scholar = (panelScholars[activePanel] || []).find(v => v.id === forwardModal.id);
            if (!scholar) {
                setMessageBox({ open: true, message: 'Scholar not found' });
                return;
            }

            const originalRecord = examinationRecords.find(r => r.id === scholar.id);
            const originalScholarId = originalRecord?._originalData?.id || originalRecord?.id;

            if (!originalScholarId) {
                setMessageBox({ open: true, message: 'Scholar database ID not found' });
                return;
            }

            // Update database - set faculty_interview with faculty-specific status
            const { forwardScholarInterview } = await import('../services/departmentScholarService');
            const { data, error } = await forwardScholarInterview(
                originalScholarId, 
                currentUser?.department, 
                currentUser?.faculty || 'Faculty of Engineering & Technology'
            );

            if (error) {
                console.error('❌ Error forwarding scholar interview:', error);
                setMessageBox({ open: true, message: `Failed to forward interview: ${error.message}` });
                return;
            }

            // Update local state
            setPanelScholars(prev => ({
                ...prev,
                [activePanel]: prev[activePanel].map(v =>
                    v.id === forwardModal.id ? { ...v, forwarded: true } : v
                )
            }));

            // Determine faculty-specific forwarded status based on department
            const facultyInterviewStatus = getFacultyInterviewStatus(
                currentUser?.department, 
                currentUser?.faculty || 'Faculty of Engineering & Technology'
            );

            // Update examination records state
            setExaminationRecords(prev => 
                prev.map(r => 
                    r.id === forwardModal.id ? { ...r, forwarded: true, _originalData: { ...r._originalData, faculty_interview: facultyInterviewStatus } } : r
                )
            );

            setForwardModal({ open: false, id: null });
            setConsentChecked(false);
            setMessageBox({ open: true, message: 'Interview record forwarded successfully. Scholar can no longer be edited.' });

        } catch (err) {
            console.error('❌ Exception forwarding scholar interview:', err);
            setMessageBox({ open: true, message: 'Failed to forward interview' });
        }
    };
    const handleForwardAllClick = (e) => {
        e.preventDefault();
        const list = (panelScholars[activePanel] || []);
        const hasUnforwarded = list.some(v => !v.forwarded);
        if (!hasUnforwarded) {
            setMessageBox({ open: true, message: 'There are no scholars to forward in this panel.' });
            return;
        }
        setForwardAllModal(true);
        setConsentAllChecked(false);
    };
    const handleConfirmForwardAll = async () => {
        if (!consentAllChecked) return;
        
        try {
            const scholarsInPanel = panelScholars[activePanel] || [];
            const unforwardedScholars = scholarsInPanel.filter(v => !v.forwarded);
            
            if (unforwardedScholars.length === 0) {
                setMessageBox({ open: true, message: 'No scholars to forward in this panel.' });
                return;
            }

            // Get original database IDs for all unforwarded scholars
            const scholarIds = unforwardedScholars
                .map(scholar => {
                    const originalRecord = examinationRecords.find(r => r.id === scholar.id);
                    return originalRecord?._originalData?.id || originalRecord?.id;
                })
                .filter(Boolean);

            if (scholarIds.length === 0) {
                setMessageBox({ open: true, message: 'No valid scholar IDs found for forwarding.' });
                return;
            }

            // Update database - set faculty_interview with faculty-specific status for all scholars
            const { forwardMultipleScholarInterviews } = await import('../services/departmentScholarService');
            const { data, error } = await forwardMultipleScholarInterviews(
                scholarIds, 
                currentUser?.department, 
                currentUser?.faculty || 'Faculty of Engineering & Technology'
            );

            if (error) {
                console.error('❌ Error forwarding scholar interviews:', error);
                setMessageBox({ open: true, message: `Failed to forward interviews: ${error.message}` });
                return;
            }

            // Update local state
            setPanelScholars(prev => ({
                ...prev,
                [activePanel]: prev[activePanel].map(v => ({ ...v, forwarded: true }))
            }));

            // Determine faculty-specific forwarded status based on department
            const facultyInterviewStatus = getFacultyInterviewStatus(
                currentUser?.department, 
                currentUser?.faculty || 'Faculty of Engineering & Technology'
            );

            // Update examination records state
            setExaminationRecords(prev => 
                prev.map(r => {
                    const shouldUpdate = unforwardedScholars.some(scholar => scholar.id === r.id);
                    return shouldUpdate 
                        ? { ...r, forwarded: true, _originalData: { ...r._originalData, faculty_interview: facultyInterviewStatus } }
                        : r;
                })
            );

            setForwardAllModal(false);
            setConsentAllChecked(false);
            setMessageBox({ open: true, message: `All ${unforwardedScholars.length} interview records forwarded successfully. Scholars can no longer be edited.` });

        } catch (err) {
            console.error('❌ Exception forwarding scholar interviews:', err);
            setMessageBox({ open: true, message: 'Failed to forward interviews' });
        }
    };
    const handleDownloadExcel = () => {
        const workbook = XLSX.utils.book_new();
        const panelOrder = panels.map(p => p.id);
        const cumulativeCounts = {};
        let running = 0;
        for (const pid of panelOrder) {
            cumulativeCounts[pid] = running;
            running += (panelScholars[pid] || []).length;
        }

        for (const pid of panelOrder) {
            const evalNames = (panels.find(p => p.id === pid)?.evaluators || []).map(e => e.name || '');
            const header = ['S.No', 'Name', 'Application No.', ...evalNames, 'Average'];
            const rows = (panelScholars[pid] || []).map((v, idx) => {
                const globalIndex = cumulativeCounts[pid] + idx + 1;
                // Format marks as float with 2 decimal places for Excel
                const formattedMarks = v.marks.map(mark => parseFloat(mark).toFixed(2));
                const formattedAverage = parseFloat(calcAverage(v.marks, panels.find(p => p.id === pid)?.evaluators.length || 1)).toFixed(2);
                return [globalIndex, v.name, v.appNo, ...formattedMarks, formattedAverage];
            });
            const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
            const sheetName = `Panel ${pid}`.substring(0, 31);
            XLSX.utils.book_append_sheet(workbook, ws, sheetName);
        }
        XLSX.writeFile(workbook, `interview-marks-all-panels-${new Date().toISOString().split('T')[0]}.xlsx`);
    };
    const handleOpenFilter = () => setFilterModalOpen(true);
    const handleCloseFilter = () => setFilterModalOpen(false);
    const handleApplyFilter = () => {
        setFilterModalOpen(false);
    };

    const filteredInterview = (panelScholars[activePanel] || []).filter(v => {
        // Name filter
        const nameMatch = !filterName || v.name.toLowerCase().includes(filterName.toLowerCase());
        
        // Application number filter
        const appNoMatch = !filterAppNo || v.appNo.toLowerCase().includes(filterAppNo.toLowerCase());
        
        // Status filter
        let statusMatch = true;
        if (filterStatus !== 'All') {
            if (filterStatus === 'Forwarded') {
                statusMatch = v.forwarded === true;
            } else if (filterStatus === 'Pending') {
                // Pending: not forwarded and no marks saved (all marks are 0 or empty)
                statusMatch = !v.forwarded && (!v.marks || v.marks.every(m => m === 0 || m === '' || m === null));
            } else if (filterStatus === 'Saved') {
                // Saved: not forwarded but has some marks saved (at least one mark > 0 or "Ab")
                statusMatch = !v.forwarded && v.marks && v.marks.some(m => (typeof m === 'number' && m > 0) || m === 'Ab');
            }
        }
        
        return nameMatch && appNoMatch && statusMatch;
    });

    // DISABLED: This useEffect was causing redistribution conflicts with the panel creation logic
    // The redistribution is now handled directly in handleSaveNewPanel function
    /*
    useEffect(() => {
        const updatePanelDistribution = async () => {
            if (panels.length > 0) {
                // Get all scholars from all panels
                const all = panels.flatMap(p => panelScholars[p.id] || []);
                const total = all.length;
                const n = panels.length;
                if (n === 0) return;
                if (total === 0) {
                    const emptyMap = {};
                    panels.forEach(p => { emptyMap[p.id] = []; });
                    setPanelScholars(emptyMap);
                    return;
                }

                // Separate scholars into two groups:
                // 1. Fixed scholars: forwarded scholars OR scholars with saved marks that should stay in their current panels
                // 2. Redistributable scholars: scholars without any data that can be moved between panels
                const fixedScholars = [];
                const redistributableScholars = [];

                all.forEach(scholar => {
                    // Check if scholar has saved data or is forwarded
                    const hasMarks = scholar.marks && scholar.marks.some(mark => mark > 0);
                    const isForwarded = scholar.forwarded;

                    if (hasMarks || isForwarded) {
                        // Keep scholars with marks or forwarded status in their current panel
                        fixedScholars.push(scholar);
                    } else {
                        // Scholars without data can be redistributed
                        redistributableScholars.push(scholar);
                    }
                });

                console.log(`📊 Panel distribution: ${fixedScholars.length} fixed scholars (forwarded or with saved marks), ${redistributableScholars.length} redistributable scholars`);

                // Initialize new panel mapping
                const newMap = {};
                panels.forEach(p => { newMap[p.id] = []; });

                // First, place all fixed scholars back in their original panels
                fixedScholars.forEach(scholar => {
                    // Find which panel this scholar was in
                    for (const panel of panels) {
                        const existingScholars = panelScholars[panel.id] || [];
                        if (existingScholars.some(s => s.id === scholar.id)) {
                            newMap[panel.id].push(scholar);
                            break;
                        }
                    }
                });

                // Then, redistribute the scholars without data equally among all panels
                if (redistributableScholars.length > 0) {
                    const base = Math.floor(redistributableScholars.length / n);
                    let rem = redistributableScholars.length % n;
                    let offset = 0;

                    for (let i = 0; i < n; i++) {
                        const size = base + (rem > 0 ? 1 : 0);
                        if (rem > 0) rem -= 1;
                        
                        const scholarsToAdd = redistributableScholars.slice(offset, offset + size);
                        newMap[panels[i].id] = [...newMap[panels[i].id], ...scholarsToAdd];
                        
                        offset += size;
                    }
                }

                // Update database for each panel
                for (let i = 0; i < panels.length; i++) {
                    const panelScholarsForThisPanel = newMap[panels[i].id];
                    
                    if (panelScholarsForThisPanel.length > 0 && panels[i].evaluators) {
                        try {
                            const scholarIds = panelScholarsForThisPanel
                                .map(scholar => {
                                    const originalRecord = examinationRecords.find(r => r.id === scholar.id);
                                    return originalRecord?._originalData?.id || originalRecord?.id;
                                })
                                .filter(Boolean);

                            if (scholarIds.length > 0) {
                                const { assignScholarsToPanel } = await import('../services/departmentScholarService');
                                await assignScholarsToPanel(scholarIds, panels[i].id, panels[i].evaluators);
                                const fixedCount = panelScholarsForThisPanel.filter(s => s.forwarded || (s.marks && s.marks.some(mark => mark > 0))).length;
                                const redistributedCount = panelScholarsForThisPanel.length - fixedCount;
                                console.log(`✅ Updated database for Panel ${panels[i].id} with ${scholarIds.length} scholars (${fixedCount} fixed, ${redistributedCount} redistributed)`);
                            }
                        } catch (err) {
                            console.error(`❌ Error updating database for Panel ${panels[i].id}:`, err);
                        }
                    }
                }

                setPanelScholars(newMap);
            }
        };

        // SMART DISTRIBUTION: Equal distribution while preserving saved/forwarded scholars
        const smartPanelDistribution = async () => {
            if (panels.length === 0 || examinationRecords.length === 0) return;
            
            console.log(`🔄 Smart panel distribution for ${panels.length} panels with ${examinationRecords.length} scholars`);
            
            // Get all scholars and categorize them
            const allScholars = examinationRecords.map(record => ({
                id: record.id,
                name: record.name,
                appNo: record.appNo,
                marks: record.marks,
                average: record.average,
                forwarded: record.forwarded,
                assignedPanel: record.assignedPanel,
                hasMarks: record.marks && record.marks.some(mark => mark > 0),
                _originalData: record._originalData
            }));
            
            // Separate into fixed and redistributable scholars
            const fixedScholars = [];
            const redistributableScholars = [];
            
            allScholars.forEach(scholar => {
                if ((scholar.hasMarks || scholar.forwarded) && scholar.assignedPanel) {
                    // Scholar has saved data or is forwarded - keep in current panel
                    fixedScholars.push(scholar);
                } else {
                    // Scholar can be redistributed
                    redistributableScholars.push(scholar);
                }
            });
            
            console.log(`📊 Distribution analysis: ${fixedScholars.length} fixed scholars, ${redistributableScholars.length} redistributable scholars`);
            
            // Initialize panel mapping with fixed scholars
            const newPanelScholars = {};
            panels.forEach(panel => {
                newPanelScholars[panel.id] = [];
            });
            
            // Place fixed scholars in their current panels
            fixedScholars.forEach(scholar => {
                const panelId = parseInt(scholar.assignedPanel);
                if (newPanelScholars[panelId] !== undefined) {
                    newPanelScholars[panelId].push({
                        ...scholar,
                        panel: panelId
                    });
                }
            });
            
            // Calculate current panel sizes (including fixed scholars)
            const currentPanelSizes = panels.map(panel => ({
                id: panel.id,
                currentCount: newPanelScholars[panel.id].length,
                evaluators: panel.evaluators
            }));
            
            console.log(`📋 Current panel sizes:`, currentPanelSizes.map(p => `Panel ${p.id}: ${p.currentCount} scholars`).join(', '));
            
            // Calculate target size per panel for equal distribution
            const totalScholars = allScholars.length;
            const targetPerPanel = Math.floor(totalScholars / panels.length);
            const remainder = totalScholars % panels.length;
            
            console.log(`🎯 Target distribution: ${targetPerPanel} scholars per panel, ${remainder} panels get +1 extra`);
            
            // Distribute redistributable scholars to balance panels
            let redistributableIndex = 0;
            
            for (let i = 0; i < panels.length && redistributableIndex < redistributableScholars.length; i++) {
                const panel = currentPanelSizes[i];
                const targetSize = targetPerPanel + (i < remainder ? 1 : 0);
                const needsMore = targetSize - panel.currentCount;
                
                if (needsMore > 0) {
                    const scholarsToAdd = redistributableScholars.slice(redistributableIndex, redistributableIndex + needsMore);
                    
                    scholarsToAdd.forEach(scholar => {
                        newPanelScholars[panel.id].push({
                            ...scholar,
                            panel: panel.id
                        });
                    });
                    
                    // Update database for newly assigned scholars
                    if (scholarsToAdd.length > 0) {
                        try {
                            const scholarIds = scholarsToAdd.map(s => s._originalData?.id || s.id).filter(Boolean);
                            if (scholarIds.length > 0) {
                                const { assignScholarsToPanel } = await import('../services/departmentScholarService');
                                await assignScholarsToPanel(scholarIds, panel.id, panel.evaluators);
                                console.log(`✅ Assigned ${scholarIds.length} new scholars to Panel ${panel.id}`);
                            }
                        } catch (err) {
                            console.error(`❌ Error updating database for Panel ${panel.id}:`, err);
                        }
                    }
                    
                    redistributableIndex += needsMore;
                }
            }
            
            // Update the panel scholars state
            setPanelScholars(newPanelScholars);
            
            // Log final distribution
            console.log(`✅ Final distribution:`, panels.map(panel => {
                const scholars = newPanelScholars[panel.id] || [];
                const fixedCount = scholars.filter(s => s.hasMarks || s.forwarded).length;
                const newCount = scholars.length - fixedCount;
                return `Panel ${panel.id}: ${scholars.length} total (${fixedCount} fixed, ${newCount} new)`;
            }).join(', '));
        };
        
        smartPanelDistribution();
    }, [panels.length]);
    */

    // DISABLED: This useEffect was also causing redistribution issues
    /*
    useEffect(() => {
        if (!Array.isArray(examinationRecords) || panels.length === 0) return;

        // Use examination records directly since they're already from the examination_records table
        const eligibleList = examinationRecords.map(record => ({
            id: record.id,
            name: record.name,
            appNo: record.appNo,
            marks: record.marks,
            forwarded: record.forwarded || false, // Use forwarded status from database
            assignedPanel: record.assignedPanel // Include existing panel assignment
        }));

        if (eligibleList.length === 0) {
            const emptyMap = {};
            panels.forEach(p => { emptyMap[p.id] = []; });
            setPanelScholars(emptyMap);
            return;
        }

        setPanelScholars(prev => {
            const copy = {};
            
            // Initialize all panels
            panels.forEach(p => {
                copy[p.id] = [];
            });

            // Separate scholars into fixed and redistributable groups
            const fixedScholars = [];
            const redistributableScholars = [];

            eligibleList.forEach(scholar => {
                // Check if scholar has saved data or is forwarded
                const hasMarks = scholar.marks && scholar.marks.some(mark => mark > 0);
                const isForwarded = scholar.forwarded;

                if (hasMarks || isForwarded) {
                    fixedScholars.push(scholar);
                } else {
                    redistributableScholars.push(scholar);
                }
            });

            // First, assign fixed scholars (forwarded or with saved marks) to their designated panels
            fixedScholars.forEach(scholar => {
                if (scholar.assignedPanel) {
                    const panelId = parseInt(scholar.assignedPanel);
                    if (copy[panelId]) {
                        copy[panelId].push({ ...scholar, panel: panelId });
                    }
                } else {
                    // If fixed but no assigned panel, keep in active panel or first available panel
                    const targetPanel = activePanel || panels[0]?.id;
                    if (targetPanel && copy[targetPanel]) {
                        copy[targetPanel].push({ ...scholar, panel: targetPanel });
                    }
                }
            });

            // Then distribute scholars without data equally among panels
            if (redistributableScholars.length > 0 && panels.length > 0) {
                const base = Math.floor(redistributableScholars.length / panels.length);
                let rem = redistributableScholars.length % panels.length;
                let offset = 0;

                for (let i = 0; i < panels.length; i++) {
                    const size = base + (rem > 0 ? 1 : 0);
                    if (rem > 0) rem -= 1;
                    
                    const scholarsToAdd = redistributableScholars.slice(offset, offset + size);
                    copy[panels[i].id] = [...copy[panels[i].id], ...scholarsToAdd.map(s => ({ ...s, panel: panels[i].id }))];
                    
                    offset += size;
                }
            }

            // Remove duplicates (just in case)
            const seen = new Set();
            panels.forEach(p => {
                const arr = Array.isArray(copy[p.id]) ? copy[p.id] : [];
                copy[p.id] = arr.filter(item => {
                    if (seen.has(item.id)) return false;
                    seen.add(item.id);
                    return true;
                });
            });

            console.log(`📊 Initial panel assignment: ${fixedScholars.length} fixed scholars (forwarded or with saved marks), ${redistributableScholars.length} redistributable scholars`);
            panels.forEach(panel => {
                const fixedCount = copy[panel.id]?.filter(s => s.forwarded || (s.marks && s.marks.some(mark => mark > 0))).length || 0;
                const totalCount = copy[panel.id]?.length || 0;
                console.log(`   Panel ${panel.id}: ${totalCount} scholars (${fixedCount} fixed, ${totalCount - fixedCount} redistributable)`);
            });

            return copy;
        });
    }, [examinationRecords, activePanel, panels]);
    */

    const currentPanel = panels.find(p => p.id === activePanel);

    // Show loading state
    if (loading) {
        return (
            <div id="panel-interview" className="panel-fullscreen flex flex-col w-full h-full bg-gray-50">
                <div className="flex justify-center items-center h-full">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
                        <p className="text-gray-600">Loading scholars for interview...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Show error state
    if (error) {
        return (
            <div id="panel-interview" className="panel-fullscreen flex flex-col w-full h-full bg-gray-50">
                <div className="flex justify-center items-center h-full">
                    <div className="text-center">
                        <div className="text-red-500 text-6xl mb-4">⚠️</div>
                        <p className="text-red-600 mb-4">{error}</p>
                        <button 
                            onClick={() => window.location.reload()}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div id="panel-interview" className="panel-fullscreen flex flex-col w-full h-full bg-gray-50">
            <style>{`
                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.3); z-index: 50; display: flex; align-items: center; justify-content: center; }
                .modal-content { background: #fff; border-radius: 1rem; box-shadow: 0 8px 32px rgba(0,0,0,0.18); padding: 2rem; position: relative; }
                .message-box { position: fixed; top: 1rem; right: 1rem; background: #fff; border-radius: 0.5rem; box-shadow: 0 4px 24px rgba(0,0,0,0.12); padding: 0.75rem 1rem; z-index: 60; display: flex; gap: 0.5rem; align-items: center; min-width: 220px; }
                input[type="number"].no-spinner::-webkit-outer-spin-button, input[type="number"].no-spinner::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
                input[type="number"].no-spinner { -moz-appearance: textfield; }
                .eval-header { display:flex; align-items:center; justify-content:center; gap:0.4rem; }
                .eval-header.vertical { flex-direction:column; }
                .eval-label { font-size:0.8rem; }
                .eval-num { display:inline-flex; width:1.25rem; height:1.25rem; align-items:center; justify-content:center; border-radius:0.375rem; background:#f3f4f6; font-weight:600; margin-top:0.25rem; }
            `}</style>
            <div className="p-6 pb-2 border-b bg-white">
                <div className="mb-3 flex items-center justify-between">
                    <h1 className="text-3xl font-bold">Interview</h1>
                </div>
                <div className="flex flex-col gap-3">
                    <div className="flex flex-row flex-wrap items-center gap-4 justify-start md:justify-between">
                        <div className="flex flex-row gap-4 flex-wrap">
                            <button onClick={handleAddPanel} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2">
                                <Users className="w-4 h-4" /> Add Panel
                            </button>
                            <button onClick={handleRemovePanel} disabled={panels.length <= 1} className={`bg-red-600 ${panels.length <= 1 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'} text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2`}>
                                <Trash2 className="w-4 h-4" /> Remove Panel
                            </button>
                            <button onClick={handleForwardAllClick} disabled={panels.length === 0} className={`py-2 px-4 rounded-lg flex items-center gap-2 font-bold bg-emerald-500 text-white ${panels.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-emerald-600'}`}>
                                <Send className="w-4 h-4" /> Forward All
                            </button>
                            <button onClick={handleDownloadExcel} disabled={panels.length === 0} className={`bg-blue-600 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 ${panels.length === 0 ? 'opacity-50 cursor-not-allowed' : 'hover:bg-blue-700'}`}>
                                <Download className="w-4 h-4" /> Download Excel
                            </button>
                            <button className="p-2.5 rounded-lg border bg-white hover:bg-gray-100 text-gray-600" title="Filter" onClick={handleOpenFilter} disabled={panels.length === 0}>
                                <SlidersHorizontal className="w-4 h-4" />
                            </button>
                            <button className="p-2.5 rounded-lg border bg-white hover:bg-gray-100 text-gray-600" title="Fullscreen interview panel" onClick={() => toggleFullScreen && toggleFullScreen('panel-interview')}>
                                <Maximize2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    {panels.length > 0 && (
                        <div className="flex flex-row flex-wrap items-center gap-2">
                            {panels.map(panel => (
                                <button
                                    key={panel.id}
                                    onClick={() => setActivePanel(panel.id)}
                                    className={`py-2 px-3 rounded-lg font-bold ${activePanel === panel.id ? 'bg-sky-600 text-white' : 'bg-white text-gray-700 border'}`}
                                >
                                    Panel {panel.id}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex-1 p-6">
                {panels.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center text-gray-500 bg-white rounded-lg shadow p-6">
                        <Users className="w-16 h-16 mb-4 text-gray-400" />
                        <h3 className="text-2xl font-bold mb-2 text-gray-700">No Interview Panels Created</h3>
                        <button onClick={handleAddPanel} className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 px-6 rounded-lg flex items-center gap-2 text-base">
                            <Users className="w-5 h-5" /> Add Your First Panel
                        </button>
                    </div>
                ) : (
                    <div className="bg-white rounded-lg shadow p-6">
                        <p className="text-gray-600 text-sm mb-4">
                            Showing all scholars from examination records for interview management.
                        </p>
                        
                        {currentPanel && Array.isArray(currentPanel.evaluators) && (
                            <div className="mb-6 border rounded-lg p-4 bg-gray-50">
                                <div className="flex justify-between items-center mb-3">
                                    <h4 className="text-lg font-bold text-gray-800">Evaluators for Panel {activePanel}</h4>
                                    <button
                                        onClick={handleEditPanel}
                                        className="flex items-center gap-2 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                                        title="Edit Panel Evaluators"
                                    >
                                        <Pencil className="w-4 h-4" />
                                        Edit Panel
                                    </button>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {currentPanel.evaluators.map((evaluator, index) => (
                                        <div key={index} className="border rounded-md p-3 bg-white shadow-sm">
                                            <p className="font-semibold text-gray-700">{evaluator.name || 'Not set'}</p>
                                            <p className="text-sm text-gray-500">Designation: {evaluator.designation || 'N/A'}</p>
                                            <p className="text-sm text-gray-500">{evaluator.affiliation || 'N/A'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="table-responsive border rounded-lg overflow-y-auto overflow-y-auto">
                            <table className="table w-full min-w-[700px] sticky-header">
                                <thead>
                                    <tr>
                                        <th className="text-left">S.No</th>
                                        <th className="text-left">Name</th>
                                        <th className="text-left">Application No.</th>
                                        {/* Dynamic evaluator columns based on current panel */}
                                        {activePanel && panels.find(p => p.id === activePanel)?.evaluators.map((evaluator, idx) => (
                                            <th key={idx} className="text-center" data-eval-index={idx + 1}>
                                                <div className="eval-header vertical">
                                                    <span className="eval-label">{evaluator.name || `Evaluator ${idx + 1}`}</span>
                                                    <span className="eval-num">{idx + 1}</span>
                                                </div>
                                            </th>
                                        ))}
                                        <th className="text-center">Average</th>
                                        <th className="text-center">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredInterview.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} className="text-center py-8 text-gray-500">
                                                No scholars found for this panel.
                                                <br />
                                                <span className="text-xs text-gray-400 mt-1">
                                                    All scholars from examination records are shown here.
                                                </span>
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredInterview.map((v, idx) => {
                                            const globalIndex = idx + 1;
                                            const isInitialEntry = v.marks.every(m => m === 0 || m === '' || m === null) && !v.forwarded;
                                            const isEditing = editingId === v.id;

                                            return (
                                                <tr key={v.id} className={v.forwarded ? 'bg-green-50' : ''}>
                                                    <td>{globalIndex}</td>
                                                    <td className="font-medium">{v.name}</td>
                                                    <td>{v.appNo}</td>
                                                    {isEditing ? (
                                                        // Active Editing State - show only relevant evaluator columns
                                                        (() => {
                                                            const currentPanel = panels.find(p => p.id === activePanel);
                                                            const numEvaluators = currentPanel ? currentPanel.evaluators.length : 1;
                                                            return Array.from({ length: numEvaluators }, (_, i) => (
                                                                <td key={i} className="p-1 text-center">
                                                                    <input 
                                                                        type="text" 
                                                                        className="w-20 text-center border rounded px-2 py-1" 
                                                                        value={editMarks[i]} 
                                                                        onChange={e => handleMarkChange(i, e.target.value)}
                                                                        onKeyDown={preventNonAlphanumericInput}
                                                                        onKeyUp={(e) => {
                                                                            // Additional Enter key handler on key up
                                                                            if ((e.key === 'Enter' || e.keyCode === 13 || e.which === 13) && editingId) {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                console.log('🔄 Enter key detected via onKeyUp for scholar:', editingId);
                                                                                console.log('🔄 KeyUp details:', { key: e.key, keyCode: e.keyCode, which: e.which });
                                                                                
                                                                                // Clear any pending auto-save timeout
                                                                                if (autoSaveTimeout) {
                                                                                    clearTimeout(autoSaveTimeout);
                                                                                    setAutoSaveTimeout(null);
                                                                                }
                                                                                
                                                                                // Trigger immediate save with small delay to ensure input value is captured
                                                                                setTimeout(() => {
                                                                                    handleSave(editingId);
                                                                                }, 50);
                                                                            }
                                                                        }}
                                                                        onKeyPress={(e) => {
                                                                            // Additional Enter key handler as backup
                                                                            if ((e.key === 'Enter' || e.charCode === 13 || e.which === 13) && editingId) {
                                                                                e.preventDefault();
                                                                                e.stopPropagation();
                                                                                console.log('🔄 Enter key detected via onKeyPress for scholar:', editingId);
                                                                                console.log('🔄 KeyPress details:', { key: e.key, charCode: e.charCode, which: e.which });
                                                                                
                                                                                // Clear any pending auto-save timeout
                                                                                if (autoSaveTimeout) {
                                                                                    clearTimeout(autoSaveTimeout);
                                                                                    setAutoSaveTimeout(null);
                                                                                }
                                                                                
                                                                                // Trigger immediate save with small delay to ensure input value is captured
                                                                                setTimeout(() => {
                                                                                    handleSave(editingId);
                                                                                }, 50);
                                                                            }
                                                                        }}
                                                                        onBlur={(e) => {
                                                                            // Only save when truly leaving the editing area, not when tabbing between fields
                                                                            setTimeout(() => {
                                                                                // Check if the new focused element is still within the same row's input fields
                                                                                const activeElement = document.activeElement;
                                                                                const isStillInSameRow = activeElement && 
                                                                                    activeElement.tagName === 'INPUT' && 
                                                                                    activeElement.closest('tr') === e.target.closest('tr');
                                                                                
                                                                                // Only save if we're not moving to another input in the same row
                                                                                if (!isStillInSameRow && editingId) {
                                                                                    console.log('🔄 Input blur - truly leaving row, triggering save for scholar:', editingId);
                                                                                    // Clear any pending auto-save timeout
                                                                                    if (autoSaveTimeout) {
                                                                                        clearTimeout(autoSaveTimeout);
                                                                                        setAutoSaveTimeout(null);
                                                                                    }
                                                                                    // Trigger immediate save
                                                                                    handleSave(editingId);
                                                                                }
                                                                            }, 10); // Small delay to let focus settle
                                                                        }}
                                                                        onFocus={e => {
                                                                            // Clear the field if it contains 0 when focused
                                                                            if (e.target.value === '0') {
                                                                                handleMarkChange(i, '');
                                                                            }
                                                                        }}
                                                                        placeholder="0"
                                                                        maxLength="2"
                                                                    />
                                                                </td>
                                                            ));
                                                        })()
                                                    ) : isInitialEntry ? (
                                                        // Initial Entry State - requires clicking to enter edit mode (no auto-focus edit)
                                                        (() => {
                                                            const currentPanel = panels.find(p => p.id === activePanel);
                                                            const numEvaluators = currentPanel ? currentPanel.evaluators.length : 1;
                                                            return Array.from({ length: numEvaluators }, (_, i) => (
                                                                <td key={i} className="p-1 text-center">
                                                                    <input 
                                                                        type="text" 
                                                                        className="w-20 text-center border rounded px-2 py-1 cursor-pointer hover:bg-gray-50" 
                                                                        value={v.marks[i] === 0 ? '' : (v.marks[i] || '')} 
                                                                        onClick={() => handleEdit(v)} 
                                                                        readOnly
                                                                        placeholder="0"
                                                                    />
                                                                </td>
                                                            ));
                                                        })()
                                                    ) : (
                                                        // View Only State (requires clicking edit button)
                                                        (() => {
                                                            const currentPanel = panels.find(p => p.id === activePanel);
                                                            const numEvaluators = currentPanel ? currentPanel.evaluators.length : 1;
                                                            return Array.from({ length: numEvaluators }, (_, i) => (
                                                                <td key={i} className="text-center">
                                                                    {(() => {
                                                                        const mark = v.marks[i];
                                                                        if (typeof mark === 'string') {
                                                                            const lowerMark = mark.toLowerCase().trim();
                                                                            if (lowerMark === 'a' || lowerMark === 'ab') {
                                                                                return <span className="text-red-600 font-semibold">Ab</span>;
                                                                            }
                                                                        }
                                                                        return isNaN(Number(mark)) ? mark : Math.round(parseFloat(mark));
                                                                    })()}
                                                                </td>
                                                            ));
                                                        })()
                                                    )}
                                                    <td className="font-bold text-lg text-center">
                                                        <span>
                                                            {(() => {
                                                                const currentPanel = panels.find(p => p.id === activePanel);
                                                                const numEvaluators = currentPanel ? currentPanel.evaluators.length : 1;
                                                                const avg = isEditing ? calcAverage(editMarks, numEvaluators) : calcAverage(v.marks, numEvaluators);
                                                                
                                                                if (avg === 'Ab') {
                                                                    return <span className="text-red-600 font-semibold">Ab</span>;
                                                                }
                                                                
                                                                // Color coding: Green for pass (≥15), Red for fail (<15)
                                                                const isPass = typeof avg === 'number' && avg >= 15;
                                                                const colorClass = isPass ? 'text-green-600' : 'text-red-600';
                                                                
                                                                return <span className={`${colorClass} font-semibold`}>{avg}</span>;
                                                            })()}
                                                        </span>
                                                    </td>
                                                    <td className="action-cell">
                                                        <div className="flex justify-center items-center gap-2">
                                                            {editingId !== v.id && (
                                                                <button className={`p-2 rounded-full ${v.forwarded ? 'bg-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white hover:bg-yellow-100'}`} title="Edit" onClick={() => !v.forwarded && handleEdit(v)} disabled={v.forwarded}>
                                                                    <Pencil className="w-5 h-5" />
                                                                </button>
                                                            )}
                                                            <button className={`p-2 rounded-lg ${v.forwarded ? 'bg-gray-300 text-gray-500 cursor-not-allowed' : 'text-white bg-emerald-500 hover:bg-emerald-600'}`} title="Forward" onClick={() => !v.forwarded && handleForward(v.id)} disabled={v.forwarded}>
                                                                <Send className="w-5 h-5" />
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
                )}
            </div>
            
            {filterModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content max-w-md w-full">
                        <button onClick={handleCloseFilter} className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-pink-400 font-bold">&times;</button>
                        <h3 className="text-2xl font-bold mb-4 text-center">Filter Interview Records</h3>
                        <div className="mb-4">
                            <label className="block text-sm font-bold mb-2">Name</label>
                            <input type="text" className="w-full border rounded-lg px-3 py-2" value={filterName} onChange={e => setFilterName(e.target.value)} placeholder="Filter by name..." />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-bold mb-2">Application No.</label>
                            <input type="text" className="w-full border rounded-lg px-3 py-2" value={filterAppNo} onChange={e => setFilterAppNo(e.target.value)} placeholder="Filter by Application No..." />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-bold mb-2">Status</label>
                            <select className="w-full border rounded-lg px-3 py-2" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                                <option value="All">All Status</option>
                                <option value="Pending">Pending (No marks saved)</option>
                                <option value="Saved">Saved (Marks saved, not forwarded)</option>
                                <option value="Forwarded">Forwarded</option>
                            </select>
                        </div>
                        <div className="flex justify-center gap-3 mt-6">
                            <button onClick={handleCloseFilter} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                            <button onClick={handleApplyFilter} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Apply Filter</button>
                        </div>
                    </div>
                </div>
            )}
            {forwardModal.open && (
                <div className="modal-overlay">
                    <div className="modal-content max-w-md w-full">
                        <button onClick={() => { setForwardModal({ open: false, id: null }); setConsentChecked(false); }} className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-pink-400 font-bold">&times;</button>
                        <h3 className="text-2xl font-bold mb-3 text-center">Confirm Forwarding for {(() => { const s = (panelScholars[activePanel] || []).find(x => x.id === forwardModal.id); return s ? s.name : ''; })()}</h3>
                        <div className="mb-4 border rounded-lg p-4 bg-gray-50">
                            <div className="text-sm text-gray-600">Admin Name: <span className="font-semibold">{currentUser?.name || 'Department HOD'}</span></div>
                            <div className="text-sm text-gray-600">Role: <span className="font-semibold">{currentUser?.role || `HOD, ${currentUser?.department || 'Department'}`}</span></div>
                            <div className="text-sm text-gray-600">Email: <a href={`mailto:${currentUser?.email || ''}`} className="text-sky-600">{currentUser?.email || 'Not available'}</a></div>
                        </div>
                        <div className="mb-4">
                            <h4 className="font-bold">Consent & Confirmation</h4>
                            <ul className="list-disc list-inside text-sm text-gray-700 mt-2 space-y-1">
                                <li>You have thoroughly reviewed all submitted data</li>
                                <li>You have verified the authenticity of documents</li>
                                <li>You are authorized to make this decision</li>
                                <li>This action will be recorded in the system</li>
                            </ul>
                        </div>
                        <div className="mb-4">
                            <label className="inline-flex items-start gap-2">
                                <input type="checkbox" className="mt-1" checked={consentChecked} onChange={e => setConsentChecked(e.target.checked)} />
                                <span className="text-sm whitespace-nowrap">I confirm I have read and agree to the above terms</span>
                            </label>
                        </div>
                        <div className="mb-6 text-sm text-gray-700 text-center">You are about to <span className="font-bold">FORWARD</span> records for {(() => { const s = (panelScholars[activePanel] || []).find(x => x.id === forwardModal.id); return s ? s.name : 'this scholar'; })()} to the Research Coordinator for further processing.</div>
                        <div className="flex justify-center gap-3 mt-6">
                            <button onClick={() => { setForwardModal({ open: false, id: null }); setConsentChecked(false); }} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                            <button onClick={handleConfirmForward} disabled={!consentChecked} className={`py-2 px-4 rounded-lg font-bold text-white ${consentChecked ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'}`}>Confirm Forward</button>
                        </div>
                    </div>
                </div>
            )}
            {forwardAllModal && (
                <div className="modal-overlay">
                    <div className="modal-content max-w-md w-full">
                        <button onClick={() => { setForwardAllModal(false); setConsentAllChecked(false); }} className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-pink-400 font-bold">&times;</button>
                        <h3 className="text-2xl font-bold mb-3 text-center">Confirm Forward All for Panel {activePanel}</h3>
                        <div className="mb-4 border rounded-lg p-4 bg-gray-50">
                            <div className="text-sm text-gray-600">Admin Name: <span className="font-semibold">Dr. Anand</span></div>
                            <div className="text-sm text-gray-600">Role: <span className="font-semibold">HOD, CSE</span></div>
                            <div className="text-sm text-gray-600">Email: <a href="mailto:anand.cse@srmist.edu.in" className="text-sky-600">anand.cse@srmist.edu.in</a></div>
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
                            <label className="inline-flex items-start gap-2">
                                <input type="checkbox" className="mt-1" checked={consentAllChecked} onChange={e => setConsentAllChecked(e.target.checked)} />
                                <span className="text-sm whitespace-nowrap">I confirm I have read and agree to the above terms for forwarding all records</span>
                            </label>
                        </div>
                        <div className="mb-6 text-sm text-gray-700 text-center">You are about to <span className="font-bold">FORWARD ALL</span> records for Panel {activePanel} to the Faculty.</div>
                        <div className="flex justify-center gap-3 mt-6">
                            <button onClick={() => { setForwardAllModal(false); setConsentAllChecked(false); }} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                            <button onClick={handleConfirmForwardAll} disabled={!consentAllChecked} className={`py-2 px-4 rounded-lg font-bold text-white ${consentAllChecked ? 'bg-blue-600 hover:bg-blue-700' : 'bg-gray-300 cursor-not-allowed'}`}>Confirm Forward All</button>
                        </div>
                    </div>
                </div>
            )}
            {addPanelModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content max-w-3xl w-full">
                        <button onClick={() => setAddPanelModalOpen(false)} className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-pink-400 font-bold">&times;</button>
                        <h3 className="text-2xl font-bold mb-3">Set Interview Panels & Evaluators</h3>
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                                <strong>Requirements:</strong> Each panel must have minimum 1 evaluator and maximum 3 evaluators.
                                Interview marks will be calculated based on the number of evaluators in the panel.
                            </p>
                        </div>
                        <div className="space-y-4 max-h-[60vh] overflow-auto pr-4">
                            {newPanelEvaluators.map((ev, idx) => (
                                <div key={idx} className="p-4 bg-gray-50 rounded-lg border relative">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="font-bold">Evaluator {idx + 1}</div>
                                        {newPanelEvaluators.length > 1 && (
                                            <button
                                                onClick={() => handleRemoveEvaluator(idx)}
                                                className="text-red-600 hover:text-red-800 p-1"
                                                title="Remove Evaluator"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 items-center">
                                        <div>
                                            <label className="block text-sm font-bold">Name</label>
                                            <input 
                                                value={ev.name} 
                                                onChange={e => handleNewEvalChange(idx, 'name', e.target.value)} 
                                                className="w-full border rounded px-3 py-2" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold">Designation</label>
                                            <input 
                                                value={ev.designation} 
                                                onChange={e => {
                                                    // Allow only alphabetic characters, spaces, and common punctuation
                                                    const value = e.target.value.replace(/[^a-zA-Z\s\-\.]/g, '');
                                                    handleNewEvalChange(idx, 'designation', value);
                                                }} 
                                                className="w-full border rounded px-3 py-2" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold">Affiliation</label>
                                            <input 
                                                value={ev.affiliation} 
                                                onChange={e => handleNewEvalChange(idx, 'affiliation', e.target.value)} 
                                                className="w-full border rounded px-3 py-2" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {newPanelEvaluators.length < 3 && (
                                <div className="flex justify-center">
                                    <button
                                        onClick={handleAddEvaluator}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
                                    >
                                        <Users className="w-4 h-4" />
                                        Add Evaluator ({newPanelEvaluators.length}/3)
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3 mt-4">
                            <div className="text-sm text-gray-600">
                                Current evaluators: {newPanelEvaluators.length} (Min: 1, Max: 3)
                            </div>
                            <div className="flex-1" />
                            <button onClick={() => { setAddPanelModalOpen(false); }} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                            <button onClick={handleSaveNewPanel} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Save Details</button>
                        </div>
                    </div>
                </div>
            )}
            {editPanelModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content max-w-3xl w-full">
                        <button onClick={() => setEditPanelModalOpen(false)} className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-pink-400 font-bold">&times;</button>
                        <h3 className="text-2xl font-bold mb-3">Edit Panel {activePanel} Evaluators</h3>
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-sm text-blue-800">
                                <strong>Requirements:</strong> Each panel must have minimum 1 evaluator and maximum 3 evaluators.
                                Interview marks will be recalculated based on the updated number of evaluators.
                            </p>
                        </div>
                        <div className="space-y-4 max-h-[60vh] overflow-auto pr-4">
                            {editPanelEvaluators.map((ev, idx) => (
                                <div key={idx} className="p-4 bg-gray-50 rounded-lg border relative">
                                    <div className="flex justify-between items-center mb-2">
                                        <div className="font-bold">Evaluator {idx + 1}</div>
                                        {editPanelEvaluators.length > 1 && (
                                            <button
                                                onClick={() => handleRemoveEditEvaluator(idx)}
                                                className="text-red-600 hover:text-red-800 p-1"
                                                title="Remove Evaluator"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 items-center">
                                        <div>
                                            <label className="block text-sm font-bold">Name</label>
                                            <input 
                                                value={ev.name} 
                                                onChange={e => handleEditEvalChange(idx, 'name', e.target.value)} 
                                                className="w-full border rounded px-3 py-2" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold">Designation</label>
                                            <input 
                                                value={ev.designation} 
                                                onChange={e => {
                                                    // Allow only alphabetic characters, spaces, and common punctuation
                                                    const value = e.target.value.replace(/[^a-zA-Z\s\-\.]/g, '');
                                                    handleEditEvalChange(idx, 'designation', value);
                                                }} 
                                                className="w-full border rounded px-3 py-2" 
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-bold">Affiliation</label>
                                            <input 
                                                value={ev.affiliation} 
                                                onChange={e => handleEditEvalChange(idx, 'affiliation', e.target.value)} 
                                                className="w-full border rounded px-3 py-2" 
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {editPanelEvaluators.length < 3 && (
                                <div className="flex justify-center">
                                    <button
                                        onClick={handleAddEditEvaluator}
                                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2"
                                    >
                                        <Users className="w-4 h-4" />
                                        Add Evaluator ({editPanelEvaluators.length}/3)
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="flex items-center gap-3 mt-4">
                            <div className="text-sm text-gray-600">
                                Current evaluators: {editPanelEvaluators.length} (Min: 1, Max: 3)
                            </div>
                            <div className="flex-1" />
                            <button onClick={() => { setEditPanelModalOpen(false); }} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">Cancel</button>
                            <button onClick={handleSaveEditPanel} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg">Save Changes</button>
                        </div>
                    </div>
                </div>
            )}
            {removePanelModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content max-w-md w-full">
                        <button onClick={() => setRemovePanelModalOpen(false)} className="absolute top-4 right-4 text-2xl text-gray-400 hover:text-pink-400 font-bold">&times;</button>
                        <h3 className="text-2xl font-bold mb-4 text-center">Confirm Panel Removal</h3>
                        <p className="text-gray-700 text-center mb-6">
                            Are you sure you want to remove <strong>Panel {activePanel}</strong>? This action will permanently delete all its associated interview records.
                        </p>
                        <div className="flex justify-center gap-3 mt-6">
                            <button onClick={() => setRemovePanelModalOpen(false)} className="bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg">
                                Cancel
                            </button>
                            <button onClick={handleConfirmRemovePanel} className="bg-red-600 hover:red-700 text-white font-bold py-2 px-4 rounded-lg">
                                Remove Panel
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {messageBox.open && (
                <div className="message-box max-w-sm">
                    <div className="flex justify-between items-center">
                        <span className="text-base">{messageBox.message}</span>
                        <button onClick={() => setMessageBox({ open: false, message: '' })} className="ml-4 px-2 py-1 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded-lg">Close</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Interview;