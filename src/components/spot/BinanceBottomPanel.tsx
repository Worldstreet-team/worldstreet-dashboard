'use client';

import { useState } from 'react';
import { Icon } from '@iconify/react';
import PositionsList from './PositionsList';
import { useOpenOrders } from '@/hooks/useOpenOrders';
import { useUserFills } from '@/hooks/useUserFills';
import { useOrderHistory } from '@/hooks/useOrderHistory';

type TabType = 'open-orders' | 'order-history' | 'trade-history' | 'holdings';

interface BinanceBottomPanelProps {
  refreshKey?: number;
  selectedChartSymbol?: string;
  onPositionTPSLUpdate?: (symbol: string, tp: string | null, sl: string | null) => void;
}

export default function BinanceBottomPanel({
  refreshKey = 0,
  selectedChartSymbol,
  onPositionTPSLUpdate
}: BinanceBottomPanelProps) {
  const [activeTab, setActiveTab] = useState<TabType>('open-orders');
  const { orders, loading, cancellingId, cancelOrder, cancelAll } = useOpenOrders();
  const { fills, loading: fillsLoading } = useUserFills();
  const { orders: historicalOrders, loading: historyLoading } = useOrderHistory();

  const tabs = [
    { id: 'open-orders' as TabType, label: 'Open Orders', count: orders.length },
    { id: 'order-history' as TabType, label: 'Order History', count: historicalOrders.length || undefined },
    { id: 'trade-history' as TabType, label: 'Trade History', count: fills.length || undefined },
    { id: 'holdings' as TabType, label: 'Positions' },
  ];

  return (
    <div className="flex flex-col bg-[#0b0e11] text-white min-h-[25vh] scrollbar-hide">
      {/* Tab Headers */}
      <div className="flex items-center px-4 border-b border-[#1e2329] flex-shrink-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-3 text-xs font-medium transition-colors flex items-center gap-2 border-b-2 ${
              activeTab === tab.id
                ? 'border-[#f0b90b] text-white'
                : 'border-transparent text-[#848e9c] hover:text-white'
            }`}
          >
            <span>{tab.label}</span>
            {tab.count !== undefined && (
              <span className="text-[10px] text-[#848e9c]">({tab.count})</span>
            )}
          </button>
        ))}
        
        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-[#848e9c] cursor-pointer hover:text-white">
            <input 
              type="checkbox" 
              className="w-3 h-3 rounded border-[#2b3139] bg-[#1e2329] checked:bg-[#f0b90b]" 
            />
            <span>Hide Other Pairs</span>
          </label>
          {orders.length > 0 && (
            <button
              onClick={cancelAll}
              className="text-xs text-red-400 hover:text-red-300 transition-colors"
            >
              Cancel All
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="max-h-[20vh] overflow-auto scrollbar-hide">
        {activeTab === 'open-orders' && orders.length === 0 && (
          <div className="p-8 text-center">
            <div className="w-16 h-16 rounded-full bg-[#1e2329] flex items-center justify-center mx-auto mb-4">
              <Icon icon="ph:file-text" className="text-[#848e9c]" width={32} />
            </div>
            <p className="text-sm text-[#848e9c]">
              {loading ? 'Loading orders...' : 'You have no open orders'}
            </p>
          </div>
        )}

        {activeTab === 'open-orders' && orders.length > 0 && (
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[#848e9c] border-b border-[#1e2329]">
                <th className="text-left px-4 py-2 font-medium">Pair</th>
                <th className="text-left px-2 py-2 font-medium">Side</th>
                <th className="text-left px-2 py-2 font-medium">Type</th>
                <th className="text-right px-2 py-2 font-medium">Price</th>
                <th className="text-right px-2 py-2 font-medium">Amount</th>
                <th className="text-right px-2 py-2 font-medium">Filled</th>
                <th className="text-right px-2 py-2 font-medium">Time</th>
                <th className="text-right px-4 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.oid} className="border-b border-[#1e2329]/50 hover:bg-[#1e2329]/30">
                  <td className="px-4 py-2 font-medium text-white">{order.coin}</td>
                  <td className={`px-2 py-2 font-medium ${
                    order.side === 'B' ? 'text-[#0ecb81]' : 'text-[#f6465d]'
                  }`}>
                    {order.side === 'B' ? 'Buy' : 'Sell'}
                  </td>
                  <td className="px-2 py-2 text-[#848e9c]">{order.orderType}</td>
                  <td className="px-2 py-2 text-right text-white">{order.limitPx}</td>
                  <td className="px-2 py-2 text-right text-white">{order.origSz}</td>
                  <td className="px-2 py-2 text-right text-[#848e9c]">
                    {(parseFloat(order.origSz) - parseFloat(order.sz)).toFixed(6)}
                  </td>
                  <td className="px-2 py-2 text-right text-[#848e9c]">
                    {new Date(order.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-2 text-right">
                    <button
                      onClick={() => cancelOrder(order.coin, order.oid)}
                      disabled={cancellingId === order.oid}
                      className="text-red-400 hover:text-red-300 disabled:opacity-50"
                    >
                      {cancellingId === order.oid ? '...' : 'Cancel'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {activeTab === 'order-history' && (
          <div className="bg-[#0b0e11]">
            {historyLoading && historicalOrders.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-[#848e9c]">Loading order history...</p>
              </div>
            ) : historicalOrders.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-[#1e2329] flex items-center justify-center mx-auto mb-4">
                  <Icon icon="ph:file-text" className="text-[#848e9c]" width={32} />
                </div>
                <p className="text-sm text-[#848e9c]">No order history</p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#848e9c] border-b border-[#1e2329]">
                    <th className="text-left px-4 py-2 font-medium">Pair</th>
                    <th className="text-left px-2 py-2 font-medium">Side</th>
                    <th className="text-left px-2 py-2 font-medium">Type</th>
                    <th className="text-right px-2 py-2 font-medium">Price</th>
                    <th className="text-right px-2 py-2 font-medium">Amount</th>
                    <th className="text-center px-2 py-2 font-medium">Status</th>
                    <th className="text-right px-4 py-2 font-medium">Time</th>
                  </tr>
                </thead>
                <tbody>
                  {historicalOrders.map((item: any) => {
                    const o = item.order || item;
                    return (
                      <tr key={o.oid} className="border-b border-[#1e2329]/50 hover:bg-[#1e2329]/30">
                        <td className="px-4 py-2 font-medium text-white">{o.coinDisplay || o.coin}</td>
                        <td className={`px-2 py-2 font-medium ${o.side === 'B' ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                          {o.side === 'B' ? 'Buy' : 'Sell'}
                        </td>
                        <td className="px-2 py-2 text-[#848e9c]">{o.orderType || 'Limit'}</td>
                        <td className="px-2 py-2 text-right text-white">{o.limitPx}</td>
                        <td className="px-2 py-2 text-right text-white">{o.origSz || o.sz}</td>
                        <td className="px-2 py-2 text-center">
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            item.status === 'filled' ? 'bg-[#0ecb81]/10 text-[#0ecb81]'
                              : item.status === 'canceled' || item.status === 'marginCanceled' ? 'bg-[#f6465d]/10 text-[#f6465d]'
                              : item.status === 'rejected' ? 'bg-[#f6465d]/10 text-[#f6465d]'
                              : 'bg-[#f0b90b]/10 text-[#f0b90b]'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-right text-[#848e9c]">
                          {new Date(item.statusTimestamp || o.timestamp).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'trade-history' && (
          <div className="bg-[#0b0e11]">
            {fillsLoading && fills.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-[#848e9c]">Loading trade history...</p>
              </div>
            ) : fills.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-[#1e2329] flex items-center justify-center mx-auto mb-4">
                  <Icon icon="ph:clock-clockwise" className="text-[#848e9c]" width={32} />
                </div>
                <p className="text-sm text-[#848e9c]">No trade history</p>
              </div>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-[#848e9c] border-b border-[#1e2329]">
                    <th className="text-left px-4 py-2 font-medium">Pair</th>
                    <th className="text-left px-2 py-2 font-medium">Side</th>
                    <th className="text-right px-2 py-2 font-medium">Price</th>
                    <th className="text-right px-2 py-2 font-medium">Size</th>
                    <th className="text-right px-2 py-2 font-medium">Fee</th>
                    <th className="text-right px-2 py-2 font-medium">Time</th>
                    <th className="text-right px-4 py-2 font-medium">Tx</th>
                  </tr>
                </thead>
                <tbody>
                  {fills.map((fill: any, idx: number) => (
                    <tr key={`${fill.tid || fill.hash}-${idx}`} className="border-b border-[#1e2329]/50 hover:bg-[#1e2329]/30">
                      <td className="px-4 py-2 font-medium text-white">{fill.coinDisplay || fill.coin}</td>
                      <td className={`px-2 py-2 font-medium ${fill.side === 'B' ? 'text-[#0ecb81]' : 'text-[#f6465d]'}`}>
                        {fill.side === 'B' ? 'Buy' : 'Sell'}
                      </td>
                      <td className="px-2 py-2 text-right text-white font-mono">{parseFloat(fill.px).toFixed(4)}</td>
                      <td className="px-2 py-2 text-right text-white font-mono">{fill.sz}</td>
                      <td className="px-2 py-2 text-right text-[#848e9c] font-mono">{parseFloat(fill.fee).toFixed(4)} {fill.feeToken || ''}</td>
                      <td className="px-2 py-2 text-right text-[#848e9c]">
                        {new Date(fill.time).toLocaleString()}
                      </td>
                      <td className="px-4 py-2 text-right">
                        {fill.hash ? (
                          <a
                            href={`https://app.hyperliquid.xyz/explorer/tx/${fill.hash}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#f0b90b] hover:underline"
                          >
                            {fill.hash.slice(0, 6)}...{fill.hash.slice(-4)}
                          </a>
                        ) : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === 'holdings' && (
          <div className="bg-[#0b0e11]">
            <PositionsList
              key={`positions-${refreshKey}`}
              selectedChartSymbol={selectedChartSymbol}
              onPositionTPSLUpdate={onPositionTPSLUpdate}
            />
          </div>
        )}
      </div>
    </div>
  );
}
