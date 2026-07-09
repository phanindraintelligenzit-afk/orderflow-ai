import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listOrders } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import { Cpu, Activity, CheckCircle, XCircle, Clock } from 'lucide-react';

const AGENT_LABELS: Record<string, string> = {
  intake_agent: 'Order Intake',
  inventory_agent: 'Inventory Check',
  erp_sync_agent: 'ERP Sync',
  fulfillment_agent: 'Fulfillment Tracking',
  invoice_agent: 'Invoice Generation',
  reconciliation_agent: 'Reconciliation',
  exception_agent: 'Exception Handler',
};

export default function AgentMonitor() {
  const { data: orders } = useQuery({
    queryKey: ['orders-monitor'],
    queryFn: () => listOrders({ limit: 100 }),
    refetchInterval: 5000,
  });

  // Aggregate agent stats from all orders
  const [agentStats, setAgentStats] = useState<Record<string, { completed: number; failed: number; running: number; pending: number; total: number }>>({});

  useEffect(() => {
    if (!orders) return;
    const stats: Record<string, any> = {};
    const allAgentNames = Object.keys(AGENT_LABELS);

    allAgentNames.forEach((name) => {
      stats[name] = { completed: 0, failed: 0, running: 0, pending: 0, total: 0 };
    });

    // We need full order data to get workflow states, so we just show the aggregate counts from what we have
    setAgentStats(stats);
  }, [orders]);

  if (!orders) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  const completedOrders = orders.filter((o) => o.status === 'reconciled').length;
  const exceptionOrders = orders.filter((o) => o.status === 'exception').length;
  const processingOrders = orders.filter((o) => ['received', 'processing'].includes(o.status)).length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Agent Monitor</h2>
        <p className="text-gray-500 mt-1">Real-time multi-agent workflow monitoring</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center gap-3">
            <Activity className="w-8 h-8 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Total Orders</p>
              <p className="text-xl font-bold text-gray-900">{orders.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-xs text-gray-500">Reconciled</p>
              <p className="text-xl font-bold text-gray-900">{completedOrders}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center gap-3">
            <Clock className="w-8 h-8 text-yellow-600" />
            <div>
              <p className="text-xs text-gray-500">Processing</p>
              <p className="text-xl font-bold text-gray-900">{processingOrders}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-5 border border-gray-100">
          <div className="flex items-center gap-3">
            <XCircle className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-xs text-gray-500">Exceptions</p>
              <p className="text-xl font-bold text-gray-900">{exceptionOrders}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Agent Pipeline Overview */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Agent Pipeline</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(AGENT_LABELS).map(([key, label]) => {
            const status = 'pending';
            return (
              <div key={key} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-2 mb-3">
                  <Cpu className={`w-5 h-5 ${
                    status === 'completed' ? 'text-green-500' :
                    status === 'running' ? 'text-yellow-500' :
                    status === 'failed' ? 'text-red-500' : 'text-gray-400'
                  }`} />
                  <span className="font-medium text-gray-900">{label}</span>
                </div>
                <div className="flex gap-2 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-green-500" />
                    Active
                  </span>
                  <span className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-gray-300" />
                    Pending
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Orders */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Recent Orders</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Order #</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {orders.slice(0, 10).map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3 font-mono text-sm text-gray-900">{order.order_number}</td>
                  <td className="px-6 py-3 text-sm text-gray-700">{order.customer_id}</td>
                  <td className="px-6 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-6 py-3 text-sm text-right text-gray-900">${order.total_amount.toLocaleString()}</td>
                  <td className="px-6 py-3 text-sm text-right text-gray-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}