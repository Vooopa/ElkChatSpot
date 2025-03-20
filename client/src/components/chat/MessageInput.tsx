import { useState, FormEvent } from "react";
import { Send } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

const MessageInput = ({ onSendMessage, onTypingStart, onTypingStop }: MessageInputProps) => {
  const [message, setMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      // Quando si invia un messaggio, l'utente non sta più scrivendo
      if (onTypingStop && isTyping) {
        onTypingStop();
        setIsTyping(false);
      }
      
      onSendMessage(message);
      setMessage("");
    }
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setMessage(text);
    
    // Gestione stato "sta scrivendo"
    if (text.trim() && !isTyping && onTypingStart) {
      // L'utente ha iniziato a scrivere
      setIsTyping(true);
      onTypingStart();
    } else if (!text.trim() && isTyping && onTypingStop) {
      // L'utente ha smesso di scrivere (campo vuoto)
      setIsTyping(false);
      onTypingStop();
    }
    
    // Reset del timeout esistente
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Imposta un nuovo timeout per determinare quando l'utente ha smesso di scrivere
    const newTimeout = setTimeout(() => {
      if (isTyping && onTypingStop) {
        setIsTyping(false);
        onTypingStop();
      }
    }, 2000); // 2 secondi dopo l'ultima digitazione
    
    setTypingTimeout(newTimeout);
  };

  return (
    <div className="bg-white border-t border-gray-200 py-3 px-4">
      <div className="max-w-6xl mx-auto">
        <form className="flex items-center" onSubmit={handleSubmit}>
          <input
            type="text"
            value={message}
            onChange={handleInputChange}
            className="flex-1 rounded-l-lg border border-gray-300 py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
            placeholder="Type your message..."
          />
          <button
            type="submit"
            className="bg-primary hover:bg-blue-600 text-white py-2 px-4 rounded-r-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            <span className="hidden sm:inline mr-1">Send</span>
            <Send className="h-5 w-5 inline-block" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default MessageInput;
