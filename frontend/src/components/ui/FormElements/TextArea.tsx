// components/FormElements/TextArea.tsx
import React from 'react';

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  className?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  className = '',
  id,
  rows = 4,
  ...props
}) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="space-y-2">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        rows={rows}
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