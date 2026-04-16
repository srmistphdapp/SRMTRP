// Question Paper Service - Handles question paper operations for department users
import { supabase } from '../../../supabaseClient';

/**
 * Parse set data from database format "filename | download_url"
 * @param {string} setData - Set data in format "filename | url"
 * @returns {Object} Parsed set object with file and driveLink
 */
export const parseSetData = (setData) => {
  if (!setData || typeof setData !== 'string') {
    return { file: '', driveLink: '' };
  }
  
  const parts = setData.split(' | ');
  return {
    file: parts[0] || '',
    driveLink: parts[1] || ''
  };
};

/**
 * Format set data for database storage "filename | download_url"
 * @param {string} filename - File name
 * @param {string} url - Download URL
 * @returns {string} Formatted set data
 */
export const formatSetData = (filename, url) => {
  if (!filename && !url) return null;
  return [filename, url].filter(Boolean).join(' | ');
};

/**
 * Fetch question papers for a specific department
 * @param {string} departmentName - Department name (e.g., "Computer Science Engineering")
 * @returns {Promise<{data: Array, error: any}>}
 */
export const fetchQuestionPapersForDepartment = async (departmentName) => {
  try {
    const { data, error } = await supabase
      .from('question_papers')
      .select('*')
      .eq('department_name', departmentName)
      .order('uploaded_on', { ascending: false });

    if (error) {
      return { data: null, error };
    }

    // Transform data for frontend consumption
    const transformedData = data.map((paper, index) => {
      const setA = parseSetData(paper.set_a);
      const setB = parseSetData(paper.set_b);
      
      const sets = [];
      if (setA.file || setA.driveLink) {
        sets.push({ set: 'A', ...setA });
      }
      if (setB.file || setB.driveLink) {
        sets.push({ set: 'B', ...setB });
      }

      return {
        id: paper.id || `qp-${index}`,
        name: paper.subject_name || paper.Subject_Name || '',
        code: paper.subject_code || paper.qp_code || '',
        uploadedBy: paper.uploaded_by || '',
        uploadedOn: paper.uploaded_on || new Date().toISOString().split('T')[0],
        sets: sets,
        // Store original data for updates/deletes
        _originalData: paper
      };
    });

    return { data: transformedData, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
};

/**
 * Create a new question paper
 * @param {Object} paperData - Question paper data
 * @param {Object} userInfo - Current user information
 * @returns {Promise<{data: Object, error: any}>}
 */
export const createQuestionPaper = async (paperData, userInfo) => {
  try {
    // Validate required fields
    if (!paperData.name || !paperData.code) {
      return { data: null, error: new Error('Subject name and code are required') };
    }

    if (!userInfo.department || !userInfo.faculty || !userInfo.name) {
      return { data: null, error: new Error('User department, faculty, and name are required') };
    }

    // Generate unique ID
    const id = `${paperData.code.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const today = new Date().toISOString().split('T')[0];
    
    // Process sets data
    const setAData = paperData.sets?.find(s => s.set === 'A');
    const setBData = paperData.sets?.find(s => s.set === 'B');
    
    const setAValue = setAData ? formatSetData(setAData.file, setAData.driveLink) : null;
    const setBValue = setBData ? formatSetData(setBData.file, setBData.driveLink) : null;

    const questionPaper = {
      id,
      subject_name: paperData.name,
      subject_code: paperData.code, // Use subject_code instead of qp_code
      department_name: userInfo.department,
      faculty_name: userInfo.faculty,
      uploaded_by: userInfo.name,
      created_by_name: userInfo.name,
      created_by_role: 'department',
      uploaded_on: today,
      set_a: setAValue,
      set_b: setBValue,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    const { data, error } = await supabase
      .from('question_papers')
      .insert([questionPaper])
      .select();

    if (error) {
      return { data: null, error };
    }

    return { data: data[0], error: null };
  } catch (err) {
    return { data: null, error: err };
  }
};

/**
 * Update an existing question paper
 * @param {string} paperId - Question paper ID
 * @param {Object} updates - Updates to apply
 * @param {Object} userInfo - Current user information
 * @returns {Promise<{data: Object, error: any}>}
 */
export const updateQuestionPaper = async (paperId, updates, userInfo) => {
  try {
    // Check if user has permission to update this paper
    const { data: existingPaper, error: fetchError } = await supabase
      .from('question_papers')
      .select('*')
      .eq('id', paperId)
      .single();

    if (fetchError) {
      return { data: null, error: fetchError };
    }

    if (!existingPaper) {
      return { data: null, error: new Error('Question paper not found') };
    }

    // Check permissions - only allow updates from same department
    if (existingPaper.department_name !== userInfo.department) {
      return { data: null, error: new Error('Permission denied: Can only update papers from your department') };
    }

    // Process updates
    const updateData = {
      updated_at: new Date().toISOString()
    };

    if (updates.name) updateData.subject_name = updates.name;
    if (updates.code) updateData.subject_code = updates.code;
    
    // Process sets if provided
    if (updates.sets) {
      const setAData = updates.sets.find(s => s.set === 'A');
      const setBData = updates.sets.find(s => s.set === 'B');
      
      if (setAData) {
        updateData.set_a = formatSetData(setAData.file, setAData.driveLink);
      }
      if (setBData) {
        updateData.set_b = formatSetData(setBData.file, setBData.driveLink);
      }
    }

    const { data, error } = await supabase
      .from('question_papers')
      .update(updateData)
      .eq('id', paperId)
      .select();

    if (error) {
      return { data: null, error };
    }

    return { data: data[0], error: null };
  } catch (err) {
    return { data: null, error: err };
  }
};

/**
 * Delete a question paper
 * @param {string} paperId - Question paper ID
 * @param {Object} userInfo - Current user information
 * @returns {Promise<{data: Object, error: any}>}
 */
export const deleteQuestionPaper = async (paperId, userInfo) => {
  try {
    // Check if user has permission to delete this paper
    const { data: existingPaper, error: fetchError } = await supabase
      .from('question_papers')
      .select('*')
      .eq('id', paperId)
      .single();

    if (fetchError) {
      return { data: null, error: fetchError };
    }

    if (!existingPaper) {
      return { data: null, error: new Error('Question paper not found') };
    }

    // Check permissions - only allow deletion from same department and created by department role
    if (existingPaper.department_name !== userInfo.department) {
      return { data: null, error: new Error('Permission denied: Can only delete papers from your department') };
    }

    if (existingPaper.created_by_role !== 'department') {
      return { data: null, error: new Error('Permission denied: Can only delete papers created by department') };
    }

    const { data, error } = await supabase
      .from('question_papers')
      .delete()
      .eq('id', paperId)
      .select();

    if (error) {
      return { data: null, error };
    }

    return { data: { success: true, deletedPaper: data[0] }, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
};

/**
 * Delete a specific set from a question paper
 * @param {string} paperId - Question paper ID
 * @param {string} setName - Set name ('A' or 'B')
 * @param {Object} userInfo - Current user information
 * @returns {Promise<{data: Object, error: any}>}
 */
export const deleteQuestionPaperSet = async (paperId, setName, userInfo) => {
  try {
    // Check if user has permission to modify this paper
    const { data: existingPaper, error: fetchError } = await supabase
      .from('question_papers')
      .select('*')
      .eq('id', paperId)
      .single();

    if (fetchError) {
      return { data: null, error: fetchError };
    }

    if (!existingPaper) {
      return { data: null, error: new Error('Question paper not found') };
    }

    // Check permissions
    if (existingPaper.department_name !== userInfo.department) {
      return { data: null, error: new Error('Permission denied: Can only modify papers from your department') };
    }

    if (existingPaper.created_by_role !== 'department') {
      return { data: null, error: new Error('Permission denied: Can only modify papers created by department') };
    }

    // Prepare update - set the specific set to null
    const updateData = {
      updated_at: new Date().toISOString()
    };

    // Determine which set to delete and check if the other set exists
    let otherSetExists = false;
    if (setName.toUpperCase() === 'A') {
      updateData.set_a = null;
      otherSetExists = existingPaper.set_b && existingPaper.set_b.trim() !== '';
    } else if (setName.toUpperCase() === 'B') {
      updateData.set_b = null;
      otherSetExists = existingPaper.set_a && existingPaper.set_a.trim() !== '';
    } else {
      return { data: null, error: new Error('Invalid set name. Must be A or B') };
    }

    // If the other set doesn't exist, delete the entire row instead of updating
    if (!otherSetExists) {
      const { data: deleteData, error: deleteError } = await supabase
        .from('question_papers')
        .delete()
        .eq('id', paperId)
        .select();

      if (deleteError) {
        return { data: null, error: deleteError };
      }

      return { 
        data: { 
          success: true, 
          deletedEntireRow: true, 
          deletedPaper: deleteData[0] 
        }, 
        error: null 
      };
    }

    // Otherwise, just update to remove the specific set
    const { data, error } = await supabase
      .from('question_papers')
      .update(updateData)
      .eq('id', paperId)
      .select();

    if (error) {
      return { data: null, error };
    }

    return { 
      data: { 
        success: true, 
        deletedEntireRow: false, 
        updatedPaper: data[0] 
      }, 
      error: null 
    };
  } catch (err) {
    return { data: null, error: err };
  }
};

/**
 * Get question paper statistics for a department
 * @param {string} departmentName - Department name
 * @returns {Promise<{data: Object, error: any}>}
 */
export const getQuestionPaperStatistics = async (departmentName) => {
  try {
    const { data, error } = await supabase
      .from('question_papers')
      .select('id, set_a, set_b, uploaded_on')
      .eq('department_name', departmentName);

    if (error) {
      return { data: null, error };
    }

    const stats = {
      total: data.length,
      withSetA: data.filter(p => p.set_a).length,
      withSetB: data.filter(p => p.set_b).length,
      withBothSets: data.filter(p => p.set_a && p.set_b).length,
      recentlyAdded: data.filter(p => {
        const uploadDate = new Date(p.uploaded_on);
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return uploadDate >= weekAgo;
      }).length
    };

    return { data: stats, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
};

/**
 * Search question papers by subject name or code
 * @param {string} departmentName - Department name
 * @param {string} searchTerm - Search term
 * @returns {Promise<{data: Array, error: any}>}
 */
export const searchQuestionPapers = async (departmentName, searchTerm) => {
  try {
    const { data, error } = await supabase
      .from('question_papers')
      .select('*')
      .eq('department_name', departmentName)
      .or(`subject_name.ilike.%${searchTerm}%,subject_code.ilike.%${searchTerm}%`)
      .order('uploaded_on', { ascending: false });

    if (error) {
      return { data: null, error };
    }

    // Transform data for frontend consumption
    const transformedData = data.map((paper, index) => {
      const setA = parseSetData(paper.set_a);
      const setB = parseSetData(paper.set_b);
      
      const sets = [];
      if (setA.file || setA.driveLink) {
        sets.push({ set: 'A', ...setA });
      }
      if (setB.file || setB.driveLink) {
        sets.push({ set: 'B', ...setB });
      }

      return {
        id: paper.id || `qp-${index}`,
        name: paper.subject_name || '',
        code: paper.subject_code || '',
        uploadedBy: paper.uploaded_by || '',
        uploadedOn: paper.uploaded_on || new Date().toISOString().split('T')[0],
        sets: sets,
        _originalData: paper
      };
    });

    return { data: transformedData, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
};

export default {
  fetchQuestionPapersForDepartment,
  createQuestionPaper,
  updateQuestionPaper,
  deleteQuestionPaper,
  deleteQuestionPaperSet,
  getQuestionPaperStatistics,
  searchQuestionPapers,
  parseSetData,
  formatSetData
};