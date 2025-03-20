import { useState, FormEvent } from "react";
import { Send } from "lucide-react";

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onTypingStart?: () => void;
  onTypingStop?: () => void;
}

const MessageInput = ({ onSendMessage }: MessageInputProps) => {
  const [message, setMessage] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage("");
    }
  };

  return (
    <div className="bg-white border-t border-gray-200 py-3 px-4">
      <div className="max-w-6xl mx-auto">
        <form className="flex items-center" onSubmit={handleSubmit}>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
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
