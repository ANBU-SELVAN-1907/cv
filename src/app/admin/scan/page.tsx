'use client';

import React, { useEffect, useState, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, ShieldAlert, Loader2, ArrowLeft, UserCheck, RefreshCw, QrCode } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Student } from '@/lib/types';

export default function AdminScanPage() {
    const [scanResult, setScanResult] = useState<Student | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [lastScan, setLastScan] = useState<string | null>(null);
    const router = useRouter();
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // Auth check
        const isAuth = localStorage.getItem('yolo_admin_auth');
        if (!isAuth) {
            router.push('/login');
            return;
        }

        const scanner = new Html5QrcodeScanner(
            "reader",
            { fps: 10, qrbox: { width: 250, height: 250 } },
            /* verbose= */ false
        );

        scanner.render(onScanSuccess, onScanFailure);
        scannerRef.current = scanner;

        return () => {
            scanner.clear().catch(err => console.error("Scanner clear error", err));
        };
    }, []);

    async function onScanSuccess(decodedText: string) {
        if (isProcessing || decodedText === lastScan) return;

        setIsProcessing(true);
        setLastScan(decodedText);
        setError(null);
        setScanResult(null);

        try {
            console.log("🔍 YOLO Scan:", decodedText);

            // Search for student by roll number (which is what we encoded in QR)
            const { data, error: dbError } = await supabase
                .from('students')
                .select('*')
                .eq('roll_number', decodedText)
                .single();

            if (dbError || !data) {
                throw new Error("Student record not found in registry.");
            }

            // Automatically check them in if not already
            if (!data.check_in_status) {
                const { error: updateError } = await supabase
                    .from('students')
                    .update({ check_in_status: true })
                    .eq('id', data.id);

                if (updateError) throw updateError;
                data.check_in_status = true;
            }

            setScanResult(data);
        } catch (err: any) {
            setError(err.message || "Failed to process QR code.");
        } finally {
            setIsProcessing(false);
            // reset last scan after 5 seconds to allow rescanning
            setTimeout(() => setLastScan(null), 5000);
        }
    }

    function onScanFailure(error: any) {
        // Ignore noise
    }

    return (
        <div className="min-h-screen bg-[#070707] text-white p-6 md:p-12 font-sans selection:bg-cyan-500/30">
            {/* Nav */}
            <div className="max-w-5xl mx-auto flex items-center justify-between mb-20 relative z-20">
                <Link href="/dashboard" className="flex items-center gap-4 group">
                    <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center group-hover:bg-cyan-500/10 transition-all">
                        <ArrowLeft size={20} className="text-gray-400 group-hover:text-white" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">Return to</span>
                        <span className="font-extrabold tracking-tighter text-lg uppercase leading-none">Control <span className="text-cyan-400">Panel</span></span>
                    </div>
                </Link>
                <div className="hidden md:flex items-center gap-3 bg-white/5 border border-white/10 px-5 py-2.5 rounded-2xl text-cyan-400 text-[10px] font-black uppercase tracking-[0.2em] backdrop-blur-xl">
                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    Live Bio-Pass Scanner
                </div>
            </div>

            <main className="max-w-4xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
                {/* Scanner View */}
                <div className="space-y-8">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 rounded-[40px] blur-2xl opacity-50"></div>
                        <div className="relative bg-[#050505] border border-white/10 rounded-[38px] overflow-hidden shadow-2xl">
                            <div id="reader" className="w-full transition-all duration-700"></div>
                            {isProcessing && (
                                <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50">
                                    <div className="flex flex-col items-center gap-5">
                                        <div className="relative">
                                            <Loader2 size={48} className="animate-spin text-cyan-400" />
                                            <div className="absolute inset-0 bg-cyan-400/20 blur-xl animate-pulse" />
                                        </div>
                                        <span className="text-gray-400 font-black uppercase tracking-[0.3em] text-[10px]">Verifying Identity...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="bg-white/5 border border-white/10 rounded-[32px] p-8 text-center backdrop-blur-xl">
                        <p className="text-gray-400 text-xs font-bold leading-relaxed tracking-wide">
                            Position the student's encrypted QR pass within the scanner frame for instantaneous biometric synchronization.
                        </p>
                    </div>
                </div>

                {/* Result View */}
                <div className="space-y-6">
                    <AnimatePresence mode="wait">
                        {scanResult ? (
                            <motion.div
                                key="result"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                className="bg-white/[0.03] border border-white/10 rounded-[40px] p-8 overflow-hidden relative"
                            >
                                <div className="absolute top-0 right-0 p-6">
                                    <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center text-green-400">
                                        <UserCheck size={24} />
                                    </div>
                                </div>

                                <div className="flex flex-col items-center text-center">
                                    <div className="w-32 h-32 rounded-[32px] overflow-hidden border-4 border-white/10 shadow-2xl mb-6 bg-white/5">
                                        {scanResult.image_url ? (
                                            <img src={scanResult.image_url} alt="Registry" className="w-full h-full object-cover" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-700 font-black">NO IMAGE</div>
                                        )}
                                    </div>

                                    <h2 className="text-4xl font-extrabold tracking-tighter uppercase mb-1 text-white">{scanResult.full_name}</h2>
                                    <p className="font-mono text-cyan-400 text-sm tracking-widest mb-8 opacity-80 uppercase">{scanResult.roll_number}</p>

                                    <div className="grid grid-cols-2 gap-4 w-full mb-10">
                                        <div className="bg-white/5 p-5 rounded-3xl border border-white/5 text-left">
                                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">Institution</div>
                                            <div className="text-xs font-extrabold truncate text-gray-300">{scanResult.college}</div>
                                        </div>
                                        <div className="bg-white/5 p-5 rounded-3xl border border-white/5 text-left">
                                            <div className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500 mb-2">Program</div>
                                            <div className="text-xs font-extrabold text-gray-300">{scanResult.department}</div>
                                        </div>
                                    </div>

                                    <div className="w-full bg-green-500/10 border border-green-500/20 p-5 rounded-3xl flex items-center justify-center gap-3 text-green-400 font-extrabold uppercase tracking-widest text-[10px] shadow-[0_0_30px_rgba(34,197,94,0.1)]">
                                        <ShieldCheck size={18} />
                                        Access Granted • Verified Identity
                                    </div>

                                    <button
                                        onClick={() => setScanResult(null)}
                                        className="mt-8 text-gray-500 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                                    >
                                        <RefreshCw size={14} />
                                        Scan Next Student
                                    </button>
                                </div>
                            </motion.div>
                        ) : error ? (
                            <motion.div
                                key="error"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="bg-red-500/10 border border-red-500/20 rounded-[40px] p-12 text-center"
                            >
                                <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
                                    <ShieldAlert size={32} />
                                </div>
                                <h2 className="text-2xl font-black uppercase italic tracking-tighter text-white mb-2">ACCESS DENIED</h2>
                                <p className="text-red-400/80 text-sm font-medium mb-8">{error}</p>
                                <button
                                    onClick={() => setError(null)}
                                    className="px-8 py-3 bg-red-500 text-white font-black uppercase tracking-widest text-[10px] rounded-xl hover:bg-red-600 transition-all"
                                >
                                    Dismiss & Retry
                                </button>
                            </motion.div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center py-20 text-center text-gray-600">
                                <QrCode size={80} className="mb-6 opacity-10" />
                                <h3 className="text-xl font-bold uppercase tracking-widest">Awaiting Scan...</h3>
                                <p className="text-sm max-w-[200px] mt-2">Ready to authorize incoming event attendees.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
}
