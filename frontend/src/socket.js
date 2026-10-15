import { io } from 'socket.io-client';

let rawSocketUrl = (import.meta.env.VITE_API_URL || '').trim().replace(/\/+$/, '');
if (rawSocketUrl.endsWith('/api')) {
  rawSocketUrl = rawSocketUrl.slice(0, -4).replace(/\/+$/, '');
}
const SOCKET_URL = rawSocketUrl || '/';

let socket;
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'], // Prefer direct WebSocket for ultra-low latency
      upgrade: true,
      rememberUpgrade: true,
      reconnection: true,
      reconnectionAttempts: 15,
      reconnectionDelay: 400,
    });
  }
  return socket;
}

export function emitWithAck(event, payload, timeoutMs = 2500) {
  return new Promise((resolve, reject) => {
    const s = getSocket();
    if (!s.connected) {
      reject(new Error('SOCKET_NOT_CONNECTED'));
      return;
    }
    const timer = setTimeout(() => reject(new Error('SOCKET_TIMEOUT')), timeoutMs);
    s.emit(event, payload, (response) => {
      clearTimeout(timer);
      if (response && response.ok) {
        resolve(response);
      } else {
        reject(new Error(response?.message || 'Action failed'));
      }
    });
  });
}