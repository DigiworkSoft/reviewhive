'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!token) {
      setError('No reset token found in the URL. Please check your email link.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to reset password');

      setSuccess(true);
      setTimeout(() => {
        router.push('/admin/login');
      }, 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
          <CheckCircle2 className="h-6 w-6 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold mb-2 text-gray-900">Password Reset</h2>
        <p className="text-gray-500 mb-6">Your password has been successfully reset. Redirecting to login...</p>
        <Link href="/admin/login">
          <Button className="w-full" variant="outline">Go to Login manually</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border">
      <div className="flex justify-center mb-6">
        <div className="bg-blue-600 p-2 rounded-xl shadow-lg ring-4 ring-blue-50/50">
          <Lock className="h-8 w-8 text-white" />
        </div>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Create New Password</h1>
        <p className="text-sm text-gray-500 mt-2">Enter at least 8 characters.</p>
      </div>

      {error && (
        <div className="mb-6 flex border items-start gap-3 rounded-xl bg-red-50 p-4 text-red-600 border-red-100">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <p className="text-sm font-medium leading-relaxed">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-semibold text-gray-700">New Password</label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            className="h-11 shadow-sm px-4 focus-visible:ring-blue-500"
          />
        </div>

        <Button 
          type="submit" 
          className="w-full h-11 text-sm font-semibold tracking-wide bg-blue-600 hover:bg-blue-700 shadow-md transition-all active:scale-[0.98]" 
          disabled={loading}
        >
          {loading ? 'Resetting...' : 'Reset Password'}
        </Button>
      </form>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen grid items-center justify-center bg-gray-50 p-4">
      <Suspense fallback={<div className="text-gray-500">Loading...</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  );
}
