import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/router';
import API from '@/lib/api';
import { io } from 'socket.io-client';
import { GoogleMap, LoadScript, Marker, Polyline } from '@react-google-maps/api';

const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000';

export default function Track() {
  const router = useRouter();
  const { id } = router.query;

  const [order, setOrder] = useState(null);
  const [agentLoc, setAgentLoc] = useState(null);
  const [routeToStore, setRouteToStore] = useState([]);
  const [routeToCustomer, setRouteToCustomer] = useState([]);
  const [eta, setEta] = useState(null); 

  const socketRef = useRef(null);
  async function getRoute(start, end) {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();

      if (!data.routes || !data.routes[0]) return { path: [], eta: null };

      const path = data.routes[0].geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
      const etaMinutes = Math.round(data.routes[0].duration / 60);
      return { path, eta: etaMinutes };
    } catch (err) {
      console.error("Error fetching route:", err);
      return { path: [], eta: null };
    }
  }

  useEffect(() => {
    if (!id) return;

    API.get(`/orders/${id}`).then(async (r) => {
      setOrder(r.data);

      if (r.data.agentLocation && r.data.storeLocation) {
        const { path, eta } = await getRoute(r.data.agentLocation, r.data.storeLocation);
        setRouteToStore(path);
        if (eta) setEta(eta);
      }
      if (r.data.storeLocation && r.data.customer) {
        const { path, eta } = await getRoute(r.data.storeLocation, {
          lat: r.data.customer.lat,
          lng: r.data.customer.lng,
        });
        setRouteToCustomer(path);
        if (eta) setEta(eta);
      }
    });

    const s = io(socketUrl, { transports: ['websocket'] });
    socketRef.current = s;

    s.emit('track:join', id);

    s.on('order:agent_location', async (p) => {
      if (p.orderId === id) {
        const newLoc = { lat: p.lat, lng: p.lng };
        setAgentLoc(newLoc);

        if (order?.storeLocation) {
          const { path, eta } = await getRoute(newLoc, order.storeLocation);
          setRouteToStore(path);
          if (eta) setEta(eta);
        }
      }
    });

    s.on('order:status', (u) => {
      if (u.orderId === id) {
        setOrder((prev) => ({
          ...(prev || {}),
          status: u.status,
          statusHistory: [
            ...(prev?.statusHistory || []),
            { status: u.status, timestamp: u.time || new Date() },
          ],
        }));
      }
    });

    return () => s.disconnect();
  }, [id]);

  return (
    <div className="min-h-screen">
      <div className="p-4">
        <h1 className="text-xl font-semibold">Tracking Order: {id}</h1>

        {eta !== null && (
          <div className="text-sm text-gray-600 mb-2">
            ETA: <strong>{eta} min</strong>
          </div>
        )}

        <div className="mb-2">
          Current Status: <strong>{order?.status}</strong>
        </div>

        {order?.statusHistory && (
          <div className="mb-4 p-4 border rounded bg-white">
            <h2 className="font-semibold mb-2">Delivery Timeline</h2>
            <ul className="space-y-2">
              {order.statusHistory.map((e, i) => (
                <li key={i} className="flex justify-between text-sm">
                  <span>{e.status}</span>
                  <span className="text-gray-500">
                    {new Date(e.timestamp).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-2 h-[60vh]">
          <LoadScript googleMapsApiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || ''}>
            <GoogleMap
              mapContainerStyle={{ width: '100%', height: '100%' }}
              center={
                agentLoc
                  ? agentLoc
                  : order?.storeLocation || { lat: 12.9716, lng: 77.5946 }
              }
              zoom={13}
            >
              {order?.storeLocation && <Marker position={order.storeLocation} label="Store" />}
              {order?.customer && (
                <Marker
                  position={{ lat: order.customer.lat, lng: order.customer.lng }}
                  label="Customer"
                />
              )}
              {agentLoc && <Marker position={agentLoc} label="Agent" />}

              {routeToStore.length > 0 && (
                <Polyline path={routeToStore} options={{ strokeColor: '#ff0000', strokeWeight: 4 }} />
              )}

              {routeToCustomer.length > 0 && (
                <Polyline path={routeToCustomer} options={{ strokeColor: '#0000ff', strokeWeight: 4 }} />
              )}
            </GoogleMap>
          </LoadScript>
        </div>

        {order && order.status !== 'Delivered' && (
          <div className="mt-4">
            <p className="text-sm text-gray-600">
              OTP will be given to agent; you can enter OTP to mark delivered.
            </p>
            <OtpForm orderId={id} />
          </div>
        )}
      </div>
    </div>
  );
}

function OtpForm({ orderId }) {
  const [otp, setOtp] = useState('');

  const handle = async () => {
    try {
      const res = await API.post(`/orders/${orderId}/verify-otp`, { otp });
      if (res.data.ok) alert('Delivered!');
    } catch (e) {
      alert('OTP wrong');
    }
  };

  return (
    <div className="flex gap-2 mt-2">
      <input
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        className="border p-2 rounded"
        placeholder="Enter OTP"
      />
      <button onClick={handle} className="bg-green-600 text-white px-3 rounded">
        Verify
      </button>
    </div>
  );
}
