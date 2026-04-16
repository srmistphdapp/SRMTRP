import { supabase, supabaseAdmin } from '../supabaseClient';

// =====================================================
// COORDINATOR SERVICE - API FUNCTIONS
// =====================================================
// This service handles all Supabase operations for coordinators
// including authentication user creation
// =====================================================

/**
 * Create coordinator with authentication
 * This creates both the coordinator record AND the Supabase auth user
 * @param {Object} coordinatorData - Coordinator data
 * @returns {Promise<{data: Object, error: any}>}
 */
export const createCoordinatorWithAuth = async (coordinatorData) => {
  try {
    console.log('Creating coordinator with auth:', coordinatorData);

    if (!supabaseAdmin) {
      return {
        data: null,
        error: { message: 'Admin client not configured. Please add REACT_APP_SUPABASE_SERVICE_ROLE_KEY to .env' }
      };
    }

    // Step 1: Create the auth user with default password
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: coordinatorData.email,
      password: '1234', // Default password
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        full_name: coordinatorData.name,
        role: 'coordinator',
        assigned_faculty: coordinatorData.assigned_faculty,
        campus: coordinatorData.campus || 'Trichy'
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return { data: null, error: authError };
    }

    console.log('Auth user created:', authData.user.id);

    // Step 2: Create the coordinator record
    const { data: coordinatorRecord, error: coordinatorError } = await supabase
      .from('coordinators')
      .insert([{
        name: coordinatorData.name,
        email: coordinatorData.email,
        phone: coordinatorData.phone,
        assigned_faculty: coordinatorData.assigned_faculty,
        campus: coordinatorData.campus || 'Trichy',
        status: coordinatorData.status || 'Active'
      }])
      .select()
      .single();

    if (coordinatorError) {
      console.error('Error creating coordinator record:', coordinatorError);
      // Rollback: Delete the auth user if coordinator creation fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      return { data: null, error: coordinatorError };
    }

    console.log('Coordinator created successfully:', coordinatorRecord);

    // Step 3: Update user_roles with the auth user_id
    const { error: userRoleError } = await supabase
      .from('user_roles')
      .update({ user_id: authData.user.id })
      .eq('email', coordinatorData.email);

    if (userRoleError) {
      console.warn('Warning: Could not update user_roles with user_id:', userRoleError);
    }

    return {
      data: {
        coordinator: coordinatorRecord,
        authUser: authData.user,
        defaultPassword: '1234'
      },
      error: null
    };
  } catch (err) {
    console.error('Exception in createCoordinatorWithAuth:', err);
    return { data: null, error: err };
  }
};

/**
 * Fetch all coordinators
 * @param {string} campus - Optional campus filter ('Trichy' or 'Ramapuram')
 * @returns {Promise<{data: Array, error: any}>}
 */
export const fetchCoordinators = async (campus = null) => {
  try {
    let query = supabase
      .from('coordinators')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply campus filter if provided
    if (campus) {
      query = query.eq('campus', campus);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching coordinators:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchCoordinators:', err);
    return { data: null, error: err };
  }
};

/**
 * Fetch single coordinator by ID
 * @param {number} id - Coordinator ID
 * @returns {Promise<{data: Object, error: any}>}
 */
export const fetchCoordinatorById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('coordinators')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching coordinator by ID:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchCoordinatorById:', err);
    return { data: null, error: err };
  }
};

/**
 * Fetch coordinators by faculty
 * @param {string} faculty - Faculty name
 * @returns {Promise<{data: Array, error: any}>}
 */
export const fetchCoordinatorsByFaculty = async (faculty) => {
  try {
    const { data, error } = await supabase
      .from('coordinators')
      .select('*')
      .eq('assigned_faculty', faculty)
      .eq('status', 'Active')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching coordinators by faculty:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in fetchCoordinatorsByFaculty:', err);
    return { data: null, error: err };
  }
};

/**
 * Add new coordinator
 * @param {Object} coordinatorData - Coordinator data
 * @returns {Promise<{data: Object, error: any}>}
 */
export const addCoordinator = async (coordinatorData) => {
  try {
    console.log('Attempting to add coordinator:', coordinatorData);

    const { data, error } = await supabase
      .from('coordinators')
      .insert([coordinatorData])
      .select();

    if (error) {
      console.error('Supabase error adding coordinator:', error);
      return { data: null, error };
    }

    console.log('Coordinator added successfully:', data);
    return { data, error: null };
  } catch (err) {
    console.error('Exception in addCoordinator:', err);
    return { data: null, error: err };
  }
};

/**
 * Update coordinator
 * @param {number} id - Coordinator ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{data: Object, error: any}>}
 */
export const updateCoordinator = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('coordinators')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error updating coordinator:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in updateCoordinator:', err);
    return { data: null, error: err };
  }
};

