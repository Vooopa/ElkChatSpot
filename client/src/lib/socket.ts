import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

// Global socket instance
let socket: Socket | null = null;

// Initialize socket connection
export const initializeSocket = (): Socket => {
  if (!socket) {
    console.log("Creating new socket connection");
    
    // Get the origin URL for the socket connection
    const socketUrl = window.location.origin;
    
    // Initialize the socket with connection options
    socket = io(socketUrl, {
      path: "/api/socket.io",
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      transports: ['websocket', 'polling']
    });
    
    // Debug listeners for socket events
    socket.on('connect', () => {
      console.log('Socket connected successfully with ID:', socket?.id);
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error.message);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });
    
    socket.on('reconnect', (attemptNumber) => {
      console.log('Socket reconnected after', attemptNumber, 'attempts');
    });
    
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('Socket reconnection attempt:', attemptNumber);
    });
    
    socket.on('reconnect_error', (error) => {
      console.error('Socket reconnection error:', error.message);
    });
    
    socket.on('reconnect_failed', () => {
      console.error('Socket failed to reconnect');
    });
    
    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }
  
  return socket;
};

// React hook for using socket in components
export const useSocket = (): Socket | null => {
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);
  
  useEffect(() => {
    // Get or create the socket instance
    const currentSocket = initializeSocket();
    setSocketInstance(currentSocket);
    
    // Make sure socket is connected
    if (!currentSocket.connected) {
      console.log("Socket not connected, connecting now...");
      currentSocket.connect();
    }
    
    // No cleanup in this case - we want to keep the socket alive
    // for the entire application session
    return () => {
      // We don't disconnect here to maintain the connection
      // across component unmounts
    };
  }, []);
  
  return socketInstance;
};

// Get the current socket instance (if any)
export const getSocket = (): Socket | null => {
  return socket;
};

// Close and reset the socket connection
export const closeSocket = (): void => {
  if (socket) {
    console.log("Closing socket connection");
    socket.disconnect();
    socket = null;
  }
};
