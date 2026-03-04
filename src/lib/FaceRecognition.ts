/**
 * High-Performance YOLO AI Engine
 * Handles Face Detection and Biometric Embedding Generation
 * Optimized for WASM and Browser-only execution
 */

// SSR Guard: Safely detect if we are in a browser environment
const isBrowser = typeof window !== 'undefined';

let modelsLoaded = false;
let loadingPromise: Promise<void> | null = null;
let apiInstance: any = null;

/**
 * Lazy-loads the face-api library only when needed in the browser.
 * This prevents the "TextEncoder" server-side crash during pre-rendering.
 */
const getFaceApi = async () => {
    if (!isBrowser) return null;

    // Only import if it doesn't exist to save memory
    if (!apiInstance) {
        try {
            // Using @vladmandic/face-api because it includes optimized tfjs handles
            apiInstance = await import('@vladmandic/face-api');
        } catch (err) {
            console.error('❌ YOLO AI: Critical Import Failure', err);
            return null;
        }
    }
    return apiInstance;
};

/**
 * Pre-initializes the models and the high-speed WASM backend.
 * Calling this early (e.g., in a Layout) removes the 15-second lag on the capture page.
 */
export const loadModels = async () => {
    // Fail-fast on server or if already loading
    if (!isBrowser) return;
    if (modelsLoaded) return;
    if (loadingPromise) return loadingPromise;

    const MODEL_URL = '/models/';

    loadingPromise = (async () => {
        try {
            console.log('📡 YOLO AI: Initializing Engine from', MODEL_URL);
            const api = await getFaceApi();
            if (!api) throw new Error('AI Bundle (face-api) could not be imported.');

            // WASM Backend setup
            if (api.tf?.setWasmPaths) {
                // Using a more reliable CDN path for WASM
                api.tf.setWasmPaths('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@latest/dist/');
                await api.tf.setBackend('wasm').catch(() => {
                    console.warn('⚠️ WASM Backend failed, falling back to WebGL');
                    return api.tf.setBackend('webgl');
                });
            }

            // Load models with retry logic or just better logging
            await Promise.all([
                api.nets.tinyFaceDetector.loadFromUri(MODEL_URL).catch((e: any) => { throw new Error(`TinyFace Model 404: ${e.message}`) }),
                api.nets.faceLandmark68Net.loadFromUri(MODEL_URL).catch((e: any) => { throw new Error(`Landmarks Model 404: ${e.message}`) }),
                api.nets.faceRecognitionNet.loadFromUri(MODEL_URL).catch((e: any) => { throw new Error(`Recognition Model 404: ${e.message}`) }),
            ]);

            modelsLoaded = true;
            console.log('✅ YOLO AI: High-Performance Models Ready');
        } catch (err: any) {
            console.error('❌ YOLO AI: Critical Engine Failure:', err.message);
            loadingPromise = null;
            throw err;
        }
    })();

    return loadingPromise;
}

/**
 * Detects a single face and extracts its landmarks + biometrics.
 * Returns null if no face is visible or if models aren't ready.
 */
export const detectFace = async (input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement) => {
    if (!isBrowser) return null;

    try {
        const api = await getFaceApi();
        if (!api) return null;

        // Auto-load if not already ready
        if (!modelsLoaded) await loadModels();

        // Detect single face with landmarks and descriptor (embedding)
        // using TinyFaceDetector with optimized settings for better detection
        const options = new api.TinyFaceDetectorOptions({
            inputSize: 416, // Standard size for high accuracy
            scoreThreshold: 0.2 // Very sensitive (default is 0.5) to catch faces in bad light
        });

        const result = await (api.detectSingleFace as any)(
            input,
            options
        ).withFaceLandmarks().withFaceDescriptor();

        return result;
    } catch (err) {
        console.error('❌ YOLO AI: Real-time detection error', err);
        return null;
    }
}

/**
 * High-level helper to get the 128-float face embedding array.
 * Perfect for duplicate prevention and secure student identity checks.
 */
export const getFaceEmbedding = async (input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement): Promise<number[] | null> => {
    if (!isBrowser) return null;

    const detection = await detectFace(input);
    if (!detection) return null;

    // Convert the Float32Array into a standard JSON-serializable array
    return Array.from(detection.descriptor);
}
