import { useState, useEffect, FormEvent, useRef } from "react";
import { X, Send } from "lucide-react";
import { Message, MessageType } from "@shared/schema";
import { Socket } from "socket.io-client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PrivateChatDialogProps {
  isOpen: boolean;
  onClose: () => void;
  recipientName: string;
  currentUser: string;
  socket: Socket | null;
  roomId: string;
}

const PrivateChatDialog = ({
  isOpen,
  onClose,
  recipientName,
  currentUser,
  socket,
  roomId,
}: PrivateChatDialogProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<Map<string, Message[]>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load chat history when the dialog opens
  useEffect(() => {
    if (isOpen && recipientName) {
      // If we already have chat history with this user, use it
      if (chatHistory.has(recipientName)) {
        setMessages(chatHistory.get(recipientName) || []);
      } else {
        // Otherwise start with an empty chat
        setMessages([]);
      }
    }
  }, [isOpen, recipientName, chatHistory]);

  // Set up a single socket event listener for the entire application
  useEffect(() => {
    if (!socket) return;
    
    console.log("🔵 Setting up private message listener with", {
      currentUser,
      recipientName
    });

    function handlePrivateMessage(message: Message) {
      console.log("🔵 Received private message in dialog:", message);
      
      // Add more debug info
      console.log("🔵 Context:", {
        currentUser,
        recipientName,
        messageFrom: message.nickname,
        messageTo: message.recipient
      });
      
      // GREATLY simplified message relevance check:
      // A message is relevant if:
      // 1. It's from the current user to the recipient we're chatting with, OR
      // 2. It's from the recipient we're chatting with to the current user
      const isFromCurrentUser = message.nickname?.toLowerCase() === currentUser?.toLowerCase();
      const isToCurrentUser = message.recipient?.toLowerCase() === currentUser?.toLowerCase();
      const isFromRecipient = message.nickname?.toLowerCase() === recipientName?.toLowerCase();
      const isToRecipient = message.recipient?.toLowerCase() === recipientName?.toLowerCase();
      
      const isRelevant = (isFromCurrentUser && isToRecipient) || (isFromRecipient && isToCurrentUser);
      
      console.log("🔵 Message relevance check:", {
        isFromCurrentUser,
        isToCurrentUser,
        isFromRecipient,
        isToRecipient,
        isRelevant
      });
      
      if (!isRelevant) {
        console.log("🔵 Message not relevant to this chat, ignoring");
        return;
      }
      
      // Message is relevant, so add it to our chat
      console.log("🔵 Message IS relevant, adding to chat");
      
      // Add to messages state
      setMessages(prevMessages => [...prevMessages, message]);
      
      // Store in chat history
      setChatHistory(prevHistory => {
        const otherUser = isFromCurrentUser ? message.recipient! : message.nickname!;
        const prevMessages = prevHistory.get(otherUser) || [];
        const newHistory = new Map(prevHistory);
        newHistory.set(otherUser, [...prevMessages, message]);
        return newHistory;
      });
    }

    if (socket) {
      socket.on("chat:private", handlePrivateMessage);
      
      return () => {
        console.log("🔵 Removing private message listener");
        socket.off("chat:private", handlePrivateMessage);
      };
    }
    return () => {};
  }, [socket, currentUser, recipientName]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);
  
  // Save messages to chat history when the dialog closes
  useEffect(() => {
    if (!isOpen && messages.length > 0 && recipientName) {
      setChatHistory(prev => {
        const newHistory = new Map(prev);
        newHistory.set(recipientName, [...messages]);
        return newHistory;
      });
    }
  }, [isOpen, messages, recipientName]);

  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim() || !socket || !roomId) return;
    
    const privateMessage: Message = {
      roomId,
      nickname: currentUser,
      text: newMessage,
      timestamp: new Date().toISOString(),
      type: MessageType.PRIVATE_MESSAGE,
      recipient: recipientName
    };
    
    socket.emit("chat:private", privateMessage);
    setNewMessage("");
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px] h-[500px] flex flex-col">
        <DialogHeader className="flex flex-row items-center justify-between border-b pb-2">
          <DialogTitle>Private chat with {recipientName}</DialogTitle>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </DialogHeader>
        
        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                Start a private conversation with {recipientName}
              </div>
            ) : (
              messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.nickname === currentUser
                      ? "justify-end"
                      : "justify-start"
                  }`}
                >
                  <div
                    className={`rounded-lg px-4 py-2 max-w-[80%] ${
                      message.nickname === currentUser
                        ? "bg-blue-500 text-white"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    <div className="text-sm break-words">{message.text}</div>
                    <div
                      className={`text-xs mt-1 ${
                        message.nickname === currentUser
                          ? "text-blue-100"
                          : "text-gray-500"
                      }`}
                    >
                      {formatTime(message.timestamp || new Date().toISOString())}
                    </div>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
        
        <form onSubmit={handleSendMessage} className="flex items-center border-t pt-2">
          <Input
            className="flex-1"
            placeholder={`Message ${recipientName}...`}
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
          />
          <Button type="submit" size="icon" className="ml-2">
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default PrivateChatDialog;