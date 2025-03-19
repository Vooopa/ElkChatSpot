import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import type { Message, WebpageVisitor } from "@shared/schema";
import { UserStatus, normalizeUrl, MessageType } from "@shared/schema";
import WebpageVisitorsList from "@/components/chat/WebpageVisitorsList";
import WebpageUrlInput from "@/components/chat/WebpageUrlInput";
import NicknameModal from "@/components/chat/NicknameModal";
import MessageInput from "@/components/chat/MessageInput";
import MessageArea from "@/components/chat/MessageArea";
import Header from "@/components/chat/Header";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";

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
  const [privateMessages, setPrivateMessages] = useState<Message[]>([]);
  const [visitors, setVisitors] = useState<WebpageVisitor[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [url, setUrl] = useState<string>("");
  const [currentUser, setCurrentUser] = useState<string>("");

  // Set up socket connection when the component loads
  useEffect(() => {
    // Create a new socket with default options - same as SimpleChatDemo
    const newSocket = io();
    
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

  // Set up socket event listeners when socket or roomId changes
  useEffect(() => {
    if (!socket) return;
    
    console.log("Setting up webpage event listeners...");
    
    // Error events
    const handleNicknameError = (data: { message: string }) => {
      console.error("Nickname error:", data.message);
      setNicknameError(data.message);
      setShowNicknameModal(true);
    };
    
    const handleMessageError = (data: { message: string }) => {
      console.error("Message error:", data.message);
      toast({
        title: "Message Error",
        description: data.message,
        variant: "destructive"
      });
    };
    
    const handleRoomInfo = (data: { roomId: string, url: string, title: string }) => {
      console.log("Received room info:", data);
      setRoomId(data.roomId);
      // Update URL route with room ID
      setLocation(`/webpage/${encodeURIComponent(url)}`);
    };
    
    const handleVisitorList = (roomVisitors: WebpageVisitor[]) => {
      console.log("Received visitor list:", roomVisitors);
      setVisitors(roomVisitors);
    };
    
    const handleUserCount = (count: number) => {
      console.log(`Received user count: ${count}`);
    };
    
    // Register event listeners with debugging
    socket.on("error:nickname", (data) => {
      console.log("Received error:nickname event", data);
      handleNicknameError(data);
    });
    
    socket.on("error:message", (data) => {
      console.log("Received error:message event", data);
      handleMessageError(data);
    });
    
    socket.on("webpage:room", (data) => {
      console.log("Received webpage:room event", data);
      handleRoomInfo(data);
    });
    
    socket.on("webpage:visitors", (data) => {
      console.log("Received webpage:visitors event", data);
      handleVisitorList(data);
    });
    
    socket.on("webpage:userCount", (count) => {
      console.log("Received webpage:userCount event", count);
      handleUserCount(count);
    });
    
    socket.on("chat:message", (message) => {
      console.log("Received chat:message event", message);
      onChatMessage(message);
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
  }, [socket, url, toast, setLocation]);

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
      url: normalizeUrl(url),
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
    socket.emit("chat:message", message);
    
    // Also add message to our local state for immediate feedback
    const localMessage = {
      ...message,
      senderSocketId: socket.id // Add sender ID to identify our own messages
    };
    setMessages(prev => [...prev, localMessage]);
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
    
    // Also add message to our local state for immediate feedback
    const localMessage = {
      ...message,
      senderSocketId: socket.id // Add sender ID to identify our own messages
    };
    
    // Add to both message lists
    setMessages(prev => [...prev, localMessage]);
    setPrivateMessages(prev => [...prev, localMessage]);
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
    if (message.roomId === roomId) {
      // Add join message to chat
      setMessages(prev => [...prev, message]);
      
      // Request updated visitor list
      if (socket && isConnected) {
        console.log("Requesting latest visitor list after user joined");
        socket.emit("webpage:getVisitors", { roomId });
      }
    }
  };

  const onVisitorLeft = (message: Message) => {
    console.log("Visitor left:", message);
    if (message.roomId === roomId) {
      // Add leave message to chat
      setMessages(prev => [...prev, message]);
      
      // Request updated visitor list
      if (socket && isConnected) {
        console.log("Requesting latest visitor list after user left");
        socket.emit("webpage:getVisitors", { roomId });
      }
    }
  };

  const onChatMessage = (message: Message) => {
    console.log("Chat message received:", message);
    if (message.roomId === roomId) {
      setMessages(prev => [...prev, message]);
    }
  };
  
  const onPrivateMessage = (message: Message) => {
    console.log("Private message received:", message);
    if (message.roomId === roomId) {
      setPrivateMessages(prev => [...prev, message]);
      // Also add to main message list
      setMessages(prev => [...prev, message]);
      
      // Show a toast if the message is from someone else
      if (message.nickname !== nickname) {
        toast({
          title: `Private message from ${message.nickname}`,
          description: message.text,
          variant: "default"
        });
      }
    }
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

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <div className="flex-none bg-white border-b shadow-sm p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center">
            <Link href="/" className="mr-4 text-gray-600 hover:text-gray-900">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <Header roomInfo={roomInfo} onlineCount={visitors.length} />
          </div>
          <div>
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
            currentUser={currentUser}
            onSetStatus={handleSetStatus}
            url={url}
          />
        </div>
      </div>
    </div>
  );
};

export default WebpageRoom;