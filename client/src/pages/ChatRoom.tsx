import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import ChatApp from "@/components/chat/ChatApp";
import { useSocket } from "@/lib/socket";
import { Message, MessageType } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const ChatRoom = () => {
  const [location] = useLocation();
  const socket = useSocket();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [nickname, setNickname] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [privateMessages, setPrivateMessages] = useState<Message[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [showNicknameModal, setShowNicknameModal] = useState(true);
  const [nicknameError, setNicknameError] = useState<string | undefined>();
  const [roomInfo, setRoomInfo] = useState("");

  // Room is current URL path (or 'lobby' if on homepage)
  const roomId = location === "/" ? "lobby" : location.substring(1);

  useEffect(() => {
    if (!socket) {
      console.log("No socket instance available");
      return;
    }

    console.log("Setting up socket listeners");

    const onConnect = () => {
      console.log("Socket connected event fired");
      setIsConnected(true);
      setRoomInfo(`${window.location.host}${location}`);
      
      // If we already have a nickname, try to join the room
      if (nickname) {
        console.log(`Already have nickname (${nickname}), trying to join room ${roomId}`);
        socket.emit("user:join", { roomId, nickname });
      }
    };

    const onDisconnect = () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    };

    const onRoomJoin = (data: { count: number }) => {
      setOnlineCount(data.count);
    };

    const onUserCount = (count: number) => {
      setOnlineCount(count);
    };

    const onChatMessage = (message: Message) => {
      setMessages((prev) => [...prev, message]);
    };
    
    const onPrivateMessage = (message: Message) => {
      setPrivateMessages((prev) => [...prev, message]);
      // Also add to main message list
      setMessages((prev) => [...prev, message]);
      
      // Show a toast if the message is from someone else
      if (message.nickname !== nickname) {
        toast({
          title: `Private message from ${message.nickname}`,
          description: message.text,
          variant: "default"
        });
      }
    };

    const onUserJoined = (message: Message) => {
      setMessages((prev) => [...prev, message]);
    };

    const onUserLeft = (message: Message) => {
      setMessages((prev) => [...prev, message]);
    };
    
    const onNicknameError = (data: { message: string }) => {
      setNicknameError(data.message);
      setShowNicknameModal(true);
    };
    
    const onMessageError = (data: { message: string }) => {
      toast({
        title: "Message Error",
        description: data.message,
        variant: "destructive"
      });
    };

    // Connect event listeners
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room:join", onRoomJoin);
    socket.on("user:count", onUserCount);
    socket.on("chat:message", onChatMessage);
    socket.on("chat:private", onPrivateMessage);
    socket.on("user:joined", onUserJoined);
    socket.on("user:left", onUserLeft);
    socket.on("error:nickname", onNicknameError);
    socket.on("error:message", onMessageError);

    // Clean up event listeners
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room:join", onRoomJoin);
      socket.off("user:count", onUserCount);
      socket.off("chat:message", onChatMessage);
      socket.off("chat:private", onPrivateMessage);
      socket.off("user:joined", onUserJoined);
      socket.off("user:left", onUserLeft);
      socket.off("error:nickname", onNicknameError);
      socket.off("error:message", onMessageError);
    };
  }, [socket, location, nickname, roomId, toast]);

  const handleSetNickname = (name: string) => {
    if (!name.trim()) return;
    
    console.log(`Attempting to join room: ${roomId} with nickname: ${name}`);
    console.log(`Socket connected: ${Boolean(socket)}, isConnected: ${isConnected}`);
    
    setNickname(name);
    setNicknameError(undefined);
    setShowNicknameModal(false);
    
    if (socket && isConnected) {
      console.log(`Emitting user:join event to room: ${roomId}`);
      socket.emit("user:join", { roomId, nickname: name });
    } else {
      console.error("Cannot join: Socket not connected");
      
      // Add fallback for connection issues - try to initialize socket again
      if (socket && !isConnected) {
        console.log("Attempting to reconnect socket...");
        socket.connect();
        
        // Wait a bit and try to join again
        setTimeout(() => {
          if (socket.connected) {
            console.log("Socket reconnected, trying to join again");
            socket.emit("user:join", { roomId, nickname: name });
          } else {
            console.error("Socket reconnection failed");
          }
        }, 1000);
      }
    }
  };

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

  return (
    <ChatApp
      isConnected={isConnected}
      nickname={nickname}
      messages={messages}
      onlineCount={onlineCount}
      roomInfo={roomInfo}
      showNicknameModal={showNicknameModal}
      nicknameError={nicknameError}
      onSetNickname={handleSetNickname}
      onSendMessage={handleSendMessage}
    />
  );
};

export default ChatRoom;
