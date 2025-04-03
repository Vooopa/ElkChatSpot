import { useState, useEffect, FormEvent, useRef } from "react";
import { io, Socket } from "socket.io-client";

// Definizione dei tipi per i messaggi
interface MessageBase {
  text: string;
  timestamp?: string;
  type?: "user" | "system";
}

interface UserMessage extends MessageBase {
  nickname: string;
  type: "user";
}

interface SystemMessage extends MessageBase {
  type: "system";
}

type Message = UserMessage | SystemMessage;

// Numero massimo di messaggi da mantenere nello stato
const MAX_MESSAGES = 100;

// Durata visualizzazione errori (in millisecondi)
const ERROR_TIMEOUT = 5000;

export default function SimpleChatDemo() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [error, setError] = useState("");
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const [joiningRoom, setJoiningRoom] = useState(false);
  const [sendingMessage, setSendingMessage] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const roomId = "demo-room";
  const errorTimeoutRef = useRef<number | null>(null);

  // Funzione per cancellare l'errore dopo un timeout
  const clearErrorAfterTimeout = () => {
    if (errorTimeoutRef.current) {
      window.clearTimeout(errorTimeoutRef.current);
    }

    errorTimeoutRef.current = window.setTimeout(() => {
      setError("");
      errorTimeoutRef.current = null;
    }, ERROR_TIMEOUT);
  };

  // Funzione per scrollare automaticamente in basso quando arrivano nuovi messaggi
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Connette il socket e gestisce gli eventi
  useEffect(() => {
    setConnecting(true);

    // Crea una nuova connessione socket
    const newSocket = io(window.location.origin, {
      path: "/api/socket.io",
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5
    });

    // Gestori di eventi
    const onConnect = () => {
      console.log("Simple demo socket connected with ID:", newSocket.id);
      setConnected(true);
      setConnecting(false);
      setError("");
    };

    const onDisconnect = () => {
      console.log("Simple demo socket disconnected");
      setConnected(false);
      setConnecting(true);
    };

    const onChatMessage = (messageData: UserMessage) => {
      console.log("Message received:", messageData);
      setMessages(prev => [...prev.slice(-MAX_MESSAGES + 1), {
        ...messageData,
        type: "user"
      }]);
    };

    const onUserJoined = (messageData: SystemMessage) => {
      console.log("User joined:", messageData);
      setMessages(prev => [...prev.slice(-MAX_MESSAGES + 1), messageData]);
    };

    const onUserLeft = (messageData: SystemMessage) => {
      console.log("User left:", messageData);
      setMessages(prev => [...prev.slice(-MAX_MESSAGES + 1), messageData]);
    };

    const onRoomJoin = (data: { count: number }) => {
      console.log("Joined room successfully:", data);
      setHasJoinedRoom(true);
      setJoiningRoom(false);
      setMessages(prev => [...prev.slice(-MAX_MESSAGES + 1), {
        text: `Ti sei unito alla stanza con ${data.count} altri utenti`,
        type: "system",
        timestamp: new Date().toISOString()
      }]);
    };

    const onNicknameError = (data: { message: string }) => {
      console.error("Nickname error:", data.message);
      setError(data.message);
      setJoiningRoom(false);
      clearErrorAfterTimeout();
    };

    const onConnectError = (err: Error) => {
      console.error("Connection error:", err);
      setError(`Errore di connessione: ${err.message}`);
      setConnecting(false);
      clearErrorAfterTimeout();
    };

    // Registra gli event listeners
    newSocket.on("connect", onConnect);
    newSocket.on("disconnect", onDisconnect);
    newSocket.on("chat:message", onChatMessage);
    newSocket.on("user:joined", onUserJoined);
    newSocket.on("user:left", onUserLeft);
    newSocket.on("room:join", onRoomJoin);
    newSocket.on("error:nickname", onNicknameError);
    newSocket.on("connect_error", onConnectError);

    // Salva il socket nello stato
    setSocket(newSocket);

    // Funzione di pulizia
    return () => {
      console.log("Pulizia del socket");
      newSocket.off("connect", onConnect);
      newSocket.off("disconnect", onDisconnect);
      newSocket.off("chat:message", onChatMessage);
      newSocket.off("user:joined", onUserJoined);
      newSocket.off("user:left", onUserLeft);
      newSocket.off("room:join", onRoomJoin);
      newSocket.off("error:nickname", onNicknameError);
      newSocket.off("connect_error", onConnectError);
      newSocket.disconnect();

      if (errorTimeoutRef.current) {
        window.clearTimeout(errorTimeoutRef.current);
      }
    };
  }, []);

  // Gestisce l'ingresso nella stanza
  const handleJoinRoom = (e: FormEvent) => {
    e.preventDefault();

    if (!socket || !connected) {
      setError("Socket non connesso, attendere prego...");
      clearErrorAfterTimeout();
      return;
    }

    if (!nickname.trim()) {
      setError("Inserisci un nickname");
      clearErrorAfterTimeout();
      return;
    }

    if (nickname.trim().length < 3 || nickname.trim().length > 20) {
      setError("Il nickname deve essere tra 3 e 20 caratteri");
      clearErrorAfterTimeout();
      return;
    }

    setJoiningRoom(true);
    console.log(`Emissione evento user:join con roomId=${roomId}, nickname=${nickname}`);
    socket.emit("user:join", { roomId, nickname });
  };

  // Gestisce l'invio dei messaggi
  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();

    if (!socket || !connected) {
      setError("Socket non connesso, attendere prego...");
      clearErrorAfterTimeout();
      return;
    }

    if (!hasJoinedRoom) {
      setError("Unisciti prima alla stanza");
      clearErrorAfterTimeout();
      return;
    }

    if (!message.trim()) {
      return;
    }

    setSendingMessage(true);
    console.log(`Invio messaggio alla stanza ${roomId}: ${message}`);

    // Preparazione messaggio
    const messageData = {
      roomId,
      text: message,
      nickname,
      timestamp: new Date().toISOString(),
      type: "user" as const
    };

    // Tentativo di invio con feedback in caso di errore
    socket.timeout(5000).emit("chat:message", messageData, (err: Error | null) => {
      setSendingMessage(false);

      if (err) {
        console.error("Errore nell'invio del messaggio:", err);
        setError("Impossibile inviare il messaggio. Riprova.");
        clearErrorAfterTimeout();
        return;
      }

      setMessage("");
    });
  };

  return (
      <div className="max-w-3xl mx-auto p-4">
        <h1 className="text-2xl font-bold mb-4">Demo Chat Semplice</h1>

        <div className="mb-4 p-2 border rounded bg-gray-100">
          <p>
            Stato: <span className={
            connecting ? "text-yellow-600 font-bold" :
                connected ? "text-green-600 font-bold" : "text-red-600 font-bold"
          }>
            {connecting ? "In connessione..." : (connected ? "Connesso" : "Disconnesso")}
          </span>
          </p>
          <p>ID Socket: {socket?.id || "Nessuno"}</p>
        </div>

        {error && (
            <div
                className="mb-4 p-3 bg-red-100 border border-red-300 text-red-600 rounded"
                role="alert"
            >
              {error}
            </div>
        )}

        {!hasJoinedRoom ? (
            <div className="mb-6 p-4 border rounded shadow-sm">
              <h2 className="text-xl font-semibold mb-2">Unisciti alla stanza chat</h2>
              <form onSubmit={handleJoinRoom} className="space-y-4">
                <div>
                  <label htmlFor="nickname" className="block text-sm font-medium mb-1">Nickname</label>
                  <input
                      id="nickname"
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full p-2 border rounded focus:ring focus:ring-blue-300 focus:border-blue-500"
                      placeholder="Inserisci il tuo nickname"
                      minLength={3}
                      maxLength={20}
                      required
                      aria-describedby="nickname-constraints"
                      disabled={joiningRoom}
                  />
                  <p id="nickname-constraints" className="text-xs text-gray-500 mt-1">
                    Il nickname deve essere tra 3 e 20 caratteri
                  </p>
                </div>
                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    disabled={!connected || joiningRoom}
                    aria-busy={joiningRoom}
                >
                  {joiningRoom ? "Entrando..." : "Entra nella Chat"}
                </button>
              </form>
            </div>
        ) : (
            <div className="space-y-4">
              <div
                  className="border rounded shadow-sm h-64 overflow-y-auto p-4 bg-white"
                  aria-live="polite"
                  aria-atomic="false"
                  aria-relevant="additions"
              >
                {messages.length === 0 && (
                    <p className="text-gray-500 italic">Nessun messaggio ancora. Sii il primo a scrivere!</p>
                )}

                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`mb-2 p-2 rounded ${
                            msg.type === "system" ? "bg-gray-100" :
                                msg.nickname === nickname ? "bg-blue-100 text-right" : "bg-gray-100"
                        }`}
                    >
                      {msg.type === "user" && <span className="font-bold">{msg.nickname}: </span>}
                      {msg.text}
                      {msg.timestamp && (
                          <div className="text-xs text-gray-500 mt-1">
                            {new Date(msg.timestamp).toLocaleTimeString()}
                          </div>
                      )}
                    </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              <form onSubmit={handleSendMessage} className="flex space-x-2">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="flex-1 p-2 border rounded focus:ring focus:ring-blue-300 focus:border-blue-500"
                    placeholder="Scrivi il tuo messaggio..."
                    disabled={!connected || !hasJoinedRoom || sendingMessage}
                    maxLength={500}
                />
                <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                    disabled={!connected || !hasJoinedRoom || !message.trim() || sendingMessage}
                    aria-busy={sendingMessage}
                >
                  {sendingMessage ? "Invio..." : "Invia"}
                </button>
              </form>
            </div>
        )}
      </div>
  );
}