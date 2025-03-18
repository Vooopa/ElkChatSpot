import { useEffect, useRef } from "react";
import { Message, MessageType } from "@shared/schema";
import { format } from "date-fns";

interface MessageAreaProps {
  messages: Message[];
  currentUser: string;
}

const MessageArea = ({ messages, currentUser }: MessageAreaProps) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Function to get first letter of nickname for avatar
  const getInitial = (nickname: string) => {
    return nickname.charAt(0).toUpperCase();
  };

  // Function to generate a consistent color based on nickname
  const getColorClass = (nickname: string) => {
    const colors = [
      "blue", "purple", "green", "amber", 
      "rose", "indigo", "teal", "cyan"
    ];
    
    // Simple hash function to determine color
    const hash = nickname.split('').reduce((acc, char) => {
      return acc + char.charCodeAt(0);
    }, 0);
    
    const colorIndex = hash % colors.length;
    return colors[colorIndex];
  };

  return (
    <div className="message-area flex-1 overflow-y-auto py-4 space-y-4">
      {/* Welcome message if this is the first message */}
      {messages.length === 0 && (
        <div className="flex justify-center">
          <div className="bg-gray-100 text-gray-600 text-xs rounded-full px-3 py-1">
            Welcome to the chat room. Be respectful and have fun!
          </div>
        </div>
      )}

      {messages.map((message, index) => {
        // Different rendering based on message type
        if (message.type === MessageType.SYSTEM) {
          return (
            <div key={index} className="flex justify-center">
              <div className="bg-gray-100 text-gray-600 text-xs rounded-full px-3 py-1">
                {message.text}
              </div>
            </div>
          );
        }

        if (message.type === MessageType.USER_JOINED) {
          return (
            <div key={index} className="flex justify-center">
              <div className="bg-blue-50 text-blue-600 text-xs rounded-full px-3 py-1">
                {message.nickname} joined the room
              </div>
            </div>
          );
        }

        if (message.type === MessageType.USER_LEFT) {
          return (
            <div key={index} className="flex justify-center">
              <div className="bg-gray-50 text-gray-500 text-xs rounded-full px-3 py-1">
                {message.nickname} left the room
              </div>
            </div>
          );
        }

        // User message
        const isCurrentUser = message.nickname === currentUser;
        const colorName = getColorClass(message.nickname);
        const time = message.timestamp ? format(new Date(message.timestamp), "h:mm a") : "";

        return (
          <div
            key={index}
            className={`user-message flex mb-4 ${isCurrentUser ? "justify-end" : ""}`}
          >
            {!isCurrentUser && (
              <div className={`w-8 h-8 rounded-full bg-${colorName}-100 flex-shrink-0 flex items-center justify-center text-${colorName}-500 font-medium mr-2`}>
                {getInitial(message.nickname || '')}
              </div>
            )}
            <div className="max-w-[80%]">
              <div className={`flex items-baseline mb-0.5 ${isCurrentUser ? "justify-end" : ""}`}>
                {!isCurrentUser && <span className="font-medium text-sm mr-2">{message.nickname}</span>}
                <span className="text-xs text-gray-500">{time}</span>
                {isCurrentUser && <span className="font-medium text-sm ml-2">{message.nickname}</span>}
              </div>
              <div 
                className={`${
                  isCurrentUser
                    ? "bg-primary text-white rounded-lg rounded-tr-none"
                    : "bg-white rounded-lg rounded-tl-none border border-gray-100"
                } p-3 shadow-sm`}
              >
                <p className="text-sm">{message.text}</p>
              </div>
            </div>
            {isCurrentUser && (
              <div className={`w-8 h-8 rounded-full bg-${colorName}-100 flex-shrink-0 flex items-center justify-center text-${colorName}-500 font-medium ml-2`}>
                {getInitial(message.nickname || '')}
              </div>
            )}
          </div>
        );
      })}
      <div ref={messagesEndRef} />
    </div>
  );
};

export default MessageArea;
