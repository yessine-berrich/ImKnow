// components/FormElements/InputGroup.tsx
import React from 'react';

interface InputGroupProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  className?: string;
}

export const InputGroup: React.FC<InputGroupProps> = ({
  label,
  error,
  className = '',
  id,
  ...props
}) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        className={`
          w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900
          focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary
          dark:border-gray-600 dark:bg-gray-800 dark:text-white
          ${error ? 'border-red-500' : ''}
          ${className}
        `}
        {...props}
      />
      {error && (
        <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
      )}
    </div>
  );
};

export default InputGroup;