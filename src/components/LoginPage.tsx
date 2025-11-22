import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { FileText, Eye, EyeOff, AlertCircle, Shield } from 'lucide-react';
import { OTPVerification } from './OTPVerification';
import { 
  sanitizeInput, 
  isValidEmail, 
  validatePassword, 
  rateLimiter, 
  generateOTP 
} from '../lib/security';

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
  const [generatedOTP, setGeneratedOTP] = useState('');
  const [attempts, setAttempts] = useState(0);

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
    const sanitizedPassword = password; // Don't sanitize password to preserve special chars

    // Validate email
    if (!isValidEmail(sanitizedEmail)) {
      setErrors({ email: 'Please enter a valid email address' });
      return;
    }

    // Validate password strength
    const passwordValidation = validatePassword(sanitizedPassword);
    if (!passwordValidation.isValid) {
      setErrors({ password: passwordValidation.errors[0] });
      return;
    }

    setIsLoading(true);

    // Simulate API call with delay
    setTimeout(() => {
      // Mock authentication - in production, verify against database
      // For demo purposes, accept valid format credentials
      
      // Generate and "send" OTP
      const otp = generateOTP();
      setGeneratedOTP(otp);
      
      // In production, send OTP via email/SMS API
      console.log(`[DEMO] OTP sent to ${sanitizedEmail}: ${otp}`);
      
      setIsLoading(false);
      setShowOTP(true);
    }, 1000);

    setAttempts(prev => prev + 1);
  };

  const handleOTPVerify = (otp: string) => {
    // Verify OTP
    if (otp === generatedOTP) {
      // Reset rate limiter on successful login
      rateLimiter.reset('login');
      onLogin();
    } else {
      setShowOTP(false);
      setErrors({ 
        general: 'Invalid verification code. Please try logging in again.' 
      });
    }
  };

  const handleResendOTP = () => {
    const newOTP = generateOTP();
    setGeneratedOTP(newOTP);
    console.log(`[DEMO] New OTP sent: ${newOTP}`);
  };

  const handleBack = () => {
    setShowOTP(false);
    setGeneratedOTP('');
  };

  if (showOTP) {
    return (
      <OTPVerification
        email={email}
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
            aria-label="TenderTrack Pro Logo"
          >
            <FileText className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">TenderTrack Pro</CardTitle>
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

            {/* Demo Notice */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-xs text-blue-800">
                <strong>Demo Mode:</strong> Use email format with password containing 
                uppercase, lowercase, number, and special character. OTP will be shown in console.
              </p>
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
