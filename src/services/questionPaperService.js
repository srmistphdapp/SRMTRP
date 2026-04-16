import { supabase } from '../supabaseClient';

/**
 * Question Paper Service
 * Handles all question paper-related operations
 */

// Fetch all question papers
export const fetchQuestionPapers = async () => {
  try {
    const { data, error } = await supabase
      .from('question_papers')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching question papers:', error);
    return { data: null, error };
  }
};

// Fetch question papers by faculty
export const fetchQuestionPapersByFaculty = async (facultyName) => {
  try {
    const { data, error } = await supabase
      .from('question_papers')
      .select('*')
      .eq('faculty_name', facultyName)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching question papers by faculty:', error);
    return { data: null, error };
  }
};

// Fetch question papers by department
export const fetchQuestionPapersByDepartment = async (departmentName) => {
  try {
    const { data, error } = await supabase
      .from('question_papers')
      .select('*')
      .eq('department_name', departmentName)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching question papers by department:', error);
    return { data: null, error };
  }
};

// Fetch question papers by faculty and department
export const fetchQuestionPapersByFacultyAndDepartment = async (facultyName, departmentName) => {
  try {
    const { data, error } = await supabase
      .from('question_papers')
      .select('*')
      .eq('faculty_name', facultyName)
      .eq('department_name', departmentName)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching question papers by faculty and department:', error);
    return { data: null, error };
  }
};

// Create a new question paper
export const createQuestionPaper = async (paperData) => {
  try {
    const { data, error } = await supabase
      .from('question_papers')
      .insert([paperData])
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error creating question paper:', error);
    return { data: null, error };
  }
};

// Update a question paper
export const updateQuestionPaper = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('question_papers')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating question paper:', error);
    return { data: null, error };
  }
};

// Delete a question paper
export const deleteQuestionPaper = async (id) => {
  try {
    const { error } = await supabase
      .from('question_papers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Error deleting question paper:', error);
    return { data: null, error };
  }
};
