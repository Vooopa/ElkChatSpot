import { useState, FormEvent } from "react";

interface NicknameModalProps {
  onSetNickname: (nickname: string) => void;
}

const NicknameModal = ({ onSetNickname }: NicknameModalProps) => {
  const [nickname, setNickname] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (nickname.trim()) {
      onSetNickname(nickname);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-11/12 max-w-md mx-auto">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Welcome to the Chat</h2>
        <p className="text-gray-600 mb-4">Please enter a nickname to start chatting in this room.</p>
        
        <form onSubmit={handleSubmit}>
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
            Join Chat
          </button>
        </form>
      </div>
    </div>
  );
};

export default NicknameModal;
