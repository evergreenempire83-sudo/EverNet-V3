import React from 'react';

export const TableSkeleton = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="animate-pulse space-y-4">
      {/* Header skeleton */}
      <div className="h-10 bg-gray-200 rounded-lg"></div>
      
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex space-x-4">
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              key={colIndex}
              className={`h-12 bg-gray-200 rounded-lg ${colIndex === columns - 1 ? 'flex-1' : 'w-1/4'}`}
            ></div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const CardSkeleton = () => {
  return (
    <div className="animate-pulse bg-white rounded-xl shadow-lg p-6 border border-gray-200">
      <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/3"></div>
    </div>
  );
};

export const StatsCardSkeleton = () => {
  return (
    <div className="animate-pulse bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl p-6">
      <div className="h-4 bg-gray-300 rounded w-1/2 mb-2"></div>
      <div className="h-8 bg-gray-300 rounded w-3/4 mb-3"></div>
      <div className="h-3 bg-gray-300 rounded w-1/3"></div>
    </div>
  );
};

export const ChartSkeleton = () => {
  return (
    <div className="animate-pulse bg-white rounded-xl shadow-lg p-6">
      <div className="h-6 bg-gray-200 rounded w-1/4 mb-6"></div>
      <div className="h-64 bg-gray-200 rounded"></div>
    </div>
  );
};
