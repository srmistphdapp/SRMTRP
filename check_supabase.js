import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabaseUrl = process.env.REACT_APP_RMP_SUPABASE_URL || 'unknown';
const supabaseKey = process.env.REACT_APP_RMP_SUPABASE_SERVICE_ROLE_KEY || process.env.REACT_APP_RMP_SUPABASE_ANON_KEY || 'unknown';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
    console.log("Attempting insert to see error...");
    const { data, error } = await supabase.from('supervisors').insert([{
        affiliation: 'test'
    }]);

    if (error) {
        console.error("Insert error for affiliation:", error.message);
    }

    const { data: data2, error: error2 } = await supabase.from('supervisors').insert([{
        designation: 'test'
    }]);

    if (error2) {
        console.error("Insert error for designation:", error2.message);
    }
}

checkSchema();
