// components/Card.tsx
import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800 ${className}`}>
      {children}
    </div>
  );
};

export default Card;