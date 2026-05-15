// components/CardHeader.tsx
import React from 'react';

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

const CardHeader: React.FC<CardHeaderProps> = ({ children, className = '' }) => {
  return (
    <div className={`border-b border-gray-200 px-6 py-4 dark:border-gray-700 ${className}`}>
      {children}
    </div>
  );
};

export default CardHeader;