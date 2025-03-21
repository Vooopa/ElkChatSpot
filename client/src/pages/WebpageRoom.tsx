import { useState, useEffect } from "react";
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

// Migliorata la funzione di notifica sonora
const playNotificationSound = () => {
  try {
    console.log("🔊 Riproduzione suono di notifica");
    
    // Crea un contesto audio
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Suono più complesso e piacevole - due note in sequenza
    const playTone = (freq: number, duration: number, delay: number = 0) => {
      setTimeout(() => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.type = 'sine';
        oscillator.frequency.value = freq;
        
        // Fade in/out per un suono più piacevole
        gainNode.gain.setValueAtTime(0, audioContext.currentTime);
        gainNode.gain.linearRampToValueAtTime(0.2, audioContext.currentTime + 0.05);
        gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + duration);
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.start();
        setTimeout(() => oscillator.stop(), duration * 1000);
      }, delay);
    };
    
    // Suona due note in sequenza (suono di notifica tipo "ding-dong")
    playTone(880, 0.15); // La nota più alta
    playTone(660, 0.2, 150); // La nota più bassa, con ritardo
    
    console.log("🔊 Suono di notifica riprodotto");
  } catch (e) {
    console.error("🔊 Errore nella riproduzione audio", e);
  }
};

const WebpageRoom = () => {
  const params = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  // Socket and connection state
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // UI state
  const [showUrlInput, setShowUrlInput] = useState(true);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nicknameError, setNicknameError] = useState<string | undefined>();
  
  // User and page state
  const [nickname, setNickname] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [visitors, setVisitors] = useState<WebpageVisitor[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [url, setUrl] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<string>("");
  
  // Private chat state
  const [privateChatOpen, setPrivateChatOpen] = useState(false);
  const [privateChatRecipient, setPrivateChatRecipient] = useState("");
  
  // Custom notification state
  const [showCustomNotification, setShowCustomNotification] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState("");
  const [notificationFrom, setNotificationFrom] = useState("");
  
  // Array di utenti con cui è stato scambiato almeno un messaggio
  const [chatHistoryUsers, setChatHistoryUsers] = useState<string[]>([]);
  // Utenti che stanno scrivendo
  const [typingUsers, setTypingUsers] = useState<{[key: string]: boolean}>({});
  const [userTypingTimeouts, setUserTypingTimeouts] = useState<{[key: string]: NodeJS.Timeout}>({}); // Timeout per ogni utente

  // Tabs state
  const [tabs, setTabs] = useState<ChatTab[]>([
    { id: "main", url: "", title: "Chat Principale" }
  ]);
  const [activeTabId, setActiveTabId] = useState<string>("main");
  const [showNewTabDialog, setShowNewTabDialog] = useState(false);
  const [newTabUrl, setNewTabUrl] = useState<string>("");
  
  // State per tracciare chat e visitatori per ogni tab
  const [tabData, setTabData] = useState<{
    [key: string]: {
      messages: Message[];
      visitors: WebpageVisitor[];
      roomId: string | null;
      url: string;
      hasUnreadMessages?: boolean;
    }
  }>({
    main: {
      messages: [],
      visitors: [],
      roomId: null,
      url: "",
      hasUnreadMessages: false
    }
  });

  // Set up socket connection when the component loads
  useEffect(() => {
    // Create a new socket with the same options used in SimpleChatDemo
    const newSocket = io(window.location.origin, {
      path: "/api/socket.io",
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5
    });
    
    // Set up event listeners for connection status
    newSocket.on("connect", () => {
      console.log("Webpage socket connected with ID:", newSocket.id);
      setIsConnected(true);
      
      // Don't set currentUser to socket.id here
      // The currentUser should be the nickname which will be set when handleSetNickname is called
    });

    newSocket.on("disconnect", () => {
      console.log("Webpage socket disconnected");
      setIsConnected(false);
    });
    
    // Save socket to state
    setSocket(newSocket);

    // Clean up on unmount
    return () => {
      console.log("Cleaning up webpage socket");
      newSocket.disconnect();
    };
  }, []);

  // Parse URL from route parameters if present
  useEffect(() => {
    if (params.url) {
      try {
        let decodedUrl = decodeURIComponent(params.url);
        if (!decodedUrl.startsWith("http")) {
          decodedUrl = `https://${decodedUrl}`;
        }
        handleUrlSubmit(decodedUrl);
      } catch (error) {
        console.error("Failed to parse URL from params:", error);
      }
    }
  }, [params.url]);
  
  // Debug socket ID changes to help with troubleshooting
  useEffect(() => {
    if (socket) {
      console.log("Current socket ID:", socket.id);
    }
  }, [socket?.id]);

  // Set up socket event listeners when socket changes
  useEffect(() => {
    if (!socket) return;
    
    console.log("Setting up webpage event listeners...");
    
    // Create stable references to state setters to avoid dependency changes
    // These closures will always use the latest state values when called
    const updateNicknameError = (message: string) => {
      console.error("Nickname error:", message);
      setNicknameError(message);
      setShowNicknameModal(true);
    };
    
    const showMessageError = (message: string) => {
      console.error("Message error:", message);
      toast({
        title: "Message Error",
        description: message,
        variant: "destructive"
      });
    };
    
    const updateRoomInfo = (data: { roomId: string, url: string, title: string }) => {
      console.log("Received room info:", data);
      setRoomId(data.roomId);
      // Update URL route with room ID
      setLocation(`/webpage/${encodeURIComponent(data.url)}`);
    };
    
    const updateVisitorList = (roomVisitors: WebpageVisitor[]) => {
      console.log("Received visitor list:", roomVisitors);
      setVisitors(roomVisitors);
    };
    
    // Register event listeners with debugging
    socket.on("error:nickname", (data) => {
      console.log("Received error:nickname event", data);
      updateNicknameError(data.message);
    });
    
    socket.on("error:message", (data) => {
      console.log("Received error:message event", data);
      showMessageError(data.message);
    });
    
    socket.on("webpage:room", (data) => {
      console.log("Received webpage:room event", data);
      updateRoomInfo(data);
    });
    
    socket.on("webpage:visitors", (data) => {
      console.log("Received webpage:visitors event", data);
      updateVisitorList(data);
    });
    
    socket.on("webpage:userCount", (count) => {
      console.log("Received webpage:userCount event", count);
    });
    
    // Ascoltatore per il nuovo evento di notifica speciale
    socket.on("msg_notification", (message: Message) => {
      console.log("📣 RICEVUTO EVENTO SPECIALE DI NOTIFICA:", message);
      
      // Verifica se la chat privata è già aperta con questo utente
      const isChatAlreadyOpenWithSender = 
        privateChatOpen && 
        privateChatRecipient.toLowerCase() === (message.nickname || '').toLowerCase();
        
      console.log("Stato chat privata:", {
        privateChatOpen,
        privateChatRecipient,
        messageSender: message.nickname,
        isChatAlreadyOpenWithSender
      });
      
      // Se la chat è già aperta con il mittente, non mostrare notifiche
      if (isChatAlreadyOpenWithSender) {
        console.log("📣 Chat già aperta con", message.nickname, "- nessuna notifica necessaria");
        return; // Esci dalla funzione senza mostrare notifiche
      }
      
      // Riproduci suono di notifica solo se la chat non è già aperta
      playNotificationSound();
      
      // Utilizzo di notifica personalizzata
      try {
        if (message.nickname) {
          // Imposta il messaggio e mostra la notifica personalizzata
          setNotificationFrom(message.nickname);
          setNotificationMessage(`Hai ricevuto un messaggio da ${message.nickname}`);
          setShowCustomNotification(true);
          
          // Riproduci il suono di notifica
          playNotificationSound();
          
          console.log("📣 Mostro notifica personalizzata per evento msg_notification da", message.nickname);
          // La chat verrà aperta quando l'utente fa clic sul pulsante "Apri chat" nella notifica personalizzata
        }
      } catch (error) {
        console.error("Errore durante la visualizzazione della notifica:", error);
        
        // Fallback con toast
        toast({
          title: "Nuovo messaggio",
          description: `Hai ricevuto un messaggio da ${message.nickname}`,
          variant: "default"
        });
        
        // Comunque apri la chat
        if (message.nickname) {
          handleStartPrivateChat(message.nickname);
        }
      }
    });
    
    socket.on("chat:message", (message) => {
      console.log("🛑 [RICEVUTO] chat:message", message);
      logCurrentState("chat:message event");
      
      // ULTRA SEMPLICE - aggiungi il messaggio e basta
      console.log("🛑 MESSAGGIO NORMALE RICEVUTO!");
      
      // Aggiungi direttamente alla lista (duplicati inclusi)
      setMessages(prevMessages => {
        console.log(`🛑 Messaggi prima: ${prevMessages.length}, dopo: ${prevMessages.length + 1}`);
        return [...prevMessages, message];
      });
      
      // Forza un nuovo render manuale per verificare che setMessages funzioni
      // Questo è un hack, ma potrebbe aiutare a risolvere il problema
      setTimeout(() => {
        console.log("🛑 [FORZATO] Verifica messaggio aggiunto:", messages.length);
      }, 500);
    });
    
    // Gestione evento "utente sta scrivendo"
    socket.on("user:typing", (data: { roomId: string, nickname: string, isTyping: boolean }) => {
      console.log("👆 Evento typing ricevuto:", data);
      
      // Ignora gli eventi di digitazione provenienti dall'utente corrente
      if (data.nickname === nickname) return;
      
      if (data.isTyping) {
        // Imposta l'utente come "sta scrivendo"
        setTypingUsers(prev => ({
          ...prev,
          [data.nickname]: true
        }));
        
        // Cancella eventuali timeout esistenti per questo utente
        if (userTypingTimeouts[data.nickname]) {
          clearTimeout(userTypingTimeouts[data.nickname]);
        }
        
        // Imposta un nuovo timeout per rimuovere lo stato "sta scrivendo" dopo 3 secondi
        const timeoutId = setTimeout(() => {
          setTypingUsers(prev => {
            const newState = { ...prev };
            delete newState[data.nickname];
            return newState;
          });
          
          // Rimuovi anche il timeout stesso dall'oggetto dei timeout
          setUserTypingTimeouts(prev => {
            const newTimeouts = { ...prev };
            delete newTimeouts[data.nickname];
            return newTimeouts;
          });
        }, 3000);
        
        // Memorizza il riferimento al timeout
        setUserTypingTimeouts(prev => ({
          ...prev,
          [data.nickname]: timeoutId
        }));
      } else {
        // Rimuovi immediatamente lo stato "sta scrivendo"
        setTypingUsers(prev => {
          const newState = { ...prev };
          delete newState[data.nickname];
          return newState;
        });
        
        // Cancella eventuali timeout
        if (userTypingTimeouts[data.nickname]) {
          clearTimeout(userTypingTimeouts[data.nickname]);
          setUserTypingTimeouts(prev => {
            const newTimeouts = { ...prev };
            delete newTimeouts[data.nickname];
            return newTimeouts;
          });
        }
      }
    });

    socket.on("chat:private", (message) => {
      console.log("📩 [IMPORTANTE] Ricevuto messaggio privato", message);
      logCurrentState("chat:private event");
      
      // Semplifica al massimo il controllo
      const isToMe = message.recipient === nickname;
      const isFromMe = message.nickname === nickname;
      
      console.log(`📩 [PRIVATE] Dettagli messaggio:`, {
        isToMe, 
        isFromMe,
        myNickname: nickname, 
        messageFrom: message.nickname,
        messageTo: message.recipient
      });
      
      // === CHAT HISTORY ===
      // Quando ricevo un messaggio da qualcuno, lo aggiungo alla chat history
      if (isToMe && !isFromMe && message.nickname) {
        console.log(`📩 [PRIVATE] Controllo cronologia chat per ${message.nickname}`);
        setChatHistoryUsers(prev => {
          if (!prev.includes(message.nickname || '')) {
            console.log(`📩 [PRIVATE] Aggiungo ${message.nickname} alla cronologia chat`);
            return [...prev, message.nickname || ''];
          }
          console.log(`📩 [PRIVATE] ${message.nickname} già presente nella cronologia chat`);
          return prev;
        });
      }
      // === FINE CHAT HISTORY ===
      
      // Anche quando invio un messaggio, assicuriamoci che il destinatario sia nella chat history
      if (isFromMe && !isToMe && message.recipient) {
        console.log(`📩 [PRIVATE] Controllo cronologia chat per ${message.recipient}`);
        setChatHistoryUsers(prev => {
          if (!prev.includes(message.recipient || '')) {
            console.log(`📩 [PRIVATE] Aggiungo ${message.recipient} alla cronologia chat`);
            return [...prev, message.recipient || ''];
          }
          console.log(`📩 [PRIVATE] ${message.recipient} già presente nella cronologia chat`);
          return prev;
        });
      }
      
      // Controlla se c'è il flag speciale di notifica
      const isNotification = message.isNotification === true;
      
      // Sei tu il destinatario?
      if (isToMe && !isFromMe) {
        console.log("📩 [PRIVATE] Sei tu il destinatario del messaggio!");
        console.log("📩 [PRIVATE] Flag notifica:", isNotification);
        
        const fromUser = message.nickname || '';
        
        // Verifica se la chat privata è già aperta con questo utente
        const isChatAlreadyOpenWithSender = 
          privateChatOpen && 
          privateChatRecipient.toLowerCase() === fromUser.toLowerCase();
          
        console.log("📩 [PRIVATE] Stato chat privata:", {
          privateChatOpen,
          privateChatRecipient,
          messageSender: fromUser,
          isChatAlreadyOpenWithSender
        });
        
        // Se la chat è già aperta, non incrementare il contatore e non mostrare notifiche
        if (!isChatAlreadyOpenWithSender) {
          console.log("📩 [PRIVATE] La chat NON è aperta, mostro notifiche");
          
          // Approccio più diretto e semplice
          setVisitors(prevVisitors => {
            return prevVisitors.map(visitor => {
              if (visitor.nickname === fromUser) {
                // Incrementa contatore messaggi non letti
                const prevCount = visitor.unreadMessages || 0;
                const newCount = prevCount + 1;
                
                console.log(`📩 [PRIVATE] Aggiornamento contatore: ${prevCount} -> ${newCount} per ${fromUser}`);
                
                return {
                  ...visitor,
                  unreadMessages: newCount
                };
              }
              return visitor;
            });
          });
          
          // Suona la notifica
          playNotificationSound();
          
          // Mostra notifica toast personalizzata senza contenuto del messaggio
          toast({
            title: `Hai ricevuto un messaggio da ${message.nickname}`,
            description: "Apri la chat per leggere il messaggio",
            variant: "destructive", // più evidente
            duration: 8000, // più a lungo
            action: (
              <div 
                className="cursor-pointer bg-blue-500 text-white px-3 py-1 rounded font-medium hover:bg-blue-600 transition-colors"
                onClick={() => handleStartPrivateChat(fromUser)}
              >
                Apri chat
              </div>
            )
          });
          
          // Apri automaticamente la chat
          console.log(`📩 [PRIVATE] Apro automaticamente chat con ${fromUser}`);
          handleStartPrivateChat(fromUser);
        } else {
          console.log(`📩 [PRIVATE] La chat con ${fromUser} è già aperta, nessuna notifica necessaria`);
        }
      } else if (isFromMe) {
        console.log("📩 [PRIVATE] Questo è un messaggio inviato da te");
      } else {
        console.log("📩 [PRIVATE] Questo messaggio non è per te");
      }
      
      // HACK FINALE: forza un aggiornamento globale della pagina dopo alcuni secondi
      // Se tutto il resto fallisce, questo dovrebbe forzare un re-render
      setTimeout(() => {
        console.log('📩 [EMERGENCY UPDATE] Forzo l\'aggiornamento della pagina');
        // Forza un aggiornamento di tutti gli stati importanti
        setVisitors(prev => [...prev]);
        setMessages(prev => [...prev]);
        
        // Forza un secondo aggiornamento dopo un altro breve ritardo
        setTimeout(() => {
          console.log('📩 [FINAL CHECK] Stato finale visitors:', 
            visitors.map(v => {
              const hasUnread = v.unreadMessages && v.unreadMessages > 0 ? true : false;
              return `${v.nickname}: ${hasUnread ? 'nuovi messaggi' : 'nessun messaggio'}`;
            }).join(', '));
        }, 300);
      }, 800);
    });
    
    // Handle visitor events
    // Note: The server emits "visitor:joined" and "visitor:left" events for webpage visitors
    socket.on("visitor:joined", (message) => {
      console.log("Received visitor:joined event", message);
      onVisitorJoined(message);
    });
    
    socket.on("visitor:left", (message) => {
      console.log("Received visitor:left event", message);
      onVisitorLeft(message);
    });
    
    // Also try "user:joined" and "user:left" events as fallbacks
    socket.on("user:joined", (message) => {
      console.log("Received user:joined event", message);
      onVisitorJoined(message);
    });
    
    socket.on("user:left", (message) => {
      console.log("Received user:left event", message);
      onVisitorLeft(message);
    });
    
    // Nota: Il gestore per l'evento "user:typing" è già stato implementato sopra
    
    // Clean up event listeners
    return () => {
      console.log("Cleaning up webpage event listeners");
      socket.off("error:nickname");
      socket.off("error:message");
      socket.off("webpage:room");
      socket.off("webpage:visitors");
      socket.off("webpage:userCount");
      socket.off("chat:message");
      socket.off("chat:private");
      socket.off("visitor:joined");
      socket.off("visitor:left");
      socket.off("user:joined");
      socket.off("user:left");
      socket.off("user:typing"); // Rimuovi il listener per l'evento utente sta scrivendo
      socket.off("msg_notification"); // Rimuovi il listener per l'evento di notifica
    };
  }, [socket]);

  // Gestione degli URL delle pagine web da monitorare
  const handleUrlSubmit = (submittedUrl: string) => {
    // Quando viene inviato un nuovo URL principale, lo imposta come URL principale
    // e imposta anche l'URL della tab principale
    setUrl(submittedUrl);
    
    // Aggiorna anche il tab principale con il nuovo URL
    const mainTab = tabs.find(tab => tab.id === "main");
    if (mainTab) {
      setTabs(prev => prev.map(tab => 
        tab.id === "main" 
          ? {...tab, url: submittedUrl, title: `Chat Principale - ${getDomainFromUrl(submittedUrl)}`} 
          : tab
      ));
      
      // Aggiorna i dati della tab principale
      setTabData(prev => ({
        ...prev,
        main: {
          ...prev.main,
          url: submittedUrl
        }
      }));
    }
    
    setShowUrlInput(false);
    setShowNicknameModal(true);
  };

  const handleSetNickname = (newNickname: string) => {
    if (!socket || !isConnected) {
      setNicknameError("Socket not connected yet. Please try again.");
      return;
    }
    
    setNickname(newNickname);
    setCurrentUser(newNickname); // Set current user to the nickname
    setNicknameError(undefined);
    setShowNicknameModal(false);
    
    // Attiva la tab principale
    setActiveTabId("main");
    
    // Join webpage-specific room for current URL
    console.log(`Joining webpage with URL: ${url}, nickname: ${newNickname}`);
    socket.emit("webpage:join", {
      url: url, // Send the original URL, server will normalize it
      nickname: newNickname,
      pageTitle: `Chat about ${getDomainFromUrl(url)}`
    });
  };

  const handleSendMessage = (text: string) => {
    if (!socket || !isConnected || !nickname || !text.trim() || !roomId) {
      console.log("Cannot send message:", {
        connected: isConnected,
        hasNickname: !!nickname,
        hasText: !!text.trim(),
        hasRoomId: !!roomId
      });
      return;
    }
    
    // Check if this is a private message with prefix "/pm "
    const privateMessagePrefix = "/pm ";
    if (text.startsWith(privateMessagePrefix)) {
      const textWithoutPrefix = text.substring(privateMessagePrefix.length);
      const firstSpaceIndex = textWithoutPrefix.indexOf(" ");
      
      if (firstSpaceIndex > 0) {
        const recipient = textWithoutPrefix.substring(0, firstSpaceIndex);
        const privateText = textWithoutPrefix.substring(firstSpaceIndex + 1);
        
        if (privateText.trim()) {
          console.log("DEBUG - Invio messaggio privato:", {
            recipient,
            privateText
          });
          
          // Toast per confermare che il messaggio è stato inviato
          toast({
            title: "Messaggio inviato",
            description: `Messaggio privato inviato a ${recipient}`,
            variant: "default",
            className: "bg-green-50 border border-green-200",
            duration: 3000
          });
          
          sendPrivateMessage(recipient, privateText);
          return;
        }
      }
      
      // Invalid format, show toast message
      toast({
        title: "Formato non valido",
        description: "Per inviare un messaggio privato usa: /pm nome-utente messaggio",
        variant: "destructive"
      });
      return;
    }
    
    // Regular message
    const message: Message = {
      roomId,
      text,
      type: MessageType.USER_MESSAGE,
      nickname,
      timestamp: new Date().toISOString()
    };
    
    console.log("Sending chat message:", message);
    
    // Send message to server
    socket.emit("chat:message", message);
  };

  const sendPrivateMessage = (recipient: string, text: string) => {
    if (!socket || !isConnected || !nickname || !text.trim() || !roomId) {
      console.log("Cannot send private message:", {
        connected: isConnected,
        hasNickname: !!nickname,
        hasText: !!text.trim(),
        hasRoomId: !!roomId
      });
      return;
    }
    
    // Aggiungi il destinatario alla lista degli utenti con cui è stata avviata una chat
    setChatHistoryUsers(prev => {
      if (!prev.includes(recipient)) {
        console.log(`🟥 Aggiunto ${recipient} alla cronologia chat`);
        console.log("🟥 chatHistoryUsers PRIMA:", prev);
        const newHistory = [...prev, recipient];
        console.log("🟥 chatHistoryUsers DOPO:", newHistory);
        
        // Forza un re-render
        setTimeout(() => {
          console.log("🟥 VERIFICA chatHistoryUsers dopo timeout:", chatHistoryUsers);
          console.log("🟥 Include", recipient, "?", chatHistoryUsers.includes(recipient));
        }, 500);
        
        return newHistory;
      }
      console.log(`🟥 ${recipient} già presente nella cronologia chat`);
      return prev;
    });
    
    const message: Message = {
      roomId,
      text,
      type: MessageType.PRIVATE_MESSAGE,
      nickname,
      recipient,
      timestamp: new Date().toISOString()
    };
    
    console.log("Sending private message:", message);
    socket.emit("chat:private", message);
    
    // Private messages are echoed back by the server as well,
    // so we don't need to add them to the local state here
  };

  const handleSetStatus = (status: UserStatus) => {
    if (!socket || !isConnected || !roomId) return;
    
    console.log(`Setting status to ${status}`);
    socket.emit("webpage:updateStatus", {
      roomId,
      status
    });
  };

  const onVisitorJoined = (message: Message) => {
    console.log("Visitor joined:", message);
    // @ts-ignore - isBroadcast and roomBroadcast are added by our server code
    const isBroadcast = message.isBroadcast;
    // @ts-ignore
    const isRoomBroadcast = message.roomBroadcast;
    
    // Check for both exact match and normalized URL match for roomId
    if (message.roomId === roomId || normalizeUrl(message.roomId) === normalizeUrl(roomId!)) {
      // Check if we already have this message to avoid duplicates
      const isDuplicate = messages.some(
        m => m.timestamp === message.timestamp && 
             m.nickname === message.nickname && 
             m.type === MessageType.USER_JOINED
      );
      
      // Simplified message handling - only room broadcasts exist now
      // We still check for duplicates to be safe
      if (!isDuplicate) {
        setMessages(prev => [...prev, message]);
        
        // Request updated visitor list
        if (socket && isConnected) {
          console.log("Requesting latest visitor list after user joined");
          socket.emit("webpage:getVisitors", { roomId });
        }
      } else {
        console.log("Skipping duplicate visitor join message");
      }
    }
  };

  const onVisitorLeft = (message: Message) => {
    console.log("Visitor left:", message);
    // @ts-ignore - isBroadcast and roomBroadcast are added by our server code
    const isBroadcast = message.isBroadcast;
    // @ts-ignore
    const isRoomBroadcast = message.roomBroadcast;
    
    // Check for both exact match and normalized URL match for roomId
    if (message.roomId === roomId || normalizeUrl(message.roomId) === normalizeUrl(roomId!)) {
      // Check if we already have this message to avoid duplicates
      const isDuplicate = messages.some(
        m => m.timestamp === message.timestamp && 
             m.nickname === message.nickname && 
             m.type === MessageType.USER_LEFT
      );
      
      // Simplified message handling - only room broadcasts exist now
      // We still check for duplicates to be safe
      if (!isDuplicate) {
        setMessages(prev => [...prev, message]);
        
        // Request updated visitor list
        if (socket && isConnected) {
          console.log("Requesting latest visitor list after user left");
          socket.emit("webpage:getVisitors", { roomId });
        }
      } else {
        console.log("Skipping duplicate visitor left message");
      }
    }
  };

  // Funzione di debug per stampare lo stato attuale
  const logCurrentState = (triggerPoint: string) => {
    console.log(`[DEBUG @ ${triggerPoint}] Current state:`, {
      roomId,
      nickname, 
      isConnected,
      socket: socket?.id || 'no socket',
      messageCount: messages.length,
      visitors: visitors.length
    });
  };

  const onChatMessage = (message: Message) => {
    console.log("💫 Chat message received:", message);
    logCurrentState('onChatMessage');
    
    // Non facciamo nessun controllo, aggiungiamo e basta
    // Questo è il sistema più semplice possibile
    console.log(`💫 Tentativo di aggiungere messaggio alla stanza ${roomId}`);
    console.log(`💫 Prima dell'aggiunta: ${messages.length} messaggi`);
    
    // Aggiungi ogni messaggio, senza filtri, alla lista principale
    setMessages(prev => {
      const newMessages = [...prev, message];
      console.log(`💫 Dopo l'aggiunta: dovremmo avere ${newMessages.length} messaggi`);
      return newMessages;
    });
    
    // Aggiorna anche i messaggi nella tab attiva
    setTabData(prev => {
      // Se il messaggio appartiene a una stanza che fa parte di una delle nostre tab
      const targetTabId = activeTabId;
      
      if (targetTabId && prev[targetTabId]) {
        // Se questa è la tab attiva, aggiorna i messaggi
        return {
          ...prev,
          [targetTabId]: {
            ...prev[targetTabId],
            messages: [...prev[targetTabId].messages, message]
          }
        };
      }
      
      // Se non trova una tab corrispondente, non fare modifiche
      return prev;
    });
    
    // Se il messaggio arriva per una tab che non è quella attiva, marca come non letto
    if (message.roomId !== roomId) {
      // Trova la tab che corrisponde a questo roomId
      const tabId = Object.keys(tabData).find(id => tabData[id].roomId === message.roomId);
      
      if (tabId && tabId !== activeTabId) {
        // Imposta il flag di messaggi non letti per questa tab
        setTabData(prev => ({
          ...prev,
          [tabId]: {
            ...prev[tabId],
            hasUnreadMessages: true
          }
        }));
        
        // Aggiorna anche l'oggetto tab per mostrare l'indicatore visivo
        setTabs(prev => prev.map(tab => 
          tab.id === tabId 
            ? {...tab, unread: true} 
            : tab
        ));
      }
    }
  };
  
  const onPrivateMessage = (message: Message) => {
    console.log("🟢 Main component received private message:", message);
    
    // Basic check: is this message to me?
    const isToMe = message.recipient?.toLowerCase() === nickname?.toLowerCase();
    const isFromMe = message.nickname?.toLowerCase() === nickname?.toLowerCase();
    
    // Log all the important info for debugging
    console.log(`🟢 Private message details:`, {
      isToMe,
      isFromMe,
      myNickname: nickname,
      messageFrom: message.nickname,
      messageTo: message.recipient,
      roomId: roomId
    });
    
    // If the message is to me and not from me, show a notification
    if (isToMe && !isFromMe) {
      console.log("🟢 This private message is FOR me from someone else!");
      
      const fromUser = message.nickname || '';
      
      // Aggiungi l'utente alla lista di chat attive se non è già presente
      setChatHistoryUsers(prev => {
        if (!prev.includes(fromUser)) {
          console.log(`🔴 Aggiunto ${fromUser} alla cronologia chat (mittente)`);
          console.log(`🔴 chatHistoryUsers PRIMA:`, prev);
          const newHistory = [...prev, fromUser];
          console.log(`🔴 chatHistoryUsers DOPO:`, newHistory);
          
          // Aggiorniamo manualmente il componente qui
          setTimeout(() => {
            console.log(`🔴 FORCE chatHistoryUsers dopo timeout:`, chatHistoryUsers);
            console.log(`🔴 Include ${fromUser}?`, chatHistoryUsers.includes(fromUser));
          }, 500);
          
          return newHistory;
        }
        console.log(`🔴 ${fromUser} già nella cronologia chat`);
        return prev;
      });
      
      // Verifica se la chat privata è già aperta con questo utente
      const isChatAlreadyOpenWithSender = 
        privateChatOpen && 
        privateChatRecipient.toLowerCase() === fromUser.toLowerCase();
        
      console.log("🟢 Stato chat privata per onPrivateMessage:", {
        privateChatOpen,
        privateChatRecipient,
        messageSender: fromUser,
        isChatAlreadyOpenWithSender
      });
      
      // Se la chat non è già aperta, mostra notifiche e aggiorna contatore
      if (!isChatAlreadyOpenWithSender) {
        console.log("🟢 Chat non aperta con questo utente, mostro notifiche e incremento contatore");
        
        // Play notification sound
        playNotificationSound();
        
        // Update the visitor to mark they have unread messages (using boolean flag instead of counter)
        setVisitors(prevVisitors => {
          return prevVisitors.map(visitor => {
            if (visitor.nickname?.toLowerCase() === fromUser.toLowerCase()) {
              console.log(`🔔 Ricevuto messaggio da ${visitor.nickname}, impostato flag 'hasUnreadMessages'`);
              return {
                ...visitor,
                unreadMessages: 1, // Impostiamo a 1 così la condizione unreadMessages > 0 sarà vera
                hasUnreadMessages: true // Nuovo flag booleano più facile da gestire
              };
            }
            return visitor;
          });
        });
        
        // Solo notifica personalizzata, senza alert standard
        try {
          // Imposta il messaggio e mostra la notifica personalizzata
          setNotificationFrom(fromUser);
          setNotificationMessage(`Hai ricevuto un messaggio da ${fromUser}`);
          setShowCustomNotification(true);
          console.log("🎯 Mostro notifica personalizzata per messaggio da", fromUser);
          
          // Riproduci il suono di notifica
          playNotificationSound();
          
          // La chat verrà aperta quando l'utente fa clic sul pulsante "Apri chat" nella notifica personalizzata
          // Non apriremo automaticamente la chat finché l'utente non interagisce con la notifica
        } catch (error) {
          console.error("Errore con notifiche personalizzate:", error);
          
          // Fallback con toast notification invece di alert tradizionale
          toast({
            title: "Nuovo messaggio",
            description: `Hai ricevuto un messaggio da ${fromUser}`,
            variant: "destructive",
            duration: 8000,
            action: (
              <div 
                className="cursor-pointer bg-blue-500 text-white px-3 py-1 rounded font-medium hover:bg-blue-600 transition-colors"
                onClick={() => handleStartPrivateChat(fromUser)}
              >
                Apri chat
              </div>
            )
          });
          // Apriamo automaticamente la chat dopo un breve ritardo
          setTimeout(() => handleStartPrivateChat(fromUser), 1000);
        }
        
        console.log("🟢 Notification shown and counter updated");
      } else {
        console.log(`🟢 Chat già aperta con ${fromUser}, nessuna notifica necessaria`);
      }
    } else {
      console.log("🟢 Private message not requiring notification in main component");
    }
  };

  // Handle starting a private chat
  const handleStartPrivateChat = (recipientName: string) => {
    // Reset unread message flags for this recipient
    setVisitors(prevVisitors => {
      return prevVisitors.map(visitor => {
        if (visitor.nickname === recipientName) {
          return {
            ...visitor,
            unreadMessages: 0, // Reset unread count
            hasUnreadMessages: false // Reset unread flag
          };
        }
        return visitor;
      });
    });
    
    // IMPORTANTE: Aggiungiamo l'utente alla cronologia chat quando la chat viene aperta
    // Questo risolve il problema del pulsante che non cambia aspetto
    setChatHistoryUsers(prev => {
      if (!prev.includes(recipientName)) {
        console.log(`🟣 Forcing add ${recipientName} to chat history when opening chat`);
        return [...prev, recipientName];
      }
      return prev;
    });
    
    setPrivateChatRecipient(recipientName);
    setPrivateChatOpen(true);
  };
  
  // Handle closing the private chat dialog
  const handleClosePrivateChat = () => {
    // If there are unread messages from the current recipient, keep them in the badge
    // This ensures the user can still see there are unread messages when they close the dialog
    const currentRecipientVisitor = visitors.find(v => v.nickname === privateChatRecipient);
    
    // Only preserve unread messages if dialogue is closed without viewing them
    if (currentRecipientVisitor) {
      // Show a reminder toast if there are unread messages (usando sia il contatore che il flag)
      if ((currentRecipientVisitor.unreadMessages && currentRecipientVisitor.unreadMessages > 0) || 
          currentRecipientVisitor.hasUnreadMessages) {
        toast({
          title: `💬 Messaggi non letti`,
          description: `Hai messaggi non letti da ${privateChatRecipient}`,
          variant: "default",
          className: "bg-blue-50 border border-blue-200",
          duration: 4000
        });
      }
    }
    
    setPrivateChatOpen(false);
  };
  
  // Handle closing custom notification
  const handleCloseNotification = () => {
    setShowCustomNotification(false);
    // Gestisci altre azioni dopo la chiusura, come aprire la chat
    if (notificationFrom) {
      handleStartPrivateChat(notificationFrom);
    }
  };
  
  // Gestione stato "utente sta scrivendo"
  const handleTypingStatus = (isTyping: boolean) => {
    if (!socket || !isConnected || !nickname || !roomId) return;
    
    console.log(`Emitting typing status: ${isTyping ? 'typing' : 'stopped typing'}`);
    
    // Emetti l'evento al server
    socket.emit("user:typing", {
      roomId,
      nickname,
      isTyping
    });
  };
  
  // Format domain name for display
  const getDomainFromUrl = (urlString: string) => {
    try {
      const urlObj = new URL(urlString);
      return urlObj.hostname;
    } catch {
      return urlString;
    }
  };

  // Funzioni per il sistema di tab
  const handleTabChange = (tabId: string) => {
    setActiveTabId(tabId);
    
    // Caricare i dati della tab selezionata
    if (tabData[tabId]) {
      setMessages(tabData[tabId].messages);
      setVisitors(tabData[tabId].visitors);
      setRoomId(tabData[tabId].roomId);
      setUrl(tabData[tabId].url);
      
      // Reset unread flag for this tab
      setTabData(prev => ({
        ...prev,
        [tabId]: {
          ...prev[tabId],
          hasUnreadMessages: false
        }
      }));
      
      // Update URL in browser if it's not the main tab
      if (tabId !== "main" && tabData[tabId].url) {
        setLocation(`/webpage/${encodeURIComponent(tabData[tabId].url)}`);
      }
    }
  };
  
  const handleAddNewTab = () => {
    setShowNewTabDialog(true);
  };
  
  const handleTabClose = (tabId: string) => {
    // Non permettere di chiudere la tab principale
    if (tabId === "main") return;
    
    // Rimuovi la tab dall'array delle tab
    setTabs(prev => prev.filter(tab => tab.id !== tabId));
    
    // Rimuovi i dati associati alla tab
    setTabData(prev => {
      const newTabData = { ...prev };
      delete newTabData[tabId];
      return newTabData;
    });
    
    // Se la tab attiva è quella che stiamo chiudendo, passa alla tab principale
    if (activeTabId === tabId) {
      handleTabChange("main");
    }
  };
  
  const handleNewTabSubmit = () => {
    if (!newTabUrl.trim()) {
      toast({
        title: "Errore",
        description: "Inserisci un URL valido",
        variant: "destructive"
      });
      return;
    }
    
    // Normalizza l'URL
    let formattedUrl = newTabUrl;
    if (!formattedUrl.startsWith('http')) {
      formattedUrl = `https://${formattedUrl}`;
    }
    
    // Genera un ID unico per la tab
    const tabId = `tab-${Date.now()}`;
    
    // Aggiungi la nuova tab
    const newTab: ChatTab = {
      id: tabId,
      url: formattedUrl,
      favicon: `https://www.google.com/s2/favicons?domain=${getDomainFromUrl(formattedUrl)}&sz=32`,
      title: getDomainFromUrl(formattedUrl)
    };
    
    setTabs(prev => [...prev, newTab]);
    
    // Inizializza i dati della tab
    setTabData(prev => ({
      ...prev,
      [tabId]: {
        messages: [],
        visitors: [],
        roomId: null,
        url: formattedUrl,
        hasUnreadMessages: false
      }
    }));
    
    // Attiva la nuova tab
    setActiveTabId(tabId);
    
    // Chiudi il dialog
    setShowNewTabDialog(false);
    setNewTabUrl("");
    
    // Aggiungi utente alla stanza per la nuova tab
    if (socket && nickname) {
      socket.emit("webpage:join", {
        url: formattedUrl,
        nickname: nickname
      });
    }
  };

  if (showUrlInput) {
    return <WebpageUrlInput onSubmit={handleUrlSubmit} />;
  }

  if (showNicknameModal) {
    return <NicknameModal onSetNickname={handleSetNickname} error={nicknameError} />;
  }

  const domain = getDomainFromUrl(url);
  const roomInfo = `Chatting about ${domain}`;
  
  // Calculate if there are any unread messages (usando sia contatore che flag booleano)
  const hasUnreadMessages = visitors.some(visitor => 
    ((visitor.unreadMessages && visitor.unreadMessages > 0) || visitor.hasUnreadMessages) && 
    visitor.nickname !== nickname
  );
  
  // La simulazione è stata rimossa per evitare errori di React Hooks

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Componente di notifica personalizzato */}
      <CustomNotification 
        isOpen={showCustomNotification} 
        message={notificationMessage}
        onClose={handleCloseNotification}
        autoCloseTime={8000}
      />
      
      {/* Audio di notifica */}
      <audio id="notification-sound" preload="auto" src="/notification.mp3" />
      
      <div className={`flex-none bg-white border-b shadow-sm p-4 ${hasUnreadMessages ? 'bg-red-50' : ''}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="mr-4 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center">
              <Header roomInfo={roomInfo} onlineCount={visitors.length} />
              
              {/* Unread messages indicator */}
              {hasUnreadMessages && (
                <div className="ml-3 chat-button-notification flex items-center px-3 py-1.5 rounded-full text-xs font-bold border-2 border-red-300 bg-gradient-to-r from-red-500 to-red-600 text-white animate-pulse shadow-md">
                  <span className="inline-block w-2 h-2 bg-white rounded-full mr-2 animate-ping"></span>
                  <span>
                    NUOVI MESSAGGI PRIVATI
                  </span>
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {hasUnreadMessages && (
              <button 
                onClick={() => {
                  // Find first visitor with unread messages and open chat
                  const visitorWithUnread = visitors.find(v => 
                    (((v.unreadMessages || 0) > 0) || v.hasUnreadMessages) && v.nickname !== nickname
                  );
                  if (visitorWithUnread) {
                    handleStartPrivateChat(visitorWithUnread.nickname);
                  }
                }}
                className="px-4 py-1.5 chat-button-notification border-2 border-red-300 font-bold text-white rounded-full text-sm shadow-lg bg-gradient-to-r from-red-500 to-red-600 animate-pulse"
              >
                CONTROLLA MESSAGGI ADESSO!
              </button>
            )}
            <a 
              href={url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="inline-flex items-center px-3 py-1 text-sm bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
            >
              Visit webpage
            </a>
          </div>
        </div>
      </div>

      {/* Sistema di tab per gestire diverse chat contemporaneamente */}
      <ChatTabs 
        tabs={tabs} 
        activeTabId={activeTabId} 
        onTabChange={handleTabChange} 
        onTabClose={handleTabClose}
        onAddNewTab={handleAddNewTab}
      />

      {/* Anteprima della pagina web */}
      <div className="px-4 py-2">
        <WebpagePreview url={url} />
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="w-3/4 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            <MessageArea messages={messages} currentUser={nickname || currentUser} />
          </div>
          <div className="flex-none p-4 border-t bg-white">
            <MessageInput 
              onSendMessage={handleSendMessage}
              onTypingStart={() => handleTypingStatus(true)}
              onTypingStop={() => handleTypingStatus(false)}
            />
            <div className="mt-2 text-xs text-gray-500">
              Tip: To send a private message, use /pm username message
            </div>
          </div>
        </div>
        
        <div className="w-1/4 border-l overflow-hidden">
          <NewWebpageVisitorsList 
            visitors={visitors} 
            currentUser={nickname || currentUser}
            onSetStatus={handleSetStatus}
            url={url}
            onStartPrivateChat={handleStartPrivateChat}
            socket={socket}
            activeChatWith={privateChatOpen ? privateChatRecipient : null}
            chatHistoryUsers={chatHistoryUsers}
            typingUsers={typingUsers}
          />
        </div>
      </div>
      
      {/* Private Chat Dialog */}
      <PrivateChatDialog
        isOpen={privateChatOpen}
        onClose={handleClosePrivateChat}
        recipientName={privateChatRecipient}
        currentUser={nickname || currentUser}
        socket={socket}
        roomId={roomId || ""}
      />
      
      {/* Dialog per aggiungere una nuova tab */}
      <Dialog open={showNewTabDialog} onOpenChange={setShowNewTabDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aggiungi nuova tab</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-gray-600 mb-4">
              Inserisci l'URL della pagina web che vuoi monitorare in una nuova tab.
            </p>
            <Input
              type="text"
              placeholder="https://esempio.com"
              value={newTabUrl}
              onChange={(e) => setNewTabUrl(e.target.value)}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewTabDialog(false)}>
              Annulla
            </Button>
            <Button onClick={handleNewTabSubmit}>
              Aggiungi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default WebpageRoom;