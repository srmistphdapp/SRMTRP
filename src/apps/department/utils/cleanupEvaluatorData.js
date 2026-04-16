// Utility function to clean up invalid evaluator data from database
import { supabase } from '../../../supabaseClient';

/**
 * Clean up invalid evaluator data from examination_records table
 * This function will set examiner columns to null if they contain invalid/placeholder data
 */
export const cleanupInvalidEvaluatorData = async () => {
  try {
    console.log('🧹 Starting cleanup of invalid evaluator data...');
    
    // Get all records with evaluator data
    const { data: records, error: fetchError } = await supabase
      .from('examination_records')
      .select('id, examiner1, examiner2, examiner3')
      .or('examiner1.not.is.null,examiner2.not.is.null,examiner3.not.is.null');
    
    if (fetchError) {
      console.error('❌ Error fetching records:', fetchError);
      return { success: false, error: fetchError };
    }
    
    console.log(`📋 Found ${records.length} records with evaluator data`);
    
    const recordsToUpdate = [];
    
    records.forEach(record => {
      const updates = { id: record.id };
      let needsUpdate = false;
      
      // Check each examiner field
      ['examiner1', 'examiner2', 'examiner3'].forEach(examinerField => {
        const examinerData = record[examinerField];
        
        if (examinerData) {
          const parts = examinerData.split(' | ');
          const name = parts[0]?.trim();
          const affiliation = parts[1]?.trim();
          const staffId = parts[2]?.trim();
          
          // Check if data is invalid (empty, placeholder, or too short)
          const isInvalid = !name || !affiliation || !staffId ||
                           name === '' || affiliation === '' || staffId === '' ||
                           name.length < 2 || affiliation.length < 2 || staffId.length < 2 ||
                           name.toLowerCase().includes('evaluator') ||
                           name.toLowerCase().includes('test') ||
                           name.toLowerCase().includes('placeholder') ||
                           /^[a-z]{2,10}$/.test(name.toLowerCase()) || // Random letters like "hjkojk"
                           /^[a-z]{2,10}$/.test(affiliation.toLowerCase()) ||
                           /^[a-z]{2,10}$/.test(staffId.toLowerCase());
          
          if (isInvalid) {
            console.log(`🗑️ Cleaning invalid ${examinerField} data:`, examinerData);
            updates[examinerField] = null;
            needsUpdate = true;
          }
        }
      });
      
      if (needsUpdate) {
        recordsToUpdate.push(updates);
      }
    });
    
    console.log(`🔄 Found ${recordsToUpdate.length} records that need cleanup`);
    
    if (recordsToUpdate.length > 0) {
      // Update records in batches
      for (const update of recordsToUpdate) {
        const { error: updateError } = await supabase
          .from('examination_records')
          .update({
            examiner1: update.examiner1,
            examiner2: update.examiner2,
            examiner3: update.examiner3,
            updated_at: new Date().toISOString()
          })
          .eq('id', update.id);
        
        if (updateError) {
          console.error(`❌ Error updating record ${update.id}:`, updateError);
        } else {
          console.log(`✅ Cleaned record ${update.id}`);
        }
      }
    }
    
    console.log('✅ Cleanup completed successfully');
    return { success: true, cleanedRecords: recordsToUpdate.length };
    
  } catch (error) {
    console.error('❌ Exception during cleanup:', error);
    return { success: false, error };
  }
};