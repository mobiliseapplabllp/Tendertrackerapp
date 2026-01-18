import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { AlertCircle, ArrowLeft, Eye, EyeOff, CheckCircle2, Shield } from 'lucide-react';
import { sanitizeInput, validatePassword } from '../lib/security';
import { authApi } from '../lib/api';

interface ResetPasswordProps {
  email: string;
  userId: number;
  onBack: () => void;
  onSuccess: () => void;
}

export function ResetPassword({ email, userId, onBack, onSuccess }: ResetPasswordProps) {
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<{ otp?: string; password?: string; confirmPassword?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [step, setStep] = useState<'verify' | 'reset'>('verify');

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!otp || otp.length !== 6) {
      setErrors({ otp: 'Please enter a valid 6-digit OTP' });
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.verifyForgotPasswordOTP(email, otp, userId);

      if (response.success) {
        setStep('reset');
      } else {
        setErrors({ otp: response.error || 'Invalid or expired OTP' });
      }
    } catch (error: any) {
      setErrors({ otp: error.message || 'Failed to verify OTP' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Trim passwords to remove any accidental whitespace
    const trimmedPassword = newPassword.trim();
    const trimmedConfirmPassword = confirmPassword.trim();

    // Validate password
    const passwordValidation = validatePassword(trimmedPassword);
    if (!passwordValidation.isValid) {
      setErrors({ password: passwordValidation.errors[0] });
      return;
    }

    // Check password match
    if (trimmedPassword !== trimmedConfirmPassword) {
      setErrors({ confirmPassword: 'Passwords do not match' });
      return;
    }

    setIsLoading(true);

    try {
      const response = await authApi.resetPassword(email, otp, userId, trimmedPassword);

      if (response.success) {
        onSuccess();
      } else {
        setErrors({ general: response.error || 'Failed to reset password' });
      }
    } catch (error: any) {
      setErrors({ general: error.message || 'Failed to reset password' });
    } finally {
      setIsLoading(false);
    }
  };

  if (step === 'verify') {
    return (
      <div className="w-full space-y-5 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
        <div className="space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 lg:text-3xl">Authorize</h1>
          <p className="text-slate-500 font-medium text-sm">
            Enter sequence sent to <span className="text-slate-900 font-bold">{email}</span>
          </p>
        </div>

        <form onSubmit={handleVerifyOTP} className="space-y-4" noValidate>
          {errors.general && (
            <div className="p-4 bg-red-50/50 border border-red-100 rounded-lg flex items-start gap-2 animate-in shake duration-500">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-xs text-red-900 font-bold leading-snug">{errors.general}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="reset-otp" className="text-sm font-semibold text-slate-900 ml-0.5">
              Authorization Sequence
            </Label>
            <Input
              id="reset-otp"
              name="otp"
              type="text"
              inputMode="numeric"
              placeholder="0 0 0 0 0 0"
              value={otp}
              onChange={(e) => {
                const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                setOtp(value);
                setErrors(prev => ({ ...prev, otp: undefined }));
              }}
              required
              maxLength={6}
              disabled={isLoading}
              className={`h-16 text-center text-3xl font-bold bg-slate-100/50 border-none focus:bg-white focus:ring-2 focus:ring-slate-200 transition-all rounded-xl shadow-inner placeholder:text-slate-300 ${errors.otp ? 'ring-2 ring-red-500/20' : ''}`}
            />
            {errors.otp && <p className="text-xs font-semibold text-red-600 ml-1">{errors.otp}</p>}
          </div>

          <div className="space-y-2 pt-2">
            <Button
              type="submit"
              className="w-full h-12 bg-[#2a2d53] hover:bg-[#1e2042] text-white text-base font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-70"
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-[2px] border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="tracking-tight">Auth...</span>
                </div>
              ) : 'Confirm Authorization'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className="w-full h-10 text-slate-500 hover:text-slate-900 font-semibold rounded-xl transition-colors text-xs"
              disabled={isLoading}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return gateway
            </Button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="w-full space-y-5 animate-in fade-in slide-in-from-right-8 duration-1000 ease-out">
      <div className="space-y-1">
        <h1 className="text-2xl font-black tracking-tight text-slate-900 lg:text-3xl">New Credentials</h1>
        <p className="text-slate-500 font-medium text-sm">
          Define your new secure access key
        </p>
      </div>

      <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
        {errors.general && (
          <div className="p-3 bg-red-50/50 border border-red-100 rounded-xl flex items-start gap-2 animate-in shake duration-500">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <p className="text-xs text-red-900 font-bold leading-snug">{errors.general}</p>
          </div>
        )}

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="new-password" title="Required" className="text-sm font-semibold text-slate-900 ml-0.5">
              New Password
            </Label>
            <div className="relative group">
              <Input
                id="new-password"
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                className={`h-11 bg-slate-100/50 border-none focus:bg-white focus:ring-2 focus:ring-slate-200 transition-all rounded-xl pr-14 text-sm font-medium placeholder:text-slate-400 ${errors.password ? 'ring-2 ring-red-500/20 shadow-sm' : ''}`}
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setErrors(prev => ({ ...prev, password: undefined }));
                }}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.password && <p className="text-xs font-semibold text-red-600 ml-1">{errors.password}</p>}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password" className="text-sm font-semibold text-slate-900 ml-0.5">
              Confirm Password
            </Label>
            <div className="relative group">
              <Input
                id="confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                className={`h-11 bg-slate-100/50 border-none focus:bg-white focus:ring-2 focus:ring-slate-200 transition-all rounded-xl pr-14 text-sm font-medium placeholder:text-slate-400 ${errors.confirmPassword ? 'ring-2 ring-red-500/20 shadow-sm' : ''}`}
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                }}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
              >
                {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs font-semibold text-red-600 ml-1">{errors.confirmPassword}</p>}
            {newPassword && confirmPassword && newPassword === confirmPassword && (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-50 rounded-lg border border-emerald-100 animate-in slide-in-from-left-4 duration-500 shadow-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-bold text-emerald-700">Passwords match</span>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2 pt-2">
          <Button
            type="submit"
            className="w-full h-12 bg-[#2a2d53] hover:bg-[#1e2042] text-white text-base font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-70"
            disabled={isLoading || !newPassword || !confirmPassword}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-[2px] border-white/30 border-t-white rounded-full animate-spin" />
                <span className="tracking-tight">Auth...</span>
              </div>
            ) : 'Update Registry'}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep('verify')}
            className="w-full h-10 text-slate-500 hover:text-slate-900 font-semibold rounded-xl transition-colors text-xs"
            disabled={isLoading}
          >
            Modify Sequence
          </Button>
        </div>
      </form>
    </div>
  );
}

