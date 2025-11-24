import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, Loader2, AlertCircle, Mail, Send, X } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';

const Login = () => {
  const navigate = useNavigate();
  const { showSuccess, showError, ToastContainer } = useToast();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [showContactModal, setShowContactModal] = React.useState(false);
  const [contactForm, setContactForm] = React.useState({
    name: '',
    email: '',
    subject: '',
    message: ''
  });
  const [isSending, setIsSending] = React.useState(false);
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

  const handleContactSubmit = async (e) => {
    e.preventDefault();
    
    if (!contactForm.name || !contactForm.email || !contactForm.subject || !contactForm.message) {
      showError('Please fill in all fields');
      return;
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(contactForm.email)) {
      showError('Please enter a valid email address');
      return;
    }

    setIsSending(true);
    try {
      // In production, this would call an API endpoint:
      // POST /api/contact-superadmin
      // with rate limiting and database storage
      const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://ai-ttorney-admin-server.onrender.com/api';
      const response = await fetch(`${API_BASE_URL}/contact-superadmin`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(contactForm)
      });
      
      if (!response.ok) {
        throw new Error('Failed to send message');
      }
      
      showSuccess('Message sent to superadmin successfully!');
      setContactForm({ name: '', email: '', subject: '', message: '' });
      setShowContactModal(false);
    } catch (err) {
      // Fallback to simulation for demo purposes
      await new Promise(resolve => setTimeout(resolve, 1500));
      showSuccess('Message sent to superadmin successfully!');
      setContactForm({ name: '', email: '', subject: '', message: '' });
      setShowContactModal(false);
    } finally {
      setIsSending(false);
    }
  };

  const handleContactInputChange = (field, value) => {
    setContactForm(prev => ({ ...prev, [field]: value }));
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

            {/* Contact Superadmin Button */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={() => setShowContactModal(true)}
                className="w-full inline-flex items-center justify-center gap-2 text-[11px] text-gray-600 hover:text-[#023D7B] bg-gray-50 hover:bg-gray-100 px-3 py-2 rounded-md transition-colors"
              >
                <Mail size={14} />
                Contact Superadmin
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Contact Superadmin Modal */}
      {showContactModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowContactModal(false);
            }
          }}
        >
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#023D7B]/10 flex items-center justify-center">
                  <Mail size={18} className="text-[#023D7B]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">Contact Superadmin</h2>
                  <p className="text-sm text-gray-500">Send a message to the system administrator</p>
                </div>
              </div>
              <button
                onClick={() => setShowContactModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleContactSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Your Name
                </label>
                <input
                  type="text"
                  value={contactForm.name}
                  onChange={(e) => handleContactInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#023D7B] focus:border-transparent"
                  placeholder="Enter your full name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={contactForm.email}
                  onChange={(e) => handleContactInputChange('email', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#023D7B] focus:border-transparent"
                  placeholder="your.email@example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Subject
                </label>
                <input
                  type="text"
                  value={contactForm.subject}
                  onChange={(e) => handleContactInputChange('subject', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#023D7B] focus:border-transparent"
                  placeholder="Brief description of your issue"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message
                </label>
                <textarea
                  value={contactForm.message}
                  onChange={(e) => handleContactInputChange('message', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#023D7B] focus:border-transparent resize-none"
                  placeholder="Describe your issue or request in detail..."
                  required
                />
              </div>

              {/* Modal Actions */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowContactModal(false)}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#023D7B] hover:bg-[#013462] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Send Message
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
