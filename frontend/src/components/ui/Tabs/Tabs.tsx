// components/Tabs.tsx
'use client';

import React, { useState } from 'react';

export interface TabItem {
  id: string;
  label: string;
  icon?: React.ElementType;
  content: React.ReactNode;
}

interface TabsProps {
  tabs: TabItem[];
  defaultTab?: string;
  className?: string;
}

const Tabs: React.FC<TabsProps> = ({ tabs, defaultTab, className = '' }) => {
  const [activeTab, setActiveTab] = useState(defaultTab || tabs[0]?.id);

  return (
    <div className={className}>
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="flex -mb-px space-x-6" aria-label="Tabs">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`
                  group inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm
                  ${isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                  }
                `}
              >
                {Icon && (
                  <Icon className={`
                    -ml-0.5 mr-2 h-5 w-5
                    ${isActive ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-500'}
                  `} />
                )}
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
      <div className="mt-6">
        {tabs.find(tab => tab.id === activeTab)?.content}
      </div>
    </div>
  );
};

export default Tabs;