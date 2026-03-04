'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ShieldCheck, UserCheck, Zap, Globe, Cpu, ChevronRight, Lock, Scan } from 'lucide-react';

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 1,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number]
      },
    },
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center relative overflow-hidden font-sans">
      {/* Premium Background Atmosphere */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.08),transparent_70%)]" />
      <div className="absolute top-0 left-0 w-full h-full -z-10 opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-cyan-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-600/10 blur-[120px] rounded-full" />
      </div>

      {/* Subtle Grid Pattern */}
      <div className="absolute inset-0 -z-10 opacity-[0.05] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '48px 48px' }}
      />

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="max-w-5xl mx-auto px-6 py-20 text-center z-10 flex flex-col items-center w-full"
      >
        <motion.div
          variants={itemVariants}
          className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-cyan-400 text-[10px] font-bold tracking-[0.2em] uppercase mb-10 backdrop-blur-md"
        >
          <Zap size={10} fill="currentColor" />
          Enterprise-Grade Security Engine
        </motion.div>

        <motion.div variants={itemVariants} className="relative mb-10">
          <h1 className="text-7xl md:text-9xl lg:text-[10rem] font-extrabold tracking-tighter leading-[0.85] flex flex-col">
            <span className="opacity-90">YOLO</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-br from-white via-cyan-400 to-blue-600">
              VERIFY
            </span>
          </h1>
          <div className="absolute -top-6 -right-6 w-16 h-16 border-t-2 border-r-2 border-cyan-500/20 opacity-40 pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-16 h-16 border-b-2 border-l-2 border-cyan-500/20 opacity-40 pointer-events-none" />
        </motion.div>

        <motion.p
          variants={itemVariants}
          className="text-lg md:text-2xl text-gray-400 font-light max-w-2xl mx-auto mb-16 leading-relaxed balance tracking-tight"
        >
          Next-generation student identity infrastructure. AI-driven verification,
          biometric mapping, and distributed edge synchronization.
        </motion.p>

        <motion.div
          variants={itemVariants}
          className="flex flex-col sm:flex-row gap-5 justify-center w-full max-w-lg mb-24"
        >
          <Link
            href="/register"
            className="flex-1 group relative px-10 py-5 bg-white text-black font-bold text-lg rounded-2xl overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_50px_rgba(255,255,255,0.15)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 opacity-0 group-hover:opacity-10 transition-opacity" />
            <span className="relative z-10 flex items-center justify-center gap-3">
              Start Verification
              <ChevronRight size={22} className="group-hover:translate-x-1 transition-transform" />
            </span>
          </Link>

          <Link
            href="/dashboard"
            className="flex-1 px-10 py-5 bg-white/5 border border-white/10 text-white font-semibold text-lg rounded-2xl hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-[0.98] backdrop-blur-xl group"
          >
            <Lock size={18} className="text-gray-400 group-hover:text-white transition-colors" />
            Admin Panel
          </Link>
        </motion.div>

        <motion.div
          variants={itemVariants}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-10 w-full border-t border-white/5 pt-16"
        >
          <Feature icon={ShieldCheck} label="Biometric ID" description="Face-mesh mapping" />
          <Feature icon={Cpu} label="Edge AI" description="Local computation" />
          <Feature icon={Scan} label="Real-time OCR" description="Data extraction" />
          <Feature icon={UserCheck} label="Live Status" description="Instant event sync" />
        </motion.div>
      </motion.main>

      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8, duration: 1.2 }}
        className="pb-10 text-gray-600 text-[10px] font-medium uppercase tracking-[0.5em]"
      >
        Verified by YOLO Security Protocol V2.4
      </motion.footer>
    </div>
  );
}

interface FeatureProps {
  icon: React.ElementType;
  label: string;
  description: string;
}

function Feature({ icon: Icon, label, description }: FeatureProps) {
  return (
    <div className="group flex flex-col items-center gap-4 p-4 rounded-3xl hover:bg-white/[0.03] transition-all duration-500 border border-transparent hover:border-white/5">
      <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 group-hover:text-cyan-400 group-hover:border-cyan-500/40 transition-all duration-500 group-hover:shadow-[0_0_20px_rgba(6,182,212,0.15)] group-hover:rotate-3">
        <Icon size={26} strokeWidth={1.2} className="group-hover:scale-110 transition-transform duration-500" />
      </div>
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-bold uppercase tracking-[0.1em] text-gray-200">{label}</span>
        <span className="text-[10px] text-gray-500 lowercase font-medium tracking-wide">{description}</span>
      </div>
    </div>
  );
}
