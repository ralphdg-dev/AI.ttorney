import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-2xl w-full text-center">
        {/* 404 Image */}
        <div className="mb-8">
          <img
            src="/404.png"
            alt="404 Not Found"
            className="mx-auto max-w-md w-full h-auto"
          />
        </div>

        {/* Error Message */}
        <h1 className="text-6xl font-bold text-gray-900 mb-4">404</h1>
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">
          Oops! Page Not Found
        </h2>
        <p className="text-gray-600 mb-8 max-w-md mx-auto">
          The page you're looking for doesn't exist or has been moved. 
          Don't worry, let's get you back on track.
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center px-6 py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200 font-medium"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium"
          >
            <Home className="w-4 h-4 mr-2" />
            Dashboard
          </button>
        </div>

        {/* Search Suggestion */}
        <div className="mt-12 p-6 bg-white rounded-lg border border-gray-200">
          <div className="flex items-center justify-center mb-3">
            <Search className="w-5 h-5 text-gray-400 mr-2" />
            <span className="text-sm text-gray-600">Looking for something specific?</span>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            <button
              onClick={() => navigate('/users/legal-seekers')}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
            >
              Legal Seekers
            </button>
            <button
              onClick={() => navigate('/users/lawyers')}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
            >
              Lawyers
            </button>
            <button
              onClick={() => navigate('/users/lawyer-applications')}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
            >
              Applications
            </button>
            <button
              onClick={() => navigate('/forum/topics-threads')}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
            >
              Forum
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
            >
              Settings
            </button>
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-8 text-sm text-gray-500">
          <p>
            If you believe this is an error, please contact{' '}
            <a 
              href="mailto:aittorney.otp@gmail.com" 
              className="text-blue-600 hover:text-blue-700 underline"
            >
              support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
