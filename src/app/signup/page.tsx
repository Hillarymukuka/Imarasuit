'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import {
  BuildingOffice2Icon,
  UserIcon,
  EnvelopeIcon,
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowRightIcon,
  DocumentTextIcon,
  TruckIcon,
  MegaphoneIcon,
  SparklesIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/solid';

const perks = [
  {
    icon: DocumentTextIcon,
    title: 'Business Documents',
    desc: 'Quotations, invoices, purchase orders, delivery notes and letters — all with branded PDF exports.',
  },
  {
    icon: TruckIcon,
    title: 'Logistics Management',
    desc: 'Manage shipments, containers, riders and deliveries with full tracking and reporting.',
  },
  {
    icon: MegaphoneIcon,
    title: 'Marketing Suite',
    desc: 'Schedule & publish social media campaigns, track performance and grow your audience.',
  },
  {
    icon: SparklesIcon,
    title: 'Imara AI',
    desc: 'AI-powered assistant for drafting documents, business advice and instant task execution.',
  },
];

export default function SignupPage() {
  const router = useRouter();
  const { signup, isLoading, error, clearError } = useAuthStore();
  const [companyName, setCompanyName] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    clearError();
    setLocalError('');

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters');
      return;
    }

    try {
      await signup(companyName, name, email, password);
      router.push('/');
    } catch {
      // Error is handled by the store
    }
  };

  const displayError = localError || error;

  return (
    <div className="min-h-screen flex bg-dark-950">
      {/* ── LEFT PANEL ─────────────────────────────────────────── */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-3/5 relative flex-col justify-between p-12 overflow-hidden">
        {/* Background layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-dark-900 via-dark-950 to-dark-950" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(2,132,199,0.18)_0%,transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,rgba(2,132,199,0.10)_0%,transparent_55%)]" />
        <div className="absolute inset-0 opacity-[0.03]"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.5) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,0.5) 1px,transparent 1px)', backgroundSize: '48px 48px' }} />

        <div className="relative z-10 flex flex-col h-full">

          {/* Hero text */}
          <div className="mt-auto mb-10">
            <h1 className="text-4xl xl:text-5xl font-bold text-white leading-tight">
              Your business,<br />
              <span className="text-primary-400">all in one place.</span>
            </h1>
            <p className="mt-4 text-dark-400 text-lg leading-relaxed max-w-md">
              Set up in minutes and unlock documents, logistics, marketing and AI-powered tools built for businesses that mean business.
            </p>
          </div>

          {/* Step indicator */}
          <div className="mb-10 bg-dark-800/60 border border-dark-700/60 rounded-2xl p-5 backdrop-blur-sm">
            <p className="text-dark-400 text-xs font-semibold uppercase tracking-widest mb-4">Getting Started is Easy</p>
            <div className="space-y-3">
              {[
                { step: '01', label: 'Create your free account', done: false },
                { step: '02', label: 'Add your company details & logo', done: false },
                { step: '03', label: 'Enable the modules you need — documents, logistics or marketing', done: false },
                { step: '04', label: 'Let Imara AI help you hit the ground running', done: false },
              ].map(({ step, label }) => (
                <div key={step} className="flex items-center gap-3">
                  <div className="w-7 h-7 rounded-full bg-primary-600/20 border border-primary-600/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary-400 text-[10px] font-bold">{step}</span>
                  </div>
                  <span className="text-dark-300 text-sm">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Perk tiles */}
          <div className="grid grid-cols-2 gap-3">
            {perks.map(({ icon: Icon, title, desc }) => (
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

          <p className="mt-8 text-dark-600 text-xs">
            © {new Date().getFullYear()} Imara Suite · Built for growing businesses
          </p>
        </div>
      </div>

      {/* ── RIGHT PANEL — SIGNUP FORM ──────────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 bg-dark-900 overflow-y-auto">
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
            <h2 className="text-2xl font-bold text-white">Create your account</h2>
            <p className="text-dark-400 text-sm mt-1.5">
              Set up your company and start in minutes
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {displayError && (
              <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-xl">
                <p className="text-sm text-red-400">{displayError}</p>
              </div>
            )}

              {/* Company Name */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">
                  Company Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <BuildingOffice2Icon className="w-4 h-4 text-dark-500" />
                  </div>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-dark-700 bg-dark-800 text-gray-100 text-sm placeholder:text-dark-600 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                    placeholder="Your Company Ltd"
                    required
                  />
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">
                  Your Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <UserIcon className="w-4 h-4 text-dark-500" />
                  </div>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-dark-700 bg-dark-800 text-gray-100 text-sm placeholder:text-dark-600 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                    placeholder="John Doe"
                    required
                  />
                </div>
              </div>

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
                    placeholder="Min. 6 characters"
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

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-dark-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                    <LockClosedIcon className="w-4 h-4 text-dark-500" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-dark-700 bg-dark-800 text-gray-100 text-sm placeholder:text-dark-600 focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all outline-none"
                    placeholder="Repeat your password"
                    required
                    minLength={6}
                  />
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isLoading || !companyName || !name || !email || !password || !confirmPassword}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-primary-600 hover:bg-primary-500 disabled:bg-primary-900 disabled:text-primary-700 text-white font-medium rounded-xl transition-all shadow-lg shadow-primary-600/20 disabled:shadow-none mt-2"
              >
                {isLoading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                ) : (
                  <>
                    Create Account
                    <ArrowRightIcon className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

          {/* Divider */}
          <div className="mt-6 pt-6 border-t border-dark-700/50">
            <p className="text-center text-sm text-dark-500">
              Already have an account?{' '}
              <Link href="/login" className="text-primary-400 hover:text-primary-300 font-medium transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
