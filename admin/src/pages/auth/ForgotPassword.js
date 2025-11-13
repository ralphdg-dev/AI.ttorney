import React, { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ShieldCheck, Lock, Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const ForgotPassword = () => {
  const navigate = useNavigate();
  const { showSuccess, showError, ToastContainer } = useToast();

  const [step, setStep] = React.useState('email'); // 'email' | 'otp' | 'reset'
  const [email, setEmail] = React.useState('');
  const [otp, setOtp] = React.useState(['', '', '', '', '', '']);
  const [token, setToken] = React.useState('');
  const [newPassword, setNewPassword] = React.useState('');
  const [confirmPassword, setConfirmPassword] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [resendTimer, setResendTimer] = React.useState(120);
  const [canResend, setCanResend] = React.useState(false);

  const goBackToLogin = () => navigate('/login');

  const inputRefs = useRef([]);

  // Focus first OTP box when entering OTP step
  useEffect(() => {
    if (step === 'otp' && inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, [step]);

  // Countdown for OTP expiry / resend availability
  useEffect(() => {
    if (step !== 'otp') return;
    let interval;
    if (resendTimer > 0 && !canResend) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [step, resendTimer, canResend]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    // Auto-focus next on input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleResendResetCode = async () => {
    if (!canResend || loading) return;
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      await res.json();
      showSuccess('A new reset code has been sent to your email.');
      setCanResend(false);
      setResendTimer(120);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } catch (err) {
      showError('Failed to resend code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleSendEmail = async (e) => {
    e.preventDefault();
    if (!email) {
      showError('Please enter your email');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      await res.json(); // always returns success generic
      showSuccess('If the email exists, a reset code has been sent.');
      setStep('otp');
      // reset timer each time we send
      setCanResend(false);
      setResendTimer(120);
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      showError('Failed to send reset code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e) => {
    e.preventDefault();
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      showError('Enter the 6-digit code sent to your email.');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/auth/verify-reset-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otpCode: otpString })
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || 'Invalid code.');
        return;
      }
      setToken(data.passwordResetToken);
      showSuccess('Code verified. You can now set a new password.');
      setStep('reset');
    } catch (err) {
      showError('Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!newPassword || !confirmPassword) {
      showError('Please enter and confirm your new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      showError('Passwords do not match.');
      return;
    }
    const strong = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}/.test(newPassword);
    if (!strong) {
      showError('Password must be at least 8 chars and include upper, lower, and a number.');
      return;
    }
    try {
      setLoading(true);
      const res = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ passwordResetToken: token, newPassword })
      });
      const data = await res.json();
      if (!res.ok) {
        showError(data.error || 'Failed to reset password.');
        return;
      }
      showSuccess('Password reset successful. Redirecting to login...');
      setTimeout(() => navigate('/login'), 1000);
    } catch (err) {
      showError('Failed to reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-0px)] grid place-items-center bg-gray-50">
      <ToastContainer />
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="inline-flex items-center justify-center rounded-md bg-[#023D7B]/10 text-[#023D7B] w-8 h-8">
              {step === 'email' && <Mail size={16} />}
              {step === 'otp' && <ShieldCheck size={16} />}
              {step === 'reset' && <Lock size={16} />}
            </div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">
                {step === 'email' && 'Forgot password'}
                {step === 'otp' && 'Verify code'}
                {step === 'reset' && 'Set new password'}
              </h1>
              <p className="text-[11px] text-gray-500">
                {step === 'email' && 'Enter your admin email to receive a reset code.'}
                {step === 'otp' && `Enter the 6-digit code sent to ${email}.`}
                {step === 'reset' && 'Choose a strong new password.'}
              </p>
            </div>
          </div>

          {step === 'email' && (
            <form onSubmit={handleSendEmail} className="space-y-3">
              <div>
                <label className="block text-[11px] text-gray-700 mb-1" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-[12px] text-gray-900 placeholder:text-gray-400 placeholder:text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="Enter your admin email"
                  required
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !email}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#023D7B] text-white text-[12px] px-3 py-2 rounded-md hover:bg-[#013462] disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (<><Loader2 size={16} className="animate-spin" />Sending...</>) : 'Send reset code'}
              </button>

              <button type="button" onClick={goBackToLogin} className="flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-800 bg-transparent border-none">
                <ArrowLeft size={14} /> Back to sign in
              </button>
            </form>
          )}

          {step === 'otp' && (
            <form onSubmit={handleVerifyOtp} className="space-y-3">
              <div>
                <label className="block text-[11px] text-gray-700 mb-2">Verification code</label>
                <div className="flex justify-center gap-3 mb-1">
                  {otp.map((digit, index) => (
                    <input
                      key={index}
                      ref={(el) => (inputRefs.current[index] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(index, e.target.value)}
                      onKeyDown={(e) => handleKeyDown(index, e)}
                      className={`w-10 h-12 text-center text-base font-semibold rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-[#023D7B]/50 transition-all ${
                        digit ? 'border-[#023D7B] bg-[#023D7B]/10' : 'border-gray-300 bg-white hover:border-gray-400'
                      }`}
                      disabled={loading}
                    />
                  ))}
                </div>
                <p className="text-[11px] text-gray-500 text-center">
                  OTP expires in: <span className="font-semibold text-gray-700">{formatTime(resendTimer)}</span>
                </p>
              </div>

              <button
                type="submit"
                disabled={loading || otp.some((d) => !d)}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#023D7B] text-white text-[12px] px-3 py-2 rounded-md hover:bg-[#013462] disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (<><Loader2 size={16} className="animate-spin" />Verifying...</>) : 'Verify code'}
              </button>

              <div className="text-center mb-1">
                <p className="text-[12px] text-gray-600">
                  Didn't receive the code?{' '}
                  <button
                    type="button"
                    onClick={handleResendResetCode}
                    disabled={!canResend}
                    className={`font-semibold ${
                      canResend ? 'text-[#023D7B] hover:text-[#013462] hover:underline cursor-pointer' : 'text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {canResend ? 'Resend Code' : `Resend (${formatTime(resendTimer)})`}
                  </button>
                </p>
              </div>

              <button type="button" onClick={() => setStep('email')} className="flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-800 bg-transparent border-none">
                <ArrowLeft size={14} /> Use a different email
              </button>
            </form>
          )}

          {step === 'reset' && (
            <form onSubmit={handleResetPassword} className="space-y-3">
              <div>
                <label className="block text-[11px] text-gray-700 mb-1" htmlFor="new-password">New password</label>
                <input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-[12px] text-gray-900 placeholder:text-gray-400 placeholder:text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-[11px] text-gray-700 mb-1" htmlFor="confirm-password">Confirm password</label>
                <input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 text-[12px] text-gray-900 placeholder:text-gray-400 placeholder:text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="••••••••"
                  required
                  disabled={loading}
                />
              </div>

              <button
                type="submit"
                disabled={loading || !newPassword || !confirmPassword}
                className="w-full inline-flex items-center justify-center gap-2 bg-[#023D7B] text-white text-[12px] px-3 py-2 rounded-md hover:bg-[#013462] disabled:bg-gray-400 disabled:cursor-not-allowed"
              >
                {loading ? (<><Loader2 size={16} className="animate-spin" />Saving...</>) : 'Reset password'}
              </button>

              <button type="button" onClick={goBackToLogin} className="flex items-center gap-1 text-[11px] text-gray-600 hover:text-gray-800 bg-transparent border-none">
                <ArrowLeft size={14} /> Back to sign in
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
