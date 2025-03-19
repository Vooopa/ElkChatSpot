import { useState, useEffect, FormEvent } from "react";
import { useLocation } from "wouter";
import { io, Socket } from "socket.io-client";
import ChatApp from "@/components/chat/ChatApp";
import { Message, MessageType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

// Main ChatRoom component - now simplified based on the working demo
const ChatRoom = () => {
  const [location] = useLocation();
  const { toast } = useToast();
  
  // Socket and connection state
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  
  // User and message state
  const [nickname, setNickname] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [privateMessages, setPrivateMessages] = useState<Message[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  
  // UI state
  const [showNicknameModal, setShowNicknameModal] = useState(true);
  const [nicknameError, setNicknameError] = useState<string | undefined>();
  const [roomInfo, setRoomInfo] = useState("");
  const [joining, setJoining] = useState(false);

  // Parse the room ID from the URL or use 'lobby' as default
  const path = location.startsWith("/chat/") ? location.substring(6) : location.substring(1);
  const roomId = path || "lobby";

  // Initialize the socket connection
  useEffect(() => {
    console.log("Setting up socket connection for ChatRoom");
    
    // Create a new socket with connection options
    const newSocket = io(window.location.origin, {
      path: "/api/socket.io",
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      timeout: 20000,
    });
    
    // Set up event listeners for connection status
    newSocket.on("connect", () => {
      console.log("Socket connected with ID:", newSocket.id);
      setIsConnected(true);
      setRoomInfo(`${window.location.host}/chat/${roomId}`);
      
      // If we already have a nickname and we were trying to join, retry join
      if (nickname && joining) {
        console.log(`Retrying join for ${nickname} to room ${roomId}`);
        newSocket.emit("user:join", { roomId, nickname });
      }
    });

    newSocket.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    // Room events
    newSocket.on("room:join", (data: { count: number }) => {
      console.log(`Joined room with ${data.count} users`);
      setOnlineCount(data.count);
      setJoining(false);
      
      toast({
        title: "Joined Successfully",
        description: `You've joined the chat room as ${nickname}`,
        variant: "default"
      });
    });

    newSocket.on("user:count", (count: number) => {
      console.log(`User count updated: ${count}`);
      setOnlineCount(count);
    });

    // Message events
    newSocket.on("chat:message", (message: Message) => {
      console.log(`Chat message received:`, message);
      setMessages((prev) => [...prev, message]);
    });
    
    newSocket.on("chat:private", (message: Message) => {
      console.log(`Private message received:`, message);
      setPrivateMessages((prev) => [...prev, message]);
      setMessages((prev) => [...prev, message]);
      
      if (message.nickname !== nickname) {
        toast({
          title: `Private message from ${message.nickname}`,
          description: message.text,
          variant: "default"
        });
      }
    });

    // User presence events
    newSocket.on("user:joined", (message: Message) => {
      console.log(`User joined:`, message);
      setMessages((prev) => [...prev, message]);
    });

    newSocket.on("user:left", (message: Message) => {
      console.log(`User left:`, message);
      setMessages((prev) => [...prev, message]);
    });
    
    // Error events
    newSocket.on("error:nickname", (data: { message: string }) => {
      console.error(`Nickname error:`, data);
      setNicknameError(data.message);
      setShowNicknameModal(true);
      setJoining(false);
      
      toast({
        title: "Nickname Error",
        description: data.message,
        variant: "destructive"
      });
    });
    
    newSocket.on("error:message", (data: { message: string }) => {
      console.error(`Message error:`, data);
      toast({
        title: "Message Error",
        description: data.message,
        variant: "destructive"
      });
    });

    // Save socket to state
    setSocket(newSocket);

    // Only disconnect when the component is fully unmounted
    return () => {
      console.log("Component unmounting, disconnecting socket");
      newSocket.disconnect();
    };
  }, [roomId, nickname, joining, toast]);

  // Handle joining a room with a nickname
  const handleSetNickname = (name: string) => {
    if (!name.trim()) return;
    
    if (!socket) {
      setNicknameError("Socket not initialized yet. Please try again.");
      return;
    }
    
    console.log(`Attempting to join room: ${roomId} with nickname: ${name}`);
    
    setNickname(name);
    setNicknameError(undefined);
    setShowNicknameModal(false);
    setJoining(true);
    
    // Emit join event
    socket.emit("user:join", { roomId, nickname: name });
  };

  // Handle sending a chat message
  const handleSendMessage = (text: string) => {
    if (!socket || !isConnected || !nickname || !text.trim()) return;
    
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
    socket.emit("chat:message", {
      roomId,
      text,
      nickname,
      timestamp: new Date().toISOString(),
    });
  };
  
  // Handle sending a private message
  const sendPrivateMessage = (recipient: string, text: string) => {
    if (!socket || !isConnected || !nickname || !text.trim()) return;
    
    socket.emit("chat:private", {
      roomId,
      text,
      nickname,
      recipient,
      type: MessageType.PRIVATE_MESSAGE,
      timestamp: new Date().toISOString(),
    });
  };

  // Show a loading state if trying to join
  if (joining && !showNicknameModal) {
    return (
      <div className="flex flex-col h-screen items-center justify-center">
        <div className="text-xl font-semibold mb-4">Connecting to chat...</div>
        <div className="animate-pulse bg-blue-100 rounded-full h-12 w-12 flex items-center justify-center">
          <div className="h-8 w-8 rounded-full bg-blue-500"></div>
        </div>
      </div>
    );
  }

  // Render the UI
  return (
    <div>
      {showNicknameModal ? (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-11/12 max-w-md mx-auto">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Welcome to the Chat</h2>
            <p className="text-gray-600 mb-4">Please enter a nickname to start chatting in room: <span className="font-semibold">{roomId}</span></p>
            
            {nicknameError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
                {nicknameError}
              </div>
            )}
            
            <form onSubmit={(e) => {
              e.preventDefault();
              const input = e.currentTarget.querySelector('input') as HTMLInputElement;
              const value = input?.value;
              if (value) handleSetNickname(value);
            }}>
              <div className="mb-4">
                <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">Nickname</label>
                <input 
                  type="text" 
                  id="nickname" 
                  className={`w-full rounded-lg border ${nicknameError ? 'border-red-300' : 'border-gray-300'} py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
                  placeholder="Enter your nickname"
                  required
                />
              </div>
              <button 
                type="submit" 
                className="w-full bg-primary hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                disabled={!socket || !isConnected}
              >
                {socket && isConnected ? "Join Chat" : "Connecting..."}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <ChatApp
          isConnected={isConnected}
          nickname={nickname}
          messages={messages}
          onlineCount={onlineCount}
          roomInfo={roomInfo}
          showNicknameModal={false}
          nicknameError={nicknameError}
          onSetNickname={handleSetNickname}
          onSendMessage={handleSendMessage}
        />
      )}
    </div>
  );
};

export default ChatRoom;