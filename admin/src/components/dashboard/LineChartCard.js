import React from 'react';

const LineChartCard = () => (
  <div className="rounded-lg border border-gray-200 bg-white p-4">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center space-x-3">
        <h4 className="text-[11px] text-gray-600 font-semibold">Lawyer Applications</h4>
        <div className="hidden sm:flex items-center space-x-4 text-[11px] text-gray-500">
          <div className="flex items-center space-x-1">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-500" />
            <span>Approved</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="inline-block w-2 h-2 rounded-full bg-amber-500" />
            <span>Pending</span>
          </div>
          <div className="flex items-center space-x-1">
            <span className="inline-block w-2 h-2 rounded-full bg-red-500" />
            <span>Rejected</span>
          </div>
        </div>
      </div>
    </div>
    <div className="h-48" />
  </div>
);

export default LineChartCard;
