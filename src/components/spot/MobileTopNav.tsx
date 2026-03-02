'use client';

import { Icon } from '@iconify/react';

export default function MobileTopNav() {
  return (
    <div className="flex justify-between items-center px-4 py-3 border-b border-border dark:border-darkborder bg-white dark:bg-darkgray">
      {/* Left side - Navigation tabs */}
      <div className="flex gap-4 items-center">
        <button className="text-sm text-muted hover:text-dark dark:hover:text-white transition-colors">
          Convert
        </button>
        <button className="text-sm font-bold text-dark dark:text-white">
          Spot
        </button>
        <button className="text-sm text-muted hover:text-dark dark:hover:text-white transition-colors">
          Alpha
        </button>
      </div>

      {/* Right side - Menu icon */}
      <button className="p-1 hover:bg-muted/20 dark:hover:bg-white/5 rounded transition-colors">
        <Icon icon="ph:list" width={20} className="text-dark dark:text-white" />
      </button>
    </div>
  );
}
