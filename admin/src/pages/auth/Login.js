import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';

const Login = () => {
  const navigate = useNavigate();
  const { showSuccess, showError, ToastContainer } = useToast();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const { login, loading, error, clearError, isAuthenticated } = useAuth();

  // Redirect if already authenticated
  React.useEffect(() => {
    if (isAuthenticated) {
      window.location.href = '/';
    }
  }, [isAuthenticated]);

  // Clear error when user starts typing
  React.useEffect(() => {
    if (error) {
      clearError();
    }
  }, [email, password, error, clearError]);

  const onSubmit = async (e) => {
    e.preventDefault();
    
    if (!email || !password) {
      showError('Please enter both email and password');
      return;
    }

    const result = await login(email, password);
    if (result.success) {
      // Check if 2FA is required
      if (result.requires2FA) {
        showSuccess('Verification code sent to your email!');
        // Navigate to OTP verification page
        setTimeout(() => {
          navigate('/verify-otp', {
            state: {
              email: result.email,
              adminId: result.adminId
            }
          });
        }, 500);
      } else {
        // Direct login (legacy flow)
        showSuccess('Login successful! Redirecting to dashboard...');
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      }
    } else {
      showError(result.error || 'Login failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-[calc(100vh-0px)] grid place-items-center bg-gray-50">
      <ToastContainer />
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="inline-flex items-center justify-center rounded-md bg-[#023D7B]/10 text-[#023D7B] w-8 h-8"><Lock size={16} /></div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">Sign in</h1>
              <p className="text-[11px] text-gray-500">Access your admin dashboard</p>
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-center gap-2">
                <AlertCircle size={16} className="text-red-600" />
                <p className="text-[11px] text-red-700">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] text-gray-700 mb-1" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-[12px] text-gray-900 placeholder:text-gray-400 placeholder:text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed"
                placeholder="Enter your email address"
                required
                autoComplete="email"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-[11px] text-gray-700 mb-1" htmlFor="password">Password</label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-md border border-gray-200 px-3 py-2 pr-10 text-[12px] text-gray-900 placeholder:text-gray-400 placeholder:text-xs focus:outline-none focus:ring-1 focus:ring-gray-300 disabled:bg-gray-50 disabled:cursor-not-allowed"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 disabled:cursor-not-allowed"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  disabled={loading}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-[11px] text-[#023D7B] hover:underline bg-transparent border-none cursor-pointer"
              >
                Forgot password?
              </button>
            </div>

            <button
              type="submit"
              disabled={loading || !email || !password}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#023D7B] text-white text-[12px] px-3 py-2 rounded-md hover:bg-[#013462] disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
