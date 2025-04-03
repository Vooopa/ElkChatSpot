import { useState, useEffect, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import type { Message, WebpageVisitor } from "@shared/schema";
import { UserStatus, normalizeUrl, MessageType } from "@shared/schema";
import WebpageVisitorsList from "@/components/chat/WebpageVisitorsList";
import NewWebpageVisitorsList from "@/components/chat/NewWebpageVisitorsList";
import WebpageUrlInput from "@/components/chat/WebpageUrlInput";
import NicknameModal from "@/components/chat/NicknameModal";
import PrivateChatDialog from "@/components/chat/PrivateChatDialog";
import WebpagePreview from "@/components/chat/WebpagePreview";
import MessageInput from "@/components/chat/MessageInput";
import MessageArea from "@/components/chat/MessageArea";
import Header from "@/components/chat/Header";
import ChatTabs, { ChatTab } from "@/components/chat/ChatTabs";
import { ArrowLeft, GlobeIcon, PlusCircle } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { CustomNotification } from "@/components/ui/custom-notification";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Funzione per riprodurre la notifica sonora
const playNotificationSound = () => {
  try {
    console.log("🔊 Riproduzione suono di notifica");
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

    const playTone = (freq: number, duration: number, delay: number = 0) => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.value = freq;

        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);

        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);

        oscillator.start();
        setTimeout(() => oscillator.stop(), duration * 1000);
      }, delay);
    };

    playTone(880, 0.15);
    playTone(660, 0.2, 150);
  } catch (e) {
    console.error("🔊 Errore nella riproduzione audio", e);
  }
};

