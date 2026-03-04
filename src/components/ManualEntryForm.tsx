'use client';

import React, { useState, useEffect } from 'react';
import { User, Contact, Building, BookOpen, Calendar, Send, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Student } from '@/lib/types';

interface ManualEntryFormProps {
    initialData?: Partial<Student>;
    onSubmit: (data: Omit<Student, 'id' | 'face_embedding' | 'check_in_status' | 'created_at' | 'synced'>) => void;
    isLoading?: boolean;
}

const InputField = ({ label, name, icon: Icon, type = 'text', placeholder, value, onChange }: any) => (
    <div className="relative group">
        <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-1 block group-focus-within:text-cyan-400 transition-colors">
            {label}
        </label>
        <div className="relative">
            <Icon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
            <input
                name={name}
                type={type}
                value={value}
                onChange={onChange}
                placeholder={placeholder}
                required
                className={cn(
                    "w-full bg-white/5 border border-white/10 text-white rounded-xl py-4 pl-12 pr-4 outline-none transition-all",
                    "focus:bg-white/10 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10 placeholder:text-gray-600"
                )}
            />
        </div>
    </div>
);

export function ManualEntryForm({ initialData, onSubmit, isLoading }: ManualEntryFormProps) {
    const [formData, setFormData] = useState({
        full_name: '',
        roll_number: '',
        college: '',
        department: '',
        year: '',
    });

    // 🔄 Sync state when OCR results arrive
    useEffect(() => {
        if (initialData) {
            setFormData(prev => ({
                full_name: initialData.full_name || prev.full_name,
                roll_number: initialData.roll_number || prev.roll_number,
                college: initialData.college || prev.college,
                department: initialData.department || prev.department,
                year: initialData.year || prev.year,
            }));
        }
    }, [initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSubmit(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 w-full max-w-lg mx-auto p-8 rounded-3xl bg-white/[0.03] backdrop-blur-3xl border border-white/10 shadow-2xl relative overflow-hidden group">
            {/* Glow behind */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-3xl -z-10 rounded-full" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/10 blur-3xl -z-10 rounded-full" />

            <h2 className="text-2xl font-bold text-white mb-2 flex items-center gap-3">
                <Contact strokeWidth={2.5} size={28} className="text-cyan-400" />
                Verify Student Details
            </h2>
            <p className="text-gray-400 text-sm mb-8">Confirm or correct the details extracted from the ID.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <InputField
                        label="Full Name"
                        name="full_name"
                        icon={User}
                        placeholder="e.g. John Doe"
                        value={formData.full_name}
                        onChange={handleChange}
                    />
                </div>

                <InputField
                    label="Roll Number"
                    name="roll_number"
                    icon={Contact}
                    placeholder="e.g. 21CS042"
                    value={formData.roll_number}
                    onChange={handleChange}
                />

                <div className="relative group">
                    <label className="text-xs font-bold text-gray-400 uppercase tracking-widest pl-1 mb-1 block group-focus-within:text-cyan-400 transition-colors">
                        Year of Study
                    </label>
                    <div className="relative">
                        <Calendar size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-cyan-400 transition-colors" />
                        <select
                            name="year"
                            value={formData.year}
                            onChange={handleChange}
                            required
                            className={cn(
                                "w-full bg-white/5 border border-white/10 text-white rounded-xl py-4 pl-12 pr-4 outline-none appearance-none transition-all",
                                "focus:bg-white/10 focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10"
                            )}
                        >
                            <option value="" disabled className="bg-gray-900">Select Year</option>
                            <option value="1" className="bg-gray-900">1st Year</option>
                            <option value="2" className="bg-gray-900">2nd Year</option>
                            <option value="3" className="bg-gray-900">3rd Year</option>
                            <option value="4" className="bg-gray-900">4th Year</option>
                        </select>
                    </div>
                </div>

                <InputField
                    label="College"
                    name="college"
                    icon={Building}
                    placeholder="e.g. IIT Madras"
                    value={formData.college}
                    onChange={handleChange}
                />
                <InputField
                    label="Department"
                    name="department"
                    icon={BookOpen}
                    placeholder="e.g. Comp Sci"
                    value={formData.department}
                    onChange={handleChange}
                />
            </div>

            <button
                type="submit"
                disabled={isLoading}
                className={cn(
                    "w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-4 rounded-xl shadow-lg shadow-cyan-500/20 active:scale-95 transition-all flex items-center justify-center gap-2 mt-4",
                    isLoading && "opacity-70 cursor-not-allowed scale-100"
                )}
            >
                {isLoading ? (
                    <>
                        <Loader2 size={20} className="animate-spin" />
                        Processing Verification...
                    </>
                ) : (
                    <>
                        <Send size={20} />
                        Complete Registration
                    </>
                )}
            </button>
        </form>
    );
}
