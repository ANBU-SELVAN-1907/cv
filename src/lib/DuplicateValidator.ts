import { supabase } from './supabaseClient';
import { Student } from './types';

export async function validateDuplicate(rollNumber: string, faceEmbedding: number[]): Promise<{ isDuplicate: boolean; reason?: string, student?: Student }> {
    // 1. Check Roll Number
    const { data: rollData, error: rollError } = await supabase
        .from('students')
        .select('id')
        .eq('roll_number', rollNumber)
        .single();

    if (rollData && !rollError) {
        return { isDuplicate: true, reason: 'Roll number already registered.' };
    }

    /* 
    // 2. Check Face Embedding (OFF - As requested to avoid false positives)
    if (faceEmbedding && faceEmbedding.length === 128) {
        const { data: faceData } = await supabase.rpc('match_face_embedding', {
            query_embedding: `[${faceEmbedding.join(',')}]`,
            match_threshold: 0.90,
            match_count: 1
        });

        if (faceData && faceData.length > 0) {
            const { data: fullData } = await supabase.from('students').select('*').eq('id', faceData[0].id).single();
            return {
                isDuplicate: true,
                reason: `Existing Profile Detected: ${fullData.full_name} (${fullData.roll_number})`,
                student: fullData
            };
        }
    }
    */

    return { isDuplicate: false };
}
