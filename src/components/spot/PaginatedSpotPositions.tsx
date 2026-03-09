"use client";

import React, { useState, useMemo } from 'react';
import { Icon } from '@iconify/react';
import { useDrift } from '@/app/context/driftContext';

interface PaginatedSpotPositionsProps {
  itemsPerPage?: number;
  showUSDC?: boolean; // Whether to show USDC collateral
  compact?: boolean; // Compact mode for smaller displays
}

export function PaginatedSpotPositions({
  itemsPerPage = 10,
  showUSDC = true,
  compact = false
}: PaginatedSpotPositionsProps) {
  const { spotPositions, summary, getMarketPrice } = useDrift();
  const [currentPage, setCurrentPage] = useState(1);

  // Prepare all positions including USDC
  const allPositions = useMemo(() => {
    const positions = [];

    // Add USDC collateral if enabled
    if (showUSDC && summary?.freeCollateral) {
      positions.push({
        marketIndex: 0,
        marketName: 'USDC',
        amount: summary.freeCollateral,
        balanceType: 'deposit' as const,
        price: 1.00,
        value: summary.freeCollateral,
        isCollateral: true,
      });
    }

    // Add all other spot positions (including zero balances)
    spotPositions.forEach(pos => {
      if (pos.marketIndex === 0) return; // Skip USDC (already added above)
      
      positions.push({
        ...pos,
        isCollateral: false,
      });
    });

    return positions;
  }, [spotPositions, summary, showUSDC]);

  // Pagination logic
  const totalPages = Math.ceil(allPositions.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPositions = allPositions.slice(startIndex, endIndex);

  // Format helpers
  const formatNumber = (num: number, decimals: number = 2) => {
    return num.toLocaleString('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
  };

  const formatUSD = (num: number) => {
    return `$${formatNumber(num, 2)}`;
  };

  // Handle page change
  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  if (allPositions.length === 0) {
    return (
      <div className="p-12 text-center">
        <Icon icon="ph:coins-duotone" className="mx-auto mb-4 text-[#848e9c]" height={48} />
        <p className="text-[#848e9c] text-sm">No spot positions</p>
        <p className="text-[#848e9c] text-xs mt-1">
          Trade spot to build your portfolio
        </p>
      </div>
    );
  }

  if (compact) {
    // Compact mode for mobile/small displays
    return (
      <div className="space-y-2">
        {currentPositions.map((position, index) => (
          <div
            key={`${position.marketIndex}-${index}`}
            className="bg-[#1e2329] rounded-lg p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-white">
                  {position.marketName}
                </span>
                {position.isCollateral && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-[#fcd535]/10 text-[#fcd535]">
                    Collateral
                  </span>
                )}
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full ${
                  position.balanceType === 'deposit'
                    ? 'bg-[#0ecb81]/10 text-[#0ecb81]'
                    : 'bg-[#f6465d]/10 text-[#f6465d]'
                }`}
              >
                {position.balanceType === 'deposit' ? 'Deposit' : 'Borrow'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div>
                <p className="text-[#848e9c]">Balance</p>
                <p className="text-white font-medium">{formatNumber(position.amount, 4)}</p>
              </div>
              <div>
                <p className="text-[#848e9c]">Price</p>
                <p className="text-white font-medium">{formatUSD(position.price)}</p>
              </div>
              <div>
                <p className="text-[#848e9c]">Value</p>
                <p className="text-white font-medium">{formatUSD(position.value)}</p>
              </div>
            </div>
          </div>
        ))}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-3 border-t border-[#2b3139]">
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded bg-[#2b3139] text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3b4149] transition-colors"
            >
              Previous
            </button>
            <span className="text-xs text-[#848e9c]">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded bg-[#2b3139] text-white text-xs disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3b4149] transition-colors"
            >
              Next
            </button>
          </div>
        )}
      </div>
    );
  }

  // Full table mode
  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-[#1e2329]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[#848e9c] uppercase tracking-wider">
                Token
              </th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-[#848e9c] uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-[#848e9c] uppercase tracking-wider">
                Balance
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-[#848e9c] uppercase tracking-wider">
                Price
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-[#848e9c] uppercase tracking-wider">
                USD Value
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1e2329]">
            {currentPositions.map((position, index) => (
              <tr key={`${position.marketIndex}-${index}`} className="hover:bg-[#1e2329] transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">
                      {position.marketName}
                    </span>
                    {position.isCollateral && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-[#fcd535]/10 text-[#fcd535]">
                        Collateral
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      position.balanceType === 'deposit'
                        ? 'bg-[#0ecb81]/10 text-[#0ecb81]'
                        : 'bg-[#f6465d]/10 text-[#f6465d]'
                    }`}
                  >
                    {position.balanceType === 'deposit' ? 'Deposit' : 'Borrow'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
                  {formatNumber(position.amount, 4)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
                  {formatUSD(position.price)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-white">
                  {formatUSD(position.value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-[#1e2329]">
          <div className="flex items-center gap-2">
            <span className="text-sm text-[#848e9c]">
              Showing {startIndex + 1} to {Math.min(endIndex, allPositions.length)} of {allPositions.length} positions
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => goToPage(1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded bg-[#2b3139] text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3b4149] transition-colors"
            >
              <Icon icon="ph:caret-double-left" height={16} />
            </button>
            <button
              onClick={() => goToPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="px-3 py-1.5 rounded bg-[#2b3139] text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3b4149] transition-colors"
            >
              <Icon icon="ph:caret-left" height={16} />
            </button>
            <span className="px-4 py-1.5 text-sm text-white">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => goToPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded bg-[#2b3139] text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3b4149] transition-colors"
            >
              <Icon icon="ph:caret-right" height={16} />
            </button>
            <button
              onClick={() => goToPage(totalPages)}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 rounded bg-[#2b3139] text-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#3b4149] transition-colors"
            >
              <Icon icon="ph:caret-double-right" height={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
