import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Rocket, Shield, Eye, EyeOff, Mail,
  Lock, ArrowRight, Github, Apple,
  CheckCircle2, Zap, FileText, AlertCircle,
  Sparkles, Brain, Cpu, Layout
} from 'lucide-react';
import { GoogleLogo, MicrosoftLogo } from './Logos';
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
import { useBranding } from '../hooks/useBranding';

interface LoginPageProps {
  onLogin: () => void;
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const { appName, tagline } = useBranding();
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

  const renderContent = () => {
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
      <>
        <div className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-1000 ease-out">
          <div className="space-y-0.5">
            <h2 className="text-xl font-black tracking-tight text-slate-900 lg:text-2xl">Sign in to your account</h2>
            <p className="text-slate-500 font-medium text-xs">
              Enter your credentials to access the dashboard
            </p>
          </div>

          {errors.general && (
            <div
              className="p-3 bg-red-50/50 border border-red-100 rounded-xl flex items-start gap-3 animate-in shake duration-500"
              role="alert"
              aria-live="assertive"
            >
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
              <p className="text-xs text-red-900 font-semibold leading-snug">{errors.general}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3" noValidate>
            <div className="space-y-1">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-900 ml-0.5">
                Email Address
              </Label>
              <div className="relative group">
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="you@company.com"
                  className={`h-11 bg-slate-100/50 border-none focus:bg-white focus:ring-2 focus:ring-slate-200 transition-all rounded-xl text-sm font-medium placeholder:text-slate-400 ${errors.email ? 'ring-2 ring-red-500/20 shadow-sm' : ''}`}
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setErrors(prev => ({ ...prev, email: undefined }));
                  }}
                  required
                  aria-required="true"
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>
              {errors.email && <p className="text-[9px] font-bold text-red-600 ml-1">{errors.email}</p>}
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between ml-0.5">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-900">
                  Password
                </Label>
                <button
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-[11px] font-semibold text-indigo-700 hover:text-indigo-900"
                  disabled={isLoading}
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative group">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className={`h-11 bg-slate-100/50 border-none focus:bg-white focus:ring-2 focus:ring-slate-200 transition-all rounded-xl pr-14 text-sm font-medium placeholder:text-slate-400 ${errors.password ? 'ring-2 ring-red-500/20 shadow-sm' : ''}`}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors(prev => ({ ...prev, password: undefined }));
                  }}
                  required
                  aria-required="true"
                  disabled={isLoading}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-900 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && <p className="text-[9px] font-bold text-red-600 ml-1">{errors.password}</p>}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-[#2a2d53] hover:bg-[#1e2042] text-white text-sm font-bold rounded-xl shadow-lg transition-all active:scale-[0.98] disabled:opacity-70 flex items-center justify-center gap-2"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-3">
                  <div className="w-3.5 h-3.5 border-[2px] border-white/30 border-t-white rounded-full animate-spin" />
                  <span className="tracking-tight">Authenticating...</span>
                </div>
              ) : (
                <>
                  <span className="tracking-tight">Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>

            <div className="relative flex items-center py-2">
              <div className="flex-grow border-t border-slate-200"></div>
              <span className="flex-shrink mx-4 text-xs font-medium text-slate-400">Or continue with</span>
              <div className="flex-grow border-t border-slate-200"></div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { name: 'Google', Icon: GoogleLogo },
                { name: 'GitHub', Icon: Github },
                { name: 'Microsoft', Icon: MicrosoftLogo },
                { name: 'Apple', Icon: Apple }
              ].map((provider) => {
                const Icon = provider.Icon;
                return (
                  <button
                    key={provider.name}
                    type="button"
                    className="flex items-center justify-center gap-2.5 h-10 border border-slate-200 rounded-xl hover:bg-slate-50 transition-all font-semibold text-slate-900 text-xs active:scale-[0.98]"
                  >
                    <Icon className="w-4 h-4" />
                    {provider.name}
                  </button>
                );
              })}
            </div>
          </form>

          <div className="pt-1 text-center">
            <p className="text-slate-500 font-medium text-xs">
              Don't have an account?{' '}
              <button
                type="button"
                className="text-indigo-900 font-bold hover:underline"
                onClick={() => { }}
              >
                Sign up for free
              </button>
            </p>
          </div>
        </div>

        <div className="mt-6 text-center px-4">
          <p className="text-[11px] font-medium text-slate-500">
            By signing in, you agree to our{' '}
            <button className="text-slate-900 font-bold hover:underline">Terms of Service</button>
            {' '}and{' '}
            <button className="text-slate-900 font-bold hover:underline">Privacy Policy</button>
          </p>
        </div>
      </>
    );
  };

  return (
    <div className="h-screen flex w-full bg-[#fdfdff] selection:bg-indigo-100 selection:text-indigo-900 overflow-hidden">
      {/* Left Panel - Reference Image Style Match */}
      <div className="hidden md:flex md:w-[45%] lg:w-[50%] p-8 lg:p-12 flex-col justify-between relative overflow-hidden bg-[#2a2d53]">
        {/* Blurry Bokeh Background Effects */}
        <div className="absolute inset-0 z-0">
          <div className="absolute top-[-10%] left-[-10%] w-1/2 h-1/2 rounded-full bg-blue-500/20 blur-[100px]" />
          <div className="absolute bottom-[-5%] right-[-5%] w-1/2 h-1/2 rounded-full bg-indigo-500/20 blur-[100px]" />
          <div className="absolute top-[20%] right-[10%] w-4 h-4 rounded-full bg-white/20 blur-sm" />
          <div className="absolute bottom-[40%] left-[20%] w-3 h-3 rounded-full bg-white/20 blur-sm" />
          <div className="absolute top-[40%] left-[40%] w-2 h-2 rounded-full bg-white/20 blur-sm" />
          <div className="absolute bottom-[20%] right-[30%] w-5 h-5 rounded-full bg-white/20 blur-sm" />
        </div>

        <div className="relative z-20">
          <div className="flex items-center gap-4 mb-12 group cursor-pointer">
            <div className="w-12 h-12 bg-white/10 backdrop-blur-xl rounded-xl flex items-center justify-center border border-white/20 shadow-xl transition-all group-hover:bg-white/20">
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight">{appName}</h1>
              <p className="text-xs text-white/60 font-medium">{tagline}</p>
            </div>
          </div>

          <div className="space-y-8 max-w-xl">
            <div className="space-y-4">
              <h2 className="text-lg lg:text-2xl font-black text-white leading-tight tracking-tight">
                Streamline the Future of <br />
                Lead Management
              </h2>
              <p className="text-base text-white/70 leading-relaxed font-medium">
                Optimize your conversion funnel with AI-powered insights <br className="hidden lg:block" />
                and enterprise-grade tracking tools.
              </p>
            </div>

            <div className="space-y-2 pt-1">
              {[
                { icon: Brain, title: "Predictive Scoring", desc: "AI-driven lead prioritization for maximum conversion" },
                { icon: Shield, title: "Secure & Privacy", desc: "Enterprise-grade data protection and GDPR compliance" },
                { icon: Zap, title: "Instant Distribution", desc: "Real-time routing with sub-second response times" }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 group cursor-default transition-all hover:bg-white/10">
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center shrink-0 border border-white/10">
                    <item.icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white tracking-tight leading-none mb-1">{item.title}</h3>
                    <p className="text-xs text-white/50 font-medium leading-tight">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="relative z-20 pt-8 border-t border-white/10 flex items-center gap-8">
          {[
            { label: "Conversion Rate", val: "99.8%" },
            { label: "Leads/Year", val: "25M+" },
            { label: "Setup Time", val: "2min" }
          ].map((stat, i) => (
            <div key={i} className={`flex items-start gap-8 ${i !== 0 ? 'border-l border-white/20 pl-8' : ''}`}>
              <div>
                <p className="text-lg font-black text-white tracking-tight leading-none mb-1.5">{stat.val}</p>
                <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest leading-none">{stat.label}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Right Panel - Reference Image Style */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 lg:p-6 relative bg-white">
        {/* Very subtle background texture */}
        <div className="absolute inset-0 opacity-[0.01] pointer-events-none"
          style={{ backgroundImage: `radial-gradient(#000 0.5px, transparent 0.5px)`, backgroundSize: '24px 24px' }} />

        <div className="w-full max-w-[420px] relative z-10 flex flex-col items-center">
          <div className="w-full bg-white rounded-[1.25rem] shadow-[0_20px_50px_rgba(0,0,0,0.08)] border border-slate-100 p-6 lg:p-8 relative overflow-hidden">
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );
}
