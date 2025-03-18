import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export const initializeSocket = (): Socket => {
  if (!socket) {
    const socketUrl = window.location.origin;
    
    socket = io(socketUrl, {
      path: "/api/socket.io",
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });
  }
  
  return socket;
};

export const useSocket = (): Socket | null => {
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);
  
  useEffect(() => {
    const socket = initializeSocket();
    setSocketInstance(socket);
    
    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, []);
  
  return socketInstance;
};

export const getSocket = (): Socket | null => {
  return socket;
};

export const closeSocket = (): void => {
  if (socket) {
    socket.close();
    socket = null;
  }
};
