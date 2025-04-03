import { io } from "socket.io-client";

// Configura il client socket.io
const socket = io("http://127.0.0.1:3000/api",
{
    path: "/api/socket.io",  // Questo deve corrispondere al percorso impostato nel server
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
});

// Opzionale: aggiunge log per il debug
socket.on("connect", () => {
    console.log("Socket.io connesso con successo!");
});

socket.on("connect_error", (error) => {
    console.error("Errore di connessione Socket.io:", error);
});

export default socket;
