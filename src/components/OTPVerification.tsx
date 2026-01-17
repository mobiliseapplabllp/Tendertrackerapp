import { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { Shield, ArrowLeft, RefreshCw } from 'lucide-react';

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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-purple-100 p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl mb-2">Verify Your Identity</h1>
          <p className="text-sm text-muted-foreground">
            We've sent a 6-digit code to
          </p>
          <p className="text-sm" aria-live="polite">
            <strong>{email}</strong>
          </p>
        </div>

        <div className="space-y-6">
          {/* OTP Input */}
          <div>
            <label className="text-sm mb-2 block" id="otp-label">
              Enter Verification Code
            </label>
            <div 
              className="flex gap-2 justify-center"
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
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  onPaste={index === 0 ? handlePaste : undefined}
                  className="w-12 h-12 text-center text-lg"
                  aria-label={`Digit ${index + 1}`}
                  aria-invalid={error ? 'true' : 'false'}
                  autoComplete="off"
                />
              ))}
            </div>
            {error && (
              <p className="text-sm text-red-600 mt-2" role="alert" aria-live="assertive">
                {error}
              </p>
            )}
          </div>

          {/* Verify Button */}
          <Button
            onClick={() => handleVerify(otp.join(''))}
            className="w-full"
            disabled={otp.join('').length !== 6 || isVerifying}
            aria-label="Verify OTP code"
            aria-busy={isVerifying}
          >
            {isVerifying ? 'Verifying...' : 'Verify Code'}
          </Button>

          {/* Resend Section */}
          <div className="text-center">
            {canResend ? (
              <Button
                variant="link"
                onClick={handleResend}
                className="text-sm"
                aria-label="Resend verification code"
                disabled={isResending}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isResending ? 'animate-spin' : ''}`} />
                {isResending ? 'Sending...' : 'Resend Code'}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground" aria-live="polite">
                Resend code in <span className="font-medium">{countdown}s</span>
              </p>
            )}
          </div>

          {/* Back Button */}
          <Button
            variant="outline"
            onClick={onBack}
            className="w-full"
            aria-label="Go back to login"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Login
          </Button>
        </div>

        {/* Security Notice */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <p className="text-xs text-blue-800">
            <strong>Security Tip:</strong> Never share your verification code with anyone. 
            Our team will never ask for this code.
          </p>
        </div>
      </Card>
    </div>
  );
}
