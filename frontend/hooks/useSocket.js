import { useEffect, useRef } from 'react'; 
import { io } from 'socket.io-client'; 
const URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000'; 
export default function useSocket(handlers={}){ const ref=useRef(null); 
useEffect(()=>{ const s=io(URL,{transports:['websocket']}); 
ref.current=s; Object.entries(handlers).forEach(([e,cb])=> s.on(e,cb)); 
return ()=>{ 
    Object.entries(handlers).forEach(([e,cb])=> s.off(e,cb));
     s.disconnect(); 
ref.current=null; }; },[]); return ref; }