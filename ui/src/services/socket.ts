import { io, Socket } from 'socket.io-client'

const SOCKET_URL = import.meta.env.PROD ? 'https://bot.gobiel.online' : 'http://localhost:3000'

let socket: Socket | null = null

export function getSocket(): Socket {
  if (!socket) {
    socket = io(SOCKET_URL, {
      path: import.meta.env.PROD ? '/api/socket.io' : '/socket.io',
      autoConnect: false,
      reconnection: true,
      reconnectionDelay: 2000,
      reconnectionAttempts: Infinity,
    })
  }
  return socket
}

export function connectSocket(): Socket {
  const s = getSocket()
  if (!s.connected) s.connect()
  return s
}

export function disconnectSocket(): void {
  socket?.disconnect()
}
