import { createClient } from '@supabase/supabase-js';

// Get campus preference from localStorage (default to 'rmp')
const getCampusPreference = () => {
  return localStorage.getItem('campus_preference') || 'rmp';
};

// Get Supabase configuration based on campus
const getSupabaseConfig = () => {
  const campus = getCampusPreference();

  if (campus === 'trp') {
    return {
      url: process.env.REACT_APP_TRP_SUPABASE_URL,
      anonKey: process.env.REACT_APP_TRP_SUPABASE_ANON_KEY,
      serviceKey: process.env.REACT_APP_TRP_SUPABASE_SERVICE_ROLE_KEY
    };
  }

  // Default to RMP
  return {
    url: process.env.REACT_APP_RMP_SUPABASE_URL,
    anonKey: process.env.REACT_APP_RMP_SUPABASE_ANON_KEY,
    serviceKey: process.env.REACT_APP_RMP_SUPABASE_SERVICE_ROLE_KEY
  };
};

const config = getSupabaseConfig();

if (!config.url || !config.anonKey) {
  console.error('Missing Supabase environment variables for campus:', getCampusPreference());
}

// Regular client for normal operations
export const supabase = createClient(config.url, config.anonKey);

// Admin client for user management operations (creating/deleting auth users)
export const supabaseAdmin = config.serviceKey
  ? createClient(config.url, config.serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  : null;

// Helper function to switch campus and reload the app
export const switchCampus = (campus) => {
  if (campus !== 'rmp' && campus !== 'trp') {
    console.error('Invalid campus. Must be "rmp" or "trp"');
    return;
  }

  localStorage.setItem('campus_preference', campus);
  // Reload to reinitialize Supabase clients
  window.location.reload();
};

// Get current campus
export const getCurrentCampus = () => getCampusPreference();

