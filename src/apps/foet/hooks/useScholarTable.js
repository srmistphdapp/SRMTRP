import { useState, useEffect, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { useAppContext } from '../App';

/**
 * Custom hook to manage scholar table logic (filtering, sorting, searching, selection, and export)
 * 
 * @param {Object} options Options for the hook
 * @param {Array} options.data The raw scholar data to manage
 * @param {Function} options.getScholarStatus Optional function to compute custom status for a scholar
 * @param {Object} options.initialFilters Initial filter states
 * @param {string} options.initialSortOrder Initial sort order ('asc' or 'desc')
 * @returns {Object} Hook state and handlers
 */
export const useScholarTable = ({ 
  data = [], 
  getScholarStatus = null,
  initialFilters = {},
  initialSortOrder = 'asc'
}) => {
  const { showMessageBox, scholarSortOrder, setScholarSortOrder } = useAppContext();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedScholarIds, setSelectedScholarIds] = useState([]);
  
  // Filter states
  const [tempFilters, setTempFilters] = useState({
    type: 'All Types',
    ...initialFilters
  });

  const [activeFilters, setActiveFilters] = useState({
    type: 'All Types',
    ...initialFilters
  });

  // Derived filtered and sorted data
  const filteredScholars = useMemo(() => {
    if (!data || data.length === 0) return [];

    let scholars = [...data];

    // Compute status if helper provided
    if (getScholarStatus) {
      scholars = scholars.map(s => ({
        ...s,
        computedStatus: getScholarStatus(s)
      }));
    } else {
      // Default status computation (matches ScholarManagement)
      scholars = scholars.map(s => ({
        ...s,
        computedStatus: (s.faculty_status && s.faculty_status.startsWith('FORWARDED_TO_')) ? 'Forwarded' : 'Pending'
      }));
    }

    // Apply active filters
    Object.keys(activeFilters).forEach(filterKey => {
      const filterValue = activeFilters[filterKey];
      if (filterValue === 'All' || filterValue.startsWith('All ')) return;

      scholars = scholars.filter(s => {
        if (filterKey === 'type') {
          const programUpper = (s.program || '').toUpperCase();
          if (filterValue === 'Full Time') return programUpper.includes('FT');
          if (filterValue === 'Part Time') return programUpper.includes('PT');
          return true;
        }
        
        if (filterKey === 'status') {
          return s.computedStatus === filterValue;
        }

        if (filterKey === 'department') {
          const deptFromProgram = (s.program || '').split('(')[0].trim();
          return deptFromProgram === filterValue;
        }

        // Add other filters as needed
        return true;
      });
    });

    // Apply search
    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      scholars = scholars.filter(s =>
        (s.registered_name || '').toLowerCase().includes(searchLower) ||
        (s.application_no || '').toLowerCase().includes(searchLower) ||
        (s.faculty || '').toLowerCase().includes(searchLower) ||
        (s.program || '').toLowerCase().includes(searchLower)
      );
    }

    // Apply sorting
    scholars.sort((a, b) => {
      const statusA = a.computedStatus;
      const statusB = b.computedStatus;

      const order = scholarSortOrder || initialSortOrder;

      if (order === 'asc') {
        if (statusA === 'Forwarded' && statusB === 'Pending') return -1;
        if (statusA === 'Pending' && statusB === 'Forwarded') return 1;
        return 0;
      } else {
        if (statusA === 'Pending' && statusB === 'Forwarded') return -1;
        if (statusA === 'Forwarded' && statusB === 'Pending') return 1;
        return 0;
      }
    });

    return scholars;
  }, [data, activeFilters, searchTerm, scholarSortOrder, getScholarStatus, initialSortOrder]);

  // Handlers
  const handleApplyFilters = () => {
    setActiveFilters({ ...tempFilters });
    return false; // Useful for closing modals
  };

  const handleClearFilters = () => {
    const clearedFilters = { type: 'All Types' };
    Object.keys(initialFilters).forEach(k => clearedFilters[k] = `All ${k.charAt(0).toUpperCase() + k.slice(1)}`);
    setTempFilters(clearedFilters);
    setActiveFilters(clearedFilters);
  };

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedScholarIds(filteredScholars.map(s => s.id));
    } else {
      setSelectedScholarIds([]);
    }
  };

  const handleSelectOne = (checked, scholarId) => {
    if (checked) {
      setSelectedScholarIds(prev => [...prev, scholarId]);
    } else {
      setSelectedScholarIds(prev => prev.filter(id => id !== scholarId));
    }
  };

  // Excel Export Logic (centralized)
  const downloadExcel = (downloadType, filenamePrefix = 'Scholars_List') => {
    try {
      const dataToDownload = downloadType === 'selected'
        ? filteredScholars.filter(s => selectedScholarIds.includes(s.id))
        : filteredScholars;

      if (dataToDownload.length === 0) {
        showMessageBox('No scholars found to download.', 'warning');
        return;
      }

      // Helper functions for data cleaning
      const extractProgramType = (program) => {
        if (!program) return '-';
        if (program.toUpperCase().includes('(FT)')) return 'Full Time';
        if (program.toUpperCase().includes('(PT)')) return 'Part Time';
        return '-';
      };

      const cleanProgramName = (program) => {
        if (!program) return '-';
        return program.split('(')[0].trim();
      };

      const excelData = dataToDownload.map((scholar) => ({
        'Registered Name': scholar.registered_name || '-',
        'Application No': scholar.application_no || '-',
        'Type': scholar.program_type || extractProgramType(scholar.program) || '-',
        'Institution': scholar.faculty || '-',
        'Program': cleanProgramName(scholar.program) || scholar.program || '-',
        'Email ID': scholar.email || '-',
        'Mobile Number': scholar.mobile_number || '-',
        'Status': scholar.computedStatus || '-'
        // ... can add more fields as needed or pass fields as param
      }));

      const ws = XLSX.utils.json_to_sheet(excelData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Scholars');
      XLSX.writeFile(wb, `${filenamePrefix}_${new Date().toISOString().split('T')[0]}.xlsx`);
      showMessageBox('Excel file downloaded successfully!', 'success');
    } catch (error) {
      console.error('Excel Export Error:', error);
      showMessageBox('Error downloading Excel file.', 'error');
    }
  };

  return {
    searchTerm,
    setSearchTerm,
    filteredScholars,
    selectedScholarIds,
    setSelectedScholarIds,
    tempFilters,
    setTempFilters,
    activeFilters,
    setActiveFilters,
    handleApplyFilters,
    handleClearFilters,
    handleSelectAll,
    handleSelectOne,
    downloadExcel
  };
};