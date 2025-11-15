import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Home, ArrowLeft, Search } from 'lucide-react';
import notfound from "./404.png"

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full text-center">
        {/* 404 Image */}
        <div className="mb-6 sm:mb-8 lg:mb-10">
          <img
            src={notfound}
            alt="404 Not Found"
            className="mx-auto w-full max-w-xs sm:max-w-sm md:max-w-md lg:max-w-lg h-auto object-contain"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center px-4 sm:px-0">
          <button
            onClick={() => navigate(-1)}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 border border-gray-300 rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors duration-200 font-medium text-sm sm:text-base shadow-sm hover:shadow-md"
          >
            <ArrowLeft className="w-4 h-4 sm:w-4 sm:h-4 mr-2" />
            Go Back
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="w-full sm:w-auto inline-flex items-center justify-center px-4 sm:px-6 py-2.5 sm:py-3 bg-blue-900 text-white rounded-lg hover:bg-blue-700 transition-colors duration-200 font-medium text-sm sm:text-base shadow-sm hover:shadow-md"
          >
            <Home className="w-4 h-4 sm:w-4 sm:h-4 mr-2" />
            Dashboard
          </button>
        </div>

        {/* Search Suggestion */}
        <div className="mt-8 sm:mt-12 lg:mt-16 p-4 sm:p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
          <div className="flex items-center justify-center mb-3 sm:mb-4">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400 mr-2" />
            <span className="text-xs sm:text-sm text-gray-600">Looking for something specific?</span>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 justify-center px-2 sm:px-0">
            <button
              onClick={() => navigate('/users/legal-seekers')}
              className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors hover:shadow-sm"
            >
              Legal Seekers
            </button>
            <button
              onClick={() => navigate('/users/lawyers')}
              className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors hover:shadow-sm"
            >
              Lawyers
            </button>
            <button
              onClick={() => navigate('/users/lawyer-applications')}
              className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors hover:shadow-sm"
            >
              Applications
            </button>
            <button
              onClick={() => navigate('/forum/topics-threads')}
              className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors hover:shadow-sm"
            >
              Forum
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="px-2.5 sm:px-3 py-1.5 text-xs sm:text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors hover:shadow-sm"
            >
              Settings
            </button>
          </div>
        </div>

        {/* Contact Support */}
        <div className="mt-6 sm:mt-8 text-xs sm:text-sm text-gray-500 px-4 sm:px-0">
          <p className="leading-relaxed">
            If you believe this is an error, please contact{' '}
            <a 
              href="mailto:aittorney.otp@gmail.com" 
              className="text-blue-600 hover:text-blue-700 underline hover:no-underline transition-all"
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
