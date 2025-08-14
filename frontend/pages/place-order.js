import { useState } from 'react';
import API from '@/lib/api';

export default function PlaceOrder() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [items, setItems] = useState('Pizza:1, Coke:2');
  const [coords, setCoords] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(false);

  const useGPS = () => {
    if (!('geolocation' in navigator)) return alert('Geolocation not supported');

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setCoords({ lat: latitude, lng: longitude });

        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`
          );
          const data = await res.json();
          if (data?.display_name) setAddress(data.display_name);
        } catch (err) {
          console.error(err);
          alert('Failed to fetch address from coordinates');
        }
      },
      (err) => alert('GPS Error: ' + err.message),
      { enableHighAccuracy: true }
    );
  };

  const fetchCoordsFromAddress = async (addr) => {
    if (!addr) return null;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addr)}`
      );
      const data = await res.json();
      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (err) {
      console.error('Failed to geocode address', err);
    }
    return null;
  };

  const submit = async () => {
    if (!name.trim() || !phone.trim() || !address.trim()) {
      return alert('Please fill in all required fields');
    }

    let finalCoords = coords;
    if (!coords) {
      finalCoords = await fetchCoordsFromAddress(address);
      if (!finalCoords) return alert('Invalid address, cannot locate on map');
      setCoords(finalCoords);
    }

    const parsed = items.split(',').map((s) => {
      const [n, q] = s.split(':').map((x) => x.trim());
      return { name: n, qty: Number(q || 1) };
    });

    const body = {
      customer: {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        lat: finalCoords.lat,
        lng: finalCoords.lng,
      },
      items: parsed,
      storeLocation: { lat: 12.9716, lng: 77.5946 },
    };

    try {
      setLoading(true);
      const { data } = await API.post('/orders', body);
      setOrder(data);
    } catch (err) {
      console.error(err);
      alert('Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-white shadow-lg rounded-xl p-6 space-y-6">
        <h1 className="text-2xl font-bold text-gray-800 text-center">Place Your Order</h1>

        <div className="space-y-4">
          <input
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <textarea
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Address (will auto-fill if using GPS)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            rows={3}
          />
          <input
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Items (e.g., Pizza:1, Coke:2)"
            value={items}
            onChange={(e) => setItems(e.target.value)}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={useGPS}
            className="flex-1 bg-gray-800 text-white py-3 rounded-lg hover:bg-gray-900 transition"
          >
            Use Live Location
          </button>
          <button
            onClick={submit}
            disabled={loading}
            className={`flex-1 py-3 rounded-lg text-white ${
              loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700 transition'
            }`}
          >
            {loading ? 'Placing...' : 'Place Order'}
          </button>
        </div>

        {coords && (
          <p className="text-sm text-gray-500">
            Using GPS: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
          </p>
        )}

        {order && (
          <div className="bg-green-50 border border-green-200 p-3 rounded-lg text-green-700">
            Order placed successfully! Track here:{' '}
            <a className="underline text-green-700 font-semibold" href={`/track/${order.orderId}`}>
              /track/{order.orderId}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
