
import React from 'react';

interface PageHeaderProps {
  title: string;
  subtitle: string;
  icon: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon }) => {
  return (
    <div className="flex items-center justify-between">
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          {icon}
          {title}
        </h2>
        <p className="text-muted-foreground">
          {subtitle}
        </p>
      </div>
    </div>
  );
};

export default PageHeader;
