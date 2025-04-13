
import React from 'react';

interface HomeLayoutProps {
  children: React.ReactNode;
}

const HomeLayout: React.FC<HomeLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full bg-white flex flex-col overflow-x-hidden">
      {children}
    </div>
  );
};

export default HomeLayout;
