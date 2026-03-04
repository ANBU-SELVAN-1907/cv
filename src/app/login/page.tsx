'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, User, ShieldCheck, Loader2, ArrowRight, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import Link from 'next/link';

export default function LoginPage() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        // Simulated Secure Check based on USER credentials
        setTimeout(() => {
            const cleanUser = username.trim().toLowerCase();
            const cleanPass = password.trim();

            if (cleanUser === 'hitsyolo' && cleanPass === 'hits2026') {
                localStorage.setItem('yolo_admin_auth', 'true');
                router.push('/dashboard');
            } else {
                setError('INVALID CREDENTIALS: ACCESS DENIED');
                setIsLoading(false);
            }
        }, 1200);
    };

    return (
        <div className="min-h-screen bg-[#070707] text-white flex items-center justify-center p-6 relative overflow-hidden">
            {/* Background Aesthetics */}
            <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.05),transparent_70%)]" />
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full" />
                <div className="absolute inset-0 opacity-[0.03]"
                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}
                />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md relative"
            >
                {/* Back Nav */}
                <Link
                    href="/register"
                    className="absolute -top-16 left-0 flex items-center gap-2 text-gray-500 hover:text-cyan-400 transition-colors group"
                >
                    <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-cyan-500/10 group-hover:border-cyan-500/30 transition-all">
                        <ArrowLeft size={18} />
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Go back to scanner</span>
                </Link>

                <div className="text-center mb-10">
                    <div className="w-20 h-20 bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 rounded-[32px] flex items-center justify-center mx-auto mb-6 shadow-[0_0_40px_rgba(6,182,212,0.25)] rotate-3">
                        <ShieldCheck size={40} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-extrabold tracking-tighter uppercase mb-2">
                        Admin <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Access</span>
                    </h1>
                    <p className="text-gray-500 font-bold uppercase tracking-[0.4em] text-[8px] opacity-60">Secure Authentication Protocol</p>
                </div>

                <div className="bg-white/[0.03] border border-white/10 backdrop-blur-3xl rounded-[40px] p-10 shadow-2xl">
                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Username</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyan-400 transition-colors" size={20} />
                                <input
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    placeholder="Enter Admin ID"
                                    className="w-full bg-white/5 border border-white/10 focus:border-cyan-500/50 outline-none rounded-2xl py-4 pl-12 pr-4 transition-all hover:bg-white/[0.06]"
                                    required
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600 group-focus-within:text-cyan-400 transition-colors" size={20} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="w-full bg-white/5 border border-white/10 focus:border-cyan-500/50 outline-none rounded-2xl py-4 pl-12 pr-12 transition-all hover:bg-white/[0.06]"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-600 hover:text-cyan-400 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <motion.div
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                className="bg-red-500/10 border border-red-500/20 text-red-500 text-[10px] font-black uppercase tracking-widest p-3 rounded-xl text-center"
                            >
                                {error}
                            </motion.div>
                        )}

                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-5 bg-white text-black font-extrabold uppercase tracking-tight rounded-2xl hover:scale-[1.02] active:scale-[0.98] transition-all shadow-[0_10px_40px_rgba(255,255,255,0.1)] flex items-center justify-center gap-3 text-lg"
                        >
                            {isLoading ? (
                                <Loader2 className="animate-spin" size={24} />
                            ) : (
                                <>
                                    Authorize System
                                    <ArrowRight size={20} className="text-gray-400" />
                                </>
                            )}
                        </button>
                    </form>
                </div>

                <div className="mt-12 text-center">
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.4em]">YOLO SECURITY PROTOCOL V1.2.4</p>
                </div>
            </motion.div>
        </div>
    );
}
