import { useState, useEffect } from "react";
import { Message } from "@shared/schema";
import Header from "./Header";
import MessageArea from "./MessageArea";
import MessageInput from "./MessageInput";
import NicknameModal from "./NicknameModal";
import ConnectionStatus from "./ConnectionStatus";

interface ChatAppProps {
  isConnected: boolean;
  nickname: string;
  messages: Message[];
  onlineCount: number;
  roomInfo: string;
  showNicknameModal: boolean;
  nicknameError?: string;
  onSetNickname: (nickname: string) => void;
  onSendMessage: (message: string) => void;
  hasJoinedRoom: boolean;
}

const ChatApp = ({
                   isConnected,
                   nickname,
                   messages,
                   onlineCount,
                   roomInfo,
                   showNicknameModal,
                   nicknameError,
                   onSetNickname,
                   onSendMessage,
                   hasJoinedRoom
                 }: ChatAppProps) => {
  // Stato per tenere traccia se un messaggio è in fase di invio
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [connectionLostMessage, setConnectionLostMessage] = useState<string | null>(null);

  // Effetto per monitorare lo stato della connessione
  useEffect(() => {
    if (!isConnected && nickname && hasJoinedRoom) {
      setConnectionLostMessage("Connessione persa. Tentativo di riconnessione in corso...");
    } else {
      setConnectionLostMessage(null);
    }
  }, [isConnected, nickname, hasJoinedRoom]);

  // Wrapper per l'invio del messaggio che aggiunge stato di caricamento
  const handleSendMessage = async (message: string) => {
    if (!isConnected || !nickname || !message.trim() || !hasJoinedRoom) {
      return;
    }

    setIsSendingMessage(true);
    try {
      await onSendMessage(message);
    } finally {
      setIsSendingMessage(false);
    }
  };

  // Verifica se l'utente può inviare messaggi
  const canSendMessages = isConnected && !!nickname && hasJoinedRoom;

  return (
      <div className="flex flex-col h-screen" role="application" aria-label="Chat application">
        <Header roomInfo={roomInfo} onlineCount={onlineCount} />

        <main className="flex-1 overflow-hidden">
          <div className="h-full flex flex-col max-w-6xl mx-auto px-4">
            {connectionLostMessage && (
                <div className="bg-yellow-100 text-yellow-800 px-4 py-2 text-center" role="alert">
                  {connectionLostMessage}
                </div>
            )}
            <MessageArea messages={messages} currentUser={nickname} />
          </div>
        </main>

        <div className="px-4 py-4 border-t bg-white">
          <MessageInput
              onSendMessage={handleSendMessage}
              disabled={!canSendMessages}
              isLoading={isSendingMessage}
          />
          {canSendMessages && (
              <div className="mt-2 text-xs text-gray-500" aria-label="Tip per messaggi privati">
                Suggerimento: Per inviare un messaggio privato, usa /pm nomeutente messaggio
              </div>
          )}
          {!canSendMessages && !showNicknameModal && (
              <div className="mt-2 text-xs text-yellow-600">
                {!isConnected
                    ? "In attesa di connessione..."
                    : !nickname
                        ? "Devi inserire un nickname prima di poter chattare"
                        : "In attesa di entrare nella stanza..."}
              </div>
          )}
        </div>

        {showNicknameModal && (
            <NicknameModal
                onSetNickname={onSetNickname}
                error={nicknameError}
                isConnecting={!isConnected}
            />
        )}

        {!isConnected && <ConnectionStatus />}
      </div>
  );
};

export default ChatApp;