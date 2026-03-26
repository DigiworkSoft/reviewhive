'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Hexagon, Lock, AlertCircle, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/admin/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send reset link');

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="min-h-screen grid items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 mb-4">
            <CheckCircle2 className="h-6 w-6 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold mb-2 text-gray-900">Check your email</h2>
          <p className="text-gray-500 mb-6">If an account exists for that email, we've sent instructions to reset your password.</p>
          <Link href="/admin/login">
            <Button className="w-full" variant="outline">Back to Login</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl shadow-sm border">
        
        <div className="flex justify-center mb-6">
          <div className="bg-blue-600 p-2 rounded-xl shadow-lg ring-4 ring-blue-50/50">
            <Hexagon className="h-8 w-8 text-white" />
          </div>
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Forgot Password</h1>
          <p className="text-sm text-gray-500 mt-2">Enter your email to receive a reset link.</p>
        </div>

        {error && (
          <div className="mb-6 flex border items-start gap-3 rounded-xl bg-red-50 p-4 text-red-600 border-red-100">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium leading-relaxed">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-semibold text-gray-700">Email Address</label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@reviewhive.com"
              required
              className="h-11 shadow-sm px-4 focus-visible:ring-blue-500"
            />
          </div>

          <Button 
            type="submit" 
            className="w-full h-11 text-sm font-semibold tracking-wide bg-blue-600 hover:bg-blue-700 shadow-md transition-all active:scale-[0.98]" 
            disabled={loading}
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Button>

          <div className="text-center">
            <Link href="/admin/login" className="text-sm text-blue-600 hover:text-blue-500 hover:underline">
              Back to Login
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}
