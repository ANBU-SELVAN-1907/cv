'use client';

import React, { useRef, useState, useCallback, useEffect } from 'react';
import Webcam from 'react-webcam';
import { Camera, CheckCircle2, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { getFaceEmbedding, loadModels } from '@/lib/FaceRecognition';

interface CameraCaptureProps {
    onCapture: (image: string, embedding: number[] | null) => void;
    isLoading?: boolean;
}

export function CameraCapture({ onCapture, isLoading }: CameraCaptureProps) {
    const webcamRef = useRef<Webcam>(null);
    const [faceDetected, setFaceDetected] = useState(false);
    const [modelsReady, setModelsReady] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [selectedDeviceId, setSelectedDeviceId] = useState<string | undefined>(undefined);
    const isProcessing = useRef(false);

    const handleDevices = useCallback(
        (mediaDevices: MediaDeviceInfo[]) =>
            setDevices(mediaDevices.filter(({ kind }) => kind === "videoinput")),
        [setDevices]
    );

    useEffect(() => {
        navigator.mediaDevices.enumerateDevices().then(handleDevices);
    }, [handleDevices]);

    useEffect(() => {
        const init = async () => {
            try {
                await loadModels();
                setModelsReady(true);
            } catch (err) {
                setError("Failed to load AI models. Ensure /public/models exist.");
            }
        };
        init();
    }, []);

    const [stabilityCounter, setStabilityCounter] = useState(0);

    const capture = useCallback(async () => {
        const imageSrc = webcamRef.current?.getScreenshot();
        const video = webcamRef.current?.video;

        if (imageSrc && video) {
            try {
                const embedding = await getFaceEmbedding(video);
                onCapture(imageSrc, embedding);
            } catch (err) {
                console.error("Capture Error:", err);
                setError("Camera error. Please try again.");
                setTimeout(() => setError(null), 3000);
            }
        }
    }, [webcamRef, onCapture]);

    const runFaceDetection = useCallback(async () => {
        if (!isProcessing.current && webcamRef.current?.video && modelsReady) {
            const video = webcamRef.current.video;
            if (video.readyState !== 4) return;

            isProcessing.current = true;
            try {
                const embedding = await getFaceEmbedding(video);
                const isFace = !!embedding;
                setFaceDetected(isFace);

                // ⚡ AUTO-CAPTURE LOGIC
                if (isFace && !isLoading) {
                    setStabilityCounter(prev => {
                        const next = prev + 1;
                        if (next >= 2) { // Responsive auto-pilot trigger (~2 seconds)
                            console.log("⚡ YOLO: Stable face detected. Auto-capturing...");
                            capture();
                            return 0;
                        }
                        return next;
                    });
                } else {
                    setStabilityCounter(0);
                }
            } catch (err) {
                console.error("Detection Error:", err);
            } finally {
                isProcessing.current = false;
            }
        }
    }, [modelsReady, capture, isLoading]);

    useEffect(() => {
        const interval = setInterval(runFaceDetection, 1000);
        return () => clearInterval(interval);
    }, [runFaceDetection]);

    return (
        <div className="relative w-full max-w-2xl mx-auto overflow-hidden rounded-[32px] border border-white/10 bg-black/50 shadow-2xl min-h-[400px] flex flex-col justify-center">
            {/* Loading Placeholder */}
            {!modelsReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/40 backdrop-blur-sm z-10">
                    <Loader2 size={40} className="animate-spin text-cyan-400" />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500">Initializing Vision Engine...</span>
                </div>
            )}
            {/* Webcam View */}
            <Webcam
                audio={false}
                ref={webcamRef}
                screenshotFormat="image/jpeg"
                videoConstraints={{
                    deviceId: selectedDeviceId,
                    facingMode: selectedDeviceId ? undefined : "user",
                    width: 1280,
                    height: 720,
                }}
                className="aspect-video w-full object-cover"
                onUserMediaError={() => setError("Camera access denied or device busy.")}
            />

            {/* Overlays */}
            <div className="absolute inset-0 pointer-events-none">
                {/* Scan line effect */}
                <motion.div
                    initial={{ top: 0 }}
                    animate={{ top: "100%" }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute left-0 right-0 h-1 bg-gradient-to-r from-blue-500/0 via-cyan-400/50 to-blue-500/0 blur-[1px]"
                />

                {/* Detection Area Helper (Optional visual guide) */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 border-2 border-dashed border-white/20 rounded-full flex items-center justify-center">
                        <div className="w-48 h-48 border-2 border-dashed border-white/10 rounded-full" />
                    </div>
                </div>
            </div>

            {/* Status Indicators */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
                <StatusPill
                    active={modelsReady}
                    loading={!modelsReady}
                    label={modelsReady ? "Models Ready" : "Loading Models..."}
                />
                <StatusPill
                    active={faceDetected}
                    icon={faceDetected ? <CheckCircle2 size={14} className="text-green-400" /> : <AlertCircle size={14} className="text-yellow-400" />}
                    label={faceDetected ? "Face Detected" : "No Face Found"}
                />
            </div>

            {/* Capture & Camera Controls */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-6">
                {devices.length > 1 && (
                    <button
                        onClick={() => {
                            const currentIndex = devices.findIndex(d => d.deviceId === selectedDeviceId);
                            const nextIndex = (currentIndex + 1) % devices.length;
                            setSelectedDeviceId(devices[nextIndex].deviceId);
                        }}
                        className="p-4 rounded-2xl bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 transition-all active:scale-90"
                        title="Switch Camera"
                    >
                        <RefreshCw size={24} />
                    </button>
                )}

                <button
                    onClick={capture}
                    disabled={isLoading || !modelsReady}
                    className={cn(
                        "group relative p-2 rounded-full backdrop-blur-md transition-all active:scale-95",
                        "bg-white/10 hover:bg-white/20 hover:scale-105 border border-white/20 shadow-lg",
                        (isLoading || !modelsReady) && "opacity-50 cursor-not-allowed"
                    )}
                >
                    <div className="w-16 h-16 rounded-full border border-white/30 flex items-center justify-center">
                        {isLoading ? <Loader2 className="animate-spin text-white" size={32} /> : <Camera className="text-white group-hover:scale-110 transition-transform" size={32} strokeWidth={1.5} />}
                    </div>
                </button>
            </div>

            {/* Errors */}
            <AnimatePresence>
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-500/90 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-xl backdrop-blur-sm"
                    >
                        <AlertCircle size={18} />
                        <span className="text-sm font-semibold">{error}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

function StatusPill({ active, loading, label, icon }: { active: boolean, loading?: boolean, label: string, icon?: React.ReactNode }) {
    return (
        <div className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] backdrop-blur-xl border transition-all duration-500",
            active ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-white/5 text-white/40 border-white/10"
        )}>
            {loading ? <Loader2 size={12} className="animate-spin" /> : icon}
            {label}
        </div>
    );
}
