import React from 'react';

const PlaceholderPage = ({ title, description = 'Content coming soon.' }) => (
  <div>
    <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6">
        <p className="text-gray-600">{description}</p>
      </div>
    </div>
  </div>
);

export default PlaceholderPage;
