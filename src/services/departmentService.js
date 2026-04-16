// Department Service - Handles all department-related operations with Supabase
import { supabase } from '../supabaseClient';
import { supabaseAdmin } from '../supabaseClient';

/**
 * Fetch all departments from Supabase
 * @returns {Promise<{data: Array, error: any}>}
 */
export const fetchDepartments = async () => {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .order('faculty', { ascending: true })
      .order('department_name', { ascending: true });

    if (error) {
      console.error('Error fetching departments:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception fetching departments:', err);
    return { data: null, error: err };
  }
};

/**
 * Fetch departments for a specific faculty
 * @param {string} facultyName - Name of the faculty
 * @returns {Promise<{data: Array, error: any}>}
 */
export const fetchDepartmentsByFaculty = async (facultyName) => {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('faculty', facultyName)
      .order('department_name', { ascending: true });

    if (error) {
      console.error('Error fetching departments by faculty:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception fetching departments by faculty:', err);
    return { data: null, error: err };
  }
};

/**
 * Create a new department with authentication
 * @param {Object} departmentData - Department data
 * @param {string} departmentData.department_name - Name of the department
 * @param {string} departmentData.faculty - Faculty name
 * @param {string} departmentData.head_of_department - HOD name
 * @param {string} departmentData.hod_email - HOD email (required for auth)
 * @param {string} departmentData.phone_no - Phone number
 * @returns {Promise<{data: Object, error: any}>}
 */
export const createDepartmentWithAuth = async (departmentData) => {
  try {
    console.log('=== CREATE DEPARTMENT WITH AUTH ===');
    console.log('Department data:', departmentData);
    console.log('supabaseAdmin exists:', !!supabaseAdmin);
    
    // Step 1: Create department in database
    const { data: deptData, error: deptError } = await supabase
      .from('departments')
      .insert([{
        department_name: departmentData.department_name,
        faculty: departmentData.faculty,
        head_of_department: departmentData.head_of_department || null,
        hod_email: departmentData.hod_email || null,
        phone_no: departmentData.phone_no || null
      }])
      .select()
      .single();

    if (deptError) {
      console.error('Error creating department:', deptError);
      return { data: null, error: deptError };
    }

    console.log('Department created successfully:', deptData);

    // Step 2: Create auth user and department_users record if HOD email is provided
    if (departmentData.hod_email && departmentData.hod_email.trim()) {
      // Check if supabaseAdmin is available
      if (!supabaseAdmin) {
        console.error('supabaseAdmin is not initialized. Check REACT_APP_SUPABASE_SERVICE_ROLE_KEY in .env');
        return { 
          data: deptData, 
          error: null,
          warning: 'Department created but auth user creation failed: Service role key not configured'
        };
      }

      try {
        console.log('Creating auth user for:', departmentData.hod_email);
        const displayName = departmentData.head_of_department || 'HOD';
        
        const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: departmentData.hod_email,
          password: '1234', // Default password
          email_confirm: true,
          user_metadata: {
            full_name: displayName,  // This is what Supabase uses for Display Name
            name: displayName,
            role: 'department',
            department: departmentData.department_name,
            faculty: departmentData.faculty
          }
        });

        if (authError) {
          console.error('Error creating auth user for HOD:', authError);
          // Don't fail the whole operation if auth creation fails
          return { 
            data: deptData, 
            error: null,
            warning: `Department created but auth user creation failed: ${authError.message}`
          };
        }

        console.log('Auth user created for HOD:', authData.user.email);
        console.log('Auth user ID:', authData.user.id);
        console.log('Display name set to:', displayName);

        // Step 3: Insert into department_users table
        console.log('Creating department_users record...');
        const { data: deptUserData, error: deptUserError } = await supabase
          .from('department_users')
          .insert({
            user_id: authData.user.id,
            name: departmentData.head_of_department || 'HOD',
            email: departmentData.hod_email,
            assigned_faculty: departmentData.faculty,
            assigned_department: departmentData.department_name,
            role: 'department',
            phone_no: departmentData.phone_no || null
          })
          .select()
          .single();

        if (deptUserError) {
          console.error('Error creating department_users record:', deptUserError);
          console.error('Error details:', JSON.stringify(deptUserError, null, 2));
          // Try to clean up auth user if department_users creation fails
          await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
          return { 
            data: deptData, 
            error: null,
            warning: `Department created but user record creation failed: ${deptUserError.message}`
          };
        }

        console.log('Department user record created successfully:', deptUserData);

        // Step 4: Insert/Update user_roles table with department role
        const { error: roleError } = await supabase
          .from('user_roles')
          .upsert({
            user_id: authData.user.id,
            email: departmentData.hod_email,
            role: 'department',
            department: departmentData.department_name,
            faculty: departmentData.faculty
          }, {
            onConflict: 'user_id'
          });

        if (roleError) {
          console.error('Error updating user_roles:', roleError);
        } else {
          console.log('User role updated successfully');
        }

        return { 
          data: deptData, 
          error: null,
          authCreated: true,
          credentials: {
            email: departmentData.hod_email,
            password: '1234'
          }
        };
      } catch (authException) {
        console.error('Exception creating auth user:', authException);
        return { 
          data: deptData, 
          error: null,
          warning: `Department created but auth user creation failed: ${authException.message}`
        };
      }
    }

    return { data: deptData, error: null };
  } catch (err) {
    console.error('Exception creating department:', err);
    return { data: null, error: err };
  }
};

