import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Shield, ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';

interface OTPVerificationProps {
  email: string;
  userId: number;
  onVerify: (otp: string) => Promise<void>;
  onBack: () => void;
  onResend: () => Promise<void>;
}

export function OTPVerification({ email, userId, onVerify, onBack, onResend }: OTPVerificationProps) {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    // Focus first input on mount
    inputRefs.current[0]?.focus();

    // Countdown timer for resend
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const handleChange = (index: number, value: string) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1); // Take only the last digit
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all digits are entered
    if (index === 5 && value) {
      const otpString = newOtp.join('');
      if (otpString.length === 6) {
        handleVerify(otpString);
      }
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6);

    if (!/^\d+$/.test(pastedData)) {
      setError('Please paste only numbers');
      return;
    }

    const newOtp = pastedData.split('').concat(Array(6).fill('')).slice(0, 6);
    setOtp(newOtp);

    // Focus the next empty input or last input
    const nextIndex = Math.min(pastedData.length, 5);
    inputRefs.current[nextIndex]?.focus();

    // Auto-verify if 6 digits pasted
    if (pastedData.length === 6) {
      handleVerify(pastedData);
    }
  };

  const handleVerify = async (otpString: string) => {
    if (otpString.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsVerifying(true);
    setError('');

    try {
      await onVerify(otpString);
    } catch (err: any) {
      setError(err.message || 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResend = async () => {
    if (!canResend || isResending) return;

    setIsResending(true);
    setOtp(['', '', '', '', '', '']);
    setError('');
    setCountdown(60);
    setCanResend(false);

    try {
      await onResend();
      inputRefs.current[0]?.focus();
    } catch (err: any) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="w-full space-y-5 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 lg:text-3xl">Verify access</h1>
        <p className="text-slate-500 font-medium text-sm">
          Please enter the code sent to <span className="text-slate-900 font-bold">{email}</span>
        </p>
      </div>

      <div className="space-y-5">
        <div className="space-y-4">
          <div
            className="flex gap-2 justify-center md:justify-start"
            role="group"
            aria-labelledby="otp-label"
          >
            {otp.map((digit, index) => (
              <Input
                key={index}
                ref={(el) => (inputRefs.current[index] = el)}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e.target.value)}
                onKeyDown={(index === 0) ? handlePaste : (e) => handleKeyDown(index, e)}
                onPaste={index === 0 ? handlePaste : undefined}
                className={`w-11 h-14 text-center text-xl font-bold bg-slate-100/50 border-none focus:bg-white focus:ring-2 focus:ring-slate-200 transition-all rounded-xl ${error ? 'ring-2 ring-red-500/20' : ''}`}
                aria-label={`Digit ${index + 1}`}
                aria-invalid={error ? 'true' : 'false'}
                autoComplete="one-time-code"
              />
            ))}
          </div>
          {error && (
            <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl flex items-center gap-3 animate-in shake duration-500">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-sm font-bold text-red-900" role="alert" aria-live="assertive">
                {error}
              </p>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Button
            onClick={() => handleVerify(otp.join(''))}
            className="w-full h-12 bg-[#2a2d53] hover:bg-[#1e2042] text-white text-base font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-70"
            disabled={otp.join('').length !== 6 || isVerifying}
          >
            {isVerifying ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-[2px] border-white/30 border-t-white rounded-full animate-spin" />
                <span className="tracking-tight">Verifying...</span>
              </div>
            ) : 'Verify Code'}
          </Button>

          <Button
            variant="ghost"
            onClick={onBack}
            className="w-full h-10 text-slate-500 hover:text-slate-900 font-semibold rounded-xl transition-colors text-xs"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to sign in
          </Button>
        </div>

        <div className="text-center md:text-left pt-4 border-t border-slate-50">
          {canResend ? (
            <button
              onClick={handleResend}
              className="text-xs font-black text-indigo-600 hover:text-indigo-800 transition-colors flex items-center gap-2 uppercase tracking-widest"
              disabled={isResending}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
              {isResending ? 'Transmitting...' : 'Request Replacement code'}
            </button>
          ) : (
            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">
              Synchronization link active for <span className="text-indigo-600">{countdown}s</span>
            </p>
          )}
        </div>
      </div>

      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 relative overflow-hidden">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-lg bg-white shadow-sm flex items-center justify-center">
            <Shield className="w-3 h-3 text-emerald-500" />
          </div>
          <span className="text-xs font-black text-slate-900 uppercase tracking-widest">Notice</span>
        </div>
        <p className="text-xs text-slate-500 leading-tight font-medium">
          Confidentiality is paramount. Never broadcast this sequence.
        </p>
      </div>
    </div>
  );
}
