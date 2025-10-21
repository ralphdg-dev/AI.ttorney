import React from 'react';
import ReportedPosts from '../../components/forum/ReportedPosts';

const ReportedPostsPage = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <ReportedPosts />
      </div>
    </div>
  );
};

export default ReportedPostsPage;
