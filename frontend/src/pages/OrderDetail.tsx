import { useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { getOrder, getOrderGraph, retryWorkflow } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import WorkflowGraph from '../components/WorkflowGraph'
import { useState } from 'react'

export default function OrderDetail() {
  const { id } = useParams<{ id: string }>()
  const [retrying, setRetrying] = useState(false)

  const { data: order, isLoading: orderLoading, refetch: refetchOrder } = useQuery({
    queryKey: ['order', id],
    queryFn: () => getOrder(id!),
    enabled: !!id,
  })

  const { data: graph } = useQuery({
    queryKey: ['order-graph', id],
    queryFn: () => getOrderGraph(id!),
    enabled: !!id,
    refetchInterval: 5_000,
  })

  const handleRetry = async () => {
    if (!id) return
    setRetrying(true)
    try {
      await retryWorkflow(id)
      await refetchOrder()
    } catch {
      // silent
    } finally {
      setRetrying(false)
    }
  }

  if (orderLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading order...</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Order not found</div>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{order.order_number}</h1>
          <p className="text-sm text-gray-500 mt-1">Customer: {order.customer_id}</p>
        </div>
        <div className="flex items-center gap-3">
          {order.status === 'failed' && (
            <button
              onClick={handleRetry}
              disabled={retrying}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg text-sm font-medium hover:bg-orange-600 disabled:opacity-50 transition-colors"
            >
              {retrying ? 'Retrying...' : 'Retry Workflow'}
            </button>
          )}
          <StatusBadge status={order.status} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Order info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Workflow Graph */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Workflow Progress</h2>
            {graph ? (
              <WorkflowGraph nodes={graph.nodes} edges={graph.edges} />
            ) : (
              <div className="text-center py-8 text-gray-400">Loading workflow graph...</div>
            )}
          </div>

          {/* Items table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Order Items</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 text-xs font-medium text-gray-500 uppercase">SKU</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Qty</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500 uppercase">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {order.items.map(item => (
                  <tr key={item.id}>
                    <td className="py-2 text-sm font-medium">{item.sku}</td>
                    <td className="py-2 text-sm text-right">{item.quantity}</td>
                    <td className="py-2 text-sm text-right">{order.currency} {item.unit_price.toFixed(2)}</td>
                    <td className="py-2 text-sm text-right font-medium">{order.currency} {item.line_total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-gray-200">
                  <td colSpan={3} className="py-2 text-sm font-semibold text-right">Total</td>
                  <td className="py-2 text-sm font-bold text-right">{order.currency} {order.total_amount.toFixed(2)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Order details */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Details</h2>
            <dl className="space-y-3">
              <div>
                <dt className="text-xs text-gray-500">Created</dt>
                <dd className="text-sm">{new Date(order.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-xs text-gray-500">Updated</dt>
                <dd className="text-sm">{new Date(order.updated_at).toLocaleString()}</dd>
              </div>
              {order.notes && (
                <div>
                  <dt className="text-xs text-gray-500">Notes</dt>
                  <dd className="text-sm text-gray-700">{order.notes}</dd>
                </div>
              )}
            </dl>
          </div>

          {/* Workflow states timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold mb-4">Agent Timeline</h2>
            <div className="space-y-3">
              {order.workflow_states.map(state => (
                <div key={state.id} className="flex items-start gap-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    state.status === 'completed' ? 'bg-green-500' :
                    state.status === 'failed' ? 'bg-red-500' :
                    state.status === 'running' ? 'bg-yellow-500' :
                    'bg-gray-300'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{state.agent_name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
                      <StatusBadge status={state.status} size="sm" />
                    </div>
                    {state.error_message && (
                      <p className="text-xs text-red-500 mt-1">{state.error_message}</p>
                    )}
                    {state.started_at && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(state.started_at).toLocaleTimeString()}
                        {state.completed_at && ` → ${new Date(state.completed_at).toLocaleTimeString()}`}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {order.workflow_states.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No workflow states yet</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}