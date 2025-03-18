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
      
      <MessageInput onSendMessage={onSendMessage} />
      
      {showNicknameModal && <NicknameModal onSetNickname={onSetNickname} />}
      
      {!isConnected && <ConnectionStatus />}
    </div>
  );
};

export default ChatApp;
