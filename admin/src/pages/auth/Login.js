import React from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

const Login = () => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const navigate = useNavigate();
  const { loginWithCredentials, isAuthenticated } = useAuth();
  const toast = useToast();

  // If already logged in, redirect away from login
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    try {
      console.log('Login attempt', { email, password });
      const { user } = await loginWithCredentials(email, password);
      toast.success('Login successful');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-0px)] grid place-items-center bg-gray-50">
      <div className="w-full max-w-sm">
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="inline-flex items-center justify-center rounded-md bg-[#023D7B]/10 text-[#023D7B] w-8 h-8"><Lock size={16} /></div>
            <div>
              <h1 className="text-sm font-semibold text-gray-900">Sign in</h1>
              <p className="text-[11px] text-gray-500">Access your admin dashboard</p>
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block text-[11px] text-gray-700 mb-1" htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-[12px] text-gray-900 placeholder:text-gray-400 placeholder:text-xs focus:outline-none focus:ring-1 focus:ring-gray-300"
                placeholder="Enter your email address"
                required
                autoComplete="email"
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
                  className="w-full rounded-md border border-gray-200 px-3 py-2 pr-10 text-[12px] text-gray-900 placeholder:text-gray-400 placeholder:text-xs focus:outline-none focus:ring-1 focus:ring-gray-300"
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-end">
              <a href="#" className="text-[11px] text-[#023D7B] hover:underline">Forgot password?</a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#023D7B] disabled:opacity-60 disabled:cursor-not-allowed text-white text-[12px] px-3 py-2 rounded-md hover:bg-[#013462]"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
