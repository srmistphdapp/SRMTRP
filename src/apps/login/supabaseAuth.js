import { supabase } from '../../supabaseClient';

// Supabase Auth helper functions
export const supabaseAuth = {
  // Sign in with email and password
  signIn: async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      console.error('Supabase sign in error:', error);
      throw error;
    }
    
    return data;
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      console.error('Supabase sign out error:', error);
      throw error;
    }
  },

  // Get current user
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }
    
    return user;
  },

  // Get current session
  getSession: async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.error('Error getting session:', error);
      return null;
    }
    
    return session;
  },

  // Listen to auth state changes
  onAuthStateChange: (callback) => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
    
    return subscription;
  },

  // Reset password - send reset email
  resetPassword: async (email) => {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password?email=${encodeURIComponent(email)}`,
    });
    
    if (error) {
      console.error('Supabase password reset error:', error);
      throw error;
    }
    
    return data;
  },

  // Verify OTP for password reset
  verifyOtp: async (email, token, type = 'recovery') => {
    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type
    });
    
    if (error) {
      console.error('Supabase OTP verification error:', error);
      throw error;
    }
    
    return data;
  },

  // Update password (used after reset)
  updatePassword: async (newPassword) => {
    const { data, error } = await supabase.auth.updateUser({
      password: newPassword
    });
    
    if (error) {
      console.error('Supabase password update error:', error);
      throw error;
    }
    
    return data;
  }
};

export default supabaseAuth;
