import { supabase, supabaseAdmin } from '../supabaseClient';

/**
 * Admin Service
 * Handles all admin-related operations including authentication
 */

// Fetch all admins
export const fetchAdmins = async () => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching admins:', error);
    return { data: null, error };
  }
};

// Fetch admin by ID
export const fetchAdminById = async (id) => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching admin:', error);
    return { data: null, error };
  }
};

// Fetch admin by email
export const fetchAdminByEmail = async (email) => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (error) {
      console.error('Error fetching admin by email:', error);
      return { data: null, error };
    }
    return { data, error: null };
  } catch (error) {
    console.error('Error fetching admin by email:', error);
    return { data: null, error };
  }
};

// Create admin with authentication
export const createAdminWithAuth = async (adminData) => {
  try {
    const { name, email, password, phone, role, campus, created_by } = adminData;

    // Use admin client if available, otherwise fall back to regular client
    const clientToUse = supabaseAdmin || supabase;

    // Step 1: Create authentication user
    const { data: authData, error: authError } = await clientToUse.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true, // Auto-confirm email
      user_metadata: {
        name: name,
        role: 'admin'
      }
    });

    if (authError) {
      console.error('Error creating auth user:', authError);
      return { data: null, error: authError };
    }

    // Step 2: Create admin record in admins table
    const { data: adminRecord, error: adminError } = await supabase
      .from('admins')
      .insert([
        {
          auth_user_id: authData.user?.id,
          name: name,
          email: email,
          phone: phone || null,
          role: role || 'Admin',
          campus: campus || 'Ramapuram',
          created_by: created_by || null,
          status: 'Active'
        }
      ])
      .select()
      .single();

    if (adminError) {
      console.error('Error creating admin record:', adminError);
      // If admin record creation fails, we should ideally delete the auth user
      // But for now, we'll just return the error
      return { data: null, error: adminError };
    }

    return { 
      data: {
        admin: adminRecord,
        auth: authData
      }, 
      error: null 
    };
  } catch (error) {
    console.error('Error in createAdminWithAuth:', error);
    return { data: null, error };
  }
};

// Update admin
export const updateAdmin = async (id, updates) => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating admin:', error);
    return { data: null, error };
  }
};

// Delete admin
export const deleteAdmin = async (id) => {
  try {
    // First, get the admin to find the auth_user_id
    const { data: admin, error: fetchError } = await fetchAdminById(id);
    
    if (fetchError) throw fetchError;

    // Delete the admin record (this will cascade delete the auth user if configured)
    const { error: deleteError } = await supabase
      .from('admins')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // Note: Deleting auth users requires admin privileges
    // This should be handled server-side or via Supabase Admin API
    // For now, we'll just delete the admin record
    
    return { data: { success: true }, error: null };
  } catch (error) {
    console.error('Error deleting admin:', error);
    return { data: null, error };
  }
};

// Update admin status
export const updateAdminStatus = async (id, status) => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .update({ status: status })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Error updating admin status:', error);
    return { data: null, error };
  }
};

// Reset admin password (requires admin privileges)
export const resetAdminPassword = async (email, newPassword) => {
  try {
    // This requires admin API access
    // Should be implemented server-side
    console.warn('Password reset should be implemented server-side with admin privileges');
    return { 
      data: null, 
      error: new Error('Password reset requires server-side implementation') 
    };
  } catch (error) {
    console.error('Error resetting admin password:', error);
    return { data: null, error };
  }
};

// Check if email already exists
export const checkEmailExists = async (email) => {
  try {
    const { data, error } = await supabase
      .from('admins')
      .select('email')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 is "not found" error
      throw error;
    }

    return { exists: !!data, error: null };
  } catch (error) {
    console.error('Error checking email:', error);
    return { exists: false, error };
  }
};
