// components/FormElements/Switch.tsx
import React from 'react';

interface SwitchProps {
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
  className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
  checked = false,
  onChange,
  label,
  disabled = false,
  className = '',
}) => {
  const handleToggle = () => {
    if (!disabled && onChange) {
      onChange(!checked);
    }
  };

  return (
    <div className={`flex items-center ${className}`}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={handleToggle}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full transition-colors
          focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
          ${checked ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span
          className={`
            inline-block h-5 w-5 transform rounded-full bg-white transition-transform
            ${checked ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
      </button>
      {label && (
        <span className="ml-3 text-sm text-gray-700 dark:text-gray-300">
          {label}
        </span>
      )}
    </div>
  );
};