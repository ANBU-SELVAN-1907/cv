'use client';

import { useEffect, useState } from 'react';

/**
 * High-performance AI pre-initializer.
 * Forces the AI models and WASM backend to load as soon as the app starts,
 * eliminating the 10-15s wait time on the capture screen.
 */
export function ModelInitializer() {
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Only run on client after mount
        (async () => {
            try {
                // Using dynamic import to prevent server-side crash during pre-rendering
                const { loadModels } = await import('@/lib/FaceRecognition');
                await loadModels();
                console.log('✨ YOLO: AI Engine is Warmed Up & Ready.');
            } catch (err) {
                console.error('✨ YOLO: AI Pre-load Warning:', err);
            }
        })();
    }, []);

    return null;
}
