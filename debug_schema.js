
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.REACT_APP_RMP_SUPABASE_URL;
const supabaseKey = process.env.REACT_APP_RMP_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
    console.log('--- Checking Supervisors Table ---');
    const { data: supData, error: supError } = await supabase.from('supervisors').select('*').limit(1);
    if (supError) {
        console.error('Error fetching supervisors:', supError);
    } else {
        console.log('Supervisors columns:', Object.keys(supData[0] || {}));
    }

    console.log('\n--- Checking Departments Table ---');
    const { data: deptData, error: deptError } = await supabase.from('departments').select('*').limit(1);
    if (deptError) {
        console.error('Error fetching departments:', deptError);
    } else {
        console.log('Departments columns:', Object.keys(deptData[0] || {}));
    }

    console.log('\n--- Checking Examination Records ---');
    const { data: examData, error: examError } = await supabase.from('examination_records').select('*').limit(1);
    if (examError) {
        console.error('Error fetching examination_records:', examError);
    } else {
        console.log('Examination Records columns:', Object.keys(examData[0] || {}));
    }
}

checkTables();
