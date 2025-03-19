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
}: ChatAppProps) => {
  return (
    <div className="flex flex-col h-screen">
      <Header roomInfo={roomInfo} onlineCount={onlineCount} />
      
      <main className="flex-1 overflow-hidden">
        <div className="h-full flex flex-col max-w-6xl mx-auto px-4">
          <MessageArea messages={messages} currentUser={nickname} />
        </div>
      </main>
      
      <div className="px-4 py-4 border-t bg-white">
        <MessageInput onSendMessage={onSendMessage} />
        <div className="mt-2 text-xs text-gray-500">
          Tip: To send a private message, use /pm username message
        </div>
      </div>
      
      {showNicknameModal && <NicknameModal onSetNickname={onSetNickname} error={nicknameError} />}
      
      {!isConnected && <ConnectionStatus />}
    </div>
  );
};

export default ChatApp;
