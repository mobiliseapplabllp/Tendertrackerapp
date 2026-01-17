import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { AlertCircle, ArrowLeft, Mail } from 'lucide-react';
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
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <div className="flex items-center gap-2 mb-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onBack}
            className="h-8 w-8"
            aria-label="Go back to login"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <CardTitle className="text-2xl">Forgot Password</CardTitle>
        </div>
        <CardDescription>
          Enter your email address and we'll send you a verification code to reset your password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {success ? (
          <div className="space-y-4">
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-green-800">
                    Verification code sent!
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    If an account exists with this email, a verification code has been sent. Please check your email and enter the code to reset your password.
                  </p>
                </div>
              </div>
            </div>
            <Button
              onClick={onBack}
              variant="outline"
              className="w-full"
            >
              Back to Login
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {/* General Error */}
            {errors.general && (
              <div
                className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2"
                role="alert"
                aria-live="assertive"
              >
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                <p className="text-sm text-red-800">{errors.general}</p>
              </div>
            )}

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="forgot-email">
                Email Address <span className="text-red-600" aria-label="required">*</span>
              </Label>
              <Input
                id="forgot-email"
                name="email"
                type="email"
                placeholder="user@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors(prev => ({ ...prev, email: undefined }));
                }}
                required
                aria-required="true"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'forgot-email-error' : undefined}
                autoComplete="email"
                disabled={isLoading}
              />
              {errors.email && (
                <p
                  id="forgot-email-error"
                  className="text-sm text-red-600"
                  role="alert"
                >
                  {errors.email}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
            >
              {isLoading ? 'Sending...' : 'Send Verification Code'}
            </Button>

            {/* Back to Login */}
            <Button
              type="button"
              variant="ghost"
              onClick={onBack}
              className="w-full"
              disabled={isLoading}
            >
              Back to Login
            </Button>
          </form>
        )}
      </CardContent>
    </Card>
  );
}













