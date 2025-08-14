import { useEffect, useRef, useState } from "react";
import { io } from "socket.io-client";
import API from "@/lib/api";

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:4000";

export default function AgentPage() {
  const socketRef = useRef(null);
  const watchIdRef = useRef(null);

  const [agentId, setAgentId] = useState(() => {
    try {
      return localStorage.getItem("agentId") || `agent_${Math.floor(Math.random() * 10000)}`;
    } catch {
      return `agent_${Math.floor(Math.random() * 10000)}`;
    }
  });

  const [connected, setConnected] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [position, setPosition] = useState(null);
  const [orderId, setOrderId] = useState("");
  const [installable, setInstallable] = useState(false);
  const deferredPromptRef = useRef(null);
  const [address, setAddress] = useState("");
  const [status, setStatus] = useState("Scheduled");

  useEffect(() => {
    const s = io(SOCKET_URL, { transports: ["websocket"] });
    socketRef.current = s;
    s.on("connect", () => setConnected(true));
    s.on("disconnect", () => setConnected(false));
    return () => {
      s.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem("agentId", agentId);
    } catch {}
  }, [agentId]);

  useEffect(() => {
    const handleBeforeInstall = (e) => {
      e.preventDefault();
      deferredPromptRef.current = e;
      setInstallable(true);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstall);
    return () => window.removeEventListener("beforeinstallprompt", handleBeforeInstall);
  }, []);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js");
    }
  }, []);

  const fetchAddress = async (lat, lng) => {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`
      );
      const data = await res.json();

      if (data && data.display_name) {
        setAddress(data.display_name);
      } else {
        setAddress(
          `Address not found — <a href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}" target="_blank" rel="noopener noreferrer">View on Map</a>`
        );
      }
    } catch (err) {
      console.error("Reverse geocode error:", err);
      setAddress(
        `Error fetching address — <a href="https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}" target="_blank" rel="noopener noreferrer">View on Map</a>`
      );
    }
  };

  const handleJoin = () => {
    if (!socketRef.current) return alert("Socket not ready");
    socketRef.current.emit("agent:join", agentId);
    alert(`Joined as ${agentId}`);
  };

  const startSharing = () => {
    if (!socketRef.current) return alert("Socket not ready");
    if (!("geolocation" in navigator)) return alert("Geolocation not available");

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const payload = {
          agentId,
          orderId: orderId || null,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          heading: pos.coords.heading || 0,
          speed: pos.coords.speed || 0,
          timestamp: pos.timestamp,
        };
        setPosition(payload);
        fetchAddress(payload.lat, payload.lng);
        socketRef.current.emit("agent:location", payload);
      },
      (err) => alert("Geolocation error: " + err.message),
      { enableHighAccuracy: true, maximumAge: 2000, timeout: 10000 }
    );
    watchIdRef.current = id;
    setSharing(true);
  };

  const stopSharing = () => {
    if (watchIdRef.current !== null && "geolocation" in navigator) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setSharing(false);
  };

  const updateStatus = (newStatus) => {
    setStatus(newStatus);
    if (!socketRef.current) return alert("Socket not ready");
    if (!orderId) return alert("Please enter an Order ID before updating status");

    socketRef.current.emit("agent:status", {
      agentId,
      orderId,
      status: newStatus,
      time: Date.now(),
    });
  };
  const handleInstall = async () => {
    const prompt = deferredPromptRef.current;
    if (!prompt) return;
    prompt.prompt();
    await prompt.userChoice;
    deferredPromptRef.current = null;
    setInstallable(false);
  };

  return (
    <div className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-xl mx-auto bg-white p-6 rounded shadow">
        <h1 className="text-2xl font-semibold mb-4">Agent App </h1>
        <label className="block text-sm">Agent ID</label>
        <input
          value={agentId}
          onChange={(e) => setAgentId(e.target.value)}
          className="w-full border p-2 rounded mb-2"
        />

        <div className="flex gap-2 mb-3">
          <button onClick={handleJoin} className="px-3 py-2 bg-blue-600 text-white rounded">
            Join Socket
          </button>
          <button
            onClick={() => (sharing ? stopSharing() : startSharing())}
            className={`px-3 py-2 rounded ${
              sharing ? "bg-red-600 text-white" : "bg-green-600 text-white"
            }`}
          >
            {sharing ? "Stop Sharing" : "Start Sharing"}
          </button>
          {installable && (
            <button
              onClick={handleInstall}
              className="px-3 py-2 bg-indigo-600 text-white rounded"
            >
              Install App
            </button>
          )}
        </div>

        <label className="block text-sm">Order ID</label>
        <input
          placeholder="orderId to target a specific order room"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
          className="w-full border p-2 rounded mb-3"
        />

        <div className="mt-4">
          <label className="block text-sm font-semibold mb-2">Update Order Status</label>
          <div className="flex flex-wrap gap-2">
            {["Reached Store", "Picked Up", "Out for Delivery", "Delivered", "Cancelled"].map(
              (st) => (
                <button
                  key={st}
                  onClick={() => updateStatus(st)}
                  className={`px-3 py-2 rounded ${
                    status === st ? "bg-blue-600 text-white" : "bg-gray-200"
                  }`}
                >
                  {st}
                </button>
              )
            )}
          </div>
        </div>

        <div className="text-sm text-gray-600 mt-3 mb-2">
          Socket:{" "}
          {connected ? (
            <span className="text-green-600">connected</span>
          ) : (
            <span className="text-red-500">disconnected</span>
          )}
        </div>

        {/* Last Position */}
        <div className="bg-gray-50 p-3 rounded">
          <div>
            <strong>Last Position</strong>
          </div>
          <div className="text-sm">
            {position ? (
              <>
                Lat: {position.lat?.toFixed(6)} • Lng: {position.lng?.toFixed(6)}
                <br />
                Accuracy: {position.accuracy} m • Speed: {position.speed ?? "—"}
              </>
            ) : (
              <span className="text-gray-500">No position yet</span>
            )}
          </div>
          <div>
            <strong>Address:</strong>{" "}
            {address ? (
              <span
                dangerouslySetInnerHTML={{
                  __html: address,
                }}
              />
            ) : (
              <span className="text-gray-500">—</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
