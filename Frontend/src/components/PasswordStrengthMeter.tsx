import React from 'react';
import { calculatePasswordStrength } from '../utils/passwordStrength';

interface PasswordStrengthMeterProps {
  password: string;
}

export const PasswordStrengthMeter: React.FC<PasswordStrengthMeterProps> = ({ password }) => {
  if (!password) return null;

  const strength = calculatePasswordStrength(password);
  const percentage = (strength.score / 6) * 100;

  return (
    <div className="mt-2">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex-1 bg-gray-200 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${strength.color}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <span className={`text-xs font-medium ${strength.color.replace('bg-', 'text-')}`}>
          {strength.label}
        </span>
      </div>
      {strength.feedback.length > 0 && (
        <p className="text-xs text-gray-500 mt-1">
          Manque: {strength.feedback.join(', ')}
        </p>
      )}
    </div>
  );
};