const WebpageRoom = () => {
  // Hooks per la gestione della navigazione e delle notifiche
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Modifica l'inizializzazione del socket nel client WebpageRoom.tsx
  // 1. Prima dichiara lo stato React per il socket
  const [socket, setSocket] = useState<Socket | null>(null);

// 2. Poi usa useEffect per inizializzare il socket
  useEffect(() => {
    // Crea l'istanza del socket
    const newSocket = io(window.location.origin, {
      path: "/api/socket.io"
    });



    // Imposta il socket nello stato
    setSocket(newSocket);

    // Funzione di cleanup quando il componente viene smontato
    return () => {
      if (newSocket) {
        newSocket.disconnect();
      }
    };
  }, []); // Esegui solo all'inizializzazione



  console.log("WebpageRoom inizializzato, params:", params);

  // Estrai l'URL dal parametro della route
  // In questo caso specifico, il parametro è "url*" o il primo elemento dell'array
  const urlFromParams = params["url*"] || params[0] || "";
  const decodedUrl = urlFromParams ? decodeURIComponent(urlFromParams) : "";

  console.log("URL decodificato:", decodedUrl);

  // Socket e stato della connessione

  const [isConnected, setIsConnected] = useState(false);

  // Stato dell'UI
  const [showUrlInput, setShowUrlInput] = useState(!decodedUrl);
  const [showNicknameModal, setShowNicknameModal] = useState(!!decodedUrl);
  const [nicknameError, setNicknameError] = useState<string | undefined>();

  // Stato utente e pagina
  const [nickname, setNickname] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [visitors, setVisitors] = useState<WebpageVisitor[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [url, setUrl] = useState<string>(decodedUrl);
  const [currentUser, setCurrentUser] = useState<string>("");
  const [activeTab, setActiveTab] = useState<ChatTab>("chat");

  // Stato chat privata
  const [privateChatOpen, setPrivateChatOpen] = useState(false);
  const [privateChatRecipient, setPrivateChatRecipient] = useState<string | null>(null);
  const [privateChatMessages, setPrivateChatMessages] = useState<Record<string, Message[]>>({});
  const [unreadPrivateMessages, setUnreadPrivateMessages] = useState<Record<string, number>>({});

  // Identificatore univoco per l'utente corrente (generato casualmente)
  const [userId] = useState<string>(() =>
      `user_${Math.random().toString(36).substring(2, 9)}`
  );

  // Controllo preventivo di nickname già presenti
  const handleNicknameSubmit = useCallback((name: string) => {
    if (!socket) {
      console.error("Socket non disponibile");
      return;
    }

    // Controllo per nickname vuoto
    if (!name.trim()) {
      setNicknameError("Il nickname non può essere vuoto");
      return;
    }

    // Controllo per nickname già in uso
    const existingNickname = visitors.some(v =>
        v.nickname.toLowerCase() === name.toLowerCase() &&
        v.userId !== userId
    );

    if (existingNickname) {
      setNicknameError("Questo nickname è già in uso");
      return;
    }

    setNickname(name);
    setShowNicknameModal(false);

    // Invia il nickname al server
    socket.emit("user:nickname", name);

    // Aggiungi utente alla lista dei visitatori con il nickname specificato
    const newVisitor: WebpageVisitor = {
      userId,
      nickname: name,
      status: UserStatus.Online,
      lastSeen: new Date()
    };

    setVisitors(prev => [...prev.filter(v => v.userId !== userId), newVisitor]);

    // Aggiorna l'utente corrente
    setCurrentUser(userId);
  }, [socket, userId, visitors]);

  const handleSetUrl = useCallback((newUrl: string) => {
    // Normalizza l'URL (aggiungi https:// se necessario)
    const normalizedUrl = normalizeUrl(newUrl);

    // Imposta l'URL e nascondi l'input URL
    setUrl(normalizedUrl);
    setShowUrlInput(false);

    // Mostra il modale del nickname
    setShowNicknameModal(true);

    // Aggiorna l'URL nella barra degli indirizzi
    setLocation(`/room/${encodeURIComponent(normalizedUrl)}`);
  }, [setLocation]);

  const sendMessage = useCallback((content: string, type: MessageType = MessageType.Text) => {
    if (!socket || !nickname || !content.trim()) return;

    // Crea l'oggetto messaggio
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      roomId: roomId || url,
      sender: nickname,
      senderId: userId,
      content,
      type,
      timestamp: new Date()
    };

    // Invia al server
    socket.emit("message:send", message);

    // Aggiorna la UI localmente (per risposta immediata)
    setMessages(prev => [...prev, message]);
  }, [socket, nickname, userId, roomId, url]);

  const sendPrivateMessage = useCallback((recipientId: string, content: string) => {
    if (!socket || !nickname || !content.trim() || !recipientId) return;

    // Trova il nickname del destinatario
    const recipient = visitors.find(v => v.userId === recipientId);
    if (!recipient) return;

    // Crea l'oggetto messaggio privato
    const privateMessage: Message = {
      id: `pm_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      roomId: roomId || url,
      sender: nickname,
      senderId: userId,
      recipient: recipient.nickname,
      recipientId,
      content,
      type: MessageType.Private,
      timestamp: new Date()
    };

    // Invia al server
    socket.emit("message:private", privateMessage);

    // Aggiorna la UI localmente
    setPrivateChatMessages(prev => ({
      ...prev,
      [recipientId]: [...(prev[recipientId] || []), privateMessage]
    }));
  }, [socket, nickname, userId, roomId, url, visitors]);

  const openPrivateChat = useCallback((recipientId: string) => {
    const recipient = visitors.find(v => v.userId === recipientId);
    if (!recipient) return;

    setPrivateChatRecipient(recipientId);
    setPrivateChatOpen(true);

    // Resetta i messaggi non letti per questo destinatario
    setUnreadPrivateMessages(prev => ({
      ...prev,
      [recipientId]: 0
    }));
  }, [visitors]);

  // Inizializzazione della connessione socket
  useEffect(() => {
    if (!url) return;

    // Inizializza la connessione socket
    const newSocket = io(`${window.location.origin}`, {
      path: "/api/socket.io",
      transports: ["websocket", "polling"],
      query: {
        room: url
      }
    });

    setSocket(newSocket);

    // Configurazione degli eventi socket
    newSocket.on("connect", () => {
      console.log("Socket connesso", newSocket.id);
      setIsConnected(true);
      setRoomId(url);

      // Se l'utente ha già un nickname, invialo
      if (nickname) {
        newSocket.emit("user:nickname", nickname);
      }

      // Unisciti alla stanza
      newSocket.emit("room:join", { room: url });
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnesso");
      setIsConnected(false);
    });

    // Cleanup alla disconnessione o cambio URL
    return () => {
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [url, nickname]);

  // Gestione degli eventi socket relativi ai messaggi
  useEffect(() => {
    if (!socket) return;

    // Gestione messaggi pubblici
    socket.on("message:new", (message: Message) => {
      setMessages(prev => [...prev, message]);

      // Se il messaggio è da un altro utente, riproduci il suono
      if (message.senderId !== userId) {
        playNotificationSound();

        // Mostra notifica se la tab non è attiva
        if (document.hidden) {
          new Notification(`Nuovo messaggio da ${message.sender}`, {
            body: message.content
          });
        }
      }
    });

    // Gestione messaggi privati
    socket.on("message:private", (message: Message) => {
      if (!message.recipientId || !message.senderId) return;

      // Aggiungi il messaggio alla conversazione privata
      const chatPartnerId = message.senderId === userId
          ? message.recipientId
          : message.senderId;

      setPrivateChatMessages(prev => ({
        ...prev,
        [chatPartnerId]: [...(prev[chatPartnerId] || []), message]
      }));

      // Se il messaggio è in arrivo e la chat non è aperta, incrementa il contatore
      if (message.senderId !== userId &&
          (!privateChatOpen || privateChatRecipient !== message.senderId)) {
        setUnreadPrivateMessages(prev => ({
          ...prev,
          [message.senderId]: (prev[message.senderId] || 0) + 1
        }));

        // Riproduci notifica sonora
        playNotificationSound();

        // Mostra toast di notifica
        toast({
          title: `Messaggio privato da ${message.sender}`,
          description: message.content,
          variant: "default",
          action: (
              <Button
                  variant="outline"
                  onClick={() => openPrivateChat(message.senderId!)}
              >
                Rispondi
              </Button>
          )
        });
      }
    });

    // Ottieni la cronologia dei messaggi
    socket.on("room:history", (history: Message[]) => {
      setMessages(history);

      // Estrai anche i messaggi privati dalla cronologia
      const privateMessages: Record<string, Message[]> = {};

      history.forEach(msg => {
        if (msg.type === MessageType.Private && (msg.senderId === userId || msg.recipientId === userId)) {
          const chatPartnerId = msg.senderId === userId ? msg.recipientId! : msg.senderId!;

          privateMessages[chatPartnerId] = [
            ...(privateMessages[chatPartnerId] || []),
            msg
          ];
        }
      });

      setPrivateChatMessages(privateMessages);
    });

    // Aggiornamento lista visitatori
    socket.on("room:visitors", (roomVisitors: WebpageVisitor[]) => {
      setVisitors(roomVisitors);
    });

    // Cleanup
    return () => {
      socket.off("message:new");
      socket.off("message:private");
      socket.off("room:history");
      socket.off("room:visitors");
    };
  }, [socket, userId, nickname, privateChatOpen, privateChatRecipient, toast, openPrivateChat]);

  console.log("Rendering component with state:", {
    showUrlInput,
    showNicknameModal,
    url,
    decodedUrl,
    nickname
  });

  // Gestione permessi notifiche
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'granted') {
      // Richiedi permesso per le notifiche
      Notification.requestPermission();
    }
  }, []);

  // Visualizza la schermata di input URL se necessario
  if (showUrlInput) {
    return (
        <div className="flex flex-col h-screen bg-gray-50 p-4">
          <div className="flex items-center mb-6">
            <Link href="/">
              <a className="mr-4">
                <ArrowLeft className="h-5 w-5" />
              </a>
            </Link>
            <h1 className="text-xl font-semibold">Chat su pagina web</h1>
          </div>

          <WebpageUrlInput onSubmit={handleSetUrl} />
        </div>
    );
  }

  return (
      <div className="flex flex-col h-screen bg-gray-50">
        <Header
            title={url || "Chat Room"}
            subtitle={nickname ? `Come ${nickname}` : undefined}
            showBackButton
        />

        <div className="flex flex-1 overflow-hidden">
          <div className="flex flex-col flex-1">
            <ChatTabs
                activeTab={activeTab}
                onChange={setActiveTab}
                unreadPrivateMessages={Object.values(unreadPrivateMessages).reduce((a, b) => a + b, 0)}
            />

            <div className="flex-1 overflow-hidden">
              {activeTab === "chat" && (
                  <div className="h-full flex flex-col">
                    <MessageArea
                        messages={messages}
                        currentUserId={userId}
                        visitors={visitors}
                    />
                    <MessageInput
                        onSendMessage={(content) => sendMessage(content)}
                        isConnected={isConnected}
                        disabled={!nickname}
                    />
                  </div>
              )}

              {activeTab === "online" && (
                  <NewWebpageVisitorsList
                      visitors={visitors}
                      currentUserId={userId}
                      onStartPrivateChat={openPrivateChat}
                  />
              )}

              {activeTab === "webpage" && (
                  <WebpagePreview url={url} />
              )}
            </div>
          </div>
        </div>

        {/* Modal per l'inserimento del nickname */}
        {showNicknameModal && (
            <NicknameModal
                isOpen={showNicknameModal}
                onSetNickname={handleNicknameSubmit}
                error={nicknameError}
            />
        )}

        {/* Dialog per la chat privata */}
        {privateChatOpen && privateChatRecipient && (
            <PrivateChatDialog
                isOpen={privateChatOpen}
                onClose={() => setPrivateChatOpen(false)}
                recipient={visitors.find(v => v.userId === privateChatRecipient)?.nickname || ""}
                recipientId={privateChatRecipient}
                messages={privateChatMessages[privateChatRecipient] || []}
                onSendMessage={(content) => sendPrivateMessage(privateChatRecipient, content)}
                currentUserId={userId}
            />
        )}
      </div>
  );
};

export default WebpageRoom;