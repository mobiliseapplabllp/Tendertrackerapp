import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AlertCircle, ArrowLeft, Eye, EyeOff, CheckCircle2 } from 'lucide-react';
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
      <Card className="w-full max-w-md mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2 mb-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onBack}
              className="h-8 w-8"
              aria-label="Go back"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="text-2xl">Verify OTP</CardTitle>
          </div>
          <CardDescription>
            Enter the 6-digit verification code sent to {email}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleVerifyOTP} className="space-y-4" noValidate>
            {errors.general && (
              <div
                className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2"
                role="alert"
              >
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-800">{errors.general}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="reset-otp">
                Verification Code <span className="text-red-600" aria-label="required">*</span>
              </Label>
              <Input
                id="reset-otp"
                name="otp"
                type="text"
                placeholder="000000"
                value={otp}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                  setOtp(value);
                  setErrors(prev => ({ ...prev, otp: undefined }));
                }}
                required
                maxLength={6}
                aria-required="true"
                aria-invalid={errors.otp ? 'true' : 'false'}
                disabled={isLoading}
                className="text-center text-2xl tracking-widest font-mono"
              />
              {errors.otp && (
                <p className="text-sm text-red-600" role="alert">
                  {errors.otp}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading || otp.length !== 6}
            >
              {isLoading ? 'Verifying...' : 'Verify Code'}
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className="w-full"
              disabled={isLoading}
            >
              Back
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setStep('verify')}
            className="h-8 w-8"
            aria-label="Go back to OTP verification"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-2xl">Reset Password</CardTitle>
        </div>
        <CardDescription>
          Enter your new password. Make sure it meets the security requirements.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleResetPassword} className="space-y-4" noValidate>
          {errors.general && (
            <div
              className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2"
              role="alert"
            >
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{errors.general}</p>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="new-password">
              New Password <span className="text-red-600" aria-label="required">*</span>
            </Label>
            <div className="relative">
              <Input
                id="new-password"
                name="newPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setErrors(prev => ({ ...prev, password: undefined }));
                }}
                required
                aria-required="true"
                aria-invalid={errors.password ? 'true' : 'false'}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.password && (
              <p className="text-sm text-red-600" role="alert">
                {errors.password}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-password">
              Confirm Password <span className="text-red-600" aria-label="required">*</span>
            </Label>
            <div className="relative">
              <Input
                id="confirm-password"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm new password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrors(prev => ({ ...prev, confirmPassword: undefined }));
                }}
                required
                aria-required="true"
                aria-invalid={errors.confirmPassword ? 'true' : 'false'}
                disabled={isLoading}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.confirmPassword && (
              <p className="text-sm text-red-600" role="alert">
                {errors.confirmPassword}
              </p>
            )}
            {newPassword && confirmPassword && newPassword === confirmPassword && (
              <p className="text-sm text-green-600 flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" />
                Passwords match
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading || !newPassword || !confirmPassword}
          >
            {isLoading ? 'Resetting...' : 'Reset Password'}
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => setStep('verify')}
            className="w-full"
            disabled={isLoading}
          >
            Back to OTP Verification
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

