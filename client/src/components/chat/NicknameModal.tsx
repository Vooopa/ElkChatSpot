import { useState, FormEvent } from "react";

// Interfaccia aggiornata per supportare entrambi i modi di utilizzo
interface NicknameModalProps {
  // Props esistenti
  onSetNickname: (nickname: string) => void;
  error?: string;


  // Props nuovi per compatibilità con WebpageRoom
  isOpen?: boolean;
  onConfirm?: (nickname: string) => void;
  errorMessage?: string;
}

const NicknameModal = ({
                         onSetNickname,
                         error,
                         isOpen = true,
                         onConfirm,
                         errorMessage
                       }: NicknameModalProps) => {
  const [nickname, setNickname] = useState("");

  // Se il componente non è aperto, non renderizzarlo
  if (isOpen === false) {
   return null;
  }
    console.log("NicknameModal rendering con props:", { onSetNickname, error, isOpen, onConfirm, errorMessage });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (nickname.trim()) {
      // Supporto per entrambi i metodi di callback
      if (onConfirm) onConfirm(nickname);
      onSetNickname(nickname);
    }
  };

  // Usa errorMessage se fornito, altrimenti usa error
  const displayError = errorMessage || error;

  return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-xl p-6 w-11/12 max-w-md mx-auto">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Welcome to the Chat</h2>
          <p className="text-gray-600 mb-4">Please enter a nickname to start chatting in this room.</p>

          {displayError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-md text-sm">
                {displayError}
              </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label htmlFor="nickname" className="block text-sm font-medium text-gray-700 mb-1">Nickname</label>
              <input
                  type="text"
                  id="nickname"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className={`w-full rounded-lg border ${displayError ? 'border-red-300' : 'border-gray-300'} py-2 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent`}
                  placeholder="Enter your nickname"
                  required
                  autoFocus
              />
            </div>
            <button
                type="submit"
                className="w-full bg-primary hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
                disabled={!nickname.trim()}
            >
              Join Chat
            </button>
          </form>
        </div>
      </div>
  );
};

export default NicknameModal;
