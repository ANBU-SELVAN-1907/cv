/**
 * YOLO Offline Storage — IndexedDB Engine
 * 
 * Strategy:
 *  - ALL registrations (online or offline) are ALWAYS saved locally first.
 *  - Photos are stored as base64 strings directly — NO Supabase Storage used.
 *  - Supabase only stores text data (name, roll, dept, etc.) to save space.
 *  - Local data acts as a permanent backup, exportable as CSV at any time.
 */

const DB_NAME = 'yolo_verification_v3';
const STORE_NAME = 'students_local';
const DB_VERSION = 1;

export interface OfflineStudent {
    id?: number;
    full_name: string;
    roll_number: string;
    college: string;
    department: string;
    year: string;
    face_embedding?: number[];
    image_url?: string;      // Stored as base64 string locally
    photo_base64?: string;   // Always stored as base64 (local copy)
    created_at: string;
    check_in_status: boolean;
    synced_from_offline?: boolean;
    synced: number;          // 0 = not yet synced to Supabase, 1 = synced
}

export function initOfflineDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        if (typeof window === 'undefined') {
            return reject('IndexedDB is not available on server.');
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event: any) => {
            const db: IDBDatabase = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                const store = db.createObjectStore(STORE_NAME, {
                    keyPath: 'id',
                    autoIncrement: true,
                });
                store.createIndex('synced', 'synced', { unique: false });
                store.createIndex('roll_number', 'roll_number', { unique: false });
                store.createIndex('created_at', 'created_at', { unique: false });
            }
        };
    });
}

/**
 * Save a student record locally — ALWAYS called for every registration.
 * Accepts photo as base64 and stores it directly in IndexedDB.
 */
export async function saveOfflineStudent(
    student: Omit<OfflineStudent, 'id' | 'synced'>
): Promise<number> {
    const db = await initOfflineDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        // Always persist the base64 photo locally regardless of online state
        const record: Omit<OfflineStudent, 'id'> = {
            ...student,
            photo_base64: student.image_url || student.photo_base64 || undefined,
            synced: 0,
        };

        const request = store.add(record);
        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get all students that have NOT yet been synced to Supabase.
 */
export async function getUnsyncedStudents(): Promise<OfflineStudent[]> {
    const db = await initOfflineDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('synced');
        const request = index.getAll(IDBKeyRange.only(0));

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Get ALL students ever stored locally (synced or not).
 * Used for local dashboard and export.
 */
export async function getAllLocalStudents(): Promise<OfflineStudent[]> {
    const db = await initOfflineDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

/**
 * Mark a specific student record as synced to Supabase.
 */
export async function markStudentSynced(id: number): Promise<void> {
    const db = await initOfflineDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
            const data = request.result;
            if (!data) return resolve();
            data.synced = 1;
            const updateRequest = store.put(data);
            updateRequest.onsuccess = () => resolve();
            updateRequest.onerror = () => reject(updateRequest.error);
        };
        request.onerror = () => reject(request.error);
    });
}

/**
 * Export all local student records as a downloadable CSV file.
 * Photos (base64) are excluded from CSV to keep it readable.
 */
export async function exportLocalDataAsCSV(): Promise<void> {
    const students = await getAllLocalStudents();
    if (students.length === 0) {
        alert('No local data to export.');
        return;
    }

    const headers = ['ID', 'Full Name', 'Roll Number', 'College', 'Department', 'Year', 'Check-in Status', 'Registered At', 'Synced'];
    const rows = students.map(s => [
        s.id ?? '',
        `"${s.full_name}"`,
        s.roll_number,
        `"${s.college}"`,
        `"${s.department}"`,
        s.year,
        s.check_in_status ? 'Present' : 'Not Checked In',
        s.created_at,
        s.synced === 1 ? 'Yes' : 'No',
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `yolo_students_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Export all local student records including photos as a JSON file.
 * This is the full backup — includes base64 photos.
 */
export async function exportLocalDataAsJSON(): Promise<void> {
    const students = await getAllLocalStudents();
    if (students.length === 0) {
        alert('No local data to export.');
        return;
    }

    const blob = new Blob([JSON.stringify(students, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `yolo_students_full_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
}

/**
 * Get total count of all locally stored students.
 */
export async function getLocalStudentCount(): Promise<number> {
    const db = await initOfflineDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.count();

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}
