
import React from 'react';

interface HomeLayoutProps {
  children: React.ReactNode;
}

const HomeLayout: React.FC<HomeLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-white flex flex-col w-full overflow-x-hidden">
      <main className="flex-grow">
        {children}
      </main>
    </div>
  );
};

export default HomeLayout;