/**
 * Delete coordinator
 * @param {number} id - Coordinator ID
 * @returns {Promise<{data: Object, error: any}>}
 */
export const deleteCoordinator = async (id) => {
  try {
    // First, get the coordinator to find their email
    const { data: coordinator, error: fetchError } = await supabase
      .from('coordinators')
      .select('email')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching coordinator:', fetchError);
      return { data: null, error: fetchError };
    }

    // Get the user_id from user_roles table
    const { data: userRole, error: roleError } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('email', coordinator.email)
      .single();

    // Delete the coordinator record (this will cascade to user_roles via trigger)
    const { data, error } = await supabase
      .from('coordinators')
      .delete()
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error deleting coordinator:', error);
      return { data: null, error };
    }

    // Delete the auth user if exists
    if (userRole && userRole.user_id && supabaseAdmin) {
      const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(
        userRole.user_id
      );
      if (authDeleteError) {
        console.warn('Warning: Could not delete auth user:', authDeleteError);
      }
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in deleteCoordinator:', err);
    return { data: null, error: err };
  }
};

/**
 * Toggle coordinator status (Active/Inactive)
 * @param {number} id - Coordinator ID
 * @param {string} newStatus - New status ('Active' or 'Inactive')
 * @returns {Promise<{data: Object, error: any}>}
 */
export const toggleCoordinatorStatus = async (id, newStatus) => {
  try {
    const { data, error } = await supabase
      .from('coordinators')
      .update({ status: newStatus })
      .eq('id', id)
      .select();

    if (error) {
      console.error('Error toggling coordinator status:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in toggleCoordinatorStatus:', err);
    return { data: null, error: err };
  }
};

/**
 * Search coordinators by name or email
 * @param {string} searchTerm - Search term
 * @returns {Promise<{data: Array, error: any}>}
 */
export const searchCoordinators = async (searchTerm) => {
  try {
    const { data, error } = await supabase
      .from('coordinators')
      .select('*')
      .or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error searching coordinators:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in searchCoordinators:', err);
    return { data: null, error: err };
  }
};

/**
 * Get coordinator statistics
 * @returns {Promise<{data: Object, error: any}>}
 */
export const getCoordinatorStats = async () => {
  try {
    // Get total count
    const { count: totalCount, error: totalError } = await supabase
      .from('coordinators')
      .select('*', { count: 'exact', head: true });

    if (totalError) throw totalError;

    // Get active count
    const { count: activeCount, error: activeError } = await supabase
      .from('coordinators')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'Active');

    if (activeError) throw activeError;

    // Get count by faculty
    const { data: facultyData, error: facultyError } = await supabase
      .from('coordinators')
      .select('assigned_faculty')
      .eq('status', 'Active');

    if (facultyError) throw facultyError;

    const facultyCounts = facultyData.reduce((acc, curr) => {
      acc[curr.assigned_faculty] = (acc[curr.assigned_faculty] || 0) + 1;
      return acc;
    }, {});

    return {
      data: {
        total: totalCount || 0,
        active: activeCount || 0,
        inactive: (totalCount || 0) - (activeCount || 0),
        byFaculty: facultyCounts
      },
      error: null
    };
  } catch (err) {
    console.error('Exception in getCoordinatorStats:', err);
    return { data: null, error: err };
  }
};

/**
 * Check if email already exists
 * @param {string} email - Email to check
 * @param {number} excludeId - ID to exclude from check (for updates)
 * @returns {Promise<{exists: boolean, error: any}>}
 */
export const checkEmailExists = async (email, excludeId = null) => {
  try {
    let query = supabase
      .from('coordinators')
      .select('id')
      .eq('email', email);

    if (excludeId) {
      query = query.neq('id', excludeId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error checking email:', error);
      return { exists: false, error };
    }

    return { exists: data && data.length > 0, error: null };
  } catch (err) {
    console.error('Exception in checkEmailExists:', err);
    return { exists: false, error: err };
  }
};


/**
 * Get coordinator info by email (used during login)
 * @param {string} email - Coordinator email
 * @returns {Promise<{data: Object, error: any}>}
 */
export const getCoordinatorByEmail = async (email) => {
  try {
    const { data, error } = await supabase
      .from('coordinators')
      .select('*')
      .eq('email', email.toLowerCase())
      .eq('status', 'Active')
      .single();

    if (error) {
      // Don't log as error if it's just "not found"
      if (error.code === 'PGRST116') {
        return { data: null, error: null };
      }
      console.error('Error fetching coordinator by email:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in getCoordinatorByEmail:', err);
    return { data: null, error: err };
  }
};

/**
 * Get user role information by email
 * @param {string} email - User email
 * @returns {Promise<{data: Object, error: any}>}
 */
export const getUserRoleByEmail = async (email) => {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('Error fetching user role:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception in getUserRoleByEmail:', err);
    return { data: null, error: err };
  }
};