/**
 * Create a new department (legacy - without auth)
 * @param {Object} departmentData - Department data
 * @returns {Promise<{data: Object, error: any}>}
 */
export const createDepartment = async (departmentData) => {
  return createDepartmentWithAuth(departmentData);
};

/**
 * Update an existing department
 * @param {string} id - Department ID
 * @param {Object} departmentData - Updated department data
 * @returns {Promise<{data: Object, error: any, emailUpdated: boolean}>}
 */
export const updateDepartment = async (id, departmentData) => {
  try {
    console.log('=== UPDATE DEPARTMENT ===');
    console.log('Department ID:', id);
    console.log('New data:', departmentData);

    // Step 1: Get the current department data to check what changed
    const { data: currentDept, error: fetchError } = await supabase
      .from('departments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching current department:', fetchError);
      return { data: null, error: fetchError, emailUpdated: false };
    }

    console.log('Current department:', currentDept);

    // Check if email changed (only if both emails exist and are different)
    const oldEmail = currentDept.hod_email?.trim();
    const newEmail = departmentData.hod_email?.trim();
    const emailChanged = oldEmail && newEmail && oldEmail !== newEmail;

    console.log('Email changed:', emailChanged);
    if (emailChanged) {
      console.log('Old email:', oldEmail);
      console.log('New email:', newEmail);
    }

    // Step 2: Update the departments table
    const { data, error } = await supabase
      .from('departments')
      .update({
        department_name: departmentData.department_name,
        faculty: departmentData.faculty,
        head_of_department: departmentData.head_of_department || null,
        hod_email: departmentData.hod_email || null,
        phone_no: departmentData.phone_no || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating department:', error);
      return { data: null, error, emailUpdated: false };
    }

    console.log('✅ Department updated successfully in database');

    let emailUpdatedInAuth = false;

    // Step 3: Handle email synchronization with Supabase Auth
    if (emailChanged) {
      console.log('🔄 Email changed - syncing with Supabase Auth...');
      
      try {
        // Find the department user record by old email
        const { data: oldDeptUser, error: findError } = await supabase
          .from('department_users')
          .select('user_id')
          .eq('email', oldEmail)
          .single();

        if (findError) {
          console.warn('⚠️ Could not find department_users record with old email:', findError);
        } else if (oldDeptUser && oldDeptUser.user_id) {
          console.log('Found department user with ID:', oldDeptUser.user_id);

          // Update the auth user's email (requires service role)
          if (!supabaseAdmin) {
            console.error('❌ supabaseAdmin not available - cannot update auth email');
            console.error('Make sure REACT_APP_SUPABASE_SERVICE_ROLE_KEY is set in .env');
          } else {
            console.log('Updating auth email for user:', oldDeptUser.user_id);
            
            const { error: emailUpdateError } = await supabaseAdmin.auth.admin.updateUserById(
              oldDeptUser.user_id,
              { email: newEmail }
            );

            if (emailUpdateError) {
              console.error('❌ Failed to update auth email:', emailUpdateError);
            } else {
              console.log('✅ Auth email updated successfully');
              emailUpdatedInAuth = true;

              // Update department_users table with new email
              const { error: deptUserError } = await supabase
                .from('department_users')
                .update({
                  name: departmentData.head_of_department || null,
                  email: newEmail,
                  assigned_faculty: departmentData.faculty,
                  assigned_department: departmentData.department_name,
                  phone_no: departmentData.phone_no || null,
                  updated_at: new Date().toISOString()
                })
                .eq('user_id', oldDeptUser.user_id);

              if (deptUserError) {
                console.error('❌ Failed to update department_users:', deptUserError);
              } else {
                console.log('✅ Department_users record updated with new email');
              }

              // Update user_roles table
              const { error: roleError } = await supabase
                .from('user_roles')
                .update({
                  email: newEmail,
                  department: departmentData.department_name,
                  faculty: departmentData.faculty
                })
                .eq('user_id', oldDeptUser.user_id);

              if (roleError) {
                console.warn('⚠️ Could not update user_roles:', roleError);
              } else {
                console.log('✅ User_roles updated with new email');
              }
            }
          }
        }
      } catch (emailUpdateErr) {
        console.error('❌ Exception updating email in auth:', emailUpdateErr);
      }
    } else if (departmentData.hod_email) {
      // Email didn't change, just update other fields in department_users
      console.log('📝 Email unchanged - updating other fields only');
      
      try {
        const { error: deptUserError } = await supabase
          .from('department_users')
          .update({
            name: departmentData.head_of_department || null,
            assigned_faculty: departmentData.faculty,
            assigned_department: departmentData.department_name,
            phone_no: departmentData.phone_no || null,
            updated_at: new Date().toISOString()
          })
          .eq('email', departmentData.hod_email);

        if (deptUserError) {
          console.warn('⚠️ Could not update department_users:', deptUserError);
        } else {
          console.log('✅ Department_users record updated (email unchanged)');
        }
      } catch (updateErr) {
        console.warn('⚠️ Exception updating department_users:', updateErr);
      }
    }

    // Always update user metadata if we have an email
    if (departmentData.hod_email) {
      try {
        const { data: deptUser } = await supabase
          .from('department_users')
          .select('user_id')
          .eq('email', departmentData.hod_email)
          .single();

        if (deptUser && deptUser.user_id && supabaseAdmin) {
          const { error: metadataError } = await supabaseAdmin.auth.admin.updateUserById(
            deptUser.user_id,
            {
              user_metadata: {
                full_name: departmentData.head_of_department || 'HOD',
                name: departmentData.head_of_department || 'HOD',
                role: 'department',
                department: departmentData.department_name,
                faculty: departmentData.faculty
              }
            }
          );

          if (metadataError) {
            console.warn('⚠️ Could not update user metadata:', metadataError);
          } else {
            console.log('✅ User metadata updated successfully');
          }
        }
      } catch (metadataErr) {
        console.warn('⚠️ Exception updating user metadata:', metadataErr);
      }
    }

    console.log('=== UPDATE COMPLETE ===');
    return { data, error: null, emailUpdated: emailUpdatedInAuth };
  } catch (err) {
    console.error('Exception updating department:', err);
    return { data: null, error: err, emailUpdated: false };
  }
};

