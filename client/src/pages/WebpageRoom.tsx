import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { getSocket, initializeSocket } from "@/lib/socket";
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

const WebpageRoom = () => {
  const params = useParams();
  const [, setLocation] = useLocation();
  const [showUrlInput, setShowUrlInput] = useState(true);
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [nickname, setNickname] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [visitors, setVisitors] = useState<WebpageVisitor[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [url, setUrl] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>("");

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

  const handleUrlSubmit = (submittedUrl: string) => {
    setUrl(submittedUrl);
    setShowUrlInput(false);
    setShowNicknameModal(true);
  };

  const handleSetNickname = (newNickname: string) => {
    setNickname(newNickname);
    setShowNicknameModal(false);
    
    // Initialize socket connection after nickname is set
    const socket = getSocket() || initializeSocket();
    
    socket.on("connect", () => {
      setIsConnected(true);
      
      if (socket.id) {
        setCurrentUser(socket.id);
      }
      
      // Join webpage-specific room
      socket.emit("webpage:join", {
        url: normalizeUrl(url),
        nickname: newNickname
      });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("webpage:roomId", (data: { roomId: string }) => {
      setRoomId(data.roomId);
      // Update URL route with room ID
      setLocation(`/webpage/${encodeURIComponent(url)}`);
    });

    socket.on("webpage:visitors", (roomVisitors: WebpageVisitor[]) => {
      setVisitors(roomVisitors);
    });

    socket.on("chat:message", onChatMessage);
    socket.on("user:joined", onVisitorJoined);
    socket.on("user:left", onVisitorLeft);

    return () => {
      socket.off("connect");
      socket.off("disconnect");
      socket.off("webpage:roomId");
      socket.off("webpage:visitors");
      socket.off("chat:message");
      socket.off("user:joined");
      socket.off("user:left");
    };
  };

  const handleSendMessage = (text: string) => {
    if (!text.trim() || !roomId) return;
    
    const socket = getSocket();
    if (socket && isConnected) {
      const message: Message = {
        roomId,
        text,
        type: MessageType.USER_MESSAGE,
        nickname
      };
      socket.emit("chat:message", message);
    }
  };

  const handleSetStatus = (status: UserStatus) => {
    const socket = getSocket();
    if (socket && isConnected && roomId) {
      socket.emit("webpage:setStatus", {
        roomId,
        status
      });
    }
  };

  const onVisitorJoined = (message: Message) => {
    if (message.roomId === roomId) {
      setMessages(prev => [...prev, message]);
    }
  };

  const onVisitorLeft = (message: Message) => {
    if (message.roomId === roomId) {
      setMessages(prev => [...prev, message]);
    }
  };

  const onChatMessage = (message: Message) => {
    if (message.roomId === roomId) {
      setMessages(prev => [...prev, message]);
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
    return <NicknameModal onSetNickname={handleSetNickname} />;
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