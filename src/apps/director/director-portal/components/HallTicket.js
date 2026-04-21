import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../../supabaseClient';
import './ScholarManagement.css';
import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

// Resolve the subfolder ID for a given appNo inside the root folder
const resolveAppSubfolder = async (rootFolderId, appNo, apiKey) => {
  const q = encodeURIComponent(`'${rootFolderId}' in parents and name = '${appNo}' and mimeType = 'application/vnd.google-apps.folder' and trashed=false`);
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&key=${apiKey}&supportsAllDrives=true&includeItemsFromAllDrives=true`);
  const data = await res.json();
  return (data.files || [])[0]?.id || null;
};

// Fetch a Drive image as base64 for a given folder + filename prefix
// Structure: rootFolder/{appNo}/P{appNo}.png or S{appNo}.png
const fetchDriveImageBase64 = async (folderId, appNo, prefix) => {
  const apiKey = process.env.REACT_APP_GOOGLE_API_KEY;
  if (!apiKey || !folderId || !appNo) return null;
  try {
    // Step 1: find the subfolder named after the application number
    const subFolderId = await resolveAppSubfolder(folderId, appNo, apiKey);
    const searchFolderId = subFolderId || folderId; // fallback to root if no subfolder found

    // Step 2: find the image file inside that subfolder
    const fileName = `${prefix}${appNo}`;
    const q = encodeURIComponent(`'${searchFolderId}' in parents and name contains '${fileName}' and trashed=false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,thumbnailLink)&key=${apiKey}&supportsAllDrives=true&includeItemsFromAllDrives=true`);
    const data = await res.json();
    const match = (data.files || []).find(f => f.name.toLowerCase().startsWith(fileName.toLowerCase()));
    if (!match) { console.warn(`[fetchDriveImageBase64] No file found for ${fileName}`); return null; }

    // Step 3: fetch image as blob (direct media download)
    try {
      const imgRes = await fetch(`https://www.googleapis.com/drive/v3/files/${match.id}?alt=media&key=${apiKey}`);
      if (imgRes.ok) {
        const blob = await imgRes.blob();
        return await new Promise(resolve => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });
      }
    } catch { /* fall through to thumbnail */ }

    // Fallback: thumbnailLink
    let thumbUrl = match.thumbnailLink;
    if (!thumbUrl) {
      const meta = await fetch(`https://www.googleapis.com/drive/v3/files/${match.id}?fields=thumbnailLink&key=${apiKey}`).then(r => r.json());
      thumbUrl = meta.thumbnailLink;
    }
    if (!thumbUrl) { console.warn(`[fetchDriveImageBase64] No thumbnailLink for ${match.name}`); return null; }
    thumbUrl = thumbUrl.replace(/=s\d+$/, '=s800');
    const imgRes = await fetch(thumbUrl);
    if (!imgRes.ok) return null;
    const blob = await imgRes.blob();
    return await new Promise(resolve => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch (e) { console.error(`[fetchDriveImageBase64] Error:`, e); return null; }
};

const extractFolderIdFromUrl = (url) => {
  if (!url) return null;
  const match = url.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
};

