import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { AlertCircle, ArrowLeft, Mail, CheckCircle2 } from 'lucide-react';
import { sanitizeInput, isValidEmail } from '../lib/security';
import { authApi } from '../lib/api';

interface ForgotPasswordProps {
  onBack: () => void;
  onOTPSent: (email: string, userId: number) => void;
}

export function ForgotPassword({ onBack, onOTPSent }: ForgotPasswordProps) {
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<{ email?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setSuccess(false);

    // Sanitize and validate email
    const sanitizedEmail = sanitizeInput(email.toLowerCase());

    if (!isValidEmail(sanitizedEmail)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.forgotPassword(sanitizedEmail);

      if (response.success) {
        setSuccess(true);
        // If userId is provided, proceed to OTP verification
        if (response.data?.userId) {
          onOTPSent(sanitizedEmail, response.data.userId);
        }
      } else {
        setErrors({ general: response.error || 'Failed to send password reset OTP' });
      }
    } catch (error: any) {
      setErrors({ general: error.message || 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full space-y-5 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 lg:text-3xl">Reset password</h1>
        <p className="text-slate-500 font-medium text-sm">
          Enter your email to receive recovery instructions
        </p>
      </div>

      <div className="space-y-5">
        {success ? (
          <div className="space-y-4 animate-in zoom-in-95 duration-500">
            <div className="p-5 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-start gap-4 shadow-sm">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-base font-bold text-emerald-900">Email Sent</p>
                <p className="text-sm text-emerald-800/80 mt-1">
                  We've sent recovery instructions to your email.
                </p>
              </div>
            </div>
            <Button
              onClick={onBack}
              className="w-full h-12 bg-[#2a2d53] hover:bg-[#1e2042] text-white text-base font-bold rounded-xl shadow-lg transition-all"
            >
              Back to Sign In
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {errors.general && (
              <div className="p-4 bg-red-50/50 border border-red-100 rounded-2xl flex items-start gap-3 animate-in shake duration-500">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <p className="text-sm text-red-900 font-bold leading-snug">{errors.general}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="forgot-email" className="text-sm font-semibold text-slate-900 ml-0.5">
                Email Address
              </Label>
              <div className="relative">
                <Input
                  id="forgot-email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  className={`h-12 bg-slate-100/50 border-none focus:bg-white focus:ring-2 focus:ring-slate-200 transition-all rounded-xl text-sm font-medium placeholder:text-slate-400 ${errors.email ? 'ring-2 ring-red-500/20 shadow-sm' : ''}`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="text-xs font-semibold text-red-600 ml-1">{errors.email}</p>}
            </div>

            <div className="space-y-2 pt-2">
              <Button
                type="submit"
                className="w-full h-12 bg-[#2a2d53] hover:bg-[#1e2042] text-white text-base font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-70"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-[2px] border-white/30 border-t-white rounded-full animate-spin" />
                    <span className="tracking-tight">Sending...</span>
                  </div>
                ) : 'Send Recovery Link'}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={onBack}
                className="w-full h-10 text-slate-500 hover:text-slate-900 font-semibold rounded-xl text-xs"
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to sign in
              </Button>
            </div>
          </form>
        )}
      </div>

    </div>
  );
}













