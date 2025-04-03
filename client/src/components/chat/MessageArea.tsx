import { useEffect, useRef, useMemo } from "react";
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

  // Function to generate consistent colors based on nickname
  const getAvatarColors = useMemo(() => {
    const colorMap = new Map<string, { bg: string, text: string }>();

    return (nickname: string): { bg: string, text: string } => {
      const defaultNickname = nickname || "Anonymous";

      // Return cached color if already computed
      if (colorMap.has(defaultNickname)) {
        return colorMap.get(defaultNickname)!;
      }

      const colorOptions = [
        { bg: "bg-blue-100", text: "text-blue-500" },
        { bg: "bg-purple-100", text: "text-purple-500" },
        { bg: "bg-green-100", text: "text-green-500" },
        { bg: "bg-amber-100", text: "text-amber-500" },
        { bg: "bg-rose-100", text: "text-rose-500" },
        { bg: "bg-indigo-100", text: "text-indigo-500" },
        { bg: "bg-teal-100", text: "text-teal-500" },
        { bg: "bg-cyan-100", text: "text-cyan-500" }
      ];

      // Safety check: if nickname is undefined or empty, return a default color
      if (!defaultNickname || defaultNickname.length === 0) {
        return colorOptions[0];
      }

      // Simple hash function to determine color
      const hash = defaultNickname.split('').reduce((acc, char) => {
        return acc + char.charCodeAt(0);
      }, 0);

      const colorIndex = hash % colorOptions.length;
      const color = colorOptions[colorIndex];

      // Cache the computed color
      colorMap.set(defaultNickname, color);

      return color;
    };
  }, []);

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

          // Private message
          if (message.type === MessageType.PRIVATE_MESSAGE) {
            const isCurrentUser = message.nickname === currentUser;
            const defaultNickname = message.nickname || "Anonymous";
            const colors = getAvatarColors(defaultNickname);

            let time = "";
            if (message.timestamp) {
              try {
                time = format(new Date(message.timestamp), "h:mm a");
              } catch (error) {
                // In caso di errore con il timestamp, lasciamo il tempo vuoto
                console.error("Errore nel formato timestamp:", error);
              }
            }

            const recipientText = isCurrentUser
                ? `Private message to ${message.recipient || "Unknown"}`
                : `Private message from ${defaultNickname}`;

            return (
                <div
                    key={index}
                    className={`user-message flex mb-4 ${isCurrentUser ? "justify-end" : ""}`}
                >
                  {!isCurrentUser && (
                      <div className={`w-8 h-8 rounded-full ${colors.bg} flex-shrink-0 flex items-center justify-center ${colors.text} font-medium mr-2`}>
                        {getInitial(defaultNickname)}
                      </div>
                  )}
                  <div className="max-w-[80%]">
                    <div className={`flex items-baseline mb-0.5 ${isCurrentUser ? "justify-end" : ""}`}>
                      <span className="text-xs text-purple-500 font-medium mr-1">{recipientText}</span>
                      <span className="text-xs text-gray-500 ml-1">{time}</span>
                    </div>
                    <div
                        className={`${
                            isCurrentUser
                                ? "bg-purple-500 bg-opacity-90 text-white rounded-lg rounded-tr-none"
                                : "bg-purple-50 text-purple-800 rounded-lg rounded-tl-none border border-purple-100"
                        } p-3 shadow-sm`}
                    >
                      <p className="text-sm">{message.text}</p>
                    </div>
                  </div>
                  {isCurrentUser && (
                      <div className={`w-8 h-8 rounded-full ${colors.bg} flex-shrink-0 flex items-center justify-center ${colors.text} font-medium ml-2`}>
                        {getInitial(defaultNickname)}
                      </div>
                  )}
                </div>
            );
          }

          // Regular user message
          const isCurrentUser = message.nickname === currentUser;
          const defaultNickname = message.nickname || "Anonymous";
          const colors = getAvatarColors(defaultNickname);

          let time = "";
          if (message.timestamp) {
            try {
              time = format(new Date(message.timestamp), "h:mm a");
            } catch (error) {
              // In caso di errore con il timestamp, lasciamo il tempo vuoto
              console.error("Errore nel formato timestamp:", error);
            }
          }

          return (
              <div
                  key={index}
                  className={`user-message flex mb-4 ${isCurrentUser ? "justify-end" : ""}`}
              >
                {!isCurrentUser && (
                    <div className={`w-8 h-8 rounded-full ${colors.bg} flex-shrink-0 flex items-center justify-center ${colors.text} font-medium mr-2`}>
                      {getInitial(defaultNickname)}
                    </div>
                )}
                <div className="max-w-[80%]">
                  <div className={`flex items-baseline mb-0.5 ${isCurrentUser ? "justify-end" : ""}`}>
                    {!isCurrentUser && <span className="font-medium text-sm mr-2">{defaultNickname}</span>}
                    <span className="text-xs text-gray-500">{time}</span>
                    {isCurrentUser && <span className="font-medium text-sm ml-2">{defaultNickname}</span>}
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
                    <div className={`w-8 h-8 rounded-full ${colors.bg} flex-shrink-0 flex items-center justify-center ${colors.text} font-medium ml-2`}>
                      {getInitial(defaultNickname)}
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