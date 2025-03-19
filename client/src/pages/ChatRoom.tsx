import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import ChatApp from "@/components/chat/ChatApp";
import { useSocket, initializeSocket } from "@/lib/socket";
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
  const [joining, setJoining] = useState(false);

  // Room is current URL path (or 'lobby' if on homepage)
  // Strip any initial "chat/" from the path if present
  const path = location.startsWith("/chat/") ? location.substring(6) : location.substring(1);
  const roomId = path || "lobby";

  useEffect(() => {
    // Ensure we have a socket connection
    const currentSocket = initializeSocket();
    
    // Set up debug state
    console.log(`Room ID: ${roomId}`);
    console.log(`Initial socket connected: ${currentSocket.connected}`);
    setIsConnected(currentSocket.connected);
    
    const onConnect = () => {
      console.log("Socket connected event fired");
      setIsConnected(true);
      setRoomInfo(`${window.location.host}/chat/${roomId}`);
      
      // If we already have a nickname and we were trying to join, retry join
      if (nickname && joining) {
        console.log(`Retrying join for ${nickname} to room ${roomId}`);
        currentSocket.emit("user:join", { roomId, nickname });
      }
    };

    const onDisconnect = () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    };

    const onRoomJoin = (data: { count: number }) => {
      console.log(`Joined room with ${data.count} users`);
      setOnlineCount(data.count);
      setJoining(false);
      
      // Show success toast
      toast({
        title: "Joined Successfully",
        description: `You've joined the chat room as ${nickname}`,
        variant: "default"
      });
    };

    const onUserCount = (count: number) => {
      console.log(`User count updated: ${count}`);
      setOnlineCount(count);
    };

    const onChatMessage = (message: Message) => {
      console.log(`Chat message received: ${message.text}`);
      setMessages((prev) => [...prev, message]);
    };
    
    const onPrivateMessage = (message: Message) => {
      console.log(`Private message received: ${message.text}`);
      setPrivateMessages((prev) => [...prev, message]);
      setMessages((prev) => [...prev, message]);
      
      if (message.nickname !== nickname) {
        toast({
          title: `Private message from ${message.nickname}`,
          description: message.text,
          variant: "default"
        });
      }
    };

    const onUserJoined = (message: Message) => {
      console.log(`User joined: ${message.nickname}`);
      setMessages((prev) => [...prev, message]);
    };

    const onUserLeft = (message: Message) => {
      console.log(`User left: ${message.nickname}`);
      setMessages((prev) => [...prev, message]);
    };
    
    const onNicknameError = (data: { message: string }) => {
      console.error(`Nickname error: ${data.message}`);
      setNicknameError(data.message);
      setShowNicknameModal(true);
      setJoining(false);
      
      toast({
        title: "Nickname Error",
        description: data.message,
        variant: "destructive"
      });
    };
    
    const onMessageError = (data: { message: string }) => {
      console.error(`Message error: ${data.message}`);
      toast({
        title: "Message Error",
        description: data.message,
        variant: "destructive"
      });
    };

    // Connect event listeners
    currentSocket.on("connect", onConnect);
    currentSocket.on("disconnect", onDisconnect);
    currentSocket.on("room:join", onRoomJoin);
    currentSocket.on("user:count", onUserCount);
    currentSocket.on("chat:message", onChatMessage);
    currentSocket.on("chat:private", onPrivateMessage);
    currentSocket.on("user:joined", onUserJoined);
    currentSocket.on("user:left", onUserLeft);
    currentSocket.on("error:nickname", onNicknameError);
    currentSocket.on("error:message", onMessageError);

    // Clean up event listeners
    return () => {
      currentSocket.off("connect", onConnect);
      currentSocket.off("disconnect", onDisconnect);
      currentSocket.off("room:join", onRoomJoin);
      currentSocket.off("user:count", onUserCount);
      currentSocket.off("chat:message", onChatMessage);
      currentSocket.off("chat:private", onPrivateMessage);
      currentSocket.off("user:joined", onUserJoined);
      currentSocket.off("user:left", onUserLeft);
      currentSocket.off("error:nickname", onNicknameError);
      currentSocket.off("error:message", onMessageError);
    };
  }, [roomId, nickname, joining, toast]);

  const handleSetNickname = (name: string) => {
    if (!name.trim()) return;
    
    // Get the current socket instance
    const currentSocket = initializeSocket();
    
    console.log(`Attempting to join room: ${roomId} with nickname: ${name}`);
    console.log(`Socket connected: ${currentSocket.connected}`);
    
    setNickname(name);
    setNicknameError(undefined);
    setShowNicknameModal(false);
    setJoining(true);
    
    // If socket is connected, emit join event
    if (currentSocket.connected) {
      console.log(`Socket is connected, emitting user:join event to room: ${roomId}`);
      currentSocket.emit("user:join", { roomId, nickname: name });
    } else {
      // If socket is not connected, connect it and try again
      console.log("Socket not connected, connecting now...");
      currentSocket.connect();
      
      // After connecting, we'll join in the onConnect handler
      // since we set joining = true and have the nickname
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
