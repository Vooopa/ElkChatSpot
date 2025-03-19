import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import type { Message, WebpageVisitor } from "@shared/schema";
import { UserStatus, normalizeUrl, MessageType } from "@shared/schema";
import WebpageVisitorsList from "@/components/chat/WebpageVisitorsList";
import WebpageUrlInput from "@/components/chat/WebpageUrlInput";
import NicknameModal from "@/components/chat/NicknameModal";
import PrivateChatDialog from "@/components/chat/PrivateChatDialog";
import MessageInput from "@/components/chat/MessageInput";
import MessageArea from "@/components/chat/MessageArea";
import Header from "@/components/chat/Header";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

// Simple notification helper
const playNotificationSound = () => {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.value = 880; // A5 note
    gainNode.gain.value = 0.1; // Quiet volume
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    setTimeout(() => oscillator.stop(), 200);
  } catch (e) {
    console.error("Audio playback failed", e);
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
    
    socket.on("chat:message", (message) => {
      console.log("Received chat:message event", message);
      // SEMPLIFICATO: Aggiunge direttamente alla lista messaggi
      setMessages(prev => [...prev, message]);
      console.log("✅ Aggiunto messaggio alla chat direttamente");
    });
    
    socket.on("chat:private", (message) => {
      console.log("Received chat:private event", message);
      onPrivateMessage(message);
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
    };
  }, [socket]);

  const handleUrlSubmit = (submittedUrl: string) => {
    setUrl(submittedUrl);
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
    
    // Join webpage-specific room
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
    
    // Check if this is a private message
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
      
      // Invalid format, show toast message
      toast({
        title: "Invalid Command",
        description: "To send a private message use: /pm username message",
        variant: "default"
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
    
    // We no longer add to local state directly - we'll rely on the server echoing back
    // the message with any additional data that might be necessary
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

  const onChatMessage = (message: Message) => {
    console.log("Chat message received:", message);
    
    // Super simplified message handling - just add to the list
    // if it's for our room and not a duplicate
    if (message.roomId === roomId) {
      console.log(`✅ Adding chat message to room ${roomId}`);
      
      // Basic duplicate check
      const isDuplicate = messages.some(
        m => m.timestamp === message.timestamp && 
             m.nickname === message.nickname && 
             m.text === message.text
      );
      
      if (!isDuplicate) {
        setMessages(prev => [...prev, message]);
        console.log("✅ Message added to state");
      } else {
        console.log("❌ Skipping duplicate message");
      }
    } else {
      console.log(`❌ Message is for room ${message.roomId}, not our room ${roomId}`);
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
      
      // Play notification sound
      playNotificationSound();
      
      // Update the visitor's unread count
      setVisitors(prevVisitors => {
        return prevVisitors.map(visitor => {
          if (visitor.nickname?.toLowerCase() === message.nickname?.toLowerCase()) {
            return {
              ...visitor,
              unreadMessages: (visitor.unreadMessages || 0) + 1
            };
          }
          return visitor;
        });
      });
      
      // Show toast notification
      toast({
        title: `New message from ${message.nickname}`,
        description: message.text,
        variant: "default",
        duration: 5000,
        action: (
          <div 
            className="cursor-pointer bg-blue-500 text-white px-3 py-1 rounded font-medium hover:bg-blue-600 transition-colors"
            onClick={() => handleStartPrivateChat(message.nickname || "")}
          >
            Reply
          </div>
        )
      });
      
      // Automatically open the chat dialog
      handleStartPrivateChat(message.nickname || "");
      
      console.log("🟢 Notification shown and chat opened automatically");
    } else {
      console.log("🟢 Private message not requiring notification in main component");
    }
  };

  // Handle starting a private chat
  const handleStartPrivateChat = (recipientName: string) => {
    // Reset unread message count for this recipient
    setVisitors(prevVisitors => {
      return prevVisitors.map(visitor => {
        if (visitor.nickname === recipientName) {
          return {
            ...visitor,
            unreadMessages: 0 // Reset unread count
          };
        }
        return visitor;
      });
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
      // Show a reminder toast if there are unread messages
      if (currentRecipientVisitor.unreadMessages && currentRecipientVisitor.unreadMessages > 0) {
        toast({
          title: `💬 Unread Messages`,
          description: `You have ${currentRecipientVisitor.unreadMessages} unread message(s) from ${privateChatRecipient}`,
          variant: "default",
          className: "bg-blue-50 border border-blue-200",
          duration: 4000
        });
      }
    }
    
    setPrivateChatOpen(false);
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

  if (showUrlInput) {
    return <WebpageUrlInput onSubmit={handleUrlSubmit} />;
  }

  if (showNicknameModal) {
    return <NicknameModal onSetNickname={handleSetNickname} error={nicknameError} />;
  }

  const domain = getDomainFromUrl(url);
  const roomInfo = `Chatting about ${domain}`;
  
  // Calculate total unread messages
  const totalUnreadMessages = visitors.reduce((sum, visitor) => {
    return sum + (visitor.unreadMessages || 0);
  }, 0);

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className={`flex-none bg-white border-b shadow-sm p-4 ${totalUnreadMessages > 0 ? 'bg-red-50' : ''}`}>
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="mr-4 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div className="flex items-center">
              <Header roomInfo={roomInfo} onlineCount={visitors.length} />
              
              {/* Unread messages indicator */}
              {totalUnreadMessages > 0 && (
                <div className="ml-3 animate-pulse flex items-center bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                  <span className="inline-block w-2 h-2 bg-red-500 rounded-full mr-1"></span>
                  {totalUnreadMessages} unread private message{totalUnreadMessages > 1 ? 's' : ''}
                </div>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {totalUnreadMessages > 0 && (
              <button 
                onClick={() => {
                  // Find first visitor with unread messages and open chat
                  const visitorWithUnread = visitors.find(v => (v.unreadMessages || 0) > 0 && v.nickname !== nickname);
                  if (visitorWithUnread) {
                    handleStartPrivateChat(visitorWithUnread.nickname);
                  }
                }}
                className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-medium hover:bg-red-700 transition-colors"
              >
                Check messages
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

      <div className="flex-1 flex overflow-hidden">
        <div className="w-3/4 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4">
            <MessageArea messages={messages} currentUser={nickname || currentUser} />
          </div>
          <div className="flex-none p-4 border-t bg-white">
            <MessageInput onSendMessage={handleSendMessage} />
            <div className="mt-2 text-xs text-gray-500">
              Tip: To send a private message, use /pm username message
            </div>
          </div>
        </div>
        
        <div className="w-1/4 border-l overflow-hidden">
          <WebpageVisitorsList 
            visitors={visitors} 
            currentUser={nickname || currentUser}
            onSetStatus={handleSetStatus}
            url={url}
            onStartPrivateChat={handleStartPrivateChat}
            socket={socket}
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
    </div>
  );
};

export default WebpageRoom;