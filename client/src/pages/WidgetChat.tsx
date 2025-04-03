import { useCallback, useEffect, useState } from "react";
import { useParams } from "wouter";
import { Message, MessageType, UserStatus } from "@shared/schema";
import { Socket, io } from "socket.io-client";
import MessageArea from "@/components/chat/MessageArea";
import MessageInput from "@/components/chat/MessageInput";
import NicknameModal from "@/components/chat/NicknameModal";
import { cn } from "@/lib/utils";
import { normalizeUrl } from "@shared/schema";
import "../widget/widget.css";

/**
 * Estensione dell'interfaccia Message con le proprietà del server
 */
interface ExtendedMessage extends Message {
  isBroadcast?: boolean;
  roomBroadcast?: boolean;
}

/**
 * WidgetChat - Un componente chat leggero progettato per essere incorporato in un iframe
 * per la funzionalità del widget di chat incorporato
 */
export default function WidgetChat() {
  const params = useParams<{ url?: string }>();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [nickname, setNickname] = useState<string>("");
  const [roomId, setRoomId] = useState<string>("");
  const [pageUrl, setPageUrl] = useState<string>("");
  const [pageTitle, setPageTitle] = useState<string>("");
  const [showNicknameModal, setShowNicknameModal] = useState(true);
  const [onlineCount, setOnlineCount] = useState(0);

  // Definizione dei gestori di eventi con useCallback
  const onChatMessage = useCallback((message: ExtendedMessage) => {
    console.log("Chat message received:", message);

    // Verifica se questo messaggio è per la nostra stanza
    if (message.roomId === roomId ||
        (roomId && message.roomId && normalizeUrl(message.roomId) === normalizeUrl(roomId))) {
      // Verifica se abbiamo già questo messaggio per evitare duplicati
      setMessages(prev => {
        const isDuplicate = prev.some(
            m => m.timestamp === message.timestamp &&
                m.nickname === message.nickname &&
                m.text === message.text
        );

        // Gestione semplificata dei messaggi - ora esistono solo broadcast di stanza
        if (!isDuplicate) {
          return [...prev, message];
        }
        console.log("Skipping duplicate chat message");
        return prev;
      });
    }
  }, [roomId]);

  const onVisitorJoined = useCallback((message: ExtendedMessage) => {
    console.log("Visitor joined:", message);

    // Verifica sia la corrispondenza esatta che la corrispondenza URL normalizzata per roomId
    if (message.roomId === roomId ||
        (roomId && message.roomId && normalizeUrl(message.roomId) === normalizeUrl(roomId))) {
      // Verifica se abbiamo già questo messaggio per evitare duplicati
      setMessages(prev => {
        const isDuplicate = prev.some(
            m => m.timestamp === message.timestamp &&
                m.nickname === message.nickname &&
                m.type === MessageType.USER_JOINED
        );

        if (!isDuplicate) {
          return [...prev, message];
        }
        console.log("Skipping duplicate visitor join message");
        return prev;
      });
    }
  }, [roomId]);

  const onVisitorLeft = useCallback((message: ExtendedMessage) => {
    console.log("Visitor left:", message);

    // Verifica sia la corrispondenza esatta che la corrispondenza URL normalizzata per roomId
    if (message.roomId === roomId ||
        (roomId && message.roomId && normalizeUrl(message.roomId) === normalizeUrl(roomId))) {
      // Verifica se abbiamo già questo messaggio per evitare duplicati
      setMessages(prev => {
        const isDuplicate = prev.some(
            m => m.timestamp === message.timestamp &&
                m.nickname === message.nickname &&
                m.type === MessageType.USER_LEFT
        );

        if (!isDuplicate) {
          return [...prev, message];
        }
        console.log("Skipping duplicate visitor left message");
        return prev;
      });
    }
  }, [roomId]);

  // Inizializza la connessione socket direttamente
  useEffect(() => {
    // Crea un nuovo socket con le stesse opzioni utilizzate in SimpleChatDemo
    const newSocket = io(window.location.origin, {
      path: "/api/socket.io",
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5
    });

    // Gestione degli errori di connessione
    newSocket.on("connect_error", (error) => {
      console.error("Socket connection error:", error);
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Connettiti alla stanza quando socket e nickname sono disponibili
  useEffect(() => {
    if (!socket || !nickname || !params.url) return;

    let url: string;
    let messageHandler: ((event: MessageEvent) => void) | null = null;
    let titleRequestTimeout: ReturnType<typeof setTimeout> | null = null;

    try {
      url = decodeURIComponent(params.url);

      // Valida e normalizza l'URL
      url = normalizeUrl(url);
      setPageUrl(url);

      // Unisciti alla chat room per questo URL
      socket.emit("webpage:join", { url, nickname });

      // Prova a ottenere il titolo della pagina dalla finestra principale se possibile
      try {
        // Ascolta il messaggio dalla finestra principale con il titolo della pagina
        messageHandler = (event: MessageEvent) => {
          if (event.data?.type === 'PAGE_TITLE') {
            setPageTitle(event.data.title);
            // Cancella il timeout una volta ottenuto il titolo
            if (titleRequestTimeout) {
              clearTimeout(titleRequestTimeout);
            }
          }
        };

        window.addEventListener('message', messageHandler);

        // Imposta l'origine se possibile per una migliore sicurezza
        const targetOrigin = new URL(url).origin;
        const postMessageOrigin = targetOrigin || '*';

        // Richiedi il titolo della pagina al genitore
        window.parent.postMessage({ type: 'REQUEST_PAGE_TITLE' }, postMessageOrigin);

        // Imposta il timeout per la richiesta del titolo
        titleRequestTimeout = setTimeout(() => {
          console.log("Title request timed out");
        }, 5000); // 5 secondi di timeout

      } catch (e) {
        // Impossibile ottenere il titolo dalla finestra principale, continua senza di esso
        console.error("Unable to communicate with parent window:", e);
      }

      // Ascolta l'assegnazione dell'ID stanza
      socket.on("webpage:room", (data: { roomId: string }) => {
        if (data && typeof data.roomId === 'string') {
          setRoomId(data.roomId);
        }
      });

      // Ascolta il titolo della stanza
      socket.on("webpage:title", (data: { title: string }) => {
        if (data && typeof data.title === 'string' && !pageTitle) {
          setPageTitle(data.title);
        }
      });

      // Ascolta gli aggiornamenti del conteggio degli utenti online
      socket.on("webpage:userCount", (count: number) => {
        if (typeof count === 'number') {
          setOnlineCount(count);
        }
      });

      // Gestisci lo stato della connessione
      socket.on("connect", () => setIsConnected(true));
      socket.on("disconnect", () => setIsConnected(false));

      // Gestori di eventi per diversi tipi di messaggio
      socket.on("chat:message", onChatMessage);
      socket.on("visitor:joined", onVisitorJoined);
      socket.on("visitor:left", onVisitorLeft);

    } catch (error) {
      console.error("Invalid URL format:", error);
      setMessages([
        {
          roomId: "error",
          text: "Invalid URL format. Please check the URL and try again.",
          type: MessageType.SYSTEM
        }
      ]);
    }

    // Funzione di pulizia unificata
    return () => {
      // Pulisci il listener di eventi dei messaggi se è stato aggiunto
      if (messageHandler) {
        window.removeEventListener('message', messageHandler);
      }

      // Cancella eventuali timeout in sospeso
      if (titleRequestTimeout) {
        clearTimeout(titleRequestTimeout);
      }

      // Pulisci i listener socket solo se la socket esiste
      if (socket) {
        // Pulisci i listener di eventi
        socket.off("webpage:room");
        socket.off("webpage:title");
        socket.off("webpage:userCount");
        socket.off("chat:message");
        socket.off("visitor:joined");
        socket.off("visitor:left");
        socket.off("connect");
        socket.off("disconnect");

        // Lascia la stanza di chat se ne abbiamo unito una
        if (roomId) {
          socket.emit("webpage:leave", { roomId });
        }
      }
    };
  }, [socket, nickname, params.url, pageTitle, roomId, onChatMessage, onVisitorJoined, onVisitorLeft]);

  const handleSetNickname = (name: string) => {
    setNickname(name);
    setShowNicknameModal(false);

    // Se abbiamo già una connessione socket e un URL, unisciti alla stanza ora
    if (socket && params.url) {
      try {
        const url = decodeURIComponent(params.url);
        socket.emit("webpage:join", { url: normalizeUrl(url), nickname: name });
      } catch (error) {
        console.error("Error joining room:", error);
      }
    }
  };

  const handleSendMessage = (text: string) => {
    if (!socket || !roomId || !text.trim()) return;

    try {
      const message: Message = {
        roomId,
        nickname,
        text,
        type: MessageType.USER_MESSAGE
      };

      socket.emit("chat:message", message);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Aggiorna lo stato per l'utente (non necessario nella versione widget)
  const handleSetStatus = (status: UserStatus) => {
    if (!socket || !roomId) return;
    try {
      socket.emit("webpage:updateStatus", { roomId, status });
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  return (
      <div className="flex flex-col h-screen bg-white">
        {/* Semplice intestazione per il widget */}
        <div className="bg-primary text-primary-foreground p-2 flex justify-between items-center">
          <div className="font-semibold truncate">
            {pageTitle || "Chat for " + (pageUrl || "this page")}
          </div>
          <div className="text-xs">
            {onlineCount} {onlineCount === 1 ? "person" : "people"} online
          </div>
        </div>

        {/* Indicatore stato connessione */}
        <div
            className={cn(
                "text-xs px-2 py-1 text-center",
                isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
            )}
        >
          {isConnected ? "Connected" : "Disconnected"}
        </div>

        {/* Area visualizzazione messaggi */}
        <div className="flex-1 overflow-y-auto p-3">
          <MessageArea messages={messages} currentUser={nickname} />
        </div>

        {/* Input messaggio */}
        <div className="p-2 border-t">
          <MessageInput onSendMessage={handleSendMessage} />
        </div>

        {/* Modale nickname */}
        {showNicknameModal && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <NicknameModal onSetNickname={handleSetNickname} />
            </div>
        )}
      </div>
  );
}