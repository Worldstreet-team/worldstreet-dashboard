"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertCircle, XCircle } from 'lucide-react';

interface DriftErrorModalProps {
  isOpen: boolean;
  onClose: () => void;
  error: {
    title: string;
    message: string;
    details?: {
      orderSize?: string;
      minRequired?: string;
      minValue?: string;
      available?: string;
      required?: string;
    };
  } | null;
}

export const DriftErrorModal: React.FC<DriftErrorModalProps> = ({
  isOpen,
  onClose,
  error,
}) => {
  if (!error) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-full">
              <XCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <DialogTitle className="text-xl font-semibold text-red-600 dark:text-red-400">
              {error.title}
            </DialogTitle>
          </div>
          <DialogDescription className="text-base text-gray-700 dark:text-gray-300 pt-2">
            {error.message}
          </DialogDescription>
        </DialogHeader>

        {error.details && (
          <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-start gap-2 mb-3">
              <AlertCircle className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Order Details
              </p>
            </div>
            <div className="space-y-2 text-sm">
              {error.details.orderSize && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Your Order Size:</span>
                  <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                    {error.details.orderSize}
                  </span>
                </div>
              )}
              {error.details.minRequired && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Minimum Required:</span>
                  <span className="font-mono font-medium text-amber-600 dark:text-amber-400">
                    {error.details.minRequired}
                  </span>
                </div>
              )}
              {error.details.minValue && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Minimum Value:</span>
                  <span className="font-mono font-medium text-amber-600 dark:text-amber-400">
                    {error.details.minValue}
                  </span>
                </div>
              )}
              {error.details.available && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Available:</span>
                  <span className="font-mono font-medium text-gray-900 dark:text-gray-100">
                    {error.details.available}
                  </span>
                </div>
              )}
              {error.details.required && (
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Required:</span>
                  <span className="font-mono font-medium text-red-600 dark:text-red-400">
                    {error.details.required}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <Button
            onClick={onClose}
            className="bg-primary hover:bg-primary/90"
          >
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
