import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_API_URL || '/';

let socket;
export function getSocket() {
  if (!socket) {
    socket = io(SOCKET_URL, {
      autoConnect: false,
      transports: ['websocket', 'polling'], // Connect directly via WebSocket for instant latency
      upgrade: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 500,
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
      if (response && response.ok) resolve(response.state);
      else reject(new Error(response?.message || 'Action failed'));
    });
  });
}