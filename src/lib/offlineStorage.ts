const DB_NAME = 'yolo_verification_v2'; // Changed name to force fresh start
const STORE_NAME = 'students_offline';
const DB_VERSION = 1;

export interface OfflineStudent {
    id?: number;
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
    synced: number; // 0 for false, 1 for true
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
                store.createIndex('roll_number', 'roll_number', { unique: true });
            }
        };
    });
}

export async function saveOfflineStudent(student: Omit<OfflineStudent, 'id' | 'synced'>): Promise<number> {
    const db = await initOfflineDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.add({ ...student, synced: 0 }); // 0 for unsynced

        request.onsuccess = () => resolve(request.result as number);
        request.onerror = () => reject(request.error);
    });
}

export async function getUnsyncedStudents(): Promise<OfflineStudent[]> {
    const db = await initOfflineDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const index = store.index('synced');
        const request = index.getAll(IDBKeyRange.only(0)); // 0 for unsynced

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

export async function markStudentSynced(id: number): Promise<void> {
    const db = await initOfflineDB();
    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.get(id);

        request.onsuccess = () => {
            const data = request.result;
            data.synced = 1; // 1 for synced
            const updateRequest = store.put(data);
            updateRequest.onsuccess = () => resolve();
            updateRequest.onerror = () => reject(updateRequest.error);
        };
        request.onerror = () => reject(request.error);
    });
}
