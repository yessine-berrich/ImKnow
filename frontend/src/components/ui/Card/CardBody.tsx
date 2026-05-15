// components/CardBody.tsx
import React from 'react';

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
}

const CardBody: React.FC<CardBodyProps> = ({ children, className = '' }) => {
  return (
    <div className={`p-6 ${className}`}>
      {children}
    </div>
  );
};

export default CardBody;