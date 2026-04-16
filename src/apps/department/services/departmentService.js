// Department Service - Handles department user operations and authentication
import { supabase } from '../../../supabaseClient';

/**
 * Fetch logged-in department user info with enhanced department code
 * @returns {Promise<{data: Object, error: any}>}
 */
export const fetchLoggedInDepartmentUser = async () => {
  try {
    console.log('🔍 Fetching logged-in department user...');
    
    // Get current authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      console.error('❌ No authenticated user found:', authError);
      return { data: null, error: authError || new Error('No authenticated user') };
    }

    console.log('✅ Authenticated user:', user.email);

    // Fetch department user details
    const { data: deptUser, error: deptError } = await supabase
      .from('department_users')
      .select('*')
      .eq('email', user.email)
      .single();

    if (deptError) {
      console.error('❌ Error fetching department user details:', deptError);
      return { data: null, error: deptError };
    }

    if (!deptUser) {
      console.error('❌ No department user record found for:', user.email);
      return { data: null, error: new Error('Department user not found') };
    }

    // Helper function to get department short code
    const getDepartmentShortCode = (departmentName) => {
      const departmentMap = {
        'Computer Science Engineering': 'CSE',
        'Computer Science and Engineering': 'CSE',
        'Electronics and Communication Engineering': 'ECE',
        'Electrical and Electronics Engineering': 'EEE',
        'Mechanical Engineering': 'MECH',
        'Civil Engineering': 'CIVIL',
        'Biotechnology': 'BIO',
        'Chemistry': 'CHEM',
        'Physics': 'PHYSICS',
        'Mathematics': 'MATH',
        'Management': 'MBA',
        'Business Administration': 'MBA',
        'Medicine': 'MEDICINE',
        'Medical': 'MEDICINE'
      };
      
      // Try exact match first
      if (departmentMap[departmentName]) {
        return departmentMap[departmentName];
      }
      
      // Try partial match for flexibility
      const departmentLower = departmentName?.toLowerCase() || '';
      for (const [fullName, shortCode] of Object.entries(departmentMap)) {
        if (departmentLower.includes(fullName.toLowerCase()) || 
            fullName.toLowerCase().includes(departmentLower)) {
          return shortCode;
        }
      }
      
      // Default fallback - extract first letters or return as-is
      return departmentName?.toUpperCase().replace(/[^A-Z]/g, '').substring(0, 4) || 'UNKNOWN';
    };

    const departmentCode = getDepartmentShortCode(deptUser.assigned_department);

    console.log('✅ Department user details loaded:', {
      name: deptUser.name,
      email: deptUser.email,
      faculty: deptUser.assigned_faculty,
      department: deptUser.assigned_department,
      departmentCode: departmentCode
    });

    return { 
      data: {
        id: deptUser.user_id,
        name: deptUser.name,
        email: deptUser.email,
        faculty: deptUser.assigned_faculty,
        department: deptUser.assigned_department,
        departmentCode: departmentCode,
        phone: deptUser.phone_no,
        role: deptUser.role || 'department'
      }, 
      error: null 
    };
  } catch (err) {
    console.error('❌ Exception fetching logged-in department user:', err);
    return { data: null, error: err };
  }
};

/**
 * Update department user profile
 * @param {string} userId - User ID
 * @param {Object} updates - Profile updates
 * @returns {Promise<{data: Object, error: any}>}
 */
export const updateDepartmentUserProfile = async (userId, updates) => {
  try {
    console.log('🔄 Updating department user profile:', userId);
    
    const { data, error } = await supabase
      .from('department_users')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .select();

    if (error) {
      console.error('❌ Error updating department user profile:', error);
      return { data: null, error };
    }

    console.log('✅ Department user profile updated successfully');
    return { data, error: null };
  } catch (err) {
    console.error('❌ Exception in updateDepartmentUserProfile:', err);
    return { data: null, error: err };
  }
};

/**
 * Get department user permissions
 * @param {string} userId - User ID
 * @returns {Promise<{data: Object, error: any}>}
 */
export const getDepartmentUserPermissions = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('department_users')
      .select('role, assigned_faculty, assigned_department')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('❌ Error fetching department user permissions:', error);
      return { data: null, error };
    }

    // Define permissions based on role and department
    const permissions = {
      canViewScholars: true,
      canApproveScholars: data.role === 'department' || data.role === 'hod',
      canRejectScholars: data.role === 'department' || data.role === 'hod',
      canForwardScholars: data.role === 'department' || data.role === 'hod',
      canAddQueries: true,
      canViewReports: data.role === 'department' || data.role === 'hod',
      canManageUsers: data.role === 'hod',
      faculty: data.assigned_faculty,
      department: data.assigned_department
    };

    return { data: permissions, error: null };
  } catch (err) {
    console.error('❌ Exception in getDepartmentUserPermissions:', err);
    return { data: null, error: err };
  }
};

