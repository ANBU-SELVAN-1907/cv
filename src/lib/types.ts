export interface Student {
    id?: string; // UUID from Supabase
    full_name: string;
    roll_number: string;
    college: string;
    department: string;
    year: string;
    face_embedding?: number[];
    image_url?: string;
    created_at: string;
    check_in_status: boolean;
    synced_from_offline?: boolean;
}
