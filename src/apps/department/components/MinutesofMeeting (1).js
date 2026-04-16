import React, { useState, useEffect } from 'react';
import { Edit3, Save, X, Download } from 'lucide-react';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { useAppContext } from '../contexts/AppContext';
import { supabase } from '../../../supabaseClient';
import './MinutesofMeeting.css';
import srmLogo from '../assets/srm-logo.png'; // Adjust this path!

export default function MinutesOfMeeting() {
    const { currentUser, userLoading } = useAppContext();
    const [editingField, setEditingField] = useState(null);
    const [loading, setLoading] = useState(false);
    const [candidatesData, setCandidatesData] = useState([]);
    const [interviewPanelData, setInterviewPanelData] = useState([]);
    
    // Helper function to get localStorage key for current user
    const getStorageKey = () => {
        return `minutesOfMeeting_${currentUser?.id || 'default'}_${currentUser?.department || 'default'}`;
    };

    // Helper function to save form data to localStorage
    const saveFormDataToStorage = (data) => {
        try {
            const storageKey = getStorageKey();
            localStorage.setItem(storageKey, JSON.stringify(data));
            console.log('✅ Form data saved to localStorage');
        } catch (error) {
            console.error('❌ Error saving form data to localStorage:', error);
        }
    };

    // Helper function to load form data from localStorage
    const loadFormDataFromStorage = () => {
        try {
            const storageKey = getStorageKey();
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                console.log('✅ Form data loaded from localStorage');
                return parsedData;
            }
        } catch (error) {
            console.error('❌ Error loading form data from localStorage:', error);
        }
        return null;
    };

    // Helper function to clear form data from localStorage (on logout)
    const clearFormDataFromStorage = () => {
        try {
            const storageKey = getStorageKey();
            localStorage.removeItem(storageKey);
            console.log('✅ Form data cleared from localStorage');
        } catch (error) {
            console.error('❌ Error clearing form data from localStorage:', error);
        }
    };

    // Helper function to convert department name to title case for content
    const getDepartmentTitleCase = (departmentName) => {
        if (!departmentName) return '';
        return departmentName.toLowerCase().replace(/\b\w/g, l => l.toUpperCase());
    };

    // Helper function to convert faculty to uppercase format
    const getFacultyUpperCase = (faculty) => {
        if (!faculty) return 'FACULTY OF SCIENCE & HUMANITIES';
        
        // Map faculty names to proper uppercase format
        const facultyMappings = {
            'Engineering And Technology': 'FACULTY OF ENGINEERING & TECHNOLOGY',
            'Science And Humanities': 'FACULTY OF SCIENCE & HUMANITIES', 
            'Medical And Health Sciences': 'FACULTY OF MEDICAL AND HEALTH SCIENCES',
            'Management And Studies': 'FACULTY OF MANAGEMENT AND STUDIES',
            'Management': 'FACULTY OF MANAGEMENT AND STUDIES'
        };
        
        // Check if faculty matches any mapping
        const mappedFaculty = facultyMappings[faculty];
        if (mappedFaculty) {
            return mappedFaculty;
        }
        
        // If already in correct format, return as is
        if (faculty.toUpperCase().startsWith('FACULTY OF')) {
            return faculty.toUpperCase();
        }
        
        // Otherwise, add FACULTY OF prefix
        return `FACULTY OF ${faculty.toUpperCase()}`;
    };

    // Helper function to convert department to uppercase department format
    const getDepartmentUpperCase = (department) => {
        if (!department) return 'DEPARTMENT OF MATHEMATICS';
        
        // Map common department names to proper format
        const departmentMappings = {
            'Management Studies': 'DEPARTMENT OF MANAGEMENT STUDIES',
            'Mathematics': 'DEPARTMENT OF MATHEMATICS',
            'Physics': 'DEPARTMENT OF PHYSICS',
            'Chemistry': 'DEPARTMENT OF CHEMISTRY',
            'English': 'DEPARTMENT OF ENGLISH',
            'Commerce': 'DEPARTMENT OF COMMERCE'
        };
        
        // Check if department matches any mapping
        const mappedDepartment = departmentMappings[department];
        if (mappedDepartment) {
            return mappedDepartment;
        }
        
        // If it already starts with "DEPARTMENT OF", return as is
        if (department.toUpperCase().startsWith('DEPARTMENT OF')) {
            return department.toUpperCase();
        }
        
        // Otherwise, add "DEPARTMENT OF" prefix
        return `DEPARTMENT OF ${department.toUpperCase()}`;
    };
    // Function to fetch comprehensive data from both scholar_applications and examination_records tables
    const fetchCandidatesData = async () => {
        if (!currentUser?.faculty || !currentUser?.department) {
            console.log('⚠️ Cannot fetch candidates data - user faculty or department not available');
            return;
        }

        try {
            setLoading(true);
            console.log('🔄 Fetching comprehensive data from both tables...');
            
            // Import service functions
            const { fetchScholarsForDepartmentUser } = await import('../services/departmentScholarService');
            
            // Use the same service function as Scholar Administration page
            console.log('🔄 Fetching scholars using departmentScholarService...');
            const { data: departmentScholars, error: scholarError } = await fetchScholarsForDepartmentUser(
                currentUser.faculty,
                currentUser.department
            );

            if (scholarError) {
                console.error('❌ Error fetching department scholars:', scholarError);
                return;
            }

            console.log(`📊 Found ${departmentScholars?.length || 0} scholars for ${currentUser.department} department`);
            
            if (departmentScholars && departmentScholars.length > 0) {
                console.log('📊 All department scholars with their exact program_type values:');
                departmentScholars.forEach((s, index) => {
                    console.log(`   ${index + 1}. Scholar ID ${s.id}: program_type="${s.program_type}", type="${s.type}"`);
                });
            } else {
                console.log('⚠️ No scholars found for this department');
                return;
            }

            // Fetch from examination_records table for exam/interview data
            const { fetchExaminationRecordsForInterview } = await import('../services/departmentScholarService');
            const { data: examData, error: examError } = await fetchExaminationRecordsForInterview(
                currentUser.department,
                currentUser.faculty
            );

            if (examError) {
                console.error('❌ Error fetching examination records:', examError);
                return;
            }

            console.log(`📥 Received ${departmentScholars?.length || 0} applications and ${examData?.length || 0} examination records`);
            
            // Debug: Log some sample data to understand the structure
            if (departmentScholars && departmentScholars.length > 0) {
                console.log('📊 Sample scholar data:', departmentScholars[0]);
                console.log('📊 Current user faculty:', currentUser.faculty);
                console.log('📊 Current user department:', currentUser.department);
            }

            // Calculate statistics
            const totalApplications = departmentScholars?.length || 0;
            
            // Count those who appeared for entrance test (ALL scholars in examination_records table)
            const appearedForEntrance = examData?.length || 0;
            
            // Count those who attended interview (faculty_interview starts with 'Forwarded_To_')
            const attendedInterview = examData?.filter(record => {
                const facultyInterview = record.faculty_interview || '';
                const attendedInterview = facultyInterview.startsWith('Forwarded_To_');
                console.log(`🔍 Interview attendance check for record ${record.id}:`, {
                    faculty_interview: record.faculty_interview,
                    startsWithForwardedTo: attendedInterview
                });
                return attendedInterview;
            }).length || 0;

            // Filter for selected candidates (those with supervisor_status = 'Admitted')
            const selectedCandidates = examData?.filter(record => {
                const isAdmitted = record.supervisor_status === 'Admitted';
                console.log(`🔍 Checking admission status for record ${record.id}:`, {
                    supervisor_status: record.supervisor_status,
                    isAdmitted: isAdmitted
                });
                return isAdmitted;
            }) || [];

            console.log(`📊 Statistics: ${totalApplications} applications, ${appearedForEntrance} appeared for entrance (all in exam records), ${attendedInterview} attended interview (faculty_interview = Forwarded_To_Department), ${selectedCandidates.length} selected (admitted)`);
            
            setCandidatesData(selectedCandidates);
            
            // Count by program_type only (not type column) as requested by user
            // Full Time scholars
            const fullTimeCount = departmentScholars.filter(s => {
                const programType = s.program_type || '';
                const isFullTime = programType === 'Full Time';
                console.log(`🔍 Full Time check for scholar ${s.id}:`, {
                    program_type: s.program_type,
                    isFullTime: isFullTime
                });
                return isFullTime;
            }).length;
            
            // Part Time Internal scholars
            const partTimeInternalCount = departmentScholars.filter(s => {
                const programType = s.program_type || '';
                const isPartTimeInternal = programType === 'Part Time Internal';
                console.log(`🔍 Part Time Internal check for scholar ${s.id}:`, {
                    program_type: s.program_type,
                    isPartTimeInternal: isPartTimeInternal
                });
                return isPartTimeInternal;
            }).length;
            
            // Part Time External (Academic) scholars - excludes Industry variants
            const partTimeExternalAcademicCount = departmentScholars.filter(s => {
                const programType = s.program_type || '';
                // Only exact "Part Time External" without "(Industry)"
                const isPartTimeExternalAcademic = programType === 'Part Time External';
                console.log(`🔍 Part Time External Academic check for scholar ${s.id}:`, {
                    program_type: s.program_type,
                    isPartTimeExternalAcademic: isPartTimeExternalAcademic
                });
                return isPartTimeExternalAcademic;
            }).length;
            
            // Part Time External (Industry) scholars
            const partTimeExternalIndustryCount = departmentScholars.filter(s => {
                const programType = s.program_type || '';
                const isPartTimeExternalIndustry = programType === 'Part Time External (Industry)';
                console.log(`🔍 Part Time External Industry check for scholar ${s.id}:`, {
                    program_type: s.program_type,
                    isPartTimeExternalIndustry: isPartTimeExternalIndustry
                });
                return isPartTimeExternalIndustry;
            }).length;
            
            console.log('📊 Program type counts:', {
                fullTime: fullTimeCount,
                partTimeInternal: partTimeInternalCount,
                partTimeExternal: partTimeExternalAcademicCount,
                partTimeExternalIndustry: partTimeExternalIndustryCount,
                totalDepartmentScholars: departmentScholars.length,
                totalCounted: fullTimeCount + partTimeInternalCount + partTimeExternalAcademicCount + partTimeExternalIndustryCount
            });
            
            updateFormData(prev => ({
                ...prev,
                // Use actual statistics from database
                applicationsReceived: totalApplications.toString(),
                totalCandidates: appearedForEntrance.toString(),
                attendedCandidates: attendedInterview.toString(),
                selectedCandidates: selectedCandidates.length.toString(),
                // Set marks automatically based on standard PhD examination pattern
                entranceMarks: '70',
                interviewMarks: '30',
                passingMarks: '60',
                candidatesTable: [
                    { program: 'Full Time', candidates: fullTimeCount.toString() },
                    { program: 'Part Time Internal', candidates: partTimeInternalCount.toString() },
                    { program: 'Part Time External-Academic', candidates: partTimeExternalAcademicCount.toString() },
                    { program: 'Part Time External-Industry', candidates: partTimeExternalIndustryCount.toString() }
                ],
                // Use only selected candidates with complete data for the final table
                selectedCandidatesTable: selectedCandidates.map(record => ({
                    name: record.registered_name || '',
                    applicationNumber: record.application_no || '',
                    category: record.type || 'Full Time',
                    entranceExam: Math.round(record.written_marks || 0).toString(),
                    interview: Math.round(record.interview_marks || 0).toString(),
                    totalMarks: Math.round(record.total_marks || 0).toString(),
                    remarks: 'Selected',
                    supervisor: record.supervisor_name || ''
                }))
            }));
            
            console.log('✅ Comprehensive data updated in form');
        } catch (err) {
            console.error('❌ Exception fetching comprehensive data:', err);
        } finally {
            setLoading(false);
        }
    };
    // Function to fetch interview panel data from examination_records table
    const fetchInterviewPanelData = async () => {
        if (!currentUser?.faculty || !currentUser?.department) {
            console.log('⚠️ Cannot fetch interview panel data - user faculty or department not available');
            return;
        }

        try {
            console.log('🔄 Fetching interview panel data from examination_records...');
            
            // Import the service function to get examination records
            const { fetchExaminationRecordsForInterview } = await import('../services/departmentScholarService');
            
            const { data, error } = await fetchExaminationRecordsForInterview(
                currentUser.department,
                currentUser.faculty
            );

            if (error) {
                console.error('❌ Error fetching interview panel data:', error);
                return;
            }

            if (data && data.length > 0) {
                console.log(`📥 Received ${data.length} examination records`);
                
                // Group records by panel and extract unique panel members
                const panelGroups = {};
                const uniqueMembers = new Map(); // Use Map to ensure uniqueness by name+designation+affiliation
                
                data.forEach(record => {
                    const panelId = record.panel || 'Panel 1';
                    
                    if (!panelGroups[panelId]) {
                        panelGroups[panelId] = {
                            panelName: panelId,
                            members: []
                        };
                    }
                    
                    // Extract examiner information and ensure uniqueness
                    [record.examiner1, record.examiner2, record.examiner3].forEach(examiner => {
                        if (examiner) {
                            const examinerParts = examiner.split(' | ');
                            if (examinerParts.length >= 3) {
                                const memberKey = `${examinerParts[0]}_${examinerParts[1]}_${examinerParts[2]}`;
                                
                                // Only add if not already exists (avoid duplicates)
                                if (!uniqueMembers.has(memberKey)) {
                                    const member = {
                                        name: examinerParts[0].trim(),
                                        designation: examinerParts[1].trim(),
                                        affiliation: examinerParts[2].trim()
                                    };
                                    
                                    uniqueMembers.set(memberKey, member);
                                    
                                    // Add to this panel's members if not already there
                                    const existsInPanel = panelGroups[panelId].members.some(m => 
                                        m.name === member.name && 
                                        m.designation === member.designation && 
                                        m.affiliation === member.affiliation
                                    );
                                    
                                    if (!existsInPanel) {
                                        panelGroups[panelId].members.push(member);
                                    }
                                }
                            }
                        }
                    });
                });
                
                // Convert panel groups to array and sort in ascending order
                const panelDataArray = Object.values(panelGroups).sort((a, b) => {
                    // Extract panel numbers for proper sorting (Panel 1, Panel 2, etc.)
                    const getPanelNumber = (panelName) => {
                        const match = panelName.match(/Panel\s*(\d+)/i);
                        return match ? parseInt(match[1]) : 0;
                    };
                    return getPanelNumber(a.panelName) - getPanelNumber(b.panelName);
                });
                setInterviewPanelData(panelDataArray);
                
                // Update form data with panel information
                // For the main interview panel, use the first panel's members
                const firstPanel = panelDataArray[0];
                const allUniqueMembers = Array.from(uniqueMembers.values());
                
                updateFormData(prev => ({
                    ...prev,
                    interviewPanel: [
                        ...(firstPanel?.members || []).slice(0, 3),
                        ...Array(Math.max(0, 3 - (firstPanel?.members?.length || 0))).fill({ name: '', designation: '', affiliation: '' })
                    ],
                    // Keep DRCC members as manually editable - don't populate from backend
                    // drccMembers remain as initialized (empty for manual entry)
                    // Store panel data for rendering separate tables
                    panelTables: panelDataArray
                }));
                
                console.log('✅ Interview panel data updated in form');
                console.log(`📊 Found ${panelDataArray.length} panels with unique members`);
                panelDataArray.forEach(panel => {
                    console.log(`   ${panel.panelName}: ${panel.members.length} members`);
                });
            }
        } catch (err) {
            console.error('❌ Exception fetching interview panel data:', err);
        }
    };
    const [formData, setFormData] = useState(() => {
        // Try to load saved data from localStorage first
        const savedData = loadFormDataFromStorage();
        if (savedData) {
            return savedData;
        }
        
        // Return default form data if no saved data exists
        return {
            // Page 1 data
            meetingDate: '',
            programme: 'Ph.D. Programme',
            meetingMonth: '',
            programmeStartDate: '',
            applicationsReceived: '',
            dateRange: '',
            examDate: '',
            examStartTime: '',
            examEndTime: '',
            screeningStartTime: '',
            screeningEndTime: '',
            faculty: 'FACULTY OF SCIENCE & HUMANITIES',
            department: 'DEPARTMENT OF MATHEMATICS',
            institution: 'SRMIST, Ramapuram',
            totalCandidates: '',
            attendedCandidates: '',
            entranceMarks: '',
            interviewMarks: '',
            passingMarks: '',
            relaxationPercentage: '',
            startDate: '',
            dean: 'Dean (S&H), Ramapuram Campus',
            
            // Tables data
            candidatesTable: [
                { program: 'Full Time', candidates: '' },
                { program: 'Part Time Internal', candidates: '' },
                { program: 'Part Time External-Academic', candidates: '' },
                { program: 'Part Time External-Industry', candidates: '' }
            ],
            
            drccMembers: [
                { name: '', designation: '', affiliation: '' },
                { name: '', designation: '', affiliation: '' },
                { name: '', designation: '', affiliation: '' }
            ],
            
            // Page 2 data
            mathematics: '',
            subjects: '',
            interviewPanel: [
                { name: '', designation: '', affiliation: '' },
                { name: '', designation: '', affiliation: '' },
                { name: '', designation: '', affiliation: '' }
            ],
            selectedCandidates: '',
            evaluationProcess: '',
            programme2: 'programme',
            department2: 'DEPARTMENT OF MATHEMATICS',
            faculty2: 'S&H',
            institution2: 'SRMIST-Ramapuram',
            
            // Page 3 data
            selectedCandidatesTable: [
                { 
                    name: '', 
                    applicationNumber: '', 
                    category: '', 
                    entranceExam: '', 
                    interview: '', 
                    totalMarks: '', 
                    remarks: '', 
                    supervisor: '' 
                },
                { 
                    name: '', 
                    applicationNumber: '', 
                    category: '', 
                    entranceExam: '', 
                    interview: '', 
                    totalMarks: '', 
                    remarks: '', 
                    supervisor: '' 
                }
            ],
            
            // Panel tables data (fetched from backend)
            panelTables: []
        };
    });

    // Custom setFormData function that also saves to localStorage
    const updateFormData = (updater) => {
        setFormData(prev => {
            const newData = typeof updater === 'function' ? updater(prev) : updater;
            // Save to localStorage whenever form data changes
            saveFormDataToStorage(newData);
            return newData;
        });
    };

    // Cleanup localStorage when user changes or component unmounts
    useEffect(() => {
        return () => {
            // Optional: Save current state before unmounting
            if (currentUser) {
                saveFormDataToStorage(formData);
            }
        };
    }, [currentUser, formData]);

    // Auto-populate faculty and department from currentUser when available
    useEffect(() => {
        if (currentUser && !userLoading) {
            console.log('🔄 Auto-populating faculty and department from currentUser:', {
                faculty: currentUser.faculty,
                department: currentUser.department
            });
            
            const facultyUpperCase = getFacultyUpperCase(currentUser.faculty);
            const departmentUpperCase = getDepartmentUpperCase(currentUser.department);
            
            updateFormData(prev => ({
                ...prev,
                faculty: facultyUpperCase,
                department: departmentUpperCase,
                department2: departmentUpperCase
            }));
            
            console.log('✅ Faculty and department auto-populated:', {
                faculty: facultyUpperCase,
                department: departmentUpperCase
            });
        }
    }, [currentUser, userLoading]);

    // Fetch data from Supabase when component mounts and user is available
    useEffect(() => {
        if (currentUser && !userLoading && currentUser.faculty && currentUser.department) {
            console.log('🔄 Fetching data for Minutes of Meeting...');
            fetchCandidatesData();
            fetchInterviewPanelData();
        }
    }, [currentUser, userLoading]);

    // Auto-refresh data every 30 seconds to ensure latest data is always shown
    useEffect(() => {
        if (currentUser && !userLoading && currentUser.faculty && currentUser.department) {
            const interval = setInterval(() => {
                console.log('🔄 Auto-refreshing data...');
                fetchCandidatesData();
                fetchInterviewPanelData();
            }, 30000); // Refresh every 30 seconds

            return () => clearInterval(interval);
        }
    }, [currentUser, userLoading]);

    // Refresh data when user returns to the tab/window
    useEffect(() => {
        const handleFocus = () => {
            if (currentUser && !userLoading && currentUser.faculty && currentUser.department) {
                console.log('🔄 Window focused - refreshing data...');
                fetchCandidatesData();
                fetchInterviewPanelData();
            }
        };

        window.addEventListener('focus', handleFocus);
        return () => window.removeEventListener('focus', handleFocus);
    }, [currentUser, userLoading]);
    const handleEdit = (field) => {
        console.log('handleEdit called with field:', field);
        setEditingField(field);
        console.log('editingField set to:', field);
    };

    const handleSave = (field, value) => {
        // Handle table field updates
        if (field.includes('selectedCandidatesTable_')) {
            const parts = field.split('_');
            const index = parseInt(parts[1]);
            const property = parts[2];
            
            updateFormData(prev => ({
                ...prev,
                selectedCandidatesTable: prev.selectedCandidatesTable.map((candidate, i) => 
                    i === index ? { ...candidate, [property]: value } : candidate
                )
            }));
        } else if (field.includes('candidatesTable_')) {
            const parts = field.split('_');
            const index = parseInt(parts[1]);
            const property = parts[2];
            
            updateFormData(prev => ({
                ...prev,
                candidatesTable: prev.candidatesTable.map((candidate, i) => 
                    i === index ? { ...candidate, [property]: value } : candidate
                )
            }));
        } else if (field.includes('drccMembers_')) {
            const parts = field.split('_');
            const index = parseInt(parts[1]);
            const property = parts[2];
            
            updateFormData(prev => ({
                ...prev,
                drccMembers: prev.drccMembers.map((member, i) => 
                    i === index ? { ...member, [property]: value } : member
                )
            }));
        } else if (field.includes('interviewPanel_')) {
            const parts = field.split('_');
            const index = parseInt(parts[1]);
            const property = parts[2];
            
            updateFormData(prev => ({
                ...prev,
                interviewPanel: prev.interviewPanel.map((member, i) => 
                    i === index ? { ...member, [property]: value } : member
                )
            }));
        } else {
            // Handle regular field updates
            const updates = { [field]: value };
            
            // Sync department field with department2
            if (field === 'department') {
                updates.department2 = value;
            }
            
            updateFormData(prev => ({
                ...prev,
                ...updates
            }));
        }
        setEditingField(null);
    };

    const handleCancel = () => {
        setEditingField(null);
    };

    const addDrccMember = () => {
        updateFormData(prev => ({
            ...prev,
            drccMembers: [
                ...prev.drccMembers,
                { name: '', designation: '', affiliation: '' }
            ]
        }));
    };

    const removeDrccMember = (index) => {
        if (formData.drccMembers.length > 1) { // Keep at least one row
            updateFormData(prev => ({
                ...prev,
                drccMembers: prev.drccMembers.filter((_, i) => i !== index)
            }));
        }
    };
    const handleSaveDocument = async () => {
        // Hide any open edit fields before saving
        setEditingField(null);
        
        // Small delay to ensure state updates
        setTimeout(async () => {
            try {
                const element = document.querySelector('.minutes-container');
                
                // Create canvas from the element with settings that preserve screen appearance
                const canvas = await html2canvas(element, {
                    scale: 2, // High quality
                    useCORS: true,
                    allowTaint: false,
                    backgroundColor: '#ffffff',
                    width: element.scrollWidth,
                    height: element.scrollHeight,
                    scrollX: 0,
                    scrollY: 0,
                    letterRendering: true,
                    logging: false,
                    imageTimeout: 15000,
                    foreignObjectRendering: false,
                    onclone: (clonedDoc) => {
                        // Ensure images are loaded in the cloned document
                        const images = clonedDoc.querySelectorAll('img');
                        images.forEach(img => {
                            if (img.src.startsWith('/')) {
                                img.src = window.location.origin + img.src;
                            }
                        });
                        
                        // Hide edit elements in cloned document and fix positioning
                        const editElements = clonedDoc.querySelectorAll('.print-hidden, .lucide, .lucide-edit-3, button');
                        editElements.forEach(el => {
                            el.style.display = 'none';
                        });
                        
                        // Remove gray backgrounds
                        const grayElements = clonedDoc.querySelectorAll('.bg-gray-50');
                        grayElements.forEach(el => {
                            el.style.backgroundColor = 'transparent';
                        });
                        
                        // Fix editable field positioning and styling
                        const editableSpans = clonedDoc.querySelectorAll('.cursor-pointer, span[title="Click to edit"]');
                        editableSpans.forEach(span => {
                            span.style.position = 'static';
                            span.style.display = 'inline';
                            span.style.padding = '0';
                            span.style.margin = '0';
                            span.style.border = 'none';
                            span.style.background = 'transparent';
                            span.style.minHeight = 'auto';
                            span.style.minWidth = 'auto';
                            span.style.verticalAlign = 'baseline';
                            span.style.lineHeight = 'inherit';
                            span.style.fontSize = 'inherit';
                            span.style.fontWeight = 'inherit';
                            span.style.color = 'inherit';
                            span.style.textDecoration = 'none';
                            span.style.borderBottom = 'none';
                            span.style.boxShadow = 'none';
                            span.style.transform = 'none';
                            span.style.zIndex = 'auto';
                        });

                        // Replace DRCC input/textarea elements with plain text spans for printing
                        const drccContainers = clonedDoc.querySelectorAll('.drcc-table-container');
                        drccContainers.forEach(container => {
                            const inputs = container.querySelectorAll('input, textarea');
                            inputs.forEach(inp => {
                                const span = clonedDoc.createElement('span');
                                span.textContent = inp.value || '';
                                span.style.display = 'inline-block';
                                span.style.padding = '0';
                                span.style.textAlign = inp.style.textAlign || 'center';
                                span.style.width = '100%';
                                span.style.whiteSpace = 'pre-wrap';
                                span.style.minHeight = inp.offsetHeight + 'px';
                                span.style.lineHeight = window.getComputedStyle(inp).lineHeight || '1.2';
                                span.style.verticalAlign = 'middle';
                                span.style.boxSizing = 'border-box';
                                inp.parentNode.replaceChild(span, inp);
                            });
                        });
                        
                        // Fix inline-flex elements that might cause positioning issues
                        const inlineFlexElements = clonedDoc.querySelectorAll('.inline-flex');
                        inlineFlexElements.forEach(el => {
                            el.style.display = 'inline';
                            el.style.position = 'static';
                            el.style.verticalAlign = 'baseline';
                        });
                        
                        // Fix group elements
                        const groupElements = clonedDoc.querySelectorAll('.group');
                        groupElements.forEach(el => {
                            el.style.display = 'inline';
                            el.style.position = 'static';
                        });
                        
                        // Ensure all text flows naturally
                        const allSpans = clonedDoc.querySelectorAll('span');
                        allSpans.forEach(span => {
                            if (!span.classList.contains('lucide') && !span.classList.contains('lucide-edit-3')) {
                                span.style.position = 'static';
                                span.style.display = 'inline';
                                span.style.verticalAlign = 'baseline';
                                span.style.lineHeight = 'inherit';
                                span.style.padding = '0';
                                span.style.margin = '0';
                                span.style.border = 'none';
                                span.style.background = 'transparent';
                                span.style.transform = 'none';
                                span.style.zIndex = 'auto';
                            }
                        });

                        // Remove any bottom borders on tables and last-row cells to avoid extra lines in PDF
                        const tables = clonedDoc.querySelectorAll('.minutes-container table');
                        tables.forEach(tbl => {
                            // ensure collapsed borders and remove spacing on cloned table
                            tbl.style.borderCollapse = 'collapse';
                            tbl.style.borderSpacing = '0';
                            tbl.style.border = 'none';

                            // Ensure every cell has a consistent 1px border
                            const allCells = tbl.querySelectorAll('td, th');
                            allCells.forEach(cell => {
                                cell.style.border = '1px solid black';
                                cell.style.boxSizing = 'border-box';
                            });

                            // Remove border-bottom for last row cells so no extra horizontal line appears
                            const rows = tbl.querySelectorAll('tr');
                            if (rows.length > 0) {
                                const lastRow = rows[rows.length - 1];
                                lastRow.querySelectorAll('td, th').forEach(cell => {
                                    cell.style.borderBottom = '1px solid black';
                                });
                            }

                            // Also handle tfoot if present
                            const tfoots = tbl.querySelectorAll('tfoot');
                            tfoots.forEach(tf => {
                                tf.querySelectorAll('td, th').forEach(cell => {
                                    cell.style.borderBottom = '1px solid black';
                                });
                            });
                        });

                        // Hide any <hr> elements in the cloned document
                        const hrs = clonedDoc.querySelectorAll('hr');
                        hrs.forEach(h => {
                            h.style.display = 'none';
                        });
                    },
                    ignoreElements: (element) => {
                        return element.tagName === 'BUTTON' || 
                               element.classList.contains('print-hidden') ||
                               element.classList.contains('lucide') ||
                               element.classList.contains('lucide-edit-3');
                    }
                });
                
                const imgData = canvas.toDataURL('image/png', 1.0);
                
                // Create PDF with A4 dimensions
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4',
                    compress: true
                });
                
                // A4 dimensions in mm
                const pdfWidth = 210;
                const pdfHeight = 297;
                const margin = 10; // Small margin
                
                const availableWidth = pdfWidth - (2 * margin);
                const availableHeight = pdfHeight - (2 * margin);
                
                // Calculate scaling to fit the content properly
                const imgWidth = canvas.width;
                const imgHeight = canvas.height;
                
                // Convert pixels to mm (assuming 96 DPI)
                const imgWidthMM = (imgWidth * 25.4) / 96;
                const imgHeightMM = (imgHeight * 25.4) / 96;
                
                // Scale to fit width
                const scaleFactor = availableWidth / imgWidthMM;
                const scaledWidth = availableWidth;
                const scaledHeight = imgHeightMM * scaleFactor;
                
                // Add content to PDF, splitting across pages if needed
                let remainingHeight = scaledHeight;
                let sourceY = 0;
                let pageNumber = 1;
                
                while (remainingHeight > 0) {
                    if (pageNumber > 1) {
                        pdf.addPage();
                    }
                    
                    const pageHeight = Math.min(remainingHeight, availableHeight);
                    const sourceHeight = (pageHeight / scaledHeight) * imgHeight;
                    
                    // Create a temporary canvas for this page section
                    // Add a small overlap to avoid seams between pages caused by image slicing
                    const overlap = 6; // pixels (increase overlap to ensure borders aren't cut)
                    const drawSourceY = Math.max(0, Math.round(sourceY - overlap));
                    const extra = (sourceY + sourceHeight < imgHeight) ? overlap : 0;
                    const drawSourceHeight = Math.min(imgHeight - drawSourceY, Math.round(sourceHeight + extra));

                    const pageCanvas = document.createElement('canvas');
                    pageCanvas.width = imgWidth;
                    pageCanvas.height = drawSourceHeight;
                    const pageCtx = pageCanvas.getContext('2d');

                    // Create temporary image
                    const tempImg = new Image();
                    await new Promise((resolve) => {
                        tempImg.onload = () => {
                            // Draw the (possibly slightly overlapped) section of the image for this page
                            pageCtx.drawImage(tempImg, 0, drawSourceY, imgWidth, drawSourceHeight, 0, 0, imgWidth, drawSourceHeight);
                            const pageImgData = pageCanvas.toDataURL('image/png', 1.0);

                            // Add this section to the PDF
                            pdf.addImage(pageImgData, 'PNG', margin, margin, scaledWidth, pageHeight, '', 'FAST');

                            resolve();
                        };
                        tempImg.src = imgData;
                    });
                    
                    remainingHeight -= pageHeight;
                    sourceY += sourceHeight;
                    pageNumber++;
                }
                
                // Generate filename with current date
                const currentDate = new Date().toISOString().split('T')[0];
                const meetingDate = formData.meetingDate ? formData.meetingDate.replace(/[\/\\:*?"<>|]/g, '-') : currentDate;
                const filename = `Minutes_of_Meeting_${meetingDate}.pdf`;
                
                // Download the PDF directly
                pdf.save(filename);
                
            } catch (error) {
                console.error('Error generating PDF:', error);
                alert('Error generating PDF. Please try again.');
            }
        }, 200);
    };
    const EditableField = ({ field, value, className = "", multiline = false, type = "text", hideIcon = false }) => {
        const isEditing = editingField === field;
        console.log('EditableField render:', { field, type, isEditing, editingField });
        
        // Determine if this field should be numeric
        const isNumericField = field.includes('applicationsReceived') || 
                              field.includes('totalCandidates') || 
                              field.includes('attendedCandidates') || 
                              field.includes('entranceMarks') || 
                              field.includes('interviewMarks') || 
                              field.includes('passingMarks') || 
                              field.includes('selectedCandidates') ||
                              field.includes('candidates') ||
                              field.includes('entranceExam') ||
                              field.includes('interview') ||
                              field.includes('totalMarks') ||
                              field.includes('relaxationPercentage');
        
        // Initialize all state at the top level
        const [tempDate, setTempDate] = useState(() => {
            if (type === "fullDate") {
                const dateValue = value || "10-11-2025";
                const [day, month, year] = dateValue.split("-");
                return {
                    day: day || "10",
                    month: month || "11", 
                    year: year || "2025"
                };
            } else if (type === "dateRange") {
                const rangeValue = value || "September 15, 2025 to October 31, 2025";
                const parts = rangeValue.split(" to ");
                const startPart = parts[0] || "September 15, 2025";
                const endPart = parts[1] || "October 31, 2025";
                
                // Parse start date
                const startMatch = startPart.match(/(\w+)\s+(\d+),\s+(\d+)/);
                const startMonth = startMatch ? startMatch[1] : "September";
                const startDay = startMatch ? startMatch[2] : "15";
                const startYear = startMatch ? startMatch[3] : "2025";
                
                // Parse end date
                const endMatch = endPart.match(/(\w+)\s+(\d+),\s+(\d+)/);
                const endMonth = endMatch ? endMatch[1] : "October";
                const endDay = endMatch ? endMatch[2] : "31";
                const endYear = endMatch ? endMatch[3] : "2025";
                
                return {
                    startMonth, startDay, startYear,
                    endMonth, endDay, endYear
                };
            } else if (type === "examDate") {
                // Parse exam date like "November 10, 2025"
                const dateValue = value || "November 10, 2025";
                const match = dateValue.match(/(\w+)\s+(\d+),\s+(\d+)/);
                const month = match ? match[1] : "November";
                const day = match ? match[2] : "10";
                const year = match ? match[3] : "2025";
                
                return { month, day, year };
            } else if (type === "monthYear") {
                const [month, year] = (value || "January-2026").split("-");
                return { month: month || "January", year: year || "2026" };
            }
            return { day: "10", month: "11", year: "2025" };
        });
        
        const [tempSubject, setTempSubject] = useState(value || "");
        const [tempTopics, setTempTopics] = useState(value || "");
        if (isEditing) {
            if (type === "monthYear") {
                const handleSaveMonthYear = () => {
                    const newValue = `${tempDate.month}-${tempDate.year}`;
                    handleSave(field, newValue);
                };
                
                return (
                    <div className="inline-flex items-center gap-2">
                        <select
                            value={tempDate.month}
                            className="border border-blue-500 rounded px-2 py-1 text-sm"
                            onChange={(e) => {
                                setTempDate(prev => ({ ...prev, month: e.target.value }));
                            }}
                            autoFocus
                        >
                            <option value="January">January</option>
                            <option value="February">February</option>
                            <option value="March">March</option>
                            <option value="April">April</option>
                            <option value="May">May</option>
                            <option value="June">June</option>
                            <option value="July">July</option>
                            <option value="August">August</option>
                            <option value="September">September</option>
                            <option value="October">October</option>
                            <option value="November">November</option>
                            <option value="December">December</option>
                        </select>
                        <select
                            value={tempDate.year}
                            className="border border-blue-500 rounded px-2 py-1 text-sm"
                            onChange={(e) => {
                                setTempDate(prev => ({ ...prev, year: e.target.value }));
                            }}
                        >
                            {Array.from({length: 81}, (_, i) => {
                                const yearOption = 2020 + i;
                                return <option key={yearOption} value={yearOption}>{yearOption}</option>;
                            })}
                        </select>
                        <button
                            onClick={handleSaveMonthYear}
                            className="text-green-600 hover:text-green-800 p-1"
                        >
                            <Save className="w-3 h-3" />
                        </button>
                        <button
                            onClick={handleCancel}
                            className="text-red-600 hover:text-red-800 p-1"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                );
            }
            
            if (type === "fullDate") {
                const handleSaveDate = () => {
                    const newValue = `${tempDate.day}-${tempDate.month}-${tempDate.year}`;
                    handleSave(field, newValue);
                };
                
                return (
                    <div className="inline-flex items-center gap-2">
                        <select
                            value={tempDate.day}
                            className="border border-blue-500 rounded px-2 py-1 text-sm"
                            onChange={(e) => {
                                setTempDate(prev => ({ ...prev, day: e.target.value }));
                            }}
                            autoFocus
                        >
                            {Array.from({length: 31}, (_, i) => {
                                const dayOption = String(i + 1).padStart(2, '0');
                                return <option key={dayOption} value={dayOption}>{dayOption}</option>;
                            })}
                        </select>
                        <select
                            value={tempDate.month}
                            className="border border-blue-500 rounded px-2 py-1 text-sm"
                            onChange={(e) => {
                                setTempDate(prev => ({ ...prev, month: e.target.value }));
                            }}
                        >
                            <option value="01">01</option>
                            <option value="02">02</option>
                            <option value="03">03</option>
                            <option value="04">04</option>
                            <option value="05">05</option>
                            <option value="06">06</option>
                            <option value="07">07</option>
                            <option value="08">08</option>
                            <option value="09">09</option>
                            <option value="10">10</option>
                            <option value="11">11</option>
                            <option value="12">12</option>
                        </select>
                        <select
                            value={tempDate.year}
                            className="border border-blue-500 rounded px-2 py-1 text-sm w-20"
                            onChange={(e) => {
                                setTempDate(prev => ({ ...prev, year: e.target.value }));
                            }}
                        >
                            {Array.from({length: 81}, (_, i) => {
                                const yearOption = 2020 + i;
                                return <option key={yearOption} value={yearOption}>{yearOption}</option>;
                            })}
                        </select>
                        <button
                            onClick={handleSaveDate}
                            className="text-green-600 hover:text-green-800 p-1"
                        >
                            <Save className="w-3 h-3" />
                        </button>
                        <button
                            onClick={handleCancel}
                            className="text-red-600 hover:text-red-800 p-1"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                );
            }
            if (type === "dateRange") {
                const handleSaveDateRange = () => {
                    const newValue = `${tempDate.startMonth} ${tempDate.startDay}, ${tempDate.startYear} to ${tempDate.endMonth} ${tempDate.endDay}, ${tempDate.endYear}`;
                    handleSave(field, newValue);
                };
                
                return (
                    <div className="inline-flex items-center gap-2 flex-wrap">
                        <div className="flex items-center gap-1">
                            <label className="text-xs text-gray-600">Start:</label>
                            <select
                                value={tempDate.startMonth}
                                className="border border-blue-500 rounded px-2 py-1 text-sm"
                                onChange={(e) => setTempDate(prev => ({ ...prev, startMonth: e.target.value }))}
                                autoFocus
                            >
                                <option value="January">January</option>
                                <option value="February">February</option>
                                <option value="March">March</option>
                                <option value="April">April</option>
                                <option value="May">May</option>
                                <option value="June">June</option>
                                <option value="July">July</option>
                                <option value="August">August</option>
                                <option value="September">September</option>
                                <option value="October">October</option>
                                <option value="November">November</option>
                                <option value="December">December</option>
                            </select>
                            <select
                                value={tempDate.startDay}
                                className="border border-blue-500 rounded px-2 py-1 text-sm"
                                onChange={(e) => setTempDate(prev => ({ ...prev, startDay: e.target.value }))}
                            >
                                {Array.from({length: 31}, (_, i) => {
                                    const dayOption = String(i + 1);
                                    return <option key={dayOption} value={dayOption}>{dayOption}</option>;
                                })}
                            </select>
                            <select
                                value={tempDate.startYear}
                                className="border border-blue-500 rounded px-2 py-1 text-sm"
                                onChange={(e) => setTempDate(prev => ({ ...prev, startYear: e.target.value }))}
                            >
                                {Array.from({length: 81}, (_, i) => {
                                    const yearOption = 2020 + i;
                                    return <option key={yearOption} value={yearOption}>{yearOption}</option>;
                                })}
                            </select>
                        </div>
                        <span className="text-sm text-gray-600">to</span>
                        <div className="flex items-center gap-1">
                            <label className="text-xs text-gray-600">End:</label>
                            <select
                                value={tempDate.endMonth}
                                className="border border-blue-500 rounded px-2 py-1 text-sm"
                                onChange={(e) => setTempDate(prev => ({ ...prev, endMonth: e.target.value }))}
                            >
                                <option value="January">January</option>
                                <option value="February">February</option>
                                <option value="March">March</option>
                                <option value="April">April</option>
                                <option value="May">May</option>
                                <option value="June">June</option>
                                <option value="July">July</option>
                                <option value="August">August</option>
                                <option value="September">September</option>
                                <option value="October">October</option>
                                <option value="November">November</option>
                                <option value="December">December</option>
                            </select>
                            <select
                                value={tempDate.endDay}
                                className="border border-blue-500 rounded px-2 py-1 text-sm"
                                onChange={(e) => setTempDate(prev => ({ ...prev, endDay: e.target.value }))}
                            >
                                {Array.from({length: 31}, (_, i) => {
                                    const dayOption = String(i + 1);
                                    return <option key={dayOption} value={dayOption}>{dayOption}</option>;
                                })}
                            </select>
                            <select
                                value={tempDate.endYear}
                                className="border border-blue-500 rounded px-2 py-1 text-sm"
                                onChange={(e) => setTempDate(prev => ({ ...prev, endYear: e.target.value }))}
                            >
                                {Array.from({length: 81}, (_, i) => {
                                    const yearOption = 2020 + i;
                                    return <option key={yearOption} value={yearOption}>{yearOption}</option>;
                                })}
                            </select>
                        </div>
                        <button
                            onClick={handleSaveDateRange}
                            className="text-green-600 hover:text-green-800 p-1"
                        >
                            <Save className="w-3 h-3" />
                        </button>
                        <button
                            onClick={handleCancel}
                            className="text-red-600 hover:text-red-800 p-1"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                );
            }
            
            if (type === "examDate") {
                const handleSaveExamDate = () => {
                    const newValue = `${tempDate.month} ${tempDate.day}, ${tempDate.year}`;
                    handleSave(field, newValue);
                };
                
                return (
                    <div className="inline-flex items-center gap-2">
                        <select
                            value={tempDate.month}
                            className="border border-blue-500 rounded px-2 py-1 text-sm"
                            onChange={(e) => setTempDate(prev => ({ ...prev, month: e.target.value }))}
                            autoFocus
                        >
                            <option value="January">January</option>
                            <option value="February">February</option>
                            <option value="March">March</option>
                            <option value="April">April</option>
                            <option value="May">May</option>
                            <option value="June">June</option>
                            <option value="July">July</option>
                            <option value="August">August</option>
                            <option value="September">September</option>
                            <option value="October">October</option>
                            <option value="November">November</option>
                            <option value="December">December</option>
                        </select>
                        <select
                            value={tempDate.day}
                            className="border border-blue-500 rounded px-2 py-1 text-sm"
                            onChange={(e) => setTempDate(prev => ({ ...prev, day: e.target.value }))}
                        >
                            {Array.from({length: 31}, (_, i) => {
                                const dayOption = String(i + 1);
                                return <option key={dayOption} value={dayOption}>{dayOption}</option>;
                            })}
                        </select>
                        <select
                            value={tempDate.year}
                            className="border border-blue-500 rounded px-2 py-1 text-sm"
                            onChange={(e) => setTempDate(prev => ({ ...prev, year: e.target.value }))}
                        >
                            {Array.from({length: 81}, (_, i) => {
                                const yearOption = 2020 + i;
                                return <option key={yearOption} value={yearOption}>{yearOption}</option>;
                            })}
                        </select>
                        <button
                            onClick={handleSaveExamDate}
                            className="text-green-600 hover:text-green-800 p-1"
                        >
                            <Save className="w-3 h-3" />
                        </button>
                        <button
                            onClick={handleCancel}
                            className="text-red-600 hover:text-red-800 p-1"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                );
            }
            
            if (type === "faculty") {
                return (
                    <FacultyDropdown 
                        value={value}
                        onSave={(newValue) => handleSave(field, newValue)}
                        onCancel={handleCancel}
                    />
                );
            }
            
            return (
                <div className="inline-flex items-center gap-2">
                    {multiline ? (
                        <textarea
                            defaultValue={value}
                            className="border border-blue-500 rounded px-2 py-1 text-sm"
                            rows={2}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSave(field, e.target.value);
                                } else if (e.key === 'Escape') {
                                    handleCancel();
                                }
                            }}
                            onBlur={(e) => handleSave(field, e.target.value)}
                            autoFocus
                            id={`input-${field}`}
                        />
                    ) : (
                        <input
                            type={isNumericField ? "number" : "text"}
                            defaultValue={value}
                            className="border border-blue-500 rounded px-2 py-1 text-sm"
                            min={isNumericField ? "0" : undefined}
                            step={isNumericField ? "1" : undefined}
                            onKeyDown={(e) => {
                                // For numeric fields, only allow numbers, backspace, delete, arrow keys, etc.
                                if (isNumericField) {
                                    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Enter', 'Escape'];
                                    const isNumber = /^[0-9]$/.test(e.key);
                                    const isDot = e.key === '.' && field.includes('relaxationPercentage'); // Allow decimal for percentage
                                    
                                    if (!allowedKeys.includes(e.key) && !isNumber && !isDot) {
                                        e.preventDefault();
                                        return;
                                    }
                                }
                                
                                if (e.key === 'Enter') {
                                    handleSave(field, e.target.value);
                                } else if (e.key === 'Escape') {
                                    handleCancel();
                                }
                            }}
                            onBlur={(e) => handleSave(field, e.target.value)}
                            autoFocus
                            id={`input-${field}`}
                        />
                    )}
                    <button
                        onClick={handleCancel}
                        className="text-red-600 hover:text-red-800 p-1"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </div>
            );
        }
        // Define placeholder text based on field type
        const getPlaceholder = (field) => {
            // For table fields, return empty string (no placeholder)
            if (field.includes('candidatesTable_') || 
                field.includes('drccMembers_') || 
                field.includes('interviewPanel_') || 
                field.includes('selectedCandidatesTable_')) {
                return '';
            }
            
            const placeholders = {
                meetingDate: '10-11-2025',
                meetingMonth: 'January-2026',
                programmeStartDate: 'January-2026',
                applicationsReceived: '50',
                dateRange: 'September 15, 2025 to October 31, 2025',
                examDate: 'November 10, 2025',
                examStartTime: '10:00 AM',
                examEndTime: '12:00 PM',
                screeningStartTime: '2:00 PM',
                screeningEndTime: '5:00 PM',
                totalCandidates: '45',
                attendedCandidates: '42',
                entranceMarks: '70',
                interviewMarks: '30',
                passingMarks: '60',
                relaxationPercentage: '5',
                startDate: '10-11-2025',
                mathematics: 'subject',
                subjects: 'Department expertise',
                selectedCandidates: '15',
                evaluationProcess: 'Comprehensive evaluation process'
            };
            return placeholders[field] || '';
        };

        return (
            <span 
                className={`${className} cursor-pointer hover:bg-gray-100 inline-flex items-center gap-1 min-h-[20px] min-w-[20px] ${!value ? 'text-gray-400 italic' : ''}`}
                onClick={() => {
                    console.log('EditableField clicked, field:', field, 'type:', type);
                    handleEdit(field);
                }}
                title="Click to edit"
            >
                {value || getPlaceholder(field)}
                {!hideIcon && !field.includes('candidatesTable_') && !field.includes('drccMembers_') && !field.includes('interviewPanel_') && !field.includes('selectedCandidatesTable_') && <Edit3 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100" />}
            </span>
        );
    };
    return (
        <div className="print-wrapper">
            <div className="w-full max-w-4xl mx-auto bg-white p-8 shadow-lg minutes-container">
                {/* Action Buttons */}
                <div className="flex justify-end gap-3 mb-6 print-hidden">
                    <button
                        onClick={handleSaveDocument}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                    >
                        <Download className="w-4 h-4" />
                        Print
                    </button>
                </div>

                {/* Header */}
              <div className="text-center mb-8">
    <div className="flex items-start justify-center mb-4 print-header-layout relative">
        {/* SRM Logo - Positioned absolutely to not affect text centering */}
        {/* SRM Logo - Positioned absolutely to not affect text centering */}
{/* SRM Logo - Positioned absolutely to not affect text centering */}
<div className="absolute left-2 top-2 z-50">
   <img 
       src="/srm-logo.png" 
       alt="SRM Institute Logo"
       style={{ width: '150px', height: 'auto', objectFit: 'contain' }}
   />
</div>


        {/* Header text - Centered in full width */}
        <div className="text-center w-full print-header-text">
                            <h1 className="text-xl font-bold text-blue-600 mb-1 text-center ml-16"> SRM INSTITUTE OF SCIENCE AND TECHNOLOGY</h1>
                            <h2 className="text-lg font-bold text-red-600 mb-1 text-center ml-8">
                                <EditableField field="faculty" value={formData.faculty} type="faculty" />
                            </h2>
                            <h3 className="text-lg font-bold text-center ml-8">
                                <DepartmentSelector 
                                    value={formData.department}
                                    faculty={formData.faculty}
                                    onChange={(newDept) => {
                                        updateFormData(prev => ({
                                            ...prev,
                                            department: newDept,
                                            department2: newDept
                                        }));
                                    }}
                                />
                            </h3>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="space-y-6 text-sm leading-loose group">
                    <div className="text-center font-bold">
                        <h3 className="-mt-4 mb-4">MINUTES OF THE DEPARTMENT RESEARCH COORDINATION COMMITTEE (DRCC)</h3>
                        <h3>
                        Meeting Held on <EditableField field="meetingDate" value={formData.meetingDate} type="fullDate" /> to Select Research Scholars for Ph.D. Programme (<EditableField field="meetingMonth" value={formData.meetingMonth} type="monthYear" />)
                        </h3>
                    </div>

                    <p>
                        The DRCC received <EditableField field="applicationsReceived" value={formData.applicationsReceived} /> applications from the Directorate of Research between <EditableField field="dateRange" value={formData.dateRange} type="dateRange" />. Candidates certificates were verified, and only eligible candidates were permitted to participate in the written examination.
                    </p>

                    <p>
                        The written examination and interview for admitting candidates to the Ph.D. programme({formData.meetingMonth}) at the {formData.department}, SRMIST, Ramapuram were conducted on <EditableField field="examDate" value={formData.examDate} type="examDate" />. The written examination was held from <EditableField field="examStartTime" value={formData.examStartTime} /> to <EditableField field="examEndTime" value={formData.examEndTime} />. Following this, the screening and selection committee for PhD program at the {getDepartmentTitleCase(formData.department)} convened from <EditableField field="screeningStartTime" value={formData.screeningStartTime} /> to <EditableField field="screeningEndTime" value={formData.screeningEndTime} /> to evaluate and select the applicants for Full time and Part time PhD program in the {getDepartmentTitleCase(formData.department)}, SRMIST, Ramapuram. A total of <EditableField field="totalCandidates" value={formData.totalCandidates} /> candidates appeared for the entrance test, and <EditableField field="attendedCandidates" value={formData.attendedCandidates} /> candidates attended the interview. The Rank list for the candidates has been prepared based on marks obtained by the candidates in Entrance exam (<EditableField field="entranceMarks" value={formData.entranceMarks} /> marks) and Presentation & Interview (<EditableField field="interviewMarks" value={formData.interviewMarks} /> marks) amounting to a total of 100 marks. Candidates who have scored <EditableField field="passingMarks" value={formData.passingMarks} /> marks and above have been selected. A <EditableField field="relaxationPercentage" value={formData.relaxationPercentage} />% relaxation has been given to candidates belonging to SC/ST OBC, Differently Abled, and Economically Weaker Sections for pursuing a Ph.D. in the {getDepartmentTitleCase(formData.department)}, SRMIST, Ramapuram, from {formData.meetingMonth}. The same has been approved by the Dean (S&H), Ramapuram Campus.
                    </p>
                    {/* Details of Candidates Table */}
                    <div className="mt-8">
                        <h3 className="font-bold mb-4">Details of the Candidates:</h3>
                        <div className="flex justify-center">
                            <table className="border-collapse border border-gray-800 bg-white" style={{width: '600px', tableLayout: 'fixed'}}>
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-800 py-2 px-3 text-center font-semibold text-gray-800" style={{width: '80px'}}>S. No.</th>
                                        <th className="border border-gray-800 py-2 px-3 text-center font-semibold text-gray-800" style={{width: '320px'}}>Program</th>
                                        <th className="border border-gray-800 py-2 px-3 text-center font-semibold text-gray-800" style={{width: '200px'}}>No. of Candidates applied</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.candidatesTable.map((row, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="border border-gray-800 py-2 px-3 text-center font-medium text-gray-700">{index + 1}</td>
                                            <td className="border border-gray-800 py-2 px-3 text-gray-700">{row.program}</td>
                                            <td className="border border-gray-800 py-2 px-3 text-center text-gray-700">
                                                {row.candidates || '0'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* DRCC Members Table */}
                    <div className="mt-8 drcc-table-section">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold">Details of DRCC Members:</h3>
                            <button
                                onClick={addDrccMember}
                                className="flex items-center gap-2 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 transition print-hidden"
                                type="button"
                            >
                                <span className="text-sm">+</span>
                                Add Member
                            </button>
                        </div>
                        <div className="flex justify-center drcc-table-container">
                            <table className="border-collapse border border-gray-800 bg-white" style={{width: '700px', tableLayout: 'fixed'}}>
                                <thead>
                                    <tr className="bg-gray-100">
                                        <th className="border border-gray-800 py-2 px-3 text-center font-semibold text-gray-800" style={{width: '80px'}}>S. No</th>
                                        <th className="border border-gray-800 py-2 px-3 text-center font-semibold text-gray-800" style={{width: '190px'}}>Name of the Faculty</th>
                                        <th className="border border-gray-800 py-2 px-3 text-center font-semibold text-gray-800" style={{width: '160px'}}>Designation</th>
                                        <th className="border border-gray-800 py-2 px-3 text-center font-semibold text-gray-800" style={{width: '190px'}}>Affiliation</th>
                                        <th className="border border-gray-800 py-2 px-3 text-center font-semibold text-gray-800 print-hidden" style={{width: '80px'}}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {formData.drccMembers.map((member, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="border border-gray-800 py-2 px-3 text-center font-medium text-gray-700">{index + 1}</td>
                                            <td className="border border-gray-800 py-2 px-3">
                                                <input
                                                    type="text"
                                                    value={member.name}
                                                    onChange={(e) => handleSave(`drccMembers_${index}_name`, e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleSave(`drccMembers_${index}_name`, e.target.value);
                                                            e.target.blur();
                                                        }
                                                    }}
                                                    className="w-full border-none bg-transparent px-1 py-1 text-left outline-none appearance-none focus:outline-none focus:ring-0 rounded-none shadow-none"
                                                    style={{ boxShadow: 'none' }}
                                                />
                                            </td>
                                            <td className="border border-gray-800 py-2 px-3">
                                                <input
                                                    type="text"
                                                    value={member.designation}
                                                    onChange={(e) => handleSave(`drccMembers_${index}_designation`, e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleSave(`drccMembers_${index}_designation`, e.target.value);
                                                            e.target.blur();
                                                        }
                                                    }}
                                                    className="w-full border-none bg-transparent px-1 py-1 text-left outline-none appearance-none focus:outline-none focus:ring-0 rounded-none shadow-none"
                                                    style={{ boxShadow: 'none' }}
                                                />
                                            </td>
                                            <td className="border border-gray-800 py-2 px-3">
                                                <input
                                                    type="text"
                                                    value={member.affiliation}
                                                    onChange={(e) => handleSave(`drccMembers_${index}_affiliation`, e.target.value)}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            e.preventDefault();
                                                            handleSave(`drccMembers_${index}_affiliation`, e.target.value);
                                                            e.target.blur();
                                                        }
                                                    }}
                                                    className="w-full border-none bg-transparent px-1 py-1 text-left outline-none appearance-none focus:outline-none focus:ring-0 rounded-none shadow-none"
                                                    style={{ boxShadow: 'none' }}
                                                />
                                            </td>
                                            <td className="border border-gray-800 py-2 px-3 text-center print-hidden">
                                                {formData.drccMembers.length > 1 && (
                                                    <button
                                                        onClick={() => removeDrccMember(index)}
                                                        className="text-red-600 hover:text-red-800 hover:bg-red-50 p-1 rounded transition-colors"
                                                        title="Remove this member"
                                                        type="button"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Page 2 Content */}
                    <div className="mt-12 space-y-6">
                        <div>
                            <h3 className="font-bold mb-4">Test Structure and Content:</h3>
                            <p className="mb-4">
                                The entrance examination comprised a written test, an interview, and a presentation. The overall 
                                admission process was evaluated with a weightage of 70% for the written test and 30% for the interview 
                                and presentation.
                            </p>
                            
                            <p className="mb-4">
                                <strong>1. Written Examination:</strong> The written test assesses candidates' knowledge in research methodology, 
                                respective fields of specialization within <EditableField field="mathematics" value={formData.mathematics} />. It covered a wide range of topics which include{' '}
                                <EditableField field="subjects" value={formData.subjects} />. The questions were 
                                designed to evaluate candidates' understanding of fundamental concepts, analytical skills and problem-solving abilities.
                            </p>
                            
                            <p className="mb-4">
                                <strong>2. Interview:</strong> Following the written examination, shortlisted candidates underwent a comprehensive 
                                interview conducted by a panel of faculty members from the {getDepartmentTitleCase(formData.department)}. The interview 
                                aimed to assess candidates' research potential, motivation, academic background, and suitability for 
                                pursuing doctoral studies in the department. Candidates were evaluated based on their research interests, 
                                previous academic achievements, publications (if any), and their ability to articulate their research goals and 
                                aspirations.
                            </p>
                            
                            <p className="mb-4">
                                <strong>3. Presentation:</strong> After the interview, candidates were asked to present their intended research 
                                topic and problem statement. The presentation was used to evaluate the groundwork completed by the 
                                applicant in their chosen research area.
                            </p>
                        </div>
                        {/* Details of Interview Panel Members - Single Title at Top */}
                        <div className="mt-8">
                            <h3 className="font-bold mb-4">Details of Interview Panel Members:</h3>
                            
                            {/* Panel-wise Tables - Fetched from Backend */}
                            {formData.panelTables && formData.panelTables.length > 0 ? (
                                formData.panelTables.map((panel, panelIndex) => (
                                    <div key={panelIndex} className="mb-8">
                                        <h4 className="font-semibold mb-3 text-blue-600">{panel.panelName}:</h4>
                                        
                                        {/* Panel Members Table */}
                                        <div className="flex justify-center">
                                            <table className="border-collapse border border-black mb-4" style={{width: '700px', tableLayout: 'fixed'}}>
                                                <thead>
                                                    <tr>
                                                        <th className="border border-black py-2 px-3 text-center bg-gray-100" style={{width: '80px'}}>S. No</th>
                                                        <th className="border border-black py-2 px-3 text-center bg-gray-100" style={{width: '200px'}}>Name of the Faculty</th>
                                                        <th className="border border-black py-2 px-3 text-center bg-gray-100" style={{width: '180px'}}>Designation</th>
                                                        <th className="border border-black py-2 px-3 text-center bg-gray-100" style={{width: '240px'}}>Affiliation</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {panel.members.map((member, memberIndex) => (
                                                        <tr key={memberIndex}>
                                                            <td className="border border-black py-2 px-3 text-center">{memberIndex + 1}</td>
                                                            <td className="border border-black py-2 px-3">{member.name}</td>
                                                            <td className="border border-black py-2 px-3">{member.designation}</td>
                                                            <td className="border border-black py-2 px-3">{member.affiliation}</td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                /* Fallback: Show editable table if no panel data is available */
                                <div className="flex justify-center">
                                    <table className="border-collapse border border-black" style={{width: '700px', tableLayout: 'fixed'}}>
                                        <thead>
                                            <tr>
                                                <th className="border border-black py-2 px-3 text-center bg-gray-100" style={{width: '80px'}}>S. No</th>
                                                <th className="border border-black py-2 px-3 text-center bg-gray-100" style={{width: '200px'}}>Name of the Faculty</th>
                                                <th className="border border-black py-2 px-3 text-center bg-gray-100" style={{width: '180px'}}>Designation</th>
                                                <th className="border border-black py-2 px-3 text-center bg-gray-100" style={{width: '240px'}}>Affiliation</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {formData.interviewPanel.map((member, index) => (
                                                <tr key={index}>
                                                    <td className="border border-black py-2 px-3 text-center">{index + 1}</td>
                                                    <td className="border border-black py-2 px-3 align-middle">
                                                        <span className="w-full px-1 py-1 block">{member.name}</span>
                                                    </td>
                                                    <td className="border border-black py-2 px-3 align-middle">
                                                        <span className="w-full px-1 py-1 block">{member.designation}</span>
                                                    </td>
                                                    <td className="border border-black py-2 px-3 align-middle">
                                                        <span className="w-full px-1 py-1 block">{member.affiliation}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>

                        <div className="mt-8 space-y-4">
                            <p>
                                <strong>Evaluation and Selection Process:</strong> After the completion of the written test, the answer sheets were 
                                evaluated. Subsequently, candidates were invited for the interview round. The interview panel reviewed 
                                each candidate's performance and qualifications and finalized the list of selected candidates for admission 
                                to the Ph.D. program ({formData.meetingMonth}).
                            </p>
                            
                            <p>
                                <strong>Conclusion:</strong> Based on the written examination and interview performance, <EditableField field="selectedCandidates" value={formData.selectedCandidates} /> candidates were selected 
                                to pursue the Ph.D. programme in the {getDepartmentTitleCase(formData.department2)}, S&H, SRMIST-Ramapuram.
                            </p>
                            
                            <p>
                                The DRCC, in consultation with the Dean (S&H), allocated supervisors to the selected candidates. If 
                                the selected candidates do not join the PhD program, reallocation of guides may be done by the DRCC at 
                                an appropriate time.
                            </p>
                        </div>
                        {/* Page 3 Content - Selected Candidates Table */}
                        <div className="mt-12">
                            <p className="mb-6">
                                The names of the selected candidates and the Name of the supervisor are given below.
                            </p>

                            <div className="flex justify-center">
                                <table className="selected-candidates-table border-collapse border border-black" style={{width: '100%', maxWidth: '900px', tableLayout: 'fixed'}}>
                                    <thead>
                                        <tr>
                                            <th rowSpan="2" className="border border-black py-2 px-2 text-center bg-gray-100" style={{width: '5%'}}>S. No.</th>
                                            <th rowSpan="2" className="border border-black py-2 px-2 text-center bg-gray-100" style={{width: '16%'}}>Name</th>
                                            <th rowSpan="2" className="border border-black py-2 px-2 text-center bg-gray-100" style={{width: '12%'}}>Application Number</th>
                                            <th rowSpan="2" className="border border-black py-2 px-2 text-center bg-gray-100" style={{width: '11%'}}>Category (FT/PTI/ PTE)</th>
                                            <th colSpan="3" className="border border-black py-2 px-2 text-center bg-gray-100" style={{width: '27%'}}>Marks Obtained</th>
                                            <th rowSpan="2" className="border border-black py-2 px-2 text-center bg-gray-100" style={{width: '12%'}}>Remarks (Selected/ Not Selected)</th>
                                            <th rowSpan="2" className="border border-black py-2 px-2 text-center bg-gray-100" style={{width: '11%'}}>Name of the Supervisor, Designation & Department Name</th>
                                        </tr>
                                        <tr>
                                            <th className="border border-black py-2 px-2 text-center bg-gray-100" style={{width: '9%'}}>Entrance Exam (70)</th>
                                            <th className="border border-black py-2 px-2 text-center bg-gray-100" style={{width: '9%'}}>Interview (30)</th>
                                            <th className="border border-black py-2 px-2 text-center bg-gray-100" style={{width: '9%'}}>Total Marks (100)</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {formData.selectedCandidatesTable.map((candidate, index) => (
                                            <tr key={index}>
                                                <td className="border border-black py-2 px-2 text-center">{index + 1}</td>
                                                <td className="border border-black py-2 px-2 text-center">
                                                    <span className="w-full px-1 py-1 text-sm block text-center">{candidate.name}</span>
                                                </td>
                                                <td className="border border-black py-2 px-2 text-center">
                                                    <span className="w-full px-1 py-1 text-sm block text-center">{candidate.applicationNumber}</span>
                                                </td>
                                                <td className="border border-black py-2 px-2 text-center">
                                                    <span className="w-full px-1 py-1 text-sm block text-center">{candidate.category}</span>
                                                </td>
                                                <td className="border border-black py-2 px-2 text-center">
                                                    <span className="w-full px-1 py-1 text-sm block text-center">{candidate.entranceExam}</span>
                                                </td>
                                                <td className="border border-black py-2 px-2 text-center">
                                                    <span className="w-full px-1 py-1 text-sm block text-center">{candidate.interview}</span>
                                                </td>
                                                <td className="border border-black py-2 px-2 text-center">
                                                    <span className="w-full px-1 py-1 text-sm block text-center">{candidate.totalMarks}</span>
                                                </td>
                                                <td className="border border-black py-2 px-2 text-center">
                                                    <span className="w-full px-1 py-1 text-sm block text-center">{candidate.remarks}</span>
                                                </td>
                                                <td className="border border-black py-2 px-2 text-center">
                                                    <span className="w-full px-1 py-1 text-sm block whitespace-pre-wrap text-center">{candidate.supervisor}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            <div className="table-legend">
                                <div className="legend-items">
                                    <span className="legend-item">FT - Full Time</span>
                                    <span className="legend-item">PTI - Part Time Internal</span>
                                    <span className="legend-item">PTE - Part Time External</span>
                                </div>
                            </div>
                        </div>

                        {/* Signature Section */}
                        <div className="flex justify-between items-end" style={{marginTop: '5cm'}}>
                            <div className="text-left">
                                <div className="mb-16">
                                    <div className="border-b border-black w-64 mb-2"></div>
                                    <p className="text-sm">Name and Signature of DRCC member</p>
                                </div>
                            </div>
                            <div className="text-right">
                                <div className="mb-16">
                                    <div className="border-b border-black w-32 mb-2 ml-auto"></div>
                                    <p className="text-sm">Dean (S & H)</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
// Faculty dropdown component
const FacultyDropdown = ({ value, onSave, onCancel }) => {
    const faculties = [
        "FACULTY OF ENGINEERING & TECHNOLOGY",
        "FACULTY OF SCIENCE & HUMANITIES",
        "FACULTY OF MEDICAL AND HEALTH SCIENCES",
        "FACULTY OF MANAGEMENT AND STUDIES"
    ];
    
    return (
        <div className="inline-flex items-center gap-2">
            <select
                value={value}
                className="border border-blue-500 rounded px-2 py-1 text-sm"
                onChange={(e) => onSave(e.target.value)}
                autoFocus
            >
                {faculties.map((faculty) => (
                    <option key={faculty} value={faculty}>{faculty}</option>
                ))}
            </select>
            <button
                onClick={onCancel}
                className="text-red-600 hover:text-red-800 p-1"
            >
                <X className="w-3 h-3" />
            </button>
        </div>
    );
};

// Simple Department Selector Component
const DepartmentSelector = ({ value, faculty, onChange }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [tempValue, setTempValue] = useState(value);
    
    const departmentsByFaculty = {
        'FACULTY OF ENGINEERING & TECHNOLOGY': [
            'DEPARTMENT OF MECHANICAL ENGINEERING',
            'DEPARTMENT OF ELECTRONICS AND COMMUNICATION ENGINEERING',
            'DEPARTMENT OF ELECTRICAL AND ELECTRONICS ENGINEERING',
            'DEPARTMENT OF CIVIL ENGINEERING',
            'DEPARTMENT OF COMPUTER SCIENCE AND ENGINEERING',
            'DEPARTMENT OF MATHEMATICS',
            'DEPARTMENT OF PHYSICS',
            'DEPARTMENT OF CHEMISTRY',
            'DEPARTMENT OF ENGLISH',
            'DEPARTMENT OF BIOTECHNOLOGY',
            'DEPARTMENT OF BIOMEDICAL ENGINEERING'
        ],
        'FACULTY OF SCIENCE & HUMANITIES': [
            'DEPARTMENT OF COMMERCE',
            'DEPARTMENT OF VISUAL COMMUNICATION',
            'DEPARTMENT OF COMPUTER SCIENCE',
            'DEPARTMENT OF BIOTECHNOLOGY',
            'DEPARTMENT OF MATHEMATICS',
            'DEPARTMENT OF TAMIL',
            'DEPARTMENT OF ENGLISH & FOREIGN LANGUAGES',
            'DEPARTMENT OF FASHION DESIGNING'
        ],
        'FACULTY OF MEDICAL AND HEALTH SCIENCES': [
            'DEPARTMENT OF ORTHODONTICS',
            'DEPARTMENT OF PROSTHODONTICS',
            'DEPARTMENT OF CONSERVATIVE DENTISTRY & ENDODONTICS',
            'DEPARTMENT OF ORAL AND MAXILLOFACIAL SURGERY',
            'DEPARTMENT OF PERIODONTICS & ORAL IMPLANTOLOGY',
            'DEPARTMENT OF ORAL AND MAXILLOFACIAL PATHOLOGY AND MICROBIOLOGY',
            'DEPARTMENT OF PUBLIC HEALTH DENTISTRY',
            'DEPARTMENT OF PEDIATRIC & PREVENTIVE DENTISTRY',
            'DEPARTMENT OF ORAL MEDICINE AND ORAL RADIOLOGY',
            'DEPARTMENT OF BASIC MEDICAL SCIENCES'
        ],
        'FACULTY OF MANAGEMENT AND STUDIES': [
            'DEPARTMENT OF MANAGEMENT STUDIES'
        ]
    };
    
    const availableDepartments = departmentsByFaculty[faculty] || departmentsByFaculty['FACULTY OF SCIENCE & HUMANITIES'];
    
    const handleSave = () => {
        onChange(tempValue);
        setIsEditing(false);
    };
    
    const handleCancel = () => {
        setTempValue(value);
        setIsEditing(false);
    };
    
    if (isEditing) {
        return (
            <div className="inline-flex items-center gap-2">
                <select
                    value={tempValue}
                    onChange={(e) => {
                        setTempValue(e.target.value);
                        onChange(e.target.value);
                        setIsEditing(false);
                    }}
                    className="border border-blue-500 rounded px-2 py-1 text-sm min-w-[400px]"
                    autoFocus
                >
                    {availableDepartments.map((dept, index) => (
                        <option key={`${dept}-${index}`} value={dept}>
                            {dept}
                        </option>
                    ))}
                </select>
                <button
                    onClick={handleCancel}
                    className="text-red-600 hover:text-red-800 p-1"
                    type="button"
                >
                    <X className="w-3 h-3" />
                </button>
            </div>
        );
    }
    
    return (
        <span 
            className="cursor-pointer hover:bg-gray-100 inline-flex items-center gap-1 min-h-[20px] min-w-[20px]"
            onClick={() => setIsEditing(true)}
            title="Click to edit"
        >
            {value || 'DEPARTMENT OF MATHEMATICS'}
            <Edit3 className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100" />
        </span>
    );
};