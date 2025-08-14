import API from '@/lib/api'; 
import { useState, useEffect } from 'react'; 
import { STATUS_ENUM } from './status';
export default function OrderCard({ 
  order, onUpdated }){
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState([]);
  useEffect(()=>{ API.get('/agents').then(r=> setAgents(r.data||[])); },[]);
  const setStatus = async (status)=>{ setLoading(true);
  try{ const {data}=await API.patch(`/orders/${order._id}/status`,{status});
  onUpdated?.(data);} finally{ setLoading(false);} };
  const setAgent = async (assignedAgentId)=>{ setLoading(true); 
    try{ const {data}=await API.patch(`/orders/${order._id}/assign`,{assignedAgentId}); 
    onUpdated?.(data);} finally{ setLoading(false);} };
  return (
  <div className="bg-white rounded-sm shadow py-3 space-y-2">
  <div className="flex items-center justify-between">
    <div className="font-semibold">#{order.orderId}</div>
    <div className="text-xs text-gray-500">
      {new Date(order.createdAt).toLocaleString('en-IN')}
    </div>
  </div>
  <div className="text-sm">
    <div className="font-medium">{order.customer?.name}</div>
    <div className="text-gray-600">{order.customer?.phone}</div>
    <div className="text-gray-500 break-words max-w-full">
  {order.customer?.address}
</div>

  </div>
  <div className="text-xs text-gray-600">
    Items: {order.items?.map(i => `${i.name}×${i.qty}`).join(', ')}
  </div>
  <div className="flex items-center gap-2">
    <select
      className="border rounded px-2 py-1 text-sm"
      value={order.status}
      onChange={(e) => setStatus(e.target.value)}
      disabled={loading}
    >
      {STATUS_ENUM.map(s => <option key={s} value={s}>{s}</option>)}
    </select>
    </div>
    <div>
    <select
      className="border rounded px-2 py-1 text-sm"
      value={order.assignedAgentId || ''}
      onChange={(e) => setAgent(e.target.value || null)}
    >
      <option value="">Unassigned</option>
      {agents.map(a => <option key={a.agentId} value={a.agentId}>{a.name || a.agentId}</option>)}
    </select>
  </div>
</div>
);
}
