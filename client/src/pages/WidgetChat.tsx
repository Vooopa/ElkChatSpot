import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { getSocket, initializeSocket } from "@/lib/socket";
import type { Message, WebpageVisitor } from "@shared/schema";
import { UserStatus, normalizeUrl, MessageType } from "@shared/schema";
import MessageInput from "@/components/chat/MessageInput";
import MessageArea from "@/components/chat/MessageArea";
import NicknameModal from "@/components/chat/NicknameModal";
import { MessageSquare, Users } from "lucide-react";

/**
 * WidgetChat - A lightweight chat component designed to be embedded in an iframe
 * for the embedded chat widget functionality
 */
const WidgetChat = () => {
  const params = useParams();
  const [nickname, setNickname] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [visitors, setVisitors] = useState<WebpageVisitor[]>([]);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [url, setUrl] = useState<string>("");
  const [isConnected, setIsConnected] = useState(false);
  const [currentUser, setCurrentUser] = useState<string>("");
  const [showNicknameModal, setShowNicknameModal] = useState(true);
  const [activeTab, setActiveTab] = useState<"chat" | "visitors">("chat");

  // Parse URL from route parameters
  useEffect(() => {
    if (params.url) {
      try {
        let decodedUrl = decodeURIComponent(params.url);
        if (!decodedUrl.startsWith("http")) {
          decodedUrl = `https://${decodedUrl}`;
        }
        setUrl(decodedUrl);
      } catch (error) {
        console.error("Failed to parse URL from params:", error);
      }
    } else {
      // If no URL is provided in params, try to get it from the parent page
      try {
        const parentUrl = document.referrer || window.parent.location.href;
        setUrl(parentUrl);
      } catch (error) {
        console.error("Failed to get URL from parent window:", error);
      }
    }
  }, [params.url]);

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

    socket.on("webpage:room_info", (data: { roomId: string, url: string, title: string }) => {
      setRoomId(data.roomId);
    });

    socket.on("webpage:visitors", (roomVisitors: WebpageVisitor[]) => {
      setVisitors(roomVisitors);
    });

    socket.on("chat:message", onChatMessage);
    socket.on("webpage:visitor_joined", onVisitorJoined);
    socket.on("webpage:visitor_left", onVisitorLeft);

    // Add a heartbeat to keep track of activity
    const activityInterval = setInterval(() => {
      if (socket.connected && roomId) {
        socket.emit("webpage:activity", { roomId });
      }
    }, 30000); // every 30 seconds

    return () => {
      clearInterval(activityInterval);
      socket.off("connect");
      socket.off("disconnect");
      socket.off("webpage:room_info");
      socket.off("webpage:visitors");
      socket.off("chat:message");
      socket.off("webpage:visitor_joined");
      socket.off("webpage:visitor_left");
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

  if (showNicknameModal) {
    return <NicknameModal onSetNickname={handleSetNickname} />;
  }

  const domain = getDomainFromUrl(url);

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden rounded-lg shadow-lg">
      {/* Header */}
      <div className="flex-none bg-gradient-to-r from-indigo-600 to-blue-500 p-3 text-white">
        <div className="flex justify-between items-center">
          <h3 className="font-medium text-sm truncate">{domain}</h3>
          <div className="text-xs flex items-center">
            <span className="inline-block w-2 h-2 rounded-full bg-green-400 mr-1"></span>
            {visitors.length} online
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex bg-gray-100 border-b">
        <button 
          className={`flex-1 py-2 text-xs font-medium flex justify-center items-center ${activeTab === 'chat' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('chat')}
        >
          <MessageSquare className="w-3 h-3 mr-1" /> Chat
        </button>
        <button 
          className={`flex-1 py-2 text-xs font-medium flex justify-center items-center ${activeTab === 'visitors' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'}`}
          onClick={() => setActiveTab('visitors')}
        >
          <Users className="w-3 h-3 mr-1" /> Visitors
        </button>
      </div>
      
      {/* Content based on active tab */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' ? (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-3">
              <MessageArea messages={messages} currentUser={nickname} />
            </div>
            <div className="flex-none p-2 border-t">
              <MessageInput onSendMessage={handleSendMessage} />
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto p-2">
            <ul className="divide-y divide-gray-100">
              {visitors.map((visitor) => (
                <li 
                  key={visitor.socketId} 
                  className={`py-2 px-1 ${visitor.socketId === currentUser ? "font-medium" : ""}`}
                >
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-2 ${
                      visitor.status === UserStatus.ACTIVE ? "bg-green-500" :
                      visitor.status === UserStatus.IDLE ? "bg-yellow-500" :
                      "bg-gray-400"
                    }`}></div>
                    <span className="text-sm truncate">
                      {visitor.nickname}
                      {visitor.socketId === currentUser && " (you)"}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
};

export default WidgetChat;