/**
 * Delete a department and its associated auth user
 * @param {string} id - Department ID
 * @returns {Promise<{data: Object, error: any}>}
 */
export const deleteDepartment = async (id) => {
  try {
    // First, get the department to find the HOD email
    const { data: deptData, error: fetchError } = await supabase
      .from('departments')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching department for deletion:', fetchError);
      return { data: null, error: fetchError };
    }

    // Try to delete the department_users record and auth user if HOD email exists
    if (deptData.hod_email) {
      try {
        // Get the department user record
        const { data: deptUser } = await supabase
          .from('department_users')
          .select('user_id')
          .eq('email', deptData.hod_email)
          .single();

        if (deptUser && deptUser.user_id) {
          // Delete auth user (this will cascade delete department_users due to FK)
          const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(deptUser.user_id);
          
          if (deleteAuthError) {
            console.error('Error deleting auth user:', deleteAuthError);
          } else {
            console.log('Auth user and department_users record deleted successfully');
          }
        }
      } catch (authException) {
        console.error('Exception deleting auth user:', authException);
        // Don't fail the whole operation
      }
    }

    // Delete the department (this will cascade delete department_users if FK exists)
    const { data, error } = await supabase
      .from('departments')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error deleting department:', error);
      return { data: null, error };
    }

    console.log('Department deleted successfully:', data);
    return { data, error: null };
  } catch (err) {
    console.error('Exception deleting department:', err);
    return { data: null, error: err };
  }
};

