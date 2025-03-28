import { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

// Istanza globale del socket
let socket: Socket | null = null;

// Inizializza la connessione del socket
export const initializeSocket = (): Socket => {
  if (!socket) {
    console.log("prov da sockets.. Creazione di una nuova connessione socket");
    
    // Ottieni l'URL di origine per la connessione del socket
    const socketUrl = window.location.origin;
    
    // Inizializza il socket con le opzioni di connessione
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
    
    // Listener di debug per gli eventi del socket
    socket.on('connect', () => {
      console.log('prov da sockets.. Socket connesso con successo con ID:', socket?.id);
    });
    
    socket.on('connect_error', (error) => {
      console.error('prov da sockets.. Errore di connessione del socket:', error.message);
    });
    
    socket.on('disconnect', (reason) => {
      console.log('prov da sockets.. Socket disconnesso:', reason);
    });
    
    socket.on('reconnect', (attemptNumber) => {
      console.log('prov da sockets.. Socket riconnesso dopo', attemptNumber, 'tentativi');
    });
    
    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('prov da sockets.. Tentativo di riconnessione del socket:', attemptNumber);
    });
    
    socket.on('reconnect_error', (error) => {
      console.error('prov da sockets.. Errore di riconnessione del socket:', error.message);
    });
    
    socket.on('reconnect_failed', () => {
      console.error('prov da sockets.. Fallimento della riconnessione del socket');
    });
    
    socket.on('error', (error) => {
      console.error('prov da sockets.. Errore del socket:', error);
    });

    // Aggiungi log per ogni messaggio ricevuto
    socket.onAny((event, ...args) => {
      console.log(`prov da sockets.. Evento ricevuto: ${event}`, args);
    });
  }
  
  return socket;
};

// Hook React per usare il socket nei componenti
export const useSocket = (): Socket | null => {
  const [socketInstance, setSocketInstance] = useState<Socket | null>(null);
  
  useEffect(() => {
    // Ottieni o crea l'istanza del socket
    const currentSocket = initializeSocket();
    setSocketInstance(currentSocket);
    
    // Assicurati che il socket sia connesso
    if (!currentSocket.connected) {
      console.log("prov da sockets.. Socket non connesso, connessione in corso...");
      currentSocket.connect();
    }
    
    // Nessuna pulizia in questo caso - vogliamo mantenere il socket attivo
    // per l'intera sessione dell'applicazione
    return () => {
      // Non disconnettiamo qui per mantenere la connessione
      // attraverso lo smontaggio del componente
    };
  }, []);
  
  return socketInstance;
};

// Ottieni l'istanza corrente del socket (se presente)
export const getSocket = (): Socket | null => {
  return socket;
};

// Chiudi e reimposta la connessione del socket
export const closeSocket = (): void => {
  if (socket) {
    console.log("prov da sockets.. Chiusura della connessione del socket");
    socket.disconnect();
    socket = null;
  }
};