import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getOrder, getOrderGraph, retryWorkflow } from '../api/client';
import StatusBadge from '../components/StatusBadge';
import WorkflowGraph from '../components/WorkflowGraph';
import { ArrowLeft, RotateCcw, Package, User, Calendar, DollarSign } from 'lucide-react';

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: order, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrder(id!),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const { data: graph } = useQuery({
    queryKey: ['order-graph', id],
    queryFn: () => getOrderGraph(id!),
    enabled: !!id,
    refetchInterval: 5000,
  });

  const retryMutation = useMutation({
    mutationFn: () => retryWorkflow(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['order', id] });
      queryClient.invalidateQueries({ queryKey: ['order-graph', id] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Order not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/orders')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-900">{order.order_number}</h2>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-gray-500 mt-1">Order Details</p>
          </div>
        </div>
        {order.status === 'exception' && (
          <button
            onClick={() => retryMutation.mutate()}
            disabled={retryMutation.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{retryMutation.isPending ? 'Retrying...' : 'Retry Workflow'}</span>
          </button>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex items-center gap-3">
          <User className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Customer</p>
            <p className="text-sm font-medium text-gray-900">{order.customer_id}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex items-center gap-3">
          <DollarSign className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Total Amount</p>
            <p className="text-sm font-medium text-gray-900">
              ${order.total_amount.toLocaleString()} {order.currency}
            </p>
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border border-gray-100 flex items-center gap-3">
          <Calendar className="w-5 h-5 text-gray-400" />
          <div>
            <p className="text-xs text-gray-500">Created</p>
            <p className="text-sm font-medium text-gray-900">
              {new Date(order.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>

      {/* Workflow Graph */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Pipeline</h3>
        {graph?.nodes ? (
          <WorkflowGraph nodes={graph.nodes} edges={graph.edges} />
        ) : (
          <p className="text-gray-500 text-sm">No workflow data available</p>
        )}
      </div>

      {/* Order Items */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Order Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">SKU</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Qty</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Unit Price</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Line Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {order.items.map((item) => (
                <tr key={item.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono text-sm text-gray-900">{item.sku}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-700">{item.quantity}</td>
                  <td className="px-6 py-4 text-sm text-right text-gray-700">${item.unit_price.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                    ${item.line_total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Workflow States */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Agent Execution Log</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Agent</th>
                <th className="text-left px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Started</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Completed</th>
                <th className="text-right px-6 py-3 text-xs font-semibold text-gray-500 uppercase">Retries</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {order.workflow_states.map((ws) => (
                <tr key={ws.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 capitalize">
                    {ws.agent_name.replace(/_/g, ' ')}
                  </td>
                  <td className="px-6 py-4">
                    <StatusBadge status={ws.status} />
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 text-right">
                    {ws.started_at ? new Date(ws.started_at).toLocaleTimeString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 text-right">
                    {ws.completed_at ? new Date(ws.completed_at).toLocaleTimeString() : '-'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 text-right">{ws.retry_count}</td>
                </tr>
              ))}
              {order.workflow_states.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No workflow states recorded yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Error details if exception */}
      {order.workflow_states.filter((s) => s.status === 'failed').length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-red-800 mb-2">Exception Details</h3>
          {order.workflow_states
            .filter((s) => s.status === 'failed')
            .map((s) => (
              <div key={s.id} className="space-y-1">
                <p className="text-sm font-medium text-red-700 capitalize">
                  {s.agent_name.replace(/_/g, ' ')}
                </p>
                <p className="text-sm text-red-600">{s.error_message || 'Unknown error'}</p>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}