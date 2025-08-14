import OrderCard from './OrderCard';
import { STATUS_ENUM } from './status';

export default function Kanban({ orders, onUpdated, statusColors = {} }) {
  const groups = Object.fromEntries(STATUS_ENUM.map(s => [s, []]));

  (orders || []).forEach(o => {
    (groups[o.status] || groups['Scheduled']).push(o);
  });

  return (
    <div className="grid md:grid-cols-3 xl:grid-cols-6 gap-4 w-full mx-0 px-0">
      {STATUS_ENUM.map(status => (
        <div
          key={status}
          className={`border p-3 flex flex-col rounded-lg ${
            statusColors[status] || 'bg-gray-50'
          }`}
        >
          <div className="font-semibold mb-2 flex items-center justify-between">
            <span>{status}</span>
            <span className="text-xs text-gray-500">
              {groups[status].length}
            </span>
          </div>
          <div className="space-y-3">
            {groups[status].map(o => (
              <OrderCard key={o._id} order={o} onUpdated={onUpdated} />
            ))}
            {groups[status].length === 0 && (
              <div className="text-xs text-gray-400 text-center py-8">
                No orders
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
