import { Card } from '../../shared/ui/Card';

export default function ConsumerPage() {
  return (
    <div className="p-8 max-w-5xl">
      <header className="mb-10">
        <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Consumer Dashboard</h1>
        <p className="text-slate-400 mt-2 font-light">
          Monitor your graph engine's active queries and data sources from the consumer view.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-6">
        <Card color="indigo">
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <h2 className="text-lg font-medium text-slate-200">Active Queries</h2>
          </div>
          <p className="text-4xl font-light text-slate-100 relative z-10 mb-2">1,402</p>
          <p className="text-sm text-slate-500 relative z-10">+12% from last hour</p>
        </Card>

        <Card color="cyan">
          <div className="flex items-center gap-4 mb-4 relative z-10">
            <h2 className="text-lg font-medium text-slate-200">Data Ingestion</h2>
          </div>
          <p className="text-4xl font-light text-slate-100 relative z-10 mb-2">1.8 TB</p>
          <p className="text-sm text-slate-500 relative z-10">24k events/sec</p>
        </Card>
      </div>
      
      <div className="mt-8">
        <Card color="slate">
          <h2 className="text-lg font-medium text-slate-200 mb-6 relative z-10">Recent Activity</h2>
          <div className="space-y-4 relative z-10">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-slate-900/50 rounded-lg border border-slate-800">
                <div>
                  <p className="text-sm font-medium text-slate-300">Schema_Graph_{i} updated</p>
                  <p className="text-xs text-slate-500 mt-1">Via MCP Protocol</p>
                </div>
                <span className="text-xs text-slate-400">{i * 2} mins ago</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
