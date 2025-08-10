import React from 'react';
import { cn } from '@/lib/utils';

interface CO2BadgeProps {
  co2Kg: number;
  size?: 'small' | 'medium' | 'large';
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  hasRealData?: boolean;
  showEquivalents?: boolean;
  carKilometers?: number;
  className?: string;
}

const CO2Badge: React.FC<CO2BadgeProps> = ({
  co2Kg,
  size = 'medium',
  position = 'top-right',
  hasRealData = false,
  showEquivalents = false,
  carKilometers,
  className
}) => {
  if (co2Kg <= 0) return null;

  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    medium: 'text-xs px-3 py-1.5',
    large: 'text-sm px-4 py-2'
  };

  const positionClasses = {
    'top-right': 'top-2 right-2',
    'top-left': 'top-2 left-2',
    'bottom-right': 'bottom-2 right-2',
    'bottom-left': 'bottom-2 left-2'
  };

  const iconSize = {
    small: 'text-xs',
    medium: 'text-sm',
    large: 'text-base'
  };

  return (
    <div className={cn(
      'absolute z-10',
      positionClasses[position],
      className
    )}>
      <div className={cn(
        'bg-gradient-to-r from-[#33638e] to-[#4ab6c4] text-white rounded-full flex items-center shadow-sm',
        sizeClasses[size]
      )}>
        <span className={cn('mr-1.5', iconSize[size])}>🍃</span>
        <span className="font-medium">-{co2Kg} kg CO2</span>
        {hasRealData && (
          <span className="ml-1 opacity-75" title="Données réelles">*</span>
        )}
      </div>
      
      {showEquivalents && carKilometers && (
        <div className={cn(
          'bg-white/95 text-[#33638e] rounded-full flex items-center shadow-sm mt-1',
          sizeClasses[size]
        )}>
          <span className={cn('mr-1', iconSize[size])}>🚗</span>
          <span className="font-medium">{carKilometers} km</span>
        </div>
      )}
    </div>
  );
};

export default CO2Badge;