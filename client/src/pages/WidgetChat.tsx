import { useEffect, useState } from "react";
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
 * WidgetChat - A lightweight chat component designed to be embedded in an iframe
 * for the embedded chat widget functionality
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

  // Initialize socket connection directly, similar to SimpleChatDemo and WebpageRoom
  useEffect(() => {
    // Create a new socket with the same options used in SimpleChatDemo
    const newSocket = io(window.location.origin, {
      path: "/api/socket.io",
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5
    });
    
    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Connect to room when socket and nickname are available
  useEffect(() => {
    if (!socket || !nickname || !params.url) return;

    let url = decodeURIComponent(params.url);
    
    // Validate and normalize URL
    try {
      url = normalizeUrl(url);
      setPageUrl(url);
      
      // Try to get page title from parent window if possible
      try {
        // Listen for message from parent window with page title
        const handleMessage = (event: MessageEvent) => {
          if (event.data?.type === 'PAGE_TITLE') {
            setPageTitle(event.data.title);
          }
        };
        
        window.addEventListener('message', handleMessage);
        
        // Request page title from parent
        window.parent.postMessage({ type: 'REQUEST_PAGE_TITLE' }, '*');
        
        return () => {
          window.removeEventListener('message', handleMessage);
        };
      } catch (e) {
        // Unable to get title from parent window, continue without it
        console.error("Unable to communicate with parent window:", e);
      }
      
      // Join the chat room for this URL
      socket.emit("webpage:join", { url, nickname });
      
      // Listen for room ID assignment
      socket.on("webpage:room", (data: { roomId: string }) => {
        setRoomId(data.roomId);
      });
      
      // Listen for room title
      socket.on("webpage:title", (data: { title: string }) => {
        if (!pageTitle) {
          setPageTitle(data.title);
        }
      });
      
      // Listen for online user count updates
      socket.on("webpage:userCount", (count: number) => {
        setOnlineCount(count);
      });
      
      // Handle connection status
      socket.on("connect", () => setIsConnected(true));
      socket.on("disconnect", () => setIsConnected(false));
      
      // Event handlers for different message types
      socket.on("chat:message", onChatMessage);
      socket.on("visitor:joined", onVisitorJoined);
      socket.on("visitor:left", onVisitorLeft);
      
      return () => {
        // Clean up event listeners
        socket.off("webpage:room");
        socket.off("webpage:title");
        socket.off("webpage:userCount");
        socket.off("chat:message");
        socket.off("visitor:joined");
        socket.off("visitor:left");
        
        // Leave the chat room
        if (roomId) {
          socket.emit("webpage:leave", { roomId });
        }
      };
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
  }, [socket, nickname, params.url, roomId, messages, normalizeUrl]);

  const onVisitorJoined = (message: Message) => {
    console.log("Visitor joined:", message);
    // @ts-ignore - isBroadcast is added by our server code
    const isBroadcast = message.isBroadcast;
    
    // Check for both exact match and normalized URL match for roomId
    if (message.roomId === roomId || normalizeUrl(message.roomId) === normalizeUrl(roomId)) {
      // Check if we already have this message to avoid duplicates
      const isDuplicate = messages.some(
        m => m.timestamp === message.timestamp && 
             m.nickname === message.nickname && 
             m.type === MessageType.USER_JOINED
      );
      
      // Simplest approach - only add messages we haven't seen yet
      if (!isDuplicate) {
        // Add new message if we haven't seen it before
        setMessages(prev => [...prev, message]);
      } else {
        console.log("Skipping duplicate visitor join message");
      }
    }
  };

  const onVisitorLeft = (message: Message) => {
    console.log("Visitor left:", message);
    // @ts-ignore - isBroadcast is added by our server code
    const isBroadcast = message.isBroadcast;
    
    // Check for both exact match and normalized URL match for roomId
    if (message.roomId === roomId || normalizeUrl(message.roomId) === normalizeUrl(roomId)) {
      // Check if we already have this message to avoid duplicates
      const isDuplicate = messages.some(
        m => m.timestamp === message.timestamp && 
             m.nickname === message.nickname && 
             m.type === MessageType.USER_LEFT
      );
      
      // Simplest approach - only add messages we haven't seen yet
      if (!isDuplicate) {
        // Add new message if we haven't seen it before
        setMessages(prev => [...prev, message]);
      } else {
        console.log("Skipping duplicate visitor left message");
      }
    }
  };

  const onChatMessage = (message: Message) => {
    console.log("Chat message received:", message);
    // @ts-ignore - isBroadcast is added by our server code
    const isBroadcast = message.isBroadcast;
    // @ts-ignore - roomBroadcast is added by our server code
    const isRoomBroadcast = message.roomBroadcast;
    
    // Check if this message is for our room
    if (message.roomId === roomId || normalizeUrl(message.roomId) === normalizeUrl(roomId)) {
      // Check if we already have this message to avoid duplicates
      const isDuplicate = messages.some(
        m => m.timestamp === message.timestamp && 
             m.nickname === message.nickname && 
             m.text === message.text
      );
      
      // Simplest approach - only add messages we haven't seen yet
      if (!isDuplicate) {
        // Add new message if we haven't seen it before
        setMessages(prev => [...prev, message]);
      } else {
        console.log("Skipping duplicate chat message");
      }
    }
  };

  const handleSetNickname = (name: string) => {
    setNickname(name);
    setShowNicknameModal(false);
    
    // If we already have a socket connection and URL, join the room now
    if (socket && params.url) {
      const url = decodeURIComponent(params.url);
      socket.emit("webpage:join", { url: url, nickname: name });
    }
  };

  const handleSendMessage = (text: string) => {
    if (!socket || !roomId || !text.trim()) return;

    const message: Message = {
      roomId,
      nickname,
      text,
      type: MessageType.USER_MESSAGE
    };

    socket.emit("chat:message", message);
  };

  // Update status for the user (not needed in the widget version)
  const handleSetStatus = (status: UserStatus) => {
    if (!socket || !roomId) return;
    socket.emit("webpage:updateStatus", { roomId, status });
  };

  return (
    <div className="flex flex-col h-screen bg-white">
      {/* Simple header for the widget */}
      <div className="bg-primary text-primary-foreground p-2 flex justify-between items-center">
        <div className="font-semibold truncate">
          {pageTitle || "Chat for " + (pageUrl || "this page")}
        </div>
        <div className="text-xs">
          {onlineCount} {onlineCount === 1 ? "person" : "people"} online
        </div>
      </div>
      
      {/* Connection status indicator */}
      <div 
        className={cn(
          "text-xs px-2 py-1 text-center",
          isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
        )}
      >
        {isConnected ? "Connected" : "Disconnected"}
      </div>
      
      {/* Message display area */}
      <div className="flex-1 overflow-y-auto p-3">
        <MessageArea messages={messages} currentUser={nickname} />
      </div>
      
      {/* Message input */}
      <div className="p-2 border-t">
        <MessageInput onSendMessage={handleSendMessage} />
      </div>
      
      {/* Nickname modal */}
      {showNicknameModal && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
          <NicknameModal onSetNickname={handleSetNickname} />
        </div>
      )}
    </div>
  );
}