/**
 * Get unique faculty names from departments
 * @returns {Promise<{data: Array<string>, error: any}>}
 */
export const fetchFacultyNames = async () => {
  try {
    const { data, error } = await supabase
      .from('departments')
      .select('faculty')
      .order('faculty', { ascending: true });

    if (error) {
      console.error('Error fetching faculty names:', error);
      return { data: null, error };
    }

    // Get unique faculty names
    const uniqueFaculties = [...new Set(data.map(d => d.faculty))];
    return { data: uniqueFaculties, error: null };
  } catch (err) {
    console.error('Exception fetching faculty names:', err);
    return { data: null, error: err };
  }
};

/**
 * Fetch all department users
 * @returns {Promise<{data: Array, error: any}>}
 */
export const fetchDepartmentUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('department_users')
      .select('*')
      .order('assigned_faculty', { ascending: true })
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching department users:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception fetching department users:', err);
    return { data: null, error: err };
  }
};

/**
 * Fetch department users by faculty
 * @param {string} facultyName - Name of the faculty
 * @returns {Promise<{data: Array, error: any}>}
 */
export const fetchDepartmentUsersByFaculty = async (facultyName) => {
  try {
    const { data, error } = await supabase
      .from('department_users')
      .select('*')
      .eq('assigned_faculty', facultyName)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching department users by faculty:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception fetching department users by faculty:', err);
    return { data: null, error: err };
  }
};

/**
 * Fetch department users by department
 * @param {string} departmentName - Name of the department
 * @returns {Promise<{data: Array, error: any}>}
 */
export const fetchDepartmentUsersByDepartment = async (departmentName) => {
  try {
    const { data, error } = await supabase
      .from('department_users')
      .select('*')
      .eq('assigned_department', departmentName)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching department users by department:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (err) {
    console.error('Exception fetching department users by department:', err);
    return { data: null, error: err };
  }
};

/**
 * Fetch department user by email from department_users table
 * @param {string} email - Email of the department user
 * @returns {Promise<{data: Object, error: any}>}
 */
export const fetchDepartmentUserByEmail = async (email) => {
  try {
    console.log('🔍 Checking department_users for email:', email);
    
    // Check department_users table
    const { data, error } = await supabase
      .from('department_users')
      .select('*')
      .eq('email', email)
      .single();

    if (error) {
      console.error('❌ Error fetching department user by email:', error);
      console.error('Error details:', JSON.stringify(error, null, 2));
      return { data: null, error };
    }

    if (data) {
      console.log('✅ Department user found:', data.name, data.email);
    } else {
      console.log('❌ No department user found for email:', email);
    }

    return { data, error: null };
  } catch (err) {
    console.error('❌ Exception fetching department user by email:', err);
    return { data: null, error: err };
  }
};

/**
 * Fetch logged-in department user info with auth
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
        departmentCode: departmentCode, // Add the short code
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
