import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Lock, AlertCircle, Loader2, Mail } from 'lucide-react';
import { useToast } from '../../components/ui/Toast';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const VerifyOTP = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError, ToastContainer } = useToast();

  // Get email and adminId from navigation state
  const { email, adminId } = location.state || {};

  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(120); // 2 minutes
  const [canResend, setCanResend] = useState(false);
  const [error, setError] = useState('');
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutTimer, setLockoutTimer] = useState(0);

  const inputRefs = useRef([]);

  // Redirect if no email or adminId
  useEffect(() => {
    if (!email || !adminId) {
      navigate('/login');
    }
  }, [email, adminId, navigate]);

  // Timer for resend OTP
  useEffect(() => {
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
  }, [resendTimer, canResend]);

  // Timer for lockout countdown
  useEffect(() => {
    let interval;
    if (lockoutTimer > 0) {
      interval = setInterval(() => {
        setLockoutTimer((prev) => {
          if (prev <= 1) {
            setIsLockedOut(false);
            setError('');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [lockoutTimer]);

  // Focus first input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  const handleOtpChange = (index, value) => {
    // Only allow digits
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerifyOTP = async () => {
    const otpString = otp.join('');

    if (otpString.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          otpCode: otpString,
          adminId
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Store token
        localStorage.setItem('admin_token', data.token);

        showSuccess('Login successful! Redirecting to dashboard...');
        
        // Clear form
        setOtp(['', '', '', '', '', '']);
        setError('');
        setAttemptsRemaining(null);
        setIsLockedOut(false);

        // Redirect to dashboard
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      } else {
        setError(data.error || 'Invalid verification code');

        // Handle lockout
        if (data.lockedOut) {
          setIsLockedOut(true);
          setLockoutTimer(data.retryAfter || 900);
          setOtp(['', '', '', '', '', '']);
        }

        // Handle OTP expiration
        if (data.error?.includes('expired') || data.error?.includes('not found')) {
          setCanResend(true);
          setResendTimer(0);
          setOtp(['', '', '', '', '', '']);
        }

        // Handle attempts remaining
        if (data.attemptsRemaining !== undefined) {
          setAttemptsRemaining(data.attemptsRemaining);
        }
      }
    } catch (error) {
      console.error('Verify OTP error:', error);
      setError('Verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!canResend || isLockedOut) return;

    try {
      const response = await fetch(`${API_BASE_URL}/auth/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          adminId
        })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setCanResend(false);
        setResendTimer(120);
        setOtp(['', '', '', '', '', '']);
        setError('');
        setAttemptsRemaining(null);
        setIsLockedOut(false);
        setLockoutTimer(0);

        showSuccess('A new verification code has been sent to your email');
        inputRefs.current[0]?.focus();
      } else {
        showError(data.error || 'Failed to resend code. Please try again.');
      }
    } catch (error) {
      console.error('Resend OTP error:', error);
      showError('Failed to resend code. Please try again.');
    }
  };

  const isOtpComplete = otp.every((digit) => digit !== '');

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <ToastContainer />
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-gray-900 mb-3">2-Factor Authentication</h1>
            <p className="text-sm text-gray-600">
              Enter the OTP sent to <span className="font-semibold text-gray-900">{email}</span> to verify your identity.
            </p>
          </div>

          {/* OTP Input */}
          <div className="mb-6">
            <div className="flex justify-center gap-3 mb-4">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (inputRefs.current[index] = el)}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className={`w-12 h-14 text-center text-xl font-bold rounded-lg border-2 focus:outline-none focus:ring-2 focus:ring-[#023D7B]/50 transition-all ${
                    error
                      ? 'border-red-500 bg-red-50'
                      : digit
                      ? 'border-[#023D7B] bg-[#023D7B]/10'
                      : 'border-gray-300 bg-white hover:border-gray-400'
                  }`}
                  disabled={isLoading || isLockedOut}
                />
              ))}
            </div>

            {/* Error Message */}
            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-md mb-3">
                <AlertCircle size={16} className="text-red-600 mt-0.5 flex-shrink-0" />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            {/* Attempts Remaining */}
            {attemptsRemaining !== null && attemptsRemaining > 0 && !isLockedOut && (
              <p className="text-xs text-orange-600 text-center mb-2">
                {attemptsRemaining} attempt(s) remaining
              </p>
            )}

            {/* Lockout Timer */}
            {isLockedOut && lockoutTimer > 0 && (
              <p className="text-xs font-semibold text-red-600 text-center mb-2">
                Account temporarily locked. Try again in {formatTime(lockoutTimer)}
              </p>
            )}

            {/* OTP Expiration Timer */}
            {!isLockedOut && (
              <p className="text-xs text-gray-500 text-center">
                OTP expires in: <span className="font-semibold text-gray-700">{formatTime(resendTimer)}</span>
              </p>
            )}
          </div>

          {/* Verify Button */}
          <button
            onClick={handleVerifyOTP}
            disabled={isLoading || !isOtpComplete || isLockedOut}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#023D7B] text-white text-base font-semibold px-4 py-3.5 rounded-lg hover:bg-[#013462] disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg mb-4"
          >
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Verifying...
              </>
            ) : (
              'Verify'
            )}
          </button>

          {/* Resend Code */}
          <div className="text-center mb-4">
            <p className="text-sm text-gray-600">
              Didn't receive the code?{' '}
              <button
                onClick={handleResendOTP}
                disabled={!canResend || isLockedOut}
                className={`font-semibold ${
                  canResend && !isLockedOut
                    ? 'text-[#023D7B] hover:text-[#013462] hover:underline cursor-pointer'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                {isLockedOut
                  ? 'Resend unavailable'
                  : canResend
                  ? 'Resend Code'
                  : `Resend (${formatTime(resendTimer)})`}
              </button>
            </p>
          </div>

          {/* Back to Login */}
          <div className="text-center">
            <button
              onClick={() => navigate('/login')}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
            >
              ← Back to Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VerifyOTP;
