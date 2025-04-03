import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import { Message, MessageType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import ChatApp from "@/components/chat/ChatApp";

console.log("Initializing ChatRoom component...from chatroom.tsx");

// Main ChatRoom component - simplified by following SimpleChatDemo approach
const ChatRoom = () => {
  console.log("Rendering ChatRoom component...from chatroom.tsx");

  const [location] = useLocation();
  const { toast } = useToast();

  // Socket and connection state
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // User and message state
  const [nickname, setNickname] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);

  // UI state
  const [showNicknameModal, setShowNicknameModal] = useState(true);
  const [nicknameError, setNicknameError] = useState<string | undefined>();
  const [roomInfo, setRoomInfo] = useState("");
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);

  // Parse the room ID from the URL or use 'lobby' as default
  const path = location.startsWith("/chat/") ? location.substring(6) : location.substring(1);
  const roomId = path || "lobby";

  // Riferimenti per evitare problemi con le closure
  const messagesRef = useRef(messages);
  const nicknameRef = useRef(nickname);

  // Aggiorna i riferimenti quando i valori cambiano
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    nicknameRef.current = nickname;
  }, [nickname]);

  console.log(`Parsed room ID: ${roomId} from chatroom.tsx`);

  // Funzione helper per verificare l'appartenenza alla stanza corrente
  const isMessageForThisRoom = useCallback((message: Message) =>
      message.roomId === roomId, [roomId]);

  // Funzione helper per gestire messaggi con logica uniforme
  const processMessage = useCallback((
      message: Message,
      isDuplicateCheck: (m: Message, currentMessages: Message[]) => boolean,
      uniqueConditionCheck: (m: Message) => boolean
  ) => {
    // Esci subito se il messaggio non è per questa stanza
    if (!isMessageForThisRoom(message)) return false;

    const currentMessages = messagesRef.current;
    const isDuplicate = isDuplicateCheck(message, currentMessages);
    const { isBroadcast } = message;

    // Logica di aggiornamento uniforme seguendo il comportamento originale
    if (!isDuplicate || !isBroadcast) {
      if (!isBroadcast && isDuplicate) {
        // Aggiorna il messaggio esistente
        setMessages(prev => prev.map(m => uniqueConditionCheck(m) ? message : m));
      } else if (!isDuplicate) {
        // Aggiungi nuovo messaggio
        setMessages(prev => [...prev, message]);
      }
      return true;
    }
    return false;
  }, [isMessageForThisRoom]);

  // Initialize the socket connection
  useEffect(() => {
    console.log("useEffect hook called: Initializing socket connection...");

    // Configurazione socket estratta in costante
    const SOCKET_CONFIG = {
      path: "/api/socket.io",
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5
    };

    const newSocket = io(window.location.origin, SOCKET_CONFIG);
    console.log("Socket created:", newSocket);

    // Eventi di connessione
    newSocket.on("connect", () => {
      console.log("Socket connected with ID:", newSocket.id);
      setIsConnected(true);
      setRoomInfo(`${window.location.host}/chat/${roomId}`);
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
      setHasJoinedRoom(false);
    });

    // Eventi della stanza
    newSocket.on("room:join", (data: { count: number }) => {
      console.log(`Joined room with ${data.count} users`);
      setOnlineCount(data.count);
      setHasJoinedRoom(true);

      const currentNickname = nicknameRef.current;
      toast({
        title: "Joined Successfully",
        description: `You've joined the chat room as ${currentNickname}`,
        variant: "default"
      });
    });

    newSocket.on("user:count", (count: number) => {
      console.log(`User count updated: ${count}`);
      setOnlineCount(count);
    });

    // Eventi messaggi chat normali
    newSocket.on("chat:message", (message: Message) => {
      console.log("Chat message received:", message);

      processMessage(
          message,
          // Controllo duplicati
          (m, currentMessages) => currentMessages.some(
              existingMsg => existingMsg.timestamp === m.timestamp &&
                  existingMsg.nickname === m.nickname &&
                  existingMsg.text === m.text
          ),
          // Condizione di unicità
          existingMsg => existingMsg.timestamp === message.timestamp &&
              existingMsg.nickname === message.nickname &&
              existingMsg.text === message.text
      );
    });

    // Eventi messaggi privati
    newSocket.on("chat:private", (message: Message) => {
      console.log("Private message received:", message);
      const currentNickname = nicknameRef.current;

      if (isMessageForThisRoom(message) &&
          (message.nickname === currentNickname || message.recipient === currentNickname)) {

        const wasProcessed = processMessage(
            message,
            // Controllo duplicati per messaggi privati
            (m, currentMessages) => currentMessages.some(
                existingMsg => existingMsg.timestamp === m.timestamp &&
                    existingMsg.nickname === m.nickname &&
                    existingMsg.text === m.text &&
                    existingMsg.recipient === m.recipient &&
                    existingMsg.type === MessageType.PRIVATE_MESSAGE
            ),
            // Condizione di unicità per messaggi privati
            existingMsg => existingMsg.timestamp === message.timestamp &&
                existingMsg.nickname === message.nickname &&
                existingMsg.text === message.text &&
                existingMsg.recipient === message.recipient &&
                existingMsg.type === MessageType.PRIVATE_MESSAGE
        );

        // Notifica per messaggi privati ricevuti (non inviati da me)
        if (wasProcessed && message.nickname !== currentNickname && !message.isBroadcast) {
          toast({
            title: `Private message from ${message.nickname}`,
            description: message.text,
            variant: "default"
          });
        }
      }
    });

    // Eventi presenza utenti
    newSocket.on("user:joined", (message: Message) => {
      console.log("User joined:", message);

      processMessage(
          message,
          // Controllo duplicati per user joined
          (m, currentMessages) => currentMessages.some(
              existingMsg => existingMsg.timestamp === m.timestamp &&
                  existingMsg.nickname === m.nickname &&
                  existingMsg.type === MessageType.USER_JOINED
          ),
          // Condizione di unicità per user joined
          existingMsg => existingMsg.timestamp === message.timestamp &&
              existingMsg.nickname === message.nickname &&
              existingMsg.type === MessageType.USER_JOINED
      );
    });

    newSocket.on("user:left", (message: Message) => {
      console.log("User left:", message);

      processMessage(
          message,
          // Controllo duplicati per user left
          (m, currentMessages) => currentMessages.some(
              existingMsg => existingMsg.timestamp === m.timestamp &&
                  existingMsg.nickname === m.nickname &&
                  existingMsg.type === MessageType.USER_LEFT
          ),
          // Condizione di unicità per user left
          existingMsg => existingMsg.timestamp === message.timestamp &&
              existingMsg.nickname === message.nickname &&
              existingMsg.type === MessageType.USER_LEFT
      );
    });

    // Eventi di errore
    newSocket.on("error:nickname", (data: { message: string }) => {
      console.error("Nickname error:", data);
      setNicknameError(data.message);
      setShowNicknameModal(true);
      toast({
        title: "Nickname Error",
        description: data.message,
        variant: "destructive"
      });
    });

    newSocket.on("error:message", (data: { message: string }) => {
      console.error("Message error:", data);
      toast({
        title: "Message Error",
        description: data.message,
        variant: "destructive"
      });
    });

    setSocket(newSocket);

    return () => {
      console.log("Cleaning up socket listeners");
      // Invia un evento di uscita se necessario
      if (newSocket.connected && nicknameRef.current) {
        newSocket.emit("user:leave", { roomId, nickname: nicknameRef.current });
      }
      newSocket.disconnect();
    };
  }, [roomId, toast, processMessage, isMessageForThisRoom]);

  // Handle joining a room with a nickname
  const handleSetNickname = (name: string) => {
    if (!name.trim()) return;

    if (!socket || !isConnected) {
      setNicknameError("Socket not connected yet. Please try again.");
      return;
    }

    console.log(`Attempting to join room: ${roomId} with nickname: ${name} from chatroom.tsx`);
    setNickname(name);
    setNicknameError(undefined);
    setShowNicknameModal(false);

    // Emit join event
    socket.emit("user:join", { roomId, nickname: name });
  };

  // Handle sending a chat message
  const handleSendMessage = (text: string) => {
    if (!socket || !isConnected || !nickname || !text.trim() || !hasJoinedRoom) return;

    console.log(`Sending message to room ${roomId}: ${text} from chatroom.tsx`);
    const privateMessagePrefix = "/pm ";
    if (text.startsWith(privateMessagePrefix)) {
      const textWithoutPrefix = text.substring(privateMessagePrefix.length);
      const firstSpaceIndex = textWithoutPrefix.indexOf(" ");

      if (firstSpaceIndex > 0) {
        const recipient = textWithoutPrefix.substring(0, firstSpaceIndex);
        const privateText = textWithoutPrefix.substring(firstSpaceIndex + 1);

        if (privateText.trim()) {
          sendPrivateMessage(recipient, privateText);
          return;
        }
      }

      toast({
        title: "Invalid Command",
        description: "To send a private message use: /pm username message",
        variant: "default"
      });
      return;
    }

    socket.emit("chat:message", {
      roomId,
      text,
      nickname,
      timestamp: new Date().toISOString(),
    });
  };

  // Handle sending a private message
  const sendPrivateMessage = (recipient: string, text: string) => {
    if (!socket || !isConnected || !nickname || !text.trim() || !hasJoinedRoom) return;

    console.log(`Sending private message to ${recipient}: ${text} from chatroom.tsx`);
    socket.emit("chat:private", {
      roomId,
      text,
      nickname,
      recipient,
      type: MessageType.PRIVATE_MESSAGE,
      timestamp: new Date().toISOString(),
    });
  };

  // Render the UI
  return (
      <div>
        {showNicknameModal ? (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg shadow-xl p-6 w-11/12 max-w-md mx-auto">
                <h2 className="text-xl font-semibold text-gray-800 mb-4">Welcome to the Chat</h2>
                <p className="text-gray-600 mb-4">Please enter a nickname to start chatting in room: <span className="font-semibold">{roomId}</span></p>

                {nicknameError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
                      {nicknameError}
                    </div>
                )}

                <form onSubmit={(e) => {
                  e.preventDefault();
                  const input = e.currentTarget.querySelector('input') as HTMLInputElement;
                  const value = input?.value;
                  if (value) handleSetNickname(value);
                }}>
                  <div className="mb-4">
                    <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">Nickname</label>
                    <input
                        type="text"
                        id="nickname"
                        className={`w-full rounded-lg border ${nicknameError ? 'border-red-300' : 'border-gray-300'} py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
                        placeholder="Enter your nickname"
                        required
                    />
                  </div>
                  <button
                      type="submit"
                      className="w-full bg-primary hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                      disabled={!socket || !isConnected}
                  >
                    {socket && isConnected ? "Join Chat" : "Connecting..."}
                  </button>
                </form>
              </div>
            </div>
        ) : (
            <ChatApp
                isConnected={isConnected}
                nickname={nickname}
                messages={messages}
                onlineCount={onlineCount}
                roomInfo={roomInfo}
                showNicknameModal={false}
                nicknameError={nicknameError}
                onSetNickname={handleSetNickname}
                onSendMessage={handleSendMessage}
            />
        )}
      </div>
  );
};

export default ChatRoom;