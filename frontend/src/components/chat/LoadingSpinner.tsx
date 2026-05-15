import React from 'react';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  color?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'md', 
  className = '',
  color = 'border-primary' // Utilise ta couleur principale Tailwind
}) => {
  // Définition des tailles
  const sizeClasses = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-12 w-12 border-3',
    xl: 'h-16 w-16 border-4',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div
        className={`
          animate-spin 
          rounded-full 
          border-solid 
          border-t-transparent 
          ${sizeClasses[size]} 
          ${color}
        `}
        role="status"
      >
        <span className="sr-only">Chargement...</span>
      </div>
    </div>
  );
};

export default LoadingSpinner;