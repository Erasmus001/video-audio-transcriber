import { VideoAnalysisData, CachedProject, VideoProject } from '../types';

const DB_NAME = 'VideoScripterDB';
const DB_VERSION = 2;
const STORE_TRANSCRIPTS = 'transcripts';
const STORE_PROJECTS = 'projects';

const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      
      if (!db.objectStoreNames.contains(STORE_TRANSCRIPTS)) {
        db.createObjectStore(STORE_TRANSCRIPTS, { keyPath: 'id' });
      }
      
      if (!db.objectStoreNames.contains(STORE_PROJECTS)) {
        db.createObjectStore(STORE_PROJECTS, { keyPath: 'id' });
      }
    };
  });
};

// --- Transcript Caching (Existing) ---

export const generateCacheKey = (fileName: string, fileSize: number, duration: number): string => {
  return `${fileName}_${fileSize}_${Math.round(duration)}`;
};

export const getCachedTranscript = async (
  fileName: string, 
  fileSize: number, 
  duration: number
): Promise<CachedProject | null> => {
  try {
    const db = await openDB();
    const key = generateCacheKey(fileName, fileSize, duration);
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_TRANSCRIPTS, 'readonly');
      const store = transaction.objectStore(STORE_TRANSCRIPTS);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error accessing IndexedDB (Cache):', error);
    return null;
  }
};

export const cacheTranscript = async (
  fileName: string,
  fileSize: number,
  duration: number,
  data: VideoAnalysisData
): Promise<void> => {
  try {
    const db = await openDB();
    const key = generateCacheKey(fileName, fileSize, duration);
    
    const cachedItem: CachedProject = {
      id: key,
      fileName,
      fileSize,
      duration,
      data,
      createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_TRANSCRIPTS, 'readwrite');
      const store = transaction.objectStore(STORE_TRANSCRIPTS);
      const request = store.put(cachedItem);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error saving to IndexedDB (Cache):', error);
  }
};

// --- Project Persistence (New) ---

export const saveProject = async (project: VideoProject): Promise<void> => {
  try {
    const db = await openDB();
    
    // Create a copy to store, removing session-specific data like URL.createObjectURL results
    // Structured clone algorithm in IDB handles File/Blob objects automatically.
    const projectToStore = { ...project };
    delete projectToStore.previewUrl;

    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = transaction.objectStore(STORE_PROJECTS);
      const request = store.put(projectToStore);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error saving project to IndexedDB:', error);
  }
};

export const getAllProjects = async (): Promise<VideoProject[]> => {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_PROJECTS, 'readonly');
      const store = transaction.objectStore(STORE_PROJECTS);
      const request = store.getAll();

      request.onsuccess = () => {
        const projects = request.result as VideoProject[];
        // Sort by newest first
        projects.sort((a, b) => b.createdAt - a.createdAt);
        resolve(projects);
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error loading projects from IndexedDB:', error);
    return [];
  }
};

export const deleteProjectFromDB = async (id: string): Promise<void> => {
  try {
    const db = await openDB();
    
    return new Promise((resolve, reject) => {
      const transaction = db.transaction(STORE_PROJECTS, 'readwrite');
      const store = transaction.objectStore(STORE_PROJECTS);
      const request = store.delete(id);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('Error deleting project from IndexedDB:', error);
  }
};