/**
 * Log department user activity
 * @param {string} userId - User ID
 * @param {string} action - Action performed
 * @param {Object} details - Action details
 * @returns {Promise<{data: Object, error: any}>}
 */
export const logDepartmentUserActivity = async (userId, action, details = {}) => {
  try {
    const { data, error } = await supabase
      .from('department_activity_logs')
      .insert({
        user_id: userId,
        action,
        details,
        timestamp: new Date().toISOString()
      })
      .select();

    if (error) {
      console.error('❌ Error logging department user activity:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('❌ Exception in logDepartmentUserActivity:', err);
    return { data: null, error: err };
  }
};

/**
 * Get department user activity history
 * @param {string} userId - User ID
 * @param {number} limit - Number of records to fetch
 * @returns {Promise<{data: Array, error: any}>}
 */
export const getDepartmentUserActivityHistory = async (userId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('department_activity_logs')
      .select('*')
      .eq('user_id', userId)
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('❌ Error fetching department user activity history:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('❌ Exception in getDepartmentUserActivityHistory:', err);
    return { data: null, error: err };
  }
};

/**
 * Validate department user session
 * @returns {Promise<{data: Object, error: any}>}
 */
export const validateDepartmentUserSession = async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error || !session) {
      return { data: null, error: error || new Error('No active session') };
    }

    // Check if user is still valid in department_users table
    const { data: deptUser, error: deptError } = await supabase
      .from('department_users')
      .select('user_id, email, role, assigned_faculty, assigned_department')
      .eq('email', session.user.email)
      .single();

    if (deptError || !deptUser) {
      return { data: null, error: deptError || new Error('Department user not found') };
    }

    return { 
      data: {
        session,
        departmentUser: deptUser,
        isValid: true
      }, 
      error: null 
    };
  } catch (err) {
    console.error('❌ Exception in validateDepartmentUserSession:', err);
    return { data: null, error: err };
  }
};

/**
 * Sign out department user
 * @returns {Promise<{data: Object, error: any}>}
 */
export const signOutDepartmentUser = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('❌ Error signing out department user:', error);
      return { data: null, error };
    }

    console.log('✅ Department user signed out successfully');
    return { data: { success: true }, error: null };
  } catch (err) {
    console.error('❌ Exception in signOutDepartmentUser:', err);
    return { data: null, error: err };
  }
};

/**
 * Change department user password
 * @param {string} newPassword - New password
 * @returns {Promise<{data: Object, error: any}>}
 */
export const changeDepartmentUserPassword = async (newPassword) => {
  try {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      console.error('❌ Error changing department user password:', error);
      return { data: null, error };
    }

    console.log('✅ Department user password changed successfully');
    return { data, error: null };
  } catch (err) {
    console.error('❌ Exception in changeDepartmentUserPassword:', err);
    return { data: null, error: err };
  }
};

/**
 * Get department configuration
 * @param {string} departmentCode - Department code
 * @returns {Promise<{data: Object, error: any}>}
 */
export const getDepartmentConfiguration = async (departmentCode) => {
  try {
    const { data, error } = await supabase
      .from('department_configurations')
      .select('*')
      .eq('department_code', departmentCode)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found"
      console.error('❌ Error fetching department configuration:', error);
      return { data: null, error };
    }

    // Return default configuration if none exists
    const defaultConfig = {
      department_code: departmentCode,
      auto_approve_threshold: null,
      require_queries_before_approval: false,
      max_scholars_per_batch: 50,
      notification_settings: {
        email_notifications: true,
        sms_notifications: false
      },
      workflow_settings: {
        require_hod_approval: true,
        allow_bulk_operations: true
      }
    };

    return { data: data || defaultConfig, error: null };
  } catch (err) {
    console.error('❌ Exception in getDepartmentConfiguration:', err);
    return { data: null, error: err };
  }
};

export default {
  fetchLoggedInDepartmentUser,
  updateDepartmentUserProfile,
  getDepartmentUserPermissions,
  logDepartmentUserActivity,
  getDepartmentUserActivityHistory,
  validateDepartmentUserSession,
  signOutDepartmentUser,
  changeDepartmentUserPassword,
  getDepartmentConfiguration
};