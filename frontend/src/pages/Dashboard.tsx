import { useQuery } from '@tanstack/react-query'
import { getDashboard } from '../api/client'
import StatusBadge from '../components/StatusBadge'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts'

const STATUS_COLORS: Record<string, string> = {
  pending: '#9ca3af',
  completed: '#22c55e',
  failed: '#ef4444',
  intake: '#3b82f6',
  inventory_check: '#6366f1',
  erp_sync: '#a855f7',
  fulfillment: '#06b6d4',
  invoice: '#f97316',
  reconciliation: '#14b8a6',
}

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: getDashboard,
    refetchInterval: 10_000,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-400">Loading dashboard...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-red-500">Failed to load dashboard data. Is the backend running?</div>
      </div>
    )
  }

  const pieData = data
    ? Object.entries(data.orders_by_status).map(([name, value]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1).replace(/_/g, ' '),
        value,
      }))
    : []

  const processingTime = data?.avg_processing_time_seconds
    ? `${(data.avg_processing_time_seconds).toFixed(1)}s`
    : 'N/A'

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Dashboard</h1>

      {/* Metric cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-500 font-medium mb-1">Total Orders</div>
          <div className="text-3xl font-bold">{data?.total_orders ?? 0}</div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-500 font-medium mb-1">Completed</div>
          <div className="text-3xl font-bold text-green-600">
            {data?.orders_by_status?.completed ?? 0}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="text-sm text-gray-500 font-medium mb-1">Avg Processing Time</div>
          <div className="text-3xl font-bold">{processingTime}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Pie chart - status breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Orders by Status</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map(entry => (
                    <Cell key={entry.name} fill={STATUS_COLORS[entry.name.toLowerCase().replace(/ /g, '_')] || '#9ca3af'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-16 text-gray-400">No data yet</div>
          )}
        </div>

        {/* Bar chart */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold mb-4">Order Status Distribution</h2>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={pieData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="text-center py-16 text-gray-400">No data yet</div>
          )}
        </div>
      </div>

      {/* Recent exceptions */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">Recent Exceptions</h2>
        {data?.recent_exceptions && data.recent_exceptions.length > 0 ? (
          <div className="space-y-3">
            {data.recent_exceptions.map((exc, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                <span className="text-red-500 mt-0.5">⚠️</span>
                <div>
                  <div className="text-sm font-medium text-red-700">
                    {(exc.payload as Record<string, unknown>)?.agent as string || 'Unknown'} failed
                  </div>
                  <div className="text-xs text-red-500 mt-1">
                    {(exc.payload as Record<string, unknown>)?.error as string || exc.event_type as string}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-400">No recent exceptions</div>
        )}
      </div>
    </div>
  )
}