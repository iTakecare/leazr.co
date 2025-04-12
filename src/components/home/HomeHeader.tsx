
import React from 'react';
import Logo from '@/components/layout/Logo';

const HomeHeader = () => {
  return (
    <header className="w-full py-4 px-6 flex justify-center">
      <Logo showText={false} />
    </header>
  );
};

export default HomeHeader;
