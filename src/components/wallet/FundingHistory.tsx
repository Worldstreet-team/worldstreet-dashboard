'use client';

import { useState, useEffect, useCallback } from 'react';
import { Icon } from '@iconify/react';

interface DepositRecord {
  _id: string;
  depositAmount: number;
  depositChain: 'ethereum' | 'solana';
  depositToken: string;
  status: string;
  spotAmount?: number;
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

const STATUS_BADGE: Record<string, { label: string; classes: string }> = {
  completed:   { label: 'Completed', classes: 'bg-[#0ecb81]/10 text-[#0ecb81]' },
  failed:      { label: 'Failed',    classes: 'bg-[#f6465d]/10 text-[#f6465d]' },
  expired:     { label: 'Expired',   classes: 'bg-[#f6465d]/10 text-[#f6465d]' },
};

// Everything else is "in progress"
function getBadge(status: string) {
  return STATUS_BADGE[status] || { label: 'In Progress', classes: 'bg-[#f0b90b]/10 text-[#f0b90b]' };
}

interface FundingHistoryProps {
  refreshKey?: number;
}

export default function FundingHistory({ refreshKey = 0 }: FundingHistoryProps) {
  const [deposits, setDeposits] = useState<DepositRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/spot/deposit/history');
      const data = await res.json();
      if (data.success) {
        setDeposits(data.data || []);
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory, refreshKey]);

  if (loading) {
    return (
      <div className="bg-[#1e2329] rounded-2xl border border-[#2b3139] p-5">
        <div className="flex items-center gap-2 animate-pulse">
          <div className="w-4 h-4 rounded bg-[#2b3139]" />
          <div className="h-3 w-24 rounded bg-[#2b3139]" />
        </div>
      </div>
    );
  }

  if (deposits.length === 0) return null;

  return (
    <div className="bg-[#1e2329] rounded-2xl border border-[#2b3139] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#2b3139]">
        <div className="flex items-center gap-2">
          <Icon icon="ph:clock-counter-clockwise" width={14} className="text-[#848e9c]" />
          <span className="text-xs font-medium text-[#848e9c]">Recent Transfers</span>
        </div>
        <button
          onClick={fetchHistory}
          className="p-1 rounded hover:bg-[#2b3139] transition-colors"
        >
          <Icon icon="ph:arrow-clockwise" width={12} className="text-[#848e9c]" />
        </button>
      </div>

      {/* List */}
      <div className="divide-y divide-[#2b3139]">
        {deposits.map((d) => {
          const badge = getBadge(d.status);
          const date = new Date(d.createdAt);
          return (
            <div key={d._id} className="flex items-center justify-between px-5 py-3">
              <div className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full bg-[#0b0e11] flex items-center justify-center">
                  <Icon
                    icon={d.depositChain === 'ethereum' ? 'cryptocurrency:eth' : 'cryptocurrency:sol'}
                    width={14}
                  />
                </div>
                <div>
                  <p className="text-xs text-white font-medium">
                    {d.depositAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {d.depositToken}
                  </p>
                  <p className="text-[10px] text-[#4a5056]">
                    {date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                    {' · '}
                    {date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${badge.classes}`}>
                {badge.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
