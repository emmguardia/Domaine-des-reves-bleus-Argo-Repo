import React from 'react';
import { FaExclamationTriangle } from 'react-icons/fa';
interface ErrorDisplayProps {
  error: string;
  onRetry?: () => void;
}
export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ error, onRetry }) => {
  return (
    <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-start gap-3">
      <FaExclamationTriangle className="text-red-600 mt-0.5 flex-shrink-0" />
      <div className="flex-1">
        <p className="font-medium">{error}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-sm underline hover:no-underline"
          >
            Réessayer
          </button>
        )}
      </div>
    </div>
  );
};
