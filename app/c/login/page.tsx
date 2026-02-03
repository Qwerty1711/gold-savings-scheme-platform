'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCustomerAuth } from '@/lib/contexts/customer-auth-context';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function CustomerLoginPage() {
  const router = useRouter();
  const { sendOTP, verifyOTP, loading: authLoading, customer } = useCustomerAuth();
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // If already logged in, redirect to /c/schemes
  if (typeof window !== 'undefined' && customer) {
    router.replace('/c/schemes');
    return null;
  }

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await sendOTP(phone);
    setLoading(false);
    if (result.success) {
      setStep('otp');
    } else {
      setError(result.error || 'Failed to send OTP');
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await verifyOTP(phone, otp);
    setLoading(false);
    if (result.success) {
      setSuccess(true);
      router.replace('/c/schemes');
    } else {
      setError(result.error || 'Invalid OTP');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gold-50 px-4">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-4 text-center text-gold-700">GoldSaver Login</h1>
        {error && (
          <div className="mb-3 text-red-600 text-center font-medium bg-red-50 rounded p-2">{error}</div>
        )}
        {step === 'phone' && (
          <form onSubmit={handleSendOTP} className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">Mobile Number</label>
            <Input
              type="tel"
              pattern="[0-9]{10}"
              maxLength={10}
              minLength={10}
              required
              placeholder="Enter your 10-digit mobile number"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
              className="mb-2"
              autoFocus
            />
            <Button type="submit" className="w-full" disabled={loading || phone.length !== 10}>
              {loading ? 'Sending OTP...' : 'Send OTP'}
            </Button>
          </form>
        )}
        {step === 'otp' && (
          <form onSubmit={handleVerifyOTP} className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">Enter OTP</label>
            <Input
              type="text"
              inputMode="numeric"
              pattern="[0-9]{6}"
              maxLength={6}
              minLength={4}
              required
              placeholder="Enter OTP received"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
              className="mb-2 tracking-widest text-center"
              autoFocus
            />
            <Button type="submit" className="w-full" disabled={loading || otp.length < 4}>
              {loading ? 'Verifying...' : 'Verify OTP'}
            </Button>
            <Button type="button" variant="ghost" className="w-full mt-2" onClick={() => setStep('phone')}>
              Change Number
            </Button>
          </form>
        )}
        {success && (
          <div className="text-green-600 text-center font-medium mt-4">Login successful! Redirecting...</div>
        )}
      </div>
    </div>
  );
}