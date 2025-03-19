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
    // Create a new socket with connection options
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
      
      if (newSocket.id) {
        setCurrentUser(newSocket.id);
      }
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
    
    // Register event listeners
    socket.on("error:nickname", handleNicknameError);
    socket.on("error:message", handleMessageError);
    socket.on("webpage:room", handleRoomInfo);
    socket.on("webpage:visitors", handleVisitorList);
    socket.on("chat:message", onChatMessage);
    socket.on("chat:private", onPrivateMessage);
    socket.on("visitor:joined", onVisitorJoined);
    socket.on("visitor:left", onVisitorLeft);
    
    // Clean up event listeners
    return () => {
      socket.off("error:nickname", handleNicknameError);
      socket.off("error:message", handleMessageError);
      socket.off("webpage:room", handleRoomInfo);
      socket.off("webpage:visitors", handleVisitorList);
      socket.off("chat:message", onChatMessage);
      socket.off("chat:private", onPrivateMessage);
      socket.off("visitor:joined", onVisitorJoined);
      socket.off("visitor:left", onVisitorLeft);
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
    if (!socket || !isConnected || !nickname || !text.trim() || !roomId) return;
    
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
  };

  const sendPrivateMessage = (recipient: string, text: string) => {
    if (!socket || !isConnected || !nickname || !text.trim() || !roomId) return;
    
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
      setMessages(prev => [...prev, message]);
    }
  };

  const onVisitorLeft = (message: Message) => {
    console.log("Visitor left:", message);
    if (message.roomId === roomId) {
      setMessages(prev => [...prev, message]);
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
            <MessageArea messages={messages} currentUser={nickname} />
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