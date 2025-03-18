import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import ChatApp from "@/components/chat/ChatApp";
import { useSocket } from "@/lib/socket";
import { Message } from "@shared/schema";

const ChatRoom = () => {
  const [location] = useLocation();
  const socket = useSocket();
  const [isConnected, setIsConnected] = useState(false);
  const [nickname, setNickname] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineCount, setOnlineCount] = useState(0);
  const [showNicknameModal, setShowNicknameModal] = useState(true);
  const [roomInfo, setRoomInfo] = useState("");

  // Room is current URL path (or 'lobby' if on homepage)
  const roomId = location === "/" ? "lobby" : location.substring(1);

  useEffect(() => {
    if (!socket) return;

    const onConnect = () => {
      setIsConnected(true);
      setRoomInfo(`${window.location.host}${location}`);
    };

    const onDisconnect = () => {
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

    const onUserJoined = (message: Message) => {
      setMessages((prev) => [...prev, message]);
    };

    const onUserLeft = (message: Message) => {
      setMessages((prev) => [...prev, message]);
    };

    // Connect event listeners
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("room:join", onRoomJoin);
    socket.on("user:count", onUserCount);
    socket.on("chat:message", onChatMessage);
    socket.on("user:joined", onUserJoined);
    socket.on("user:left", onUserLeft);

    // Clean up event listeners
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("room:join", onRoomJoin);
      socket.off("user:count", onUserCount);
      socket.off("chat:message", onChatMessage);
      socket.off("user:joined", onUserJoined);
      socket.off("user:left", onUserLeft);
    };
  }, [socket, location]);

  const handleSetNickname = (name: string) => {
    if (!name.trim()) return;
    
    setNickname(name);
    setShowNicknameModal(false);
    
    if (socket && isConnected) {
      socket.emit("user:join", { roomId, nickname: name });
    }
  };

  const handleSendMessage = (text: string) => {
    if (!socket || !isConnected || !nickname || !text.trim()) return;
    
    socket.emit("chat:message", {
      roomId,
      text,
      nickname,
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
      onSetNickname={handleSetNickname}
      onSendMessage={handleSendMessage}
    />
  );
};

export default ChatRoom;
