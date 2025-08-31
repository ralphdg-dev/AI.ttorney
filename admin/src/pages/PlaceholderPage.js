import React from 'react';

const PlaceholderPage = ({ title, description = 'Content coming soon.' }) => (
  <div>
    <h2 className="text-[12px] font-semibold text-gray-900 mb-3">{title}</h2>
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="p-6">
        <p className="text-[10px] text-gray-600">{description}</p>
      </div>
    </div>
  </div>
);

export default PlaceholderPage;
