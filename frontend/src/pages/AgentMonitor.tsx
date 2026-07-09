import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '../api/client'
import { listOrders } from '../api/client'
import StatusBadge from '../components/StatusBadge'

interface AgentSummary {
  name: string
  total: number
  completed: number
  failed: number
  running: number
  pending: number
}

export default function AgentMonitor() {
  const { data: dashboard } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    refetchInterval: 5_000,
  })

  const { data: orders } = useQuery({
    queryKey: ['orders', { limit: 100 }],
    queryFn: () => listOrders({ limit: 100 }),
    refetchInterval: 10_000,
  })

  const agentNames = [
    'intake', 'inventory', 'erp_sync',
    'fulfillment', 'invoice', 'reconciliation',
  ]

  const agents: AgentSummary[] = agentNames.map(name => ({
    name,
    total: 0,
    completed: 0,
    failed: 0,
    running: 0,
    pending: 0,
  }))

  // We'd need workflow state data aggregated; show a simplified view
  const totalOrders = dashboard?.total_orders ?? 0
  const completedOrders = dashboard?.orders_by_status?.completed ?? 0
  const failedOrders = dashboard?.orders_by_status?.failed ?? 0

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Agent Monitor</h1>

      {/* Global stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-xs text-gray-500 font-medium">Total Orders</div>
          <div className="text-2xl font-bold">{totalOrders}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-xs text-gray-500 font-medium">Completed</div>
          <div className="text-2xl font-bold text-green-600">{completedOrders}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-xs text-gray-500 font-medium">Failed</div>
          <div className="text-2xl font-bold text-red-600">{failedOrders}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="text-xs text-gray-500 font-medium">Active / In Progress</div>
          <div className="text-2xl font-bold text-yellow-600">
            {totalOrders - completedOrders - failedOrders}
          </div>
        </div>
      </div>

      {/* Agent pipeline overview */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Agent Pipeline</h2>
        <div className="flex items-center gap-2 flex-wrap">
          {agentNames.map((name, i) => (
            <div key={name} className="flex items-center">
              <div className="px-4 py-2 bg-slate-100 rounded-lg text-sm font-medium border border-slate-200">
                {name.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </div>
              {i < agentNames.length - 1 && (
                <span className="text-gray-400 mx-1">→</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Recent orders status */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Orders</h2>
        {orders && orders.length > 0 ? (
          <div className="space-y-2">
            {orders.slice(0, 20).map(order => (
              <div key={order.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-mono text-gray-600">{order.order_number}</span>
                  <StatusBadge status={order.status} size="sm" />
                </div>
                <div className="text-xs text-gray-400">
                  {new Date(order.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">No orders yet</div>
        )}
      </div>
    </div>
  )
}