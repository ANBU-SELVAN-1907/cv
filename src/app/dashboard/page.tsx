'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { Student } from '@/lib/types';
import { Search, Filter, Download, CheckSquare, Square, MoreHorizontal, Database, RefreshCw, ChevronRight, UserPlus, ShieldCheck, Building, Loader2, BookOpen, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

import { useRouter } from 'next/navigation';

export default function DashboardPage() {
    const router = useRouter();
    const [students, setStudents] = useState<Student[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [collegeFilter, setCollegeFilter] = useState('All');
    const [isLoading, setIsLoading] = useState(true);
    const [stats, setStats] = useState({ total: 0, verified: 0, colleges: 0 });
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<Partial<Student>>({});

    useEffect(() => {
        // 🔒 AUTH CHECK
        const isAuth = localStorage.getItem('yolo_admin_auth');
        if (!isAuth) {
            router.push('/login');
            return;
        }

        fetchStudents();

        // ⚡ REALTIME SYNC: Listen for new registrations and status changes
        const channel = supabase
            .channel('dashboard-updates')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'students'
            }, (payload) => {
                console.log('🔄 Dashboard Sync:', payload.eventType);
                fetchStudents(); // Re-fetch to keep sorting and filters accurate
            })
            .subscribe();

        // Fallback: Refresh when tab becomes active
        const handleFocus = () => fetchStudents();
        window.addEventListener('focus', handleFocus);

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('focus', handleFocus);
        };
    }, [collegeFilter]);

    const fetchStudents = async () => {
        // Only show loader on initial load, not background syncs
        if (students.length === 0) setIsLoading(true);
        try {
            let query = supabase.from('students').select('*').order('created_at', { ascending: false });

            if (collegeFilter !== 'All') {
                query = query.eq('college', collegeFilter);
            }

            const { data, error } = await query;
            if (data) {
                setStudents(data);
                updateStats(data);
            }
        } catch (err) {
            console.error("Fetch Error:", err);
        } finally {
            setIsLoading(false);
        }
    };

    const updateStats = (data: Student[]) => {
        const colleges = new Set(data.map(s => s.college)).size;
        const verified = data.filter(s => s.check_in_status).length;
        setStats({ total: data.length, verified, colleges });
    };

    const toggleCheckIn = async (id: string, currentStatus: boolean) => {
        const { error } = await supabase.from('students').update({ check_in_status: !currentStatus }).eq('id', id);
        if (!error) {
            setStudents(prev => prev.map(s => s.id === id ? { ...s, check_in_status: !currentStatus } : s));
            setStats(prev => ({ ...prev, verified: currentStatus ? prev.verified - 1 : prev.verified + 1 }));

            // Sync selected student state if open
            if (selectedStudent?.id === id) {
                setSelectedStudent(prev => prev ? { ...prev, check_in_status: !currentStatus } : null);
            }
        }
    };

    const deleteStudent = async (id: string) => {
        if (confirm("🚨 YOLO EXTERMINATION: Are you sure you want to permanently delete this student record? This cannot be undone.")) {
            const { error } = await supabase.from('students').delete().eq('id', id);
            if (!error) {
                setStudents(prev => prev.filter(s => s.id !== id));
                setSelectedStudent(null);
            } else {
                alert(`Delete Error: ${error.message}`);
            }
        }
    };

    const updateStudent = async () => {
        if (!selectedStudent?.id) return;
        setIsLoading(true);
        try {
            const { error } = await supabase
                .from('students')
                .update(editData)
                .eq('id', selectedStudent.id);

            if (!error) {
                setStudents(prev => prev.map(s => s.id === selectedStudent.id ? { ...s, ...editData } : s));
                setSelectedStudent(prev => prev ? { ...prev, ...editData } : null);
                setIsEditing(false);
            } else {
                alert(`Update Error: ${error.message}`);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const exportCSV = () => {
        const headers = ['Name', 'Roll Number', 'College', 'Dept', 'Year', 'Checked In', 'Created At'];
        const rows = students.map(s => [
            s.full_name,
            s.roll_number,
            s.college,
            s.department,
            s.year,
            s.check_in_status ? 'YES' : 'NO',
            new Date(s.created_at).toLocaleString()
        ]);

        const csvContent = "data:text/csv;charset=utf-8,"
            + headers.join(",") + "\n"
            + rows.map(e => e.join(",")).join("\n");

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `yolo_students_${new Date().toISOString()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleLogout = () => {
        localStorage.removeItem('yolo_admin_auth');
        router.push('/login');
    };

    const filteredStudents = students.filter(s =>
    (s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        s.roll_number?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    const colleges = Array.from(new Set(students.map(s => s.college)));

    return (
        <div className="min-h-screen bg-[#070707] text-[#ededed] font-sans selection:bg-cyan-500/30">
            {/* Background Orbs */}
            <div className="fixed inset-0 pointer-events-none -z-10 bg-[radial-gradient(circle_at_50%_50%,rgba(6,182,212,0.03),transparent_70%)]" />
            <div className="fixed inset-0 pointer-events-none -z-10">
                <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-cyan-600/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-600/5 blur-[120px] rounded-full" />
                <div className="absolute inset-0 opacity-[0.02]"
                    style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}
                />
            </div>

            {/* Navigation */}
            <nav className="border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <Link href="/" className="flex items-center gap-4 group">
                            <div className="w-12 h-12 bg-gradient-to-tr from-cyan-400 via-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-[0_0_20px_rgba(6,182,212,0.2)] group-hover:scale-105 transition-all">
                                Y
                            </div>
                            <div className="flex flex-col">
                                <span className="font-extrabold tracking-tighter text-lg uppercase leading-none">
                                    YOLO <span className="text-cyan-400">VERIFY</span>
                                </span>
                                <span className="text-[8px] font-bold tracking-[0.4em] uppercase opacity-40 mt-1">DASHBOARD</span>
                            </div>
                        </Link>

                        <div className="hidden md:flex gap-1">
                            <Link href="/">
                                <NavBtn label="Home" />
                            </Link>
                            <Link href="/admin/scan">
                                <NavBtn label="Scan QR" />
                            </Link>
                            <NavBtn label="Analytics" active />
                            <NavBtn label="Live Feed" />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <Link href="/register" className="flex items-center gap-2 bg-white/5 border border-white/10 hover:border-cyan-500/30 hover:bg-white/10 px-4 py-2 rounded-xl text-sm font-bold transition-all active:scale-95">
                            <UserPlus size={18} className="text-cyan-400" />
                            Register New
                        </Link>
                        <button
                            onClick={handleLogout}
                            className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-95"
                        >
                            <ShieldCheck size={20} />
                        </button>
                        <button onClick={fetchStudents} className="p-2.5 rounded-xl bg-white/5 border border-white/10 hover:text-cyan-400 transition-all active:rotate-180 duration-500">
                            <RefreshCw size={20} />
                        </button>
                    </div>
                </div>
            </nav>

            {/* Modal */}
            <AnimatePresence>
                {selectedStudent && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedStudent(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.9, opacity: 0, y: 20 }}
                            className="relative w-full max-w-2xl bg-[#0f0f0f] border border-white/10 rounded-[32px] overflow-hidden shadow-2xl"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2">
                                <div className="aspect-square bg-white/5 border-r border-white/10 flex items-center justify-center overflow-hidden">
                                    {selectedStudent.image_url ? (
                                        <img src={selectedStudent.image_url} alt={selectedStudent.full_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="text-gray-600 font-black text-4xl italic uppercase tracking-tighter opacity-10">NO IMAGE</div>
                                    )}
                                </div>
                                <div className="p-8 flex flex-col justify-between">
                                    <div>
                                        <div className="flex items-center justify-between mb-6">
                                            <div className="flex items-center gap-2">
                                                <div className={cn(
                                                    "w-3 h-3 rounded-full animate-pulse",
                                                    selectedStudent.check_in_status ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]" : "bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.5)]"
                                                )} />
                                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500">
                                                    {selectedStudent.check_in_status ? "VERIFIED IDENTITY" : "PENDING VERIFICATION"}
                                                </span>
                                            </div>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => {
                                                        setIsEditing(!isEditing);
                                                        setEditData(selectedStudent);
                                                    }}
                                                    className={cn(
                                                        "p-2 rounded-lg transition-all",
                                                        isEditing ? "bg-cyan-500 text-white" : "bg-white/5 text-gray-400 hover:text-white"
                                                    )}
                                                >
                                                    <MoreHorizontal size={16} />
                                                </button>
                                                <button
                                                    onClick={() => deleteStudent(selectedStudent.id!)}
                                                    className="p-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                                                >
                                                    <Database size={16} /> {/* Replace with Trash if available */}
                                                </button>
                                            </div>
                                        </div>

                                        {isEditing ? (
                                            <div className="space-y-4">
                                                <input
                                                    type="text"
                                                    value={editData.full_name}
                                                    onChange={(e) => setEditData({ ...editData, full_name: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white font-bold outline-none focus:border-cyan-500"
                                                    placeholder="Full Name"
                                                />
                                                <input
                                                    type="text"
                                                    value={editData.roll_number}
                                                    onChange={(e) => setEditData({ ...editData, roll_number: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white font-mono outline-none focus:border-cyan-500"
                                                    placeholder="Roll Number"
                                                />
                                                <input
                                                    type="text"
                                                    value={editData.college}
                                                    onChange={(e) => setEditData({ ...editData, college: e.target.value })}
                                                    className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white outline-none focus:border-cyan-500"
                                                    placeholder="College"
                                                />
                                                <div className="grid grid-cols-2 gap-3">
                                                    <input
                                                        type="text"
                                                        value={editData.department}
                                                        onChange={(e) => setEditData({ ...editData, department: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-xs outline-none focus:border-cyan-500"
                                                        placeholder="Department"
                                                    />
                                                    <input
                                                        type="text"
                                                        value={editData.year}
                                                        onChange={(e) => setEditData({ ...editData, year: e.target.value })}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg p-3 text-white text-xs outline-none focus:border-cyan-500"
                                                        placeholder="Year"
                                                    />
                                                </div>
                                                <button
                                                    onClick={updateStudent}
                                                    className="w-full py-3 bg-cyan-600 text-white font-black uppercase tracking-tighter rounded-xl hover:bg-cyan-500 transition-all mt-4"
                                                >
                                                    Save Changes
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <h3 className="text-3xl font-black italic uppercase tracking-tight text-white mb-1 leading-none">{selectedStudent.full_name}</h3>
                                                <p className="text-cyan-400 font-mono text-lg mb-8">{selectedStudent.roll_number}</p>

                                                <div className="space-y-4">
                                                    <DetailItem label="Institution" value={selectedStudent.college} icon={Building} />
                                                    <DetailItem label="Department" value={selectedStudent.department} icon={BookOpen} />
                                                    <DetailItem label="Academic Year" value={`${selectedStudent.year}${selectedStudent.year === '1' ? 'st' : selectedStudent.year === '2' ? 'nd' : selectedStudent.year === '3' ? 'rd' : 'th'} Year`} icon={Calendar} />
                                                    <DetailItem label="Registered" value={new Date(selectedStudent.created_at).toLocaleDateString()} icon={Search} />
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="flex flex-col gap-3 mt-8">
                                        {!isEditing && (
                                            <button
                                                onClick={() => toggleCheckIn(selectedStudent.id!, selectedStudent.check_in_status)}
                                                className={cn(
                                                    "w-full py-4 font-black uppercase tracking-tighter italic rounded-2xl transition-all active:scale-95",
                                                    selectedStudent.check_in_status
                                                        ? "bg-red-500/10 text-red-500 border border-red-500/20 hover:bg-red-500 hover:text-white"
                                                        : "bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-500/20"
                                                )}
                                            >
                                                {selectedStudent.check_in_status ? "Revert Verification" : "Verify Identity"}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => {
                                                setSelectedStudent(null);
                                                setIsEditing(false);
                                            }}
                                            className="w-full py-4 bg-white/5 text-gray-400 font-bold uppercase tracking-tighter rounded-2xl hover:bg-white/10 transition-all"
                                        >
                                            Close Portal
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <main className="max-w-7xl mx-auto px-6 py-12">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                    <StatCard label="Total Registered" value={stats.total} icon={Database} subValue="+12% from last hour" color="cyan" />
                    <StatCard label="Currently Checked In" value={stats.verified} icon={ShieldCheck} subValue={`${((stats.verified / (stats.total || 1)) * 100).toFixed(1)}% attendance`} color="blue" />
                    <StatCard label="Participating Institutions" value={stats.colleges} icon={Building} subValue="Across all regions" color="purple" />
                </div>

                {/* Filters/Actions Row */}
                <div className="flex flex-col md:flex-row gap-6 items-center justify-between mb-8">
                    <div className="flex flex-1 w-full md:w-auto items-center gap-4">
                        <div className="relative flex-1 max-w-md group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={20} />
                            <input
                                type="text"
                                placeholder="Search by name or roll number..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 focus:border-cyan-500/50 outline-none rounded-xl py-3.5 pl-12 pr-4 transition-all hover:bg-white/[0.07]"
                            />
                        </div>

                        <div className="relative group">
                            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" size={18} />
                            <select
                                value={collegeFilter}
                                onChange={(e) => setCollegeFilter(e.target.value)}
                                className="bg-white/5 border border-white/10 focus:border-cyan-500/50 outline-none rounded-xl py-3.5 pl-11 pr-8 appearance-none transition-all font-bold text-sm hover:bg-white/[0.07] cursor-pointer"
                            >
                                <option value="All" className="bg-gray-900">All Colleges</option>
                                {colleges.map(c => <option key={c} value={c} className="bg-gray-900">{c}</option>)}
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={exportCSV}
                        className="w-full md:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-gray-800 to-gray-700 hover:from-gray-700 hover:to-gray-600 border border-white/10 px-6 py-3.5 rounded-xl font-bold transition-all active:scale-95 shadow-xl"
                    >
                        <Download size={20} />
                        Export CSV
                    </button>
                </div>

                {/* Table */}
                <div className="bg-white/[0.03] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl backdrop-blur-3xl">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-white/10 bg-white/5">
                                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-500">Photo</th>
                                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-500">Student Info</th>
                                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-500">Academic Mapping</th>
                                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-500 text-center">Status</th>
                                    <th className="px-6 py-5 text-xs font-black uppercase tracking-widest text-gray-500 text-right">Registered</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                <AnimatePresence mode="popLayout">
                                    {isLoading ? (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center">
                                                <div className="flex flex-col items-center gap-4">
                                                    <Loader2 size={40} className="animate-spin text-cyan-400" />
                                                    <span className="text-gray-500 font-bold uppercase tracking-widest text-[10px]">Accessing Encrypted Records...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredStudents.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="py-20 text-center text-gray-500 font-medium">No biometric matches found.</td>
                                        </tr>
                                    ) : filteredStudents.map((student) => (
                                        <motion.tr
                                            key={student.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="hover:bg-white/[0.05] transition-all group cursor-pointer"
                                            onClick={() => setSelectedStudent(student)}
                                        >
                                            <td className="px-6 py-6">
                                                <div className="w-14 h-14 rounded-2xl border border-white/10 bg-white/5 overflow-hidden shadow-inner flex items-center justify-center group-hover:border-cyan-500/30 transition-colors">
                                                    {student.image_url ? (
                                                        <img src={student.image_url} alt={student.full_name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                                    ) : (
                                                        <div className="text-[10px] font-black opacity-20 uppercase tracking-tighter">NULL</div>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-700 to-gray-900 border border-white/10 flex items-center justify-center text-cyan-400 font-black shadow-lg">
                                                        {student.full_name?.charAt(0) || '?'}
                                                    </div>
                                                    <div>
                                                        <div className="font-extrabold text-white group-hover:text-cyan-400 transition-colors uppercase tracking-tight text-lg mb-0.5">{student.full_name}</div>
                                                        <div className="text-[10px] text-gray-500 font-mono tracking-[0.2em] uppercase opacity-60 font-bold">{student.roll_number}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-6">
                                                <div className="text-sm font-bold text-gray-300">{student.college}</div>
                                                <div className="text-[10px] font-black uppercase text-gray-500 tracking-tighter">{student.department} • Year {student.year}</div>
                                            </td>
                                            <td className="px-6 py-6 text-center" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => student.id && toggleCheckIn(student.id, student.check_in_status)}
                                                    className={cn(
                                                        "inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase transition-all tracking-widest",
                                                        student.check_in_status
                                                            ? "bg-green-500/10 text-green-400 border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]"
                                                            : "bg-red-500/10 text-red-400 border border-red-500/20 opacity-40 hover:opacity-100"
                                                    )}
                                                >
                                                    {student.check_in_status ? <CheckSquare size={14} /> : <Square size={14} />}
                                                    {student.check_in_status ? "VERIFIED" : "PENDING"}
                                                </button>
                                            </td>
                                            <td className="px-6 py-6 text-right">
                                                <div className="text-xs text-white font-bold">{new Date(student.created_at).toLocaleDateString()}</div>
                                                <div className="text-[10px] text-gray-500 font-medium uppercase tracking-widest">{new Date(student.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}

function DetailItem({ label, value, icon: Icon }: any) {
    return (
        <div className="flex items-center gap-4 group/item">
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-500 group-hover/item:text-cyan-400 group-hover/item:border-cyan-500/30 transition-all">
                <Icon size={18} />
            </div>
            <div>
                <div className="text-[10px] font-black uppercase tracking-widest text-gray-600 mb-0.5">{label}</div>
                <div className="text-sm font-bold text-gray-200">{value || 'Not Specified'}</div>
            </div>
        </div>
    );
}

function StatCard({ label, value, icon: Icon, subValue, color }: any) {
    const colors: any = {
        cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/20 text-cyan-400",
        blue: "from-blue-500/20 to-blue-500/5 border-blue-500/20 text-blue-400",
        purple: "from-purple-500/20 to-purple-500/5 border-purple-500/20 text-purple-400",
    };
    return (
        <div className={cn("relative p-8 rounded-[32px] bg-gradient-to-br border backdrop-blur-2xl group overflow-hidden shadow-2xl", colors[color])}>
            <div className="absolute top-0 right-0 p-8 text-white/5 group-hover:text-white/10 transition-colors group-hover:scale-125 duration-700">
                <Icon size={80} strokeWidth={1} />
            </div>
            <div className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-3">{label}</div>
            <div className="text-5xl font-extrabold tracking-tighter text-white mb-2 leading-none">{value}</div>
            <div className="text-[10px] font-bold opacity-60 flex items-center gap-1 uppercase tracking-widest">
                <div className="w-1 h-1 rounded-full bg-current opacity-50" />
                {subValue}
            </div>
        </div>
    );
}

function NavBtn({ label, active }: { label: string, active?: boolean }) {
    return (
        <button className={cn(
            "px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all",
            active ? "text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 shadow-lg shadow-cyan-500/10" : "text-gray-500 hover:text-gray-200 hover:bg-white/5"
        )}>
            {label}
        </button>
    );
}
