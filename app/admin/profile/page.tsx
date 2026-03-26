'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertCircle, CheckCircle2, User, Key } from 'lucide-react';

export default function ProfilePage() {
  const [email, setEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetch('/api/admin/profile')
      .then(res => res.json())
      .then(data => {
        if (data.email) setEmail(data.email);
      });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (newPassword && newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const res = await fetch('/api/admin/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, currentPassword, newPassword: newPassword || undefined }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');

      setSuccess('Profile updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight">Admin Profile</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account email and password.</p>
      </div>

      <div className="max-w-md space-y-6">
        {error && (
          <div className="flex border items-start gap-3 rounded-xl bg-red-50 p-4 text-red-600 border-red-100 italic">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium leading-relaxed">{error}</p>
          </div>
        )}

        {success && (
          <div className="flex border items-start gap-3 rounded-xl bg-green-50 p-4 text-green-700 border-green-200">
            <CheckCircle2 className="h-5 w-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium leading-relaxed">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6 bg-white p-6 rounded-xl border shadow-sm">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
                <User className="h-4 w-4" /> Account Details
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Email Address</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="admin@example.com"
                className="h-10"
              />
            </div>
          </div>

          <div className="border-t pt-6 space-y-4">
            <div className="flex items-center gap-2 text-blue-600 font-semibold text-sm">
                <Key className="h-4 w-4" /> Change Password (Optional)
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Current Password</label>
              <Input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
                placeholder="Required for any changes"
                className="h-10"
              />
            </div>
            
            <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">New Password</label>
                    <Input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="Leave blank to keep current"
                        className="h-10"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700">Confirm New Password</label>
                    <Input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="h-10"
                    />
                </div>
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-all shadow-md" 
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Save Changes'}
          </Button>
        </form>
      </div>
    </div>
  );
}
