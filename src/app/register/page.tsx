'use client';

import React, { useState, useEffect } from 'react';
import { CameraCapture } from '@/components/CameraCapture';
import { ManualEntryForm } from '@/components/ManualEntryForm';
import { Student } from '@/lib/types';
import { processIDCard } from '@/lib/OCRProcessor';
import { validateDuplicate } from '@/lib/DuplicateValidator';
import { supabase } from '@/lib/supabaseClient';
import { saveOfflineStudent, getUnsyncedStudents, markStudentSynced } from '@/lib/offlineStorage';
import { CheckCircle2, AlertTriangle, Wifi, WifiOff, LayoutDashboard, UserCheck, Loader2, QrCode, ShieldCheck } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function RegistrationPage() {
    const [step, setStep] = useState<'capture' | 'verify' | 'success' | 'duplicate'>('capture');
    const [capturedData, setCapturedData] = useState<Partial<Student>>({});
    const [currentStudent, setCurrentStudent] = useState<Student | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(true);
    const [syncCount, setSyncCount] = useState(0);

    // Helper to convert base64 to Blob
    const base64ToBlob = (base64: string) => {
        const byteString = atob(base64.split(',')[1]);
        const mimeString = base64.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        return new Blob([ab], { type: mimeString });
    };

    // Helper to upload image and return public URL
    const uploadImage = async (base64: string, rollNumber: string) => {
        const blob = base64ToBlob(base64);
        const fileName = `${rollNumber}_${Date.now()}.jpg`;
        const { data, error } = await supabase.storage
            .from('student-photos')
            .upload(fileName, blob, { contentType: 'image/jpeg', upsert: false });

        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage
            .from('student-photos')
            .getPublicUrl(fileName);

        return publicUrl;
    };

    // Sync Logic: Cron-like behavior to sync in order
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        setIsOnline(window.navigator.onLine);

        const syncInterval = setInterval(async () => {
            if (window.navigator.onLine) {
                const pending = await getUnsyncedStudents();
                // ORDERLY: Sort by created_at to ensure chronological order
                const sortedPending = pending.sort((a, b) =>
                    new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
                );

                setSyncCount(sortedPending.length);
                if (sortedPending.length > 0) {
                    console.log(`📡 YOLO: Syncing ${sortedPending.length} records in order...`);
                    for (const { id: offlineId, synced, ...studentData } of sortedPending) {
                        try {
                            let liveImageUrl = studentData.image_url;

                            // If it's a base64 (offline captured), upload it now
                            if (liveImageUrl && liveImageUrl.startsWith('data:image')) {
                                liveImageUrl = await uploadImage(liveImageUrl, studentData.roll_number);
                            }

                            const { error: syncError } = await supabase.from('students').insert({
                                ...studentData,
                                image_url: liveImageUrl,
                                synced_from_offline: true,
                                created_at: studentData.created_at // Preserve original timestamp
                            });

                            if (!syncError) {
                                await markStudentSynced(offlineId!);
                            }
                        } catch (err) {
                            console.error("Sync Error for record:", offlineId, err);
                        }
                    }
                }
            }
        }, 15000); // Check every 15s

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
            clearInterval(syncInterval);
        };
    }, []);

    const [capturedImage, setCapturedImage] = useState<string | null>(null);

    const [autoProcessing, setAutoProcessing] = useState(false);

    const handleCapture = async (image: string, embedding: number[] | null) => {
        setIsLoading(true);
        setError(null);
        setCapturedImage(image);
        try {
            // Intelligent OCR fetch
            console.log("🔍 YOLO: Analyzing card layout...");
            const ocrResult = await processIDCard(image);

            setCapturedData({
                ...ocrResult,
                face_embedding: embedding || undefined,
            });

            // Always go to verify so user sees the "Draft"
            setStep('verify');

            // ⚡ AUTO-SAVE: If high-confidence data found, save automatically
            if (ocrResult.full_name && ocrResult.roll_number && ocrResult.roll_number.length >= 4) {
                console.log("🚀 YOLO: High confidence data found. Initiating Auto-Save...");
                setAutoProcessing(true);
                // Tiny delay to let the UI transition
                setTimeout(async () => {
                    await handleFinalSubmit({
                        full_name: ocrResult.full_name,
                        roll_number: ocrResult.roll_number,
                        college: ocrResult.college || "Hindustan University",
                        department: ocrResult.department || "General",
                        year: ocrResult.year || "1"
                    });
                    setAutoProcessing(false);
                }, 800);
            }
        } catch (err) {
            console.error("🏁 YOLO Auto-Pilot Error:", err);
            setError("OCR extraction failed. Please enter manually.");
            setCapturedData({ face_embedding: embedding || undefined });
            setStep('verify');
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinalSubmit = async (formData: any) => {
        setIsLoading(true);
        setError(null);

        try {
            let finalImageUrl = capturedImage;

            if (isOnline) {
                // Online: High-Secure Duplicate Check (only if embedding exists)
                const { isDuplicate, reason, student } = await validateDuplicate(
                    formData.roll_number,
                    capturedData.face_embedding || []
                );

                if (isDuplicate) {
                    if (student) {
                        setCurrentStudent(student);
                        setStep('duplicate');
                    } else {
                        setError(reason || "Student already exists.");
                    }
                    setIsLoading(false);
                    return;
                }

                // Upload to Storage
                if (capturedImage) {
                    finalImageUrl = await uploadImage(capturedImage, formData.roll_number);
                }
            }

            const finalStudent: Omit<Student, 'id'> = {
                ...formData,
                face_embedding: capturedData.face_embedding,
                image_url: finalImageUrl,
                check_in_status: false,
                created_at: new Date().toISOString(),
                synced_from_offline: !isOnline
            };

            if (isOnline) {
                const { error: insertError } = await supabase.from('students').insert({
                    ...finalStudent,
                    // Ensure embedding is exactly 128 and valid
                    face_embedding: (finalStudent.face_embedding && finalStudent.face_embedding.length === 128)
                        ? `[${finalStudent.face_embedding.join(',')}]`
                        : null
                });
                if (insertError) throw new Error(`Database Error: ${insertError.message}`);
            } else {
                // Offline Store: Ready for Auto-Sync
                await saveOfflineStudent(finalStudent);
            }

            setCurrentStudent(finalStudent as Student);
            setStep('success');
        } catch (err: any) {
            console.error("🏁 YOLO Submit Error:", err);
            setError(err.message || "Failed to finalize registration.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0a0a] text-white p-6 md:p-12 relative overflow-hidden font-sans">
            {/* Background Orbs */}
            <div className="fixed -top-24 -left-24 w-96 h-96 bg-cyan-500/10 blur-[120px] rounded-full -z-10 animate-pulse" />
            <div className="fixed -bottom-24 -right-24 w-96 h-96 bg-blue-600/10 blur-[120px] rounded-full -z-10" />

            {/* Header Container */}
            <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between mb-20 gap-8 relative z-20">
                <Link href="/" className="flex items-center gap-5 group">
                    <div className="w-14 h-14 bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center font-black text-2xl shadow-[0_0_30px_rgba(6,182,212,0.3)] group-hover:scale-105 transition-transform">
                        Y
                    </div>
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-extrabold tracking-tighter uppercase leading-none">
                            YOLO <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-600">VERIFY</span>
                        </h1>
                        <span className="text-[10px] font-bold tracking-[0.3em] uppercase opacity-50 mt-1">SECURE REGISTRY</span>
                    </div>
                </Link>

                <div className="flex items-center gap-4">
                    {/* Sync Badge */}
                    <AnimatePresence>
                        {syncCount > 0 && (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="flex items-center gap-3 px-5 py-2.5 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 text-cyan-400 text-xs font-bold backdrop-blur-xl shadow-lg"
                            >
                                <Loader2 size={16} className="animate-spin" />
                                <span className="tracking-wide">Syncing {syncCount} Nodes</span>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Online Status */}
                    <div className={cn(
                        "flex items-center gap-2.5 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] border backdrop-blur-xl shadow-xl transition-all duration-500",
                        isOnline ? "bg-green-500/10 text-green-400 border-green-500/20 shadow-green-500/5" : "bg-red-500/10 text-red-400 border-red-500/20 shadow-red-500/5"
                    )}>
                        <div className={cn("w-2 h-2 rounded-full", isOnline ? "bg-green-400 animate-pulse" : "bg-red-400")} />
                        {isOnline ? "Real-time" : "Local-only"}
                    </div>

                    <div className="flex items-center gap-2 pl-4 border-l border-white/10">
                        <Link href="/dashboard" className="p-3 rounded-2xl bg-white/5 border border-white/10 text-white/40 hover:text-cyan-400 hover:bg-cyan-500/10 hover:border-cyan-500/20 transition-all active:scale-95">
                            <LayoutDashboard size={20} />
                        </Link>
                    </div>
                </div>
            </div>

            <main className="max-w-4xl mx-auto relative z-10">
                <AnimatePresence mode="wait">
                    {step === 'capture' && (
                        <motion.div
                            key="capture"
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="flex flex-col items-center gap-8"
                        >
                            <div className="text-center mb-4">
                                <h2 className="text-4xl font-black mb-2 flex items-center justify-center gap-4 italic italic uppercase tracking-tight">
                                    <UserCheck className="text-cyan-400 not-italic" size={40} />
                                    Register Student
                                </h2>
                                <p className="text-gray-400 font-medium">Position face and ID card clearly for scanning</p>
                            </div>

                            <CameraCapture
                                onCapture={handleCapture}
                                isLoading={isLoading}
                            />
                        </motion.div>
                    )}

                    {step === 'verify' && (
                        <motion.div
                            key="verify"
                            initial={{ opacity: 0, x: 50 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -50 }}
                            className="flex flex-col items-center justify-center relative w-full"
                        >
                            {autoProcessing && (
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="absolute -top-12 inset-x-0 flex items-center justify-center z-50 pointer-events-none"
                                >
                                    <div className="bg-cyan-500 text-black px-6 py-2 rounded-full font-black uppercase tracking-widest text-[10px] flex items-center gap-2 shadow-2xl shadow-cyan-500/50 animate-bounce">
                                        <Loader2 size={14} className="animate-spin" />
                                        Auto-Verifying Registered ID...
                                    </div>
                                </motion.div>
                            )}
                            <ManualEntryForm
                                initialData={capturedData}
                                onSubmit={handleFinalSubmit}
                                isLoading={isLoading || autoProcessing}
                            />

                            <AnimatePresence>
                                {error && (
                                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 flex items-center gap-3 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
                                        <AlertTriangle size={20} />
                                        <span className="font-bold text-sm">{error}</span>
                                        <button onClick={() => setStep('capture')} className="ml-4 px-3 py-1 rounded-md bg-white/10 text-xs font-bold hover:bg-white/20">RETRY</button>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </motion.div>
                    )}

                    {step === 'success' && (
                        <motion.div
                            key="success"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center py-10 text-center"
                        >
                            <div className="w-32 h-32 bg-green-500/20 border-2 border-green-500/30 rounded-full flex items-center justify-center mb-8 relative">
                                <motion.div
                                    animate={{ scale: [1, 1.2, 1] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                    className="absolute inset-0 bg-green-500/5 rounded-full"
                                />
                                <CheckCircle2 size={64} className="text-green-500" />
                            </div>
                            <h1 className="text-6xl font-extrabold tracking-tighter uppercase mb-2">Registration</h1>
                            <div className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-cyan-500 uppercase tracking-widest mb-4">SUCCESSFUL</div>
                            <p className="text-gray-400 max-w-sm mb-12 text-lg font-medium">Digital identity successfully bound. Access credentials generated.</p>

                            {/* QR PASS */}
                            <div className="bg-white p-6 rounded-[32px] shadow-2xl mb-12 relative group">
                                <div className="absolute -top-3 -right-3 px-4 py-1.5 bg-cyan-600 text-white text-[10px] font-black uppercase tracking-widest rounded-full shadow-lg">EVENT PASS</div>
                                <div className="p-2 border-2 border-dashed border-gray-100 rounded-2xl">
                                    <QRCodeSVG
                                        value={currentStudent?.roll_number || 'YOLO-PASS'}
                                        size={200}
                                        level="H"
                                        includeMargin
                                    />
                                </div>
                                <div className="mt-5 text-black font-extrabold uppercase tracking-tighter text-2xl">{currentStudent?.full_name}</div>
                                <div className="text-gray-400 font-mono text-xs tracking-widest mt-1 opacity-60">{currentStudent?.roll_number}</div>
                            </div>

                            <button
                                onClick={() => {
                                    setStep('capture');
                                    setCapturedData({});
                                    setCapturedImage(null);
                                    setAutoProcessing(false);
                                    setCurrentStudent(null);
                                    setError(null);
                                }}
                                className="px-14 py-5 bg-white text-black font-bold uppercase tracking-tight rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_0_40px_rgba(255,255,255,0.1)] text-lg"
                            >
                                Continue Registry
                            </button>
                        </motion.div>
                    )}

                    {step === 'duplicate' && currentStudent && (
                        <motion.div
                            key="duplicate"
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="flex flex-col items-center justify-center py-10 text-center"
                        >
                            <div className={cn(
                                "inline-flex items-center gap-2 px-6 py-2.5 rounded-full border-2 mb-8 text-sm font-black uppercase tracking-widest",
                                currentStudent.check_in_status ? "bg-green-500/10 border-green-500/30 text-green-500" : "bg-red-500/10 border-red-500/30 text-red-500 animate-pulse"
                            )}>
                                {currentStudent.check_in_status ? <ShieldCheck size={18} /> : <AlertTriangle size={18} />}
                                {currentStudent.check_in_status ? "VERIFIED: ACCESS GRANTED" : "CONFLICT: PROFILE DETECTED"}
                            </div>

                            <h2 className="text-5xl font-extrabold tracking-tighter uppercase mb-3">Duplicate Record</h2>
                            <p className="text-gray-400 max-w-md mb-12 text-sm font-medium opacity-60">This biometric profile is already associated with an existing account in our secure database.</p>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center bg-white/[0.03] p-8 rounded-[40px] border border-white/10 mb-12">
                                <div className="w-48 h-48 rounded-[32px] overflow-hidden border-2 border-white/10 shadow-2xl">
                                    <img src={currentStudent.image_url} alt="Registry" className="w-full h-full object-cover" />
                                </div>
                                <div className="bg-white p-4 rounded-3xl shadow-xl">
                                    <QRCodeSVG
                                        value={currentStudent.roll_number}
                                        size={160}
                                        level="H"
                                    />
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4">
                                <Link
                                    href="/dashboard"
                                    className="px-8 py-4 bg-white/5 border border-white/10 text-white/70 font-bold uppercase tracking-widest text-[10px] rounded-xl hover:bg-white/10 transition-all"
                                >
                                    Admin View
                                </Link>
                                <button
                                    onClick={() => {
                                        setStep('capture');
                                        setCapturedData({});
                                        setCapturedImage(null);
                                        setAutoProcessing(false);
                                        setCurrentStudent(null);
                                        setError(null);
                                    }}
                                    className="px-12 py-4 bg-white text-black font-bold uppercase tracking-tight rounded-xl hover:scale-[1.02] transition-all shadow-xl active:scale-[0.98]"
                                >
                                    Retry Scan
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Footer Branding */}
            <footer className="mt-20 py-8 border-t border-white/5 text-center flex flex-col items-center gap-2">
                <div className="flex items-center gap-2 opacity-30 brightness-150">
                    <span className="text-xs font-bold uppercase tracking-[0.5em] text-cyan-400">Production Ready</span>
                    <div className="w-1 h-1 rounded-full bg-white" />
                    <span className="text-xs font-bold uppercase tracking-[0.5em]">AI SECURE</span>
                </div>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest mt-4">© 2024 YOLO Event - Core Tech System v1.0.4</p>
            </footer>
        </div>
    );
}
