import { useEffect, useMemo, useState } from 'react';
import API from '@/lib/api';
import useSocket from '@/hooks/useSocket';
import dynamic from 'next/dynamic';

const Kanban = dynamic(() => import('@/components/admin/Kanban'), { ssr: false });

export default function Admin() {
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [agentFilter, setAgentFilter] = useState('');

  const statusColors = {
    Scheduled: 'bg-blue-100 border-blue-300',
    'Reached Store': 'bg-indigo-100 border-indigo-300',
    'Picked Up': 'bg-yellow-100 border-yellow-300',
    'Out for Delivery': 'bg-orange-100 border-orange-300',
    Delivered: 'bg-green-100 border-green-300',
    Cancelled: 'bg-red-100 border-red-300',
  };

  useEffect(() => {
    API.get('/orders').then(r => setOrders(r.data || []));
  }, []);

  useSocket({
    'order:created': o => setOrders(prev => [o, ...prev]),
    'order:status': p =>
      setOrders(prev =>
        prev.map(o =>
          o.orderId === p.orderId
            ? {
                ...o,
                status: p.status,
                statusHistory: [
                  ...(o.statusHistory || []),
                  { status: p.status, timestamp: p.time },
                ],
              }
            : o
        )
      ),
    'order:assigned': ({ orderId, agentId }) =>
      setOrders(prev =>
        prev.map(o =>
          o.orderId === orderId ? { ...o, assignedAgentId: agentId } : o
        )
      ),
  });

  const filtered = useMemo(() => {
    let list = orders;
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(o =>
        [o.orderId, o.customer?.name, o.customer?.phone, o.customer?.address]
          .filter(Boolean)
          .some(v => String(v).toLowerCase().includes(q))
      );
    }
    if (statusFilter) list = list.filter(o => o.status === statusFilter);
    if (agentFilter) list = list.filter(o => (o.assignedAgentId || '') === agentFilter);
    return list;
  }, [orders, search, statusFilter, agentFilter]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-8xl mx-auto p-4 flex flex-wrap items-center gap-4">
          <h1 className="text-2xl font-bold text-gray-800 mr-auto">Admin Dashboard</h1>

          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search orders..."
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-blue-400"
          />

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-indigo-400"
          >
            <option value="">All Status</option>
            {['Scheduled','Reached Store','Picked Up','Out for Delivery','Delivered','Cancelled']
              .map(s => (
                <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <input
            value={agentFilter}
            onChange={e => setAgentFilter(e.target.value)}
            placeholder="Agent ID"
            className="border border-gray-300 rounded-lg px-4 py-2 text-sm w-full sm:w-auto focus:outline-none focus:ring-2 focus:ring-green-400"
          />
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-10xl mx-auto p-6">
        <div className="bg-white rounded-xl shadow p-4">
          <Kanban
            orders={filtered}
            statusColors={statusColors}
            onUpdated={(u) =>
              setOrders(prev => prev.map(o => (o._id === u._id ? u : o)))
            }
          />
        </div>
      </main>
    </div>
  );
}
