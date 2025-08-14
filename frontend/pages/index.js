export default function Home() {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md text-center">
        <h1 className="text-3xl font-bold text-gray-800">Delivery Tracker</h1>
        <p className="text-gray-500 mt-2">Admin / Agent / Customer demo</p>

        <div className="mt-6 space-y-3">
          <a
            href="/admin"
            className="block w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition"
          >
            Admin Dashboard
          </a>
          <a
            href="/agent"
            className="block w-full py-3 px-4 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition"
          >
            Agent App
          </a>
          <a
            href="/place-order"
            className="block w-full py-3 px-4 bg-gray-800 text-white rounded-lg font-medium hover:bg-gray-900 transition"
          >
            Place Order
          </a>
        </div>
      </div>
    </div>
  );
}
