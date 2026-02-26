"use client";

import React from 'react';
import { useDrift } from '@/app/context/driftContext';
import { Icon } from '@iconify/react';

interface DriftAccountGuardProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Guard component that only renders children when Drift account is initialized and ready to trade.
 * Shows appropriate messages for different account states.
 */
export const DriftAccountGuard: React.FC<DriftAccountGuardProps> = ({ 
  children, 
  fallback 
}) => {
  const { 
    isInitialized, 
    canTrade, 
    needsInitialization, 
    isLoading,
    error 
  } = useDrift();

  if (isLoading) {
    return fallback || (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Icon icon="svg-spinners:ring-resize" className="mx-auto mb-3 text-primary" height={32} />
          <p className="text-sm text-muted dark:text-darklink">Loading account...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return fallback || (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Icon icon="ph:warning-circle-duotone" className="mx-auto mb-3 text-error" height={32} />
          <p className="text-sm text-error">{error}</p>
        </div>
      </div>
    );
  }

  if (needsInitialization) {
    return fallback || (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Icon icon="ph:info-duotone" className="mx-auto mb-3 text-warning" height={32} />
          <p className="text-sm text-warning">Please initialize your Drift account to continue</p>
        </div>
      </div>
    );
  }

  if (!isInitialized) {
    return fallback || (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Icon icon="ph:clock-duotone" className="mx-auto mb-3 text-info" height={32} />
          <p className="text-sm text-info">Account is being initialized...</p>
        </div>
      </div>
    );
  }

  if (!canTrade) {
    return fallback || (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Icon icon="ph:warning-duotone" className="mx-auto mb-3 text-warning" height={32} />
          <p className="text-sm text-warning">Trading is currently disabled</p>
          <p className="text-xs text-muted dark:text-darklink mt-1">
            Please add collateral or close positions to continue
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
