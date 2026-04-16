
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.REACT_APP_RMP_SUPABASE_URL, process.env.REACT_APP_RMP_SUPABASE_SERVICE_ROLE_KEY);

async function check() {
    const { data, error } = await supabase.from('supervisors').select('*');
    if (error) {
        console.error('FETCH ERROR:', error);
    } else {
        console.log('Fetch successful, count:', data.length);
        // If empty, look at the error from a failed insert to see column names or try RPC
        const { error: insError } = await supabase.from('supervisors').insert([{name: 'Test'}]).select();
        if (insError) {
            console.log('Insert error info:', insError.message);
        } else {
            console.log('Insert successful');
            // Clean up
            await supabase.from('supervisors').delete().eq('name', 'Test');
        }
    }
}
check();
