import { useEffect, useState, useRef } from "react";
import { useLocation } from "wouter";
import { Message, MessageType, WebpageVisitor, UserStatus } from "@shared/schema";
import { useSocket } from "@/lib/socket";
import ChatApp from "@/components/chat/ChatApp";
import WebpageVisitorsList from "@/components/chat/WebpageVisitorsList";
import WebpageUrlInput from "@/components/chat/WebpageUrlInput";

const WebpageRoom = () => {
  const [location] = useLocation();
  const socket = useSocket();
  const [isConnected, setIsConnected] = useState(false);
  const [nickname, setNickname] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [visitorCount, setVisitorCount] = useState(0);
  const [showNicknameModal, setShowNicknameModal] = useState(true);
  const [currentUrl, setCurrentUrl] = useState("");
  const [pageTitle, setPageTitle] = useState("");
  const [roomInfo, setRoomInfo] = useState("");
  const [visitors, setVisitors] = useState<WebpageVisitor[]>([]);
  const [showUrlInput, setShowUrlInput] = useState(true);
  const activityTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Room ID is derived from the URL
  const defaultRoomId = location === "/" ? "lobby" : location.substring(1);

  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      setIsConnected(true);
    };

    const onDisconnect = () => {
      setIsConnected(false);
    };

    const onVisitorCount = (count: number) => {
      setVisitorCount(count);
    };

    const onVisitorJoined = (message: Message) => {
      setMessages((prev) => [...prev, message]);
    };

    const onVisitorLeft = (message: Message) => {
      setMessages((prev) => [...prev, message]);
    };

    const onChatMessage = (message: Message) => {
      setMessages((prev) => [...prev, message]);
    };

    const onVisitors = (visitorsList: WebpageVisitor[]) => {
      setVisitors(visitorsList);
    };

    const onVisitorUpdate = (visitorsList: WebpageVisitor[]) => {
      setVisitors(visitorsList);
    };

    const onRoomInfo = (info: { roomId: string; url: string; title: string; visitorCount: number }) => {
      setRoomInfo(`${info.title || info.url}`);
      setCurrentUrl(info.url);
      setPageTitle(info.title);
      setVisitorCount(info.visitorCount);
    };

    // Connect event listeners
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("webpage:visitor_count", onVisitorCount);
    socket.on("webpage:visitor_joined", onVisitorJoined);
    socket.on("webpage:visitor_left", onVisitorLeft);
    socket.on("chat:message", onChatMessage);
    socket.on("webpage:visitors", onVisitors);
    socket.on("webpage:visitor_update", onVisitorUpdate);
    socket.on("webpage:room_info", onRoomInfo);

    // Clean up event listeners
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("webpage:visitor_count", onVisitorCount);
      socket.off("webpage:visitor_joined", onVisitorJoined);
      socket.off("webpage:visitor_left", onVisitorLeft);
      socket.off("chat:message", onChatMessage);
      socket.off("webpage:visitors", onVisitors);
      socket.off("webpage:visitor_update", onVisitorUpdate);
      socket.off("webpage:room_info", onRoomInfo);
    };
  }, [socket]);

  // Set up periodic activity updates
  useEffect(() => {
    if (!socket || !isConnected || !currentUrl || !nickname) return;

    // Clear any existing activity timeout
    if (activityTimeoutRef.current) {
      clearInterval(activityTimeoutRef.current);
    }

    // Set up a new activity reporter that sends updates every 30 seconds
    activityTimeoutRef.current = setInterval(() => {
      socket.emit("webpage:activity");
    }, 30000);

    // Clean up on unmount
    return () => {
      if (activityTimeoutRef.current) {
        clearInterval(activityTimeoutRef.current);
        activityTimeoutRef.current = null;
      }
    };
  }, [socket, isConnected, currentUrl, nickname]);

  const handleSetNickname = (name: string) => {
    if (!name.trim()) return;
    
    setNickname(name);
    setShowNicknameModal(false);
    
    // If we already have a URL, join that webpage room
    if (currentUrl && socket && isConnected) {
      joinWebpage(currentUrl, name);
    } else {
      // Otherwise show the URL input
      setShowUrlInput(true);
    }
  };

  const handleSetUrl = (url: string) => {
    if (!url.trim()) return;
    
    // Join the webpage room
    if (socket && isConnected && nickname) {
      joinWebpage(url, nickname);
      setShowUrlInput(false);
    }
  };

  const joinWebpage = (url: string, nick: string) => {
    if (!socket || !isConnected) return;
    
    setCurrentUrl(url);
    
    // Get page title if it's the current page
    let title = "";
    try {
      // If the URL appears to be for the current page, use document title
      const currentHost = window.location.host;
      if (url.includes(currentHost)) {
        title = document.title;
      }
    } catch (e) {
      // Ignore errors
    }
    
    socket.emit("webpage:join", {
      url,
      nickname: nick,
      pageTitle: title
    });
  };

  const handleSendMessage = (text: string) => {
    if (!socket || !isConnected || !nickname || !text.trim() || !currentUrl) return;
    
    // Report activity when sending messages
    socket.emit("webpage:activity");
    
    // Send the actual message to the room
    socket.emit("chat:message", {
      roomId: `url-${currentUrl}`,
      text,
      nickname,
      type: MessageType.USER_MESSAGE
    });
  };

  const handleSetStatus = (status: UserStatus) => {
    if (!socket || !isConnected || !nickname || !currentUrl) return;
    
    socket.emit("webpage:status", { status });
  };

  return (
    <div className="flex flex-col h-screen">
      {showUrlInput && !showNicknameModal && (
        <WebpageUrlInput onSubmit={handleSetUrl} />
      )}
      
      {!showUrlInput && !showNicknameModal && (
        <div className="flex h-full">
          <div className="flex-grow">
            <ChatApp
              isConnected={isConnected}
              nickname={nickname}
              messages={messages}
              onlineCount={visitorCount}
              roomInfo={roomInfo || currentUrl}
              showNicknameModal={showNicknameModal}
              onSetNickname={handleSetNickname}
              onSendMessage={handleSendMessage}
            />
          </div>
          
          <WebpageVisitorsList 
            visitors={visitors} 
            currentUser={nickname} 
            onSetStatus={handleSetStatus}
            url={currentUrl}
          />
        </div>
      )}
      
      {showNicknameModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-11/12 max-w-md mx-auto">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Join Webpage Chat</h2>
            <p className="text-gray-600 mb-4">Enter a nickname to start chatting with others browsing the same webpage.</p>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              handleSetNickname(nickname);
            }}>
              <div className="mb-4">
                <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">Nickname</label>
                <input 
                  type="text" 
                  id="nickname" 
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                  placeholder="Enter your nickname"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-primary hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
              >
                Continue
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebpageRoom;