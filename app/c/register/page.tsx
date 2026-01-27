'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Phone, User, MapPin, CreditCard, Lock, Timer } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

export default function CustomerRegistrationPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  // Form steps
  const [step, setStep] = useState<'details' | 'otp' | 'complete'>('details');
  
  // Form data
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [address, setAddress] = useState('');
  const [panNumber, setPanNumber] = useState('');
  
  // OTP data
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpExpiry, setOtpExpiry] = useState<Date | null>(null);
  const [timeRemaining, setTimeRemaining] = useState(300); // 5 minutes
  const [registrationId, setRegistrationId] = useState<string | null>(null);
  
  // Loading states
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  
  // Timer for OTP expiry
  useEffect(() => {
    if (otpSent && otpExpiry) {
      const interval = setInterval(() => {
        const now = new Date();
        const remaining = Math.max(0, Math.floor((otpExpiry.getTime() - now.getTime()) / 1000));
        setTimeRemaining(remaining);
        
        if (remaining === 0) {
          clearInterval(interval);
          toast({
            title: 'OTP Expired',
            description: 'Please request a new OTP',
            variant: 'destructive',
          });
        }
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [otpSent, otpExpiry, toast]);
  
  // Send OTP
  const handleSendOtp = async () => {
    if (!phone) {
      toast({
        title: 'Error',
        description: 'Please enter your phone number',
        variant: 'destructive',
      });
      return;
    }
    
    setIsSendingOtp(true);
    
    try {
      const response = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to send OTP');
      }
      
      setOtpSent(true);
      setOtpExpiry(new Date(data.expires_at));
      setRegistrationId(data.registration_id);
      setStep('otp');
      
      toast({
        title: 'OTP Sent',
        description: `We've sent a 6-digit OTP to ${phone}`,
      });
      
      // For development - show OTP in console
      if (data.otp) {
        console.log('Development OTP:', data.otp);
        toast({
          title: 'Development Mode',
          description: `OTP: ${data.otp} (check console)`,
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsSendingOtp(false);
    }
  };
  
  // Resend OTP
  const handleResendOtp = async () => {
    setOtp('');
    await handleSendOtp();
  };
  
  // Verify OTP
  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast({
        title: 'Error',
        description: 'Please enter a 6-digit OTP',
        variant: 'destructive',
      });
      return;
    }
    
    setIsVerifying(true);
    
    try {
      const response = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, otp }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Invalid OTP');
      }
      
      toast({
        title: 'OTP Verified',
        description: 'Please complete your registration',
      });
      
      setStep('complete');
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsVerifying(false);
    }
  };
  
  // Complete registration
  const handleCompleteRegistration = async () => {
    if (!fullName) {
      toast({
        title: 'Error',
        description: 'Please enter your full name',
        variant: 'destructive',
      });
      return;
    }
    
    setIsCompleting(true);
    
    try {
      // For now, use a default retailer ID - in production, this should come from URL param or config
      const retailerId = '00000000-0000-0000-0000-000000000001'; // Replace with actual retailer ID
      
      const response = await fetch('/api/auth/complete-registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          full_name: fullName,
          address,
          pan_number: panNumber,
          retailer_id: retailerId,
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Registration failed');
      }
      
      toast({
        title: 'Registration Complete!',
        description: 'Redirecting to enrollment page...',
      });
      
      // Redirect to enrollment page
      setTimeout(() => {
        router.push('/c/enroll');
      }, 1500);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsCompleting(false);
    }
  };
  
  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gold-50 via-white to-gold-100 p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-gold-600 to-gold-800 bg-clip-text text-transparent">
            Register as Customer
          </CardTitle>
          <CardDescription className="text-center">
            {step === 'details' && 'Enter your phone number to get started'}
            {step === 'otp' && 'Enter the OTP sent to your phone'}
            {step === 'complete' && 'Complete your registration details'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Step 1: Phone Number */}
          {step === 'details' && (
            <>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+919876543210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="pl-10"
                    disabled={otpSent}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Include country code (e.g., +91 for India)
                </p>
              </div>
              
              <Button
                onClick={handleSendOtp}
                disabled={isSendingOtp || !phone}
                className="w-full bg-gradient-to-r from-gold-600 to-gold-700 hover:from-gold-700 hover:to-gold-800"
              >
                {isSendingOtp ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending OTP...
                  </>
                ) : (
                  'Send OTP'
                )}
              </Button>
              
              <div className="text-center text-sm text-gray-600">
                Already have an account?{' '}
                <a href="/c/login" className="text-gold-600 hover:text-gold-700 font-medium">
                  Login here
                </a>
              </div>
            </>
          )}
          
          {/* Step 2: OTP Verification */}
          {step === 'otp' && (
            <>
              <div className="space-y-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Enter the OTP sent to <span className="font-medium">{phone}</span>
                  </p>
                  <button
                    onClick={() => {
                      setStep('details');
                      setOtpSent(false);
                      setOtp('');
                    }}
                    className="text-xs text-gold-600 hover:text-gold-700"
                  >
                    Change number
                  </button>
                </div>
                
                <div className="flex justify-center">
                  <InputOTP
                    maxLength={6}
                    value={otp}
                    onChange={(value) => setOtp(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                
                <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
                  <Timer className="h-4 w-4" />
                  <span>
                    {timeRemaining > 0 ? (
                      <>Time remaining: {formatTime(timeRemaining)}</>
                    ) : (
                      <span className="text-red-600">OTP expired</span>
                    )}
                  </span>
                </div>
              </div>
              
              <Button
                onClick={handleVerifyOtp}
                disabled={isVerifying || otp.length !== 6}
                className="w-full bg-gradient-to-r from-gold-600 to-gold-700 hover:from-gold-700 hover:to-gold-800"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verifying...
                  </>
                ) : (
                  'Verify OTP'
                )}
              </Button>
              
              <Button
                onClick={handleResendOtp}
                disabled={isSendingOtp || timeRemaining > 0}
                variant="outline"
                className="w-full"
              >
                {isSendingOtp ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Resending...
                  </>
                ) : (
                  'Resend OTP'
                )}
              </Button>
            </>
          )}
          
          {/* Step 3: Complete Registration */}
          {step === 'complete' && (
            <>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="fullName"
                      type="text"
                      placeholder="Enter your full name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Textarea
                      id="address"
                      placeholder="Enter your complete address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="pl-10 min-h-[80px]"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="panNumber">PAN Number</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="panNumber"
                      type="text"
                      placeholder="ABCDE1234F"
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                      className="pl-10"
                      maxLength={10}
                    />
                  </div>
                  <p className="text-xs text-gray-500">
                    Optional - Required for high-value transactions
                  </p>
                </div>
              </div>
              
              <Button
                onClick={handleCompleteRegistration}
                disabled={isCompleting || !fullName}
                className="w-full bg-gradient-to-r from-gold-600 to-gold-700 hover:from-gold-700 hover:to-gold-800"
              >
                {isCompleting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Completing Registration...
                  </>
                ) : (
                  'Complete Registration'
                )}
              </Button>
            </>
          )}
          
          {/* Security note */}
          <div className="flex items-center gap-2 p-3 bg-gold-50 rounded-lg border border-gold-200">
            <Lock className="h-4 w-4 text-gold-600 flex-shrink-0" />
            <p className="text-xs text-gray-600">
              Your information is securely encrypted and will only be used for managing your gold savings account.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
