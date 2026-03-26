'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import {
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  TruckIcon,
  MegaphoneIcon,
  SparklesIcon,
} from '@heroicons/react/24/solid';

const features = [
  {
    icon: DocumentTextIcon,
    title: 'Business Documents',
    desc: 'Create quotations, invoices, purchase orders, delivery notes and professional letters with branded PDF exports.',
  },
  {
    icon: TruckIcon,
    title: 'Logistics Management',
    desc: 'Track shipments, manage containers, assign riders and monitor deliveries end-to-end in real time.',
  },
  {
    icon: MegaphoneIcon,
    title: 'Marketing Suite',
    desc: 'Schedule and publish social media campaigns, track performance and grow your audience across platforms.',
  },
  {
    icon: SparklesIcon,
    title: 'Imara AI',
    desc: 'AI-powered assistant for drafting documents, business advice and instant task execution.',
  },
];

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading, error, clearError } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    try {
      await login(email, password);
      router.push('/');
    } catch {
      // Error is handled by the store
    }
  };

  return (
    <div className="min-h-screen flex bg-dark-950">
      {/* ── LEFT PANEL ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative flex-col justify-between p-12 overflow-hidden">
        {/* Background gradient layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-950 to-dark-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(2,132,199,0.18)_0%,transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(2,132,199,0.10)_0%,transparent_55%)]" />

        {/* Decorative grid */}
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

        {/* Content — sits above the decorative layers */}
        <div className="relative z-10 flex flex-col h-full">
          {/* Hero text */}
          <div className="mt-auto mb-10">
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
              Run your business<br />
              <span className="text-primary-400">smarter, faster.</span>
            </h1>
            <p className="mt-4 text-dark-400 text-lg leading-relaxed max-w-md">
              From documents and logistics to social media campaigns — manage every part of your business in one beautifully designed platform.
            </p>
          </div>

          {/* Illustration — abstract business dashboard mockup */}
          <div className="relative mb-10">
            <div className="bg-dark-800/60 border border-dark-700/60 rounded-2xl p-5 backdrop-blur-sm">
              {/* Mock header bar */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-dark-600" />
                  <div className="w-2.5 h-2.5 rounded-full bg-dark-600" />
                  <div className="w-2.5 h-2.5 rounded-full bg-dark-600" />
                </div>
                <div className="h-3 w-24 bg-dark-700 rounded-full" />
                <div className="h-6 w-20 bg-primary-600/30 border border-primary-600/40 rounded-lg" />
              </div>
              {/* Mock stat cards */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: 'Revenue', val: '$48,290', color: 'text-emerald-400' },
                  { label: 'Invoices', val: '124', color: 'text-primary-400' },
                  { label: 'Pending', val: '$6,120', color: 'text-amber-400' },
                ].map((s) => (
                  <div key={s.label} className="bg-dark-900/70 rounded-xl p-3">
                    <p className="text-dark-500 text-[10px] uppercase tracking-wide mb-1">{s.label}</p>
                    <p className={`font-bold text-sm ${s.color}`}>{s.val}</p>
                  </div>
                ))}
              </div>
              {/* Mock bar chart */}
              <div className="flex items-end gap-1.5 h-16 px-1">
                {[40, 65, 45, 80, 55, 90, 70, 85, 60, 75, 50, 95].map((h, i) => (
                  <div key={i} className="flex-1 rounded-t-sm" style={{ height: `${h}%`, backgroundColor: i === 11 ? '#0284c7' : i % 3 === 0 ? '#1e40af30' : '#1e293b' }} />
                ))}
              </div>
              <div className="flex justify-between mt-1">
                {['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'].map((m) => (
                  <span key={m} className="text-[8px] text-dark-600">{m}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Feature pills */}
          <div className="grid grid-cols-2 gap-3">
            {features.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex gap-3 p-3.5 rounded-xl bg-dark-800/40 border border-dark-700/50 hover:border-primary-600/30 transition-colors">
                <div className="w-8 h-8 flex-shrink-0 rounded-lg bg-primary-600/15 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-primary-400" />
                </div>
                <div>
                  <p className="text-white text-xs font-semibold leading-snug">{title}</p>
                  <p className="text-dark-500 text-[10px] leading-relaxed mt-0.5">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <p className="mt-8 text-dark-600 text-xs">
            © {new Date().getFullYear()} Imara Suite · Built for growing businesses
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — LOGIN FORM ────────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 bg-dark-900">
        {/* Logo */}
        <div className="flex items-center justify-center mb-10">
          <img
            src="/Logos/Logo%20Design_word%20mark%20light.svg"
            alt="Imara Suite"
            className="h-24 lg:h-64 w-auto"
          />
        </div>

        <div className="w-full max-w-sm">
          {/* Heading */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white">Welcome back</h2>
            <p className="text-dark-400 text-sm mt-1.5">
              Sign in to your account to continue
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-xl">
                <p className="text-sm text-red-400">{error}</p>
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <EnvelopeIcon className="w-4 h-4 text-dark-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-dark-700 bg-dark-800 text-gray-100 text-sm placeholder:text-dark-600 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                  placeholder="you@company.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-dark-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                  <LockClosedIcon className="w-4 h-4 text-dark-500" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2.5 rounded-xl border border-dark-700 bg-dark-800 text-gray-100 text-sm placeholder:text-dark-600 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                  placeholder="Enter your password"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-dark-500 hover:text-dark-300 transition-colors"
                >
                  {showPassword ? <EyeSlashIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-900 disabled:text-primary-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-primary-600/20 disabled:shadow-none mt-1"
            >
              {isLoading ? (
                <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
              ) : (
                <>
                  Sign In
                  <ArrowRightIcon className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="mt-6 pt-6 border-t border-dark-700/50">
            <p className="text-center text-sm text-dark-500">
              Don&apos;t have an account?{' '}
              <Link href="/signup" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                Create one
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
