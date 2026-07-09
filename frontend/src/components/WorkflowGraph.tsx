const agentColors: Record<string, string> = {
  completed: 'bg-green-500',
  running: 'bg-yellow-500 animate-pulse',
  failed: 'bg-red-500',
  pending: 'bg-gray-300',
  skipped: 'bg-gray-200',
};

const agentLabels: Record<string, string> = {
  intake_agent: 'Order Intake',
  inventory_agent: 'Inventory Check',
  erp_sync_agent: 'ERP Sync',
  fulfillment_agent: 'Fulfillment',
  invoice_agent: 'Invoice',
  reconciliation_agent: 'Reconciliation',
  exception_agent: 'Exception Handler',
};

export default function WorkflowGraph({ nodes, edges }: { nodes: any[]; edges: any[] }) {
  return (
    <div className="overflow-x-auto">
      <div className="flex items-center gap-2 min-w-max py-4">
        {nodes.map((node, idx) => (
          <div key={node.id} className="flex items-center gap-2">
            <div
              className={`flex flex-col items-center p-3 rounded-lg border-2 min-w-[120px] ${
                node.status === 'completed'
                  ? 'border-green-400 bg-green-50'
                  : node.status === 'running'
                  ? 'border-yellow-400 bg-yellow-50'
                  : node.status === 'failed'
                  ? 'border-red-400 bg-red-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full mb-1 ${
                  agentColors[node.status] || 'bg-gray-300'
                }`}
              />
              <span className="text-xs font-medium text-gray-700 text-center">
                {agentLabels[node.id] || node.label}
              </span>
              <span className="text-xs text-gray-500 capitalize">{node.status}</span>
            </div>
            {idx < nodes.length - 1 && (
              <div className="flex items-center">
                <div className="w-6 h-0.5 bg-gray-300" />
                <div className="w-0 h-0 border-t-4 border-b-4 border-l-4 border-transparent border-l-gray-300" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}