// DriveImage: loads photo (prefix P) or signature (prefix S) from a publicly shared Drive folder.
// Uses Google Drive API v3 with a public API key (no OAuth needed for publicly shared folders).
const DriveImage = ({ folderId, appNo, prefix, alt, style, fallbackText }) => {
  const [imgSrc, setImgSrc] = useState(null);
  const [tried, setTried] = useState(false);

  useEffect(() => {
    if (!folderId || !appNo) { setTried(true); return; }
    const apiKey = process.env.REACT_APP_GOOGLE_API_KEY;
    if (!apiKey || apiKey === 'your_google_api_key_here') { setTried(true); return; }

    const fileName = `${prefix}${appNo}`;

    // Step 1: resolve subfolder named after appNo, then search inside it
    resolveAppSubfolder(folderId, appNo, apiKey)
      .then(subFolderId => {
        const searchId = subFolderId || folderId;
        const q = encodeURIComponent(`'${searchId}' in parents and name contains '${fileName}' and trashed=false`);
        return fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,thumbnailLink)&key=${apiKey}&supportsAllDrives=true&includeItemsFromAllDrives=true`)
          .then(r => r.json());
      })
      .then(async data => {
        const files = data.files || [];
        const match = files.find(f => f.name.toLowerCase().startsWith(fileName.toLowerCase()));
        if (!match) { setTried(true); return; }

        try {
          const imgRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${match.id}?alt=media&key=${apiKey}`
          );
          const blob = await imgRes.blob();
          const reader = new FileReader();
          reader.onloadend = () => { setImgSrc(reader.result); setTried(true); };
          reader.readAsDataURL(blob);
        } catch {
          const thumbUrl = match.thumbnailLink
            ? match.thumbnailLink.replace(/=s\d+$/, '=s600')
            : null;
          if (thumbUrl) setImgSrc(thumbUrl);
          setTried(true);
        }
      })
      .catch(() => setTried(true));
  }, [folderId, appNo, prefix]);

  if (!tried && folderId && appNo) {
    return (
      <div style={{ ...style, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb' }}>
        <span style={{ fontSize: '10px', color: '#9ca3af' }}>Loading...</span>
      </div>
    );
  }

  if (imgSrc) {
    return (
      <img
        src={imgSrc}
        alt={alt}
        referrerPolicy="no-referrer"
        style={style}
        onError={(e) => {
          console.error(`[DriveImage] Image failed to load:`, imgSrc);
          e.target.style.display = 'none';
          const span = document.createElement('span');
          span.style.cssText = 'font-size:10px;color:#9ca3af;text-align:center;padding:4px;white-space:pre-line;';
          span.innerText = fallbackText || alt;
          e.target.parentElement.appendChild(span);
        }}
      />
    );
  }

  return (
    <span style={{ fontSize: '10px', color: '#9ca3af', textAlign: 'center', padding: '4px', whiteSpace: 'pre-line' }}>
      {fallbackText || alt}
    </span>
  );
};

const HallTicket = ({ isSidebarMinimized, onFullscreenChange, onModalStateChange }) => {
  const [scholars, setScholars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDept, setSelectedDept] = useState('');
  const [selectedProgram, setSelectedProgram] = useState('');
  const [selectedScholars, setSelectedScholars] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [programs, setPrograms] = useState([]);

  // Preview Modal
  const [previewScholar, setPreviewScholar] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const hallTicketRef = useRef(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [generationProgress, setGenerationProgress] = useState({ current: 0, total: 0 });
  const [messageBox, setMessageBox] = useState({ show: false, text: '', type: 'info' });

  useEffect(() => {
    fetchApprovedScholars();
  }, []);

  const fetchApprovedScholars = async () => {
    setLoading(true);
    try {
      // Prompt specification: ONLY scholars whose status is "Approved"
      // Since the system uses dept_review = accepted/approved or status = Verified/Approved
      // We will fetch where dept_review is accepted/approved 
      const { data, error } = await supabase
        .from('scholar_applications')
        .select('*');

      if (error) throw error;

      // Filter locally for simplicity (assuming eligible means Approved)
      const approved = data.filter(s => {
        const review = (s.dept_review || '').toLowerCase();
        return review === 'accepted' || review === 'approved' || s.status === 'Verified' || s.status === 'Approved' || s.status === 'Admitted' || s.status === 'Generated';
      }).map(s => ({ ...s, hall_ticket_generated: s.status === 'Generated' }));

      setScholars(approved);

      // Extract unique departments and programs for filters
      const depts = [...new Set(approved.map(s => s.department).filter(Boolean))];
      const progs = [...new Set(approved.map(s => s.program).filter(Boolean))];

      setDepartments(depts.sort());
      setPrograms(progs.sort());

    } catch (error) {
      console.error('Error fetching approved scholars:', error);
      showMessage('Failed to load scholars', 'error');
    } finally {
      setLoading(false);
    }
  };

  const showMessage = (text, type = 'info') => {
    setMessageBox({ show: true, text, type });
    setTimeout(() => setMessageBox({ show: false, text: '', type: 'info' }), 3000);
  };

  // Filter scholars
  const filteredScholars = scholars.filter(scholar => {
    const matchesSearch =
      (scholar.registered_name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (scholar.application_no?.toLowerCase() || '').includes(searchTerm.toLowerCase());

    const matchesDept = selectedDept ? scholar.department === selectedDept : true;
    const matchesProgram = selectedProgram ? scholar.program === selectedProgram : true;

    return matchesSearch && matchesDept && matchesProgram;
  });

  // Bulk select toggles
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedScholars(filteredScholars.map(s => s.id));
    } else {
      setSelectedScholars([]);
    }
  };

  const handleSelectScholar = (id) => {
    setSelectedScholars(prev =>
      prev.includes(id) ? prev.filter(sId => sId !== id) : [...prev, id]
    );
  };

  const openPreview = (scholar) => {
    setPreviewScholar(scholar);
    setShowPreviewModal(true);
    if (onModalStateChange) onModalStateChange(true);
  };

  const closePreview = () => {
    setShowPreviewModal(false);
    setPreviewScholar(null);
    if (onModalStateChange) onModalStateChange(false);
  };

  const generateSinglePDF = async (scholarRef, scholarData, download = true) => {
    try {
      const folderId = extractFolderIdFromUrl(scholarData.certificates);
      const appNo = scholarData.application_no;

      const [photoB64, sigB64] = await Promise.all([
        fetchDriveImageBase64(folderId, appNo, 'P'),
        fetchDriveImageBase64(folderId, appNo, 'S'),
      ]);

      // Fetch SRM logo as base64
      let logoB64 = null;
      try {
        const logoRes = await fetch(`${process.env.PUBLIC_URL}/srm-logo.png`);
        const logoBlob = await logoRes.blob();
        logoB64 = await new Promise(resolve => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(logoBlob);
        });
      } catch { /* logo optional */ }

      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfW = pdf.internal.pageSize.getWidth();
      const pdfH = pdf.internal.pageSize.getHeight();
      const lm = 15; // left margin
      const rm = pdfW - 15; // right margin
      const contentW = rm - lm;
      let y = 15;

      const checkNewPage = (neededSpace = 10) => {
        if (y + neededSpace > pdfH - 20) {
          pdf.addPage();
          y = 15;
        }
      };

      // ── Header ──────────────────────────────────────────────
      if (logoB64) {
        const logoFmt = logoB64.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        pdf.addImage(logoB64, logoFmt, lm, y - 2, 22, 22);
      }
      pdf.setFontSize(11); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(180, 0, 0);
      pdf.text(`FACULTY OF ${(scholarData.faculty || 'ENGINEERING & TECHNOLOGY').toUpperCase().replace('FACULTY OF', '')}`, rm, y, { align: 'right' });
      y += 6;
      pdf.setFontSize(10); pdf.setTextColor(0, 0, 0);
      pdf.text(`DEPARTMENT OF ${(scholarData.department || '').toUpperCase()}`, rm, y, { align: 'right' });
      y += 6;
      if (logoB64) y = Math.max(y, 38);
      pdf.setDrawColor(180, 0, 0); pdf.setLineWidth(0.5);
      pdf.line(lm, y, rm, y); y += 8;

      // ── Title ────────────────────────────────────────────────
      pdf.setFontSize(14); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(0, 0, 0);
      pdf.text('PhD Entrance Exam \u2013 July 2026', pdfW / 2, y, { align: 'center' }); y += 8;
      pdf.setFontSize(13); pdf.setTextColor(180, 0, 0);
      pdf.setDrawColor(180, 0, 0); pdf.setLineWidth(0.5);
      pdf.rect(pdfW / 2 - 28, y - 6, 56, 10);
      pdf.text('HALL TICKET', pdfW / 2, y, { align: 'center' });
      pdf.setTextColor(0, 0, 0); y += 12;

      // ── Candidate Info + Photo ───────────────────────────────
      const photoX = rm - 32; const photoY = y; const photoW = 32; const photoH = 40;
      const rows = [
        ["Candidate's Name", scholarData.registered_name || scholarData.name || ''],
        ['Application Number', appNo || ''],
        ['Date of Birth', scholarData.date_of_birth || ''],
        ['Gender', scholarData.gender || ''],
        ['Mode of Study', scholarData.type || scholarData.program_type || 'Full Time'],
        ['Institute', scholarData.institution || 'SRMIST'],
        ['Department', scholarData.department || ''],
        ['Program', scholarData.program || 'Ph.D'],
      ];
      const rowH = 8;
      const labelW = 55;
      rows.forEach(([label, value], i) => {
        const ry = y + i * rowH;
        pdf.setFillColor(245, 245, 245); pdf.setDrawColor(180, 180, 180);
        pdf.rect(lm, ry, labelW, rowH, 'FD');
        pdf.rect(lm + labelW, ry, photoX - lm - labelW - 3, rowH, 'D');
        pdf.setFontSize(8); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(0, 0, 0);
        pdf.text(label, lm + 2, ry + 5.5);
        pdf.setFont('helvetica', 'normal'); pdf.setTextColor(180, 0, 0);
        const val = String(value).substring(0, 50);
        pdf.text(val, lm + labelW + 2, ry + 5.5);
      });

      // Photo box
      pdf.setDrawColor(150, 150, 150); pdf.setLineWidth(0.3);
      if (photoB64) {
        const photoFmt = photoB64.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        pdf.addImage(photoB64, photoFmt, photoX, photoY, photoW, photoH);
        pdf.rect(photoX, photoY, photoW, photoH);
      } else {
        pdf.rect(photoX, photoY, photoW, photoH);
        pdf.setFontSize(7); pdf.setTextColor(150, 150, 150);
        pdf.text(`P${appNo}`, photoX + photoW / 2, photoY + photoH / 2, { align: 'center' });
      }

      // Signature box
      const sigY = photoY + photoH + 3;
      if (sigB64) {
        const sigFmt = sigB64.startsWith('data:image/png') ? 'PNG' : 'JPEG';
        pdf.addImage(sigB64, sigFmt, photoX, sigY, photoW, 12);
        pdf.rect(photoX, sigY, photoW, 12);
      } else {
        pdf.rect(photoX, sigY, photoW, 12);
        pdf.setFontSize(7); pdf.setTextColor(150, 150, 150);
        pdf.text('Signature', photoX + photoW / 2, sigY + 7, { align: 'center' });
      }

      y += rows.length * rowH + 10;
      pdf.setTextColor(0, 0, 0);

      // ── Exam Schedule ────────────────────────────────────────
      checkNewPage(30);
      pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
      pdf.text('EXAMINATION SCHEDULE', lm, y); y += 5;
      pdf.setDrawColor(180, 180, 180); pdf.setLineWidth(0.3);
      const colW = [40, 70, contentW - 110];
      ['Examination', 'Date & Time', 'Reporting Venue'].forEach((h, i) => {
        const x = lm + colW.slice(0, i).reduce((a, b) => a + b, 0);
        pdf.setFillColor(230, 230, 230); pdf.rect(x, y, colW[i], 8, 'FD');
        pdf.setFontSize(8); pdf.text(h, x + 2, y + 5.5);
      });
      y += 8;
      const venue = `Dept. of ${scholarData.department || '___'},\nFaculty of ${(scholarData.faculty || '').replace('Faculty of', '').trim() || '___'},\nSRMIST, Ramapuram, Chennai-600089`;
      [['Written', '16/05/2026, 10:00 AM \u2013 12:00 Noon'], ['Interview', '16/05/2026, 1:00 PM \u2013 5:00 PM']].forEach(([exam, dt], i) => {
        const rowY = y + i * 10;
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(8);
        pdf.rect(lm, rowY, colW[0], 10, 'D'); pdf.text(exam, lm + 2, rowY + 6);
        pdf.rect(lm + colW[0], rowY, colW[1], 10, 'D'); pdf.setFont('helvetica', 'normal'); pdf.text(dt, lm + colW[0] + 2, rowY + 6);
        if (i === 0) { pdf.rect(lm + colW[0] + colW[1], rowY, colW[2], 20, 'D'); pdf.setFontSize(7); pdf.text(venue, lm + colW[0] + colW[1] + 2, rowY + 5, { maxWidth: colW[2] - 4 }); }
      });
      y += 25;

      // ── Instructions ─────────────────────────────────────────
      checkNewPage(10);
      pdf.setDrawColor(150, 150, 150); pdf.setLineWidth(0.3);
      pdf.line(lm, y, rm, y); y += 6;
      pdf.setFontSize(10); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(0, 0, 0);
      pdf.text('INSTRUCTIONS TO CANDIDATES', lm, y); y += 7;

      const instructions = [
        { heading: null, text: 'I.  Hall ticket is valid for both Written Examination and Interview.' },
        {
          heading: 'II. Time Schedule:', items: [
            'Candidates should report to the examination venue 30 minutes before the commencement of the exam.',
            'No candidate will be allowed into the examination hall 30 minutes after commencement.',
            'Candidates will not be allowed to leave the hall until the end of the examination.',
            'Candidates must bring a valid original Photo ID proof (Aadhaar / Passport / Driving License).',
            'Electronic gadgets, smart watches, calculators, and mobile phones are strictly prohibited.',
            'Malpractice in any form will lead to immediate disqualification.',
          ]
        },
        {
          heading: 'III. Examination Guidelines:', items: [
            'The exam pattern will be Objective Type (MCQ) containing 100 questions.',
            'Use only Blue or Black ballpoint pen to shade the OMR sheet.',
            'Duration of the examination is 2 Hours (120 minutes).',
          ]
        },
        {
          heading: 'IV. Interview Guidelines:', items: [
            'Interview will be conducted in offline mode only on the same date.',
            'Candidates must present their research proposal (max 5 slides) during the interview.',
            'Final evaluation is based on combined performance in Written test (70%) and Interview (30%).',
          ]
        },
      ];

      pdf.setFontSize(8.5);
      instructions.forEach(({ heading, text, items }) => {
        checkNewPage(12);
        if (heading) {
          pdf.setFont('helvetica', 'bold'); pdf.setTextColor(0, 0, 0);
          pdf.text(heading, lm, y); y += 6;
          pdf.setFont('helvetica', 'normal');
          items.forEach((item, idx) => {
            const lines = pdf.splitTextToSize(`${idx + 1}.  ${item}`, contentW - 8);
            checkNewPage(lines.length * 5 + 2);
            pdf.text(lines, lm + 6, y);
            y += lines.length * 5 + 1;
          });
          y += 3;
        } else {
          pdf.setFont('helvetica', 'normal'); pdf.setTextColor(0, 0, 0);
          const lines = pdf.splitTextToSize(text, contentW);
          checkNewPage(lines.length * 5 + 2);
          pdf.text(lines, lm, y);
          y += lines.length * 5 + 4;
        }
      });

      // ── Footer ───────────────────────────────────────────────
      checkNewPage(20);
      y += 8;
      pdf.setFont('helvetica', 'bold'); pdf.setFontSize(9); pdf.setTextColor(180, 0, 0);
      pdf.line(rm - 50, y, rm, y); y += 6;
      pdf.text('DIRECTOR', rm, y, { align: 'right' }); y += 5;
      pdf.text('DIRECTORATE OF RESEARCH', rm, y, { align: 'right' });

      if (download) {
        pdf.save(`HallTicket_${appNo || scholarData.id}.pdf`);
        showMessage(`Hall Ticket generated for ${scholarData.registered_name}`, 'success');
      }
      return pdf;
    } catch (error) {
      console.error('Error generating PDF:', error);
      showMessage('Error generating Hall Ticket', 'error');
    }
  };

  const handleDownloadPDF = async () => {
    if (!previewScholar) return;
    setIsGeneratingPdf(true);
    await markAsGenerated(previewScholar.id);
    await generateSinglePDF(null, previewScholar, true);
    setIsGeneratingPdf(false);
  };

  const markAsGenerated = async (id) => {
    try {
      // Fetch full scholar data first
      const { data: scholar } = await supabase
        .from('scholar_applications')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      await supabase
        .from('scholar_applications')
        .update({ status: 'Generated' })
        .eq('id', id);

      // Upsert examination_records with full scholar data so no columns are NULL
      if (scholar) {
        await supabase
          .from('examination_records')
          .upsert([{
            application_no: scholar.application_no,
            registered_name: scholar.registered_name,
            faculty: scholar.faculty,
            department: scholar.department,
            institution: scholar.institution,
            program: scholar.program,
            program_type: scholar.program_type,
            type: scholar.type,
            mobile_number: scholar.mobile_number,
            email: scholar.email,
            gender: scholar.gender,
            date_of_birth: scholar.date_of_birth,
            nationality: scholar.nationality,
            written_marks: 0,
            interview_marks: 0,
            total_marks: null,
            status: 'pending',
            current_owner: 'director',
          }], { onConflict: 'application_no', ignoreDuplicates: false });
      }

      setScholars(prev => prev.map(s => s.id === id ? { ...s, hall_ticket_generated: true } : s));
    } catch (error) {
      console.error('Error marking as generated:', error);
    }
  };

  const handleBulkGenerate = async () => {
    if (selectedScholars.length === 0) return;
    const scholarsToGenerate = scholars.filter(s => selectedScholars.includes(s.id));
    if (scholarsToGenerate.length === 0) return;

    setIsGeneratingPdf(true);
    setGenerationProgress({ current: 0, total: scholarsToGenerate.length });
    showMessage(`Generating ${scholarsToGenerate.length} hall tickets...`, 'info');

    for (let i = 0; i < scholarsToGenerate.length; i++) {
      const scholar = scholarsToGenerate[i];
      setGenerationProgress({ current: i + 1, total: scholarsToGenerate.length });

      try {
        const folderId = extractFolderIdFromUrl(scholar.certificates);
        const appNo = scholar.application_no;

        // Fetch photo and signature as base64 in parallel
        const [photoB64, sigB64] = await Promise.all([
          fetchDriveImageBase64(folderId, appNo, 'P'),
          fetchDriveImageBase64(folderId, appNo, 'S'),
        ]);

        // Fetch logo
        let logoB64 = null;
        try {
          const logoRes = await fetch(`${process.env.PUBLIC_URL}/srm-logo.png`);
          const logoBlob = await logoRes.blob();
          logoB64 = await new Promise(resolve => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.readAsDataURL(logoBlob);
          });
        } catch { /* logo optional */ }

        // Build PDF directly with jsPDF (no DOM needed)
        const pdf = new jsPDF('p', 'mm', 'a4');
        const W = pdf.internal.pageSize.getWidth();

        // Header with logo on left, faculty/dept on right
        if (logoB64) {
          const fmt = logoB64.startsWith('data:image/png') ? 'PNG' : 'JPEG';
          pdf.addImage(logoB64, fmt, 10, 8, 20, 20);
        }
        pdf.setFontSize(11); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(180, 0, 0);
        pdf.text(`FACULTY OF ${(scholar.faculty || 'ENGINEERING & TECHNOLOGY').toUpperCase().replace('FACULTY OF', '')}`, W - 10, 13, { align: 'right' });
        pdf.setFontSize(9); pdf.setTextColor(0, 0, 0);
        pdf.text(`DEPARTMENT OF ${(scholar.department || '').toUpperCase()}`, W - 10, 19, { align: 'right' });
        pdf.setDrawColor(180, 0, 0); pdf.setLineWidth(0.5); pdf.line(10, 30, W - 10, 30);
        pdf.setFontSize(14); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(0, 0, 0);
        pdf.text('PhD Entrance Exam - July 2026', W / 2, 38, { align: 'center' });
        pdf.setFontSize(16); pdf.setDrawColor(180, 0, 0); pdf.setLineWidth(0.5);
        pdf.rect(W / 2 - 30, 41, 60, 10);
        pdf.setTextColor(180, 0, 0);
        pdf.text('HALL TICKET', W / 2, 48, { align: 'center' });
        pdf.setTextColor(0, 0, 0);

        // Info table
        const rows = [
          ["Candidate's Name", scholar.registered_name || scholar.name || ''],
          ['Application Number', appNo || ''],
          ['Date of Birth', scholar.date_of_birth || ''],
          ['Gender', scholar.gender || ''],
          ['Mode of Study', scholar.type || scholar.program_type || 'Full Time'],
          ['Institute', scholar.institution || 'SRMIST'],
          ['Department', scholar.department || ''],
          ['Program', scholar.program || 'Ph.D'],
        ];
        let y = 58;
        pdf.setFontSize(9);
        rows.forEach(([label, value]) => {
          pdf.setFont('helvetica', 'bold'); pdf.setFillColor(245, 245, 245);
          pdf.rect(10, y, 55, 7, 'F');
          pdf.text(label, 12, y + 5);
          pdf.setFont('helvetica', 'normal');
          pdf.text(String(value).substring(0, 60), 67, y + 5);
          pdf.setDrawColor(180, 180, 180);
          pdf.rect(10, y, 55, 7); pdf.rect(65, y, W - 85, 7);
          y += 7;
        });

        // Photo
        if (photoB64) {
          pdf.addImage(photoB64, 'JPEG', W - 45, 58, 32, 40);
          pdf.setDrawColor(150, 150, 150); pdf.rect(W - 45, 58, 32, 40);
        } else {
          pdf.setDrawColor(150, 150, 150); pdf.rect(W - 45, 58, 32, 40);
          pdf.setFontSize(7); pdf.setTextColor(150, 150, 150);
          pdf.text(`P${appNo}`, W - 29, 79, { align: 'center' });
          pdf.setTextColor(0, 0, 0);
        }

        // Signature
        if (sigB64) {
          pdf.addImage(sigB64, 'JPEG', W - 45, 102, 32, 12);
          pdf.setDrawColor(150, 150, 150); pdf.rect(W - 45, 102, 32, 12);
        } else {
          pdf.setDrawColor(150, 150, 150); pdf.rect(W - 45, 102, 32, 12);
          pdf.setFontSize(7); pdf.setTextColor(150, 150, 150);
          pdf.text('Signature', W - 29, 109, { align: 'center' });
          pdf.setTextColor(0, 0, 0);
        }

        // Exam schedule
        y += 6;
        pdf.setFontSize(10); pdf.setFont('helvetica', 'bold');
        pdf.text('EXAMINATION SCHEDULE', 10, y); y += 5;
        pdf.setFontSize(8);
        ['Written|16/05/2026, 10:00 AM – 12:00 Noon', 'Interview|16/05/2026, 1:00 PM – 5:00 PM'].forEach(row => {
          const [exam, dt] = row.split('|');
          pdf.setFont('helvetica', 'bold'); pdf.text(exam, 12, y + 5);
          pdf.setFont('helvetica', 'normal'); pdf.text(dt, 50, y + 5);
          pdf.setDrawColor(180, 180, 180); pdf.rect(10, y, 38, 7); pdf.rect(48, y, W - 58, 7);
          y += 7;
        });

        // Footer
        pdf.setFontSize(9); pdf.setFont('helvetica', 'bold'); pdf.setTextColor(180, 0, 0);
        pdf.text('DIRECTOR', W - 10, 280, { align: 'right' });
        pdf.text('DIRECTORATE OF RESEARCH', W - 10, 285, { align: 'right' });

        pdf.save(`HallTicket_${appNo || scholar.id}.pdf`);
        await markAsGenerated(scholar.id);

        // Small delay between downloads
        await new Promise(r => setTimeout(r, 400));
      } catch (err) {
        console.error(`Error generating for ${scholar.application_no}:`, err);
      }
    }

    setIsGeneratingPdf(false);
    setGenerationProgress({ current: 0, total: 0 });
    showMessage(`Generated ${scholarsToGenerate.length} hall tickets successfully!`, 'success');
  };

  // Extract folder ID from the scholar's certificates drive link
  const getFolderIdForScholar = (scholar) => {
    return extractFolderIdFromUrl(scholar?.certificates);
  };

  return (
    <div className="scholar-management-container">
      {messageBox.show && (
        <div className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-xl text-white font-medium flex items-center gap-2 ${messageBox.type === 'error' ? 'bg-red-500' : messageBox.type === 'success' ? 'bg-green-500' : 'bg-blue-500'}`}>
          <span>{messageBox.text}</span>
          <button onClick={() => setMessageBox({ show: false, text: '', type: '' })} className="ml-4 text-white hover:text-gray-200">
            &times;
          </button>
        </div>
      )}

      {/* Header section matching VerifiedScholars */}
      <div className="dashboard-header mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Hall Ticket Management</h1>
      </div>

      {/* Stats Cards */}
      <div className="flex justify-between items-stretch gap-4 mb-6">
        <div className="flex-1 bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Eligible Scholars</p>
              <h3 className="text-2xl font-bold text-gray-900">{scholars.length}</h3>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" /></svg>
            </div>
          </div>
        </div>
        <div className="flex-1 bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Generated Tickets</p>
              <h3 className="text-2xl font-bold text-green-600">{scholars.filter(s => s.hall_ticket_generated).length}</h3>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            </div>
          </div>
        </div>
        <div className="flex-1 bg-white p-6 rounded-lg shadow border border-gray-200 hover:shadow-md transition-shadow">
          <div className="flex items-center">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-600">Pending Generation</p>
              <h3 className="text-2xl font-bold text-orange-500">{scholars.filter(s => !s.hall_ticket_generated).length}</h3>
            </div>
            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
            </div>
          </div>
        </div>
      </div>

      {/* Controls / Filters */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-white p-4 rounded-lg shadow border border-gray-200">
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <input
              type="text"
              placeholder="Search Name / Application No..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          </div>

          <select
            value={selectedDept}
            onChange={(e) => setSelectedDept(e.target.value)}
            className="w-48 px-4 py-2 border text-sm border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Departments</option>
            {departments.map(d => <option key={d} value={d}>{d}</option>)}
          </select>

          <select
            value={selectedProgram}
            onChange={(e) => setSelectedProgram(e.target.value)}
            className="w-48 px-4 py-2 border text-sm border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Programs</option>
            {programs.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </div>

        <div className="flex items-center gap-4 text-sm">
          <span className="font-medium text-gray-600">
            {selectedScholars.length} / {filteredScholars.length} Selected
          </span>
          <button
            onClick={handleBulkGenerate}
            disabled={selectedScholars.length === 0 || isGeneratingPdf}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${selectedScholars.length > 0 && !isGeneratingPdf ? 'bg-blue-600 hover:bg-blue-700 text-white shadow' : 'bg-gray-200 text-gray-400 cursor-not-allowed'}`}
          >
            {isGeneratingPdf && generationProgress.total > 0
              ? `Generating ${generationProgress.current}/${generationProgress.total}...`
              : 'Generate All Selected'}
          </button>
        </div>
      </div>

      {/* Main Table */}
      <div className="table-container bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" style={{ marginTop: 0, minHeight: 'auto' }}>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading Scholars...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      onChange={handleSelectAll}
                      checked={selectedScholars.length > 0 && selectedScholars.length === filteredScholars.length}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Application No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Candidate Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mode</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredScholars.map((scholar, idx) => (
                  <tr key={scholar.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedScholars.includes(scholar.id)}
                        onChange={() => handleSelectScholar(scholar.id)}
                        className="rounded text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      {scholar.application_no || `APP-${scholar.id}`}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">
                      {scholar.registered_name || scholar.name || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="truncate max-w-[200px]" title={scholar.department}>{scholar.department || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      <div className="text-xs text-blue-600">{scholar.type || scholar.program_type || '-'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${scholar.hall_ticket_generated ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                        {scholar.hall_ticket_generated ? 'Generated' : 'Approved'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => openPreview(scholar)}
                        className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-md transition-colors"
                      >
                        {scholar.hall_ticket_generated ? 'Preview' : 'Generate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredScholars.length === 0 && (
              <div className="p-8 text-center text-gray-500">No scholars found matching criteria.</div>
            )}
          </div>
        )}
      </div>

      {/* Preview Modal Component */}
      {showPreviewModal && previewScholar && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white rounded-t-lg z-10">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>
                Hall Ticket Preview
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPdf}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded shadow flex items-center gap-2 transition-colors disabled:opacity-50"
                >
                  {isGeneratingPdf ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating...
                    </span>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                      Download PDF
                    </>
                  )}
                </button>
                <button onClick={closePreview} className="text-gray-400 hover:text-gray-600 p-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            </div>

            {/* Modal Body - PDF Container */}
            <div className="overflow-y-auto bg-white flex justify-center">

              {/* Actual Hall Ticket DOM element to be captured */}
              <div
                ref={hallTicketRef}
                className="bg-white p-8 w-[210mm] shadow-lg box-border"
                style={{ fontFamily: "'Times New Roman', Times, serif", color: '#000' }}
              >

                {/* Header Section */}
                <div className="flex border-b-2 border-red-800 pb-4 mb-4">
                  <div className="w-24 h-24 flex-shrink-0">
                    {/* Placeholder for SRM Logo */}
                    <img src={`${process.env.PUBLIC_URL}/srm-logo.png`} alt="SRM Logo" className="w-full h-full object-contain" crossOrigin="anonymous" />
                  </div>
                  <div className="flex-1 text-right ml-4 flex flex-col justify-center">
                    <h2 className="text-lg font-bold text-red-800 tracking-wide uppercase">FACULTY OF {previewScholar.faculty?.toUpperCase().replace('FACULTY OF', '') || 'ENGINEERING & TECHNOLOGY'}</h2>
                    <h3 className="text-base font-bold text-gray-800 uppercase">DEPARTMENT OF {previewScholar.department?.toUpperCase() || 'COMPUTER SCIENCE'}</h3>
                  </div>
                </div>

                <div className="text-center mb-6">
                  <h1 className="text-2xl font-bold uppercase mb-1">PhD Entrance Exam – July 2026</h1>
                  <h2 className="text-xl font-bold text-red-800 border-2 border-red-800 inline-block px-10 py-1 rounded">HALL TICKET</h2>
                </div>

                {/* Candidate Info Tables Area */}
                <div className="flex gap-4 mb-8">

                  {/* Left Side: Info Table */}
                  <div className="flex-1">
                    <table className="w-full border-collapse border border-gray-400 text-sm">
                      <tbody>
                        {[
                          ['Candidate\'s Name', previewScholar.registered_name || previewScholar.name || ''],
                          ['Application Number', previewScholar.application_no || `APP-${previewScholar.id}`],
                          ['Date of Birth', previewScholar.date_of_birth || ''],
                          ['Gender', previewScholar.gender || ''],
                          ['Mode of Study', previewScholar.type || previewScholar.program_type || 'Full Time'],
                          ['Institute', previewScholar.institution || 'SRMIST'],
                          ['Department', previewScholar.department || ''],
                          ['Program', previewScholar.program || 'Ph.D']
                        ].map(([label, value], i) => (
                          <tr key={i}>
                            <td className="border border-gray-400 p-2 font-bold bg-gray-50 w-2/5">{label}</td>
                            <td className="border border-gray-400 p-2 text-red-800 font-bold underline decoration-orange-500 whitespace-pre-wrap">{value}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Right Side: Photo and Signature */}
                  <div className="w-40 flex flex-col justify-between items-center">
                    <div className="w-[120px] h-[150px] border-2 border-gray-400 flex items-center justify-center bg-gray-50 relative overflow-hidden">
                      <DriveImage
                        folderId={getFolderIdForScholar(previewScholar)}
                        appNo={previewScholar.application_no}
                        prefix="P"
                        alt={`Candidate Photo (P${previewScholar.application_no || previewScholar.id})`}
                        fallbackText={`Candidate Photo\n(P${previewScholar.application_no || previewScholar.id})`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      />
                    </div>

                    <div className="w-[120px] h-[50px] border-2 border-gray-400 mt-2 flex items-center justify-center bg-gray-50 overflow-hidden">
                      <DriveImage
                        folderId={getFolderIdForScholar(previewScholar)}
                        appNo={previewScholar.application_no}
                        prefix="S"
                        alt="Signature"
                        fallbackText="Signature"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    </div>
                  </div>

                </div>

                {/* Examination Schedule Table */}
                <h3 className="font-bold mb-2">EXAMINATION SCHEDULE</h3>
                <table className="w-full border-collapse border border-gray-400 text-sm mb-6">
                  <thead className="bg-gray-100 font-bold">
                    <tr>
                      <th className="border border-gray-400 p-2 text-left">Examination</th>
                      <th className="border border-gray-400 p-2 text-left">Date & Time</th>
                      <th className="border border-gray-400 p-2 text-left">Reporting Venue</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="border border-gray-400 p-2 font-bold">Written</td>
                      <td className="border border-gray-400 p-2 font-bold">16/05/2026, 10:00 AM – 12:00 Noon</td>
                      <td className="border border-gray-400 p-2" rowSpan="2">
                        Department of {previewScholar.department || '_____________'},<br />
                        Faculty of {previewScholar.faculty?.replace('Faculty of', '').trim() || '_____________'},<br />
                        SRM Institute of Science and Technology,<br />
                        Ramapuram Campus, Chennai – 600089
                      </td>
                    </tr>
                    <tr>
                      <td className="border border-gray-400 p-2 font-bold">Interview</td>
                      <td className="border border-gray-400 p-2 font-bold">16/05/2026, 1:00 PM – 5:00 PM</td>
                    </tr>
                  </tbody>
                </table>

                {/* Instructions Section */}
                <div className="text-xs leading-relaxed border-t-2 border-gray-300 pt-4 mt-4">
                  <h3 className="font-bold underline text-sm mb-2">INSTRUCTIONS TO CANDIDATES</h3>

                  <div className="mb-2">
                    <strong>I.</strong> Hall ticket is valid for both Written Examination and Interview.
                  </div>

                  <div className="mb-2">
                    <strong>II. Time Schedule:</strong>
                    <ol className="list-decimal pl-6 mt-1 space-y-1">
                      <li>Candidates should report to the examination venue 30 minutes before the commencement of the exam.</li>
                      <li>No candidate will be allowed into the examination hall 30 minutes after commencement.</li>
                      <li>Candidates will not be allowed to leave the hall until the end of the examination.</li>
                      <li>Candidates must bring a valid original Photo ID proof (Aadhaar / Passport / Driving License).</li>
                      <li>Electronic gadgets, smart watches, calculators, and mobile phones are strictly prohibited.</li>
                      <li>Malpractice in any form will lead to immediate disqualification.</li>
                    </ol>
                  </div>

                  <div className="mb-2">
                    <strong>III. Examination Guidelines:</strong>
                    <ul className="list-disc pl-6 mt-1 space-y-1">
                      <li>The exam pattern will be Objective Type (MCQ) containing 100 questions.</li>
                      <li>Use only Blue or Black ballpoint pen to shade the OMR sheet.</li>
                      <li>Duration of the examination is 2 Hours (120 minutes).</li>
                    </ul>
                  </div>

                  <div className="mb-4">
                    <strong>IV. Interview Guidelines:</strong>
                    <ul className="list-disc pl-6 mt-1 space-y-1">
                      <li>Interview will be conducted in offline mode only on the same date.</li>
                      <li>Candidates must present their research proposal (max 5 slides) during the interview.</li>
                      <li>Final evaluation is based on combined performance in Written test (70%) and Interview (30%).</li>
                    </ul>
                  </div>
                </div>

                {/* Footer drawn by jsPDF on download — not rendered in DOM */}

              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default HallTicket;
