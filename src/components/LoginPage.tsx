import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { FileText, Eye, EyeOff, AlertCircle, Shield } from 'lucide-react';
import { OTPVerification } from './OTPVerification';
import { ForgotPassword } from './ForgotPassword';
import { ResetPassword } from './ResetPassword';
import { 
  sanitizeInput, 
  isValidEmail, 
  validatePassword, 
  rateLimiter
} from '../lib/security';
import { authApi, tokenManager } from '../lib/api';

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showOTP, setShowOTP] = useState(false);
  const [userId, setUserId] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetUserId, setResetUserId] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Rate limiting check - max 5 attempts per minute
    if (!rateLimiter.checkLimit('login', 5, 60000)) {
      setErrors({ 
        general: 'Too many login attempts. Please wait a minute before trying again.' 
      });
      return;
    }

    // Sanitize inputs
    const sanitizedEmail = sanitizeInput(email.toLowerCase());
    const sanitizedPassword = password.trim(); // Trim whitespace but don't sanitize to preserve special chars

    // Validate email
    if (!isValidEmail(sanitizedEmail)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    // Don't validate password strength on login - just check it's not empty
    // Password strength validation is only for creating/updating passwords
    if (!sanitizedPassword || sanitizedPassword.length === 0) {
      setErrors({ password: 'Password is required' });
      return;
    }

    setIsLoading(true);

    try {
      // Call real API
      const response = await authApi.login(sanitizedEmail, sanitizedPassword);
      
      if (response.success) {
        // Check if OTP is required (2FA enabled)
        if (response.data?.requiresOTP) {
          setUserId(response.data.userId);
          setIsLoading(false);
          setShowOTP(true);
          setAttempts(prev => prev + 1);
        } 
        // Check if login was successful with token (2FA disabled)
        else if (response.data?.token) {
          // Store token using tokenManager
          tokenManager.setToken(response.data.token);
          if (response.data.user) {
            localStorage.setItem('user', JSON.stringify(response.data.user));
          }
          // Reset rate limiter on successful login
          rateLimiter.reset('login');
          setIsLoading(false);
          // Call onLogin callback to redirect to dashboard
          onLogin();
        } 
        // No token and no OTP requirement - error
        else {
          setIsLoading(false);
          setErrors({ 
            general: response.error || 'Login failed. Please check your credentials.' 
          });
        }
      } else {
        setIsLoading(false);
        setErrors({ 
          general: response.error || 'Login failed. Please check your credentials.' 
        });
      }
    } catch (error: any) {
      setIsLoading(false);
      setErrors({ 
        general: error.message || 'Network error. Please try again.' 
      });
    }
  };

  const handleOTPVerify = async (otp: string) => {
    if (!userId || !email) {
      setShowOTP(false);
      setErrors({ general: 'Session expired. Please login again.' });
      return;
    }

    try {
      const response = await authApi.verifyOTP(email.toLowerCase(), otp, userId);
      
      if (response.success && response.data?.token) {
        // Store token
        tokenManager.setToken(response.data.token);
        
        // Reset rate limiter on successful login
        rateLimiter.reset('login');
        onLogin();
      } else {
        setShowOTP(false);
        setErrors({ 
          general: response.error || 'Invalid verification code. Please try again.' 
        });
      }
    } catch (error: any) {
      setShowOTP(false);
      setErrors({ 
        general: error.message || 'Verification failed. Please try again.' 
      });
    }
  };

  const handleResendOTP = async () => {
    if (!userId || !email) return;

    try {
      const response = await authApi.resendOTP(email.toLowerCase(), userId);
      if (response.success) {
        // OTP resent successfully
      } else {
        setErrors({ general: response.error || 'Failed to resend OTP.' });
      }
    } catch (error: any) {
      setErrors({ general: error.message || 'Failed to resend OTP.' });
    }
  };

  const handleBack = () => {
    setShowOTP(false);
    setUserId(null);
  };

  if (showResetPassword && resetEmail && resetUserId) {
    return (
      <ResetPassword
        email={resetEmail}
        userId={resetUserId}
        onBack={() => {
          setShowResetPassword(false);
          setShowForgotPassword(true);
        }}
        onSuccess={() => {
          setShowResetPassword(false);
          setShowForgotPassword(false);
          setResetEmail('');
          setResetUserId(null);
          setErrors({ general: 'Password reset successfully! Please login with your new password.' });
        }}
      />
    );
  }

  if (showForgotPassword) {
    return (
      <ForgotPassword
        onBack={() => {
          setShowForgotPassword(false);
          setResetEmail('');
          setResetUserId(null);
        }}
        onOTPSent={(email, userId) => {
          setResetEmail(email);
          setResetUserId(userId);
          setShowForgotPassword(false);
          setShowResetPassword(true);
        }}
      />
    );
  }

  if (showOTP) {
    return (
      <OTPVerification
        email={email}
        userId={userId!}
        onVerify={handleOTPVerify}
        onBack={handleBack}
        onResend={handleResendOTP}
      />
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 flex flex-col items-center">
          <div 
            className="w-12 h-12 bg-indigo-600 rounded-lg flex items-center justify-center mb-2"
            role="img"
            aria-label="LeadTrack Pro Logo"
          >
            <FileText className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">LeadTrack Pro</CardTitle>
          <CardDescription>
            Secure login with two-factor authentication
          </CardDescription>
        </CardHeader>
        <CardContent>
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
              <Label htmlFor="email">
                Email Address <span className="text-red-600" aria-label="required">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="text"
                placeholder="user@company.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setErrors(prev => ({ ...prev, email: undefined }));
                }}
                required
                aria-required="true"
                aria-invalid={errors.email ? 'true' : 'false'}
                aria-describedby={errors.email ? 'email-error' : undefined}
                autoComplete="email"
                disabled={isLoading}
              />
              {errors.email && (
                <p 
                  id="email-error" 
                  className="text-sm text-red-600"
                  role="alert"
                >
                  {errors.email}
                </p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">
                Password <span className="text-red-600" aria-label="required">*</span>
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors(prev => ({ ...prev, password: undefined }));
                  }}
                  required
                  aria-required="true"
                  aria-invalid={errors.password ? 'true' : 'false'}
                  aria-describedby={errors.password ? 'password-error password-requirements' : 'password-requirements'}
                  autoComplete="current-password"
                  disabled={isLoading}
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  tabIndex={0}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" aria-hidden="true" />
                  ) : (
                    <Eye className="w-4 h-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p 
                  id="password-error" 
                  className="text-sm text-red-600"
                  role="alert"
                >
                  {errors.password}
                </p>
              )}
              <p 
                id="password-requirements" 
                className="text-xs text-muted-foreground"
              >
                Min 8 characters, uppercase, lowercase, number, and special character
              </p>
            </div>

            {/* Submit Button */}
            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
              aria-busy={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Authenticating...
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 mr-2" aria-hidden="true" />
                  Sign In Securely
                </>
              )}
            </Button>

            {/* Forgot Password Link */}
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                onClick={() => setShowForgotPassword(true)}
                className="text-sm text-muted-foreground hover:text-primary"
                disabled={isLoading}
              >
                Forgot your password?
              </Button>
            </div>

          </form>

          {/* Security Notice */}
          <div className="mt-4 pt-4 border-t">
            <p className="text-xs text-center text-muted-foreground">
              🔒 Secured with industry-standard encryption and two-factor authentication
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
