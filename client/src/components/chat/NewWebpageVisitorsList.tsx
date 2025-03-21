import { useState } from "react";
import type { WebpageVisitor } from "@shared/schema";
import { UserStatus } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { User, Users, Clock, MessageSquare, MessageCircle } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Socket } from "socket.io-client";

interface WebpageVisitorsListProps {
  visitors: WebpageVisitor[];
  currentUser: string; // This is the current user's nickname
  onSetStatus: (status: UserStatus) => void;
  url: string;
  onStartPrivateChat: (recipientName: string) => void;
  socket: Socket | null;
  activeChatWith: string | null; // Nome utente con cui è attiva una chat privata
  chatHistoryUsers: string[]; // Lista di utenti con cui è stato scambiato almeno un messaggio
  typingUsers?: {[key: string]: boolean}; // Utenti che stanno scrivendo
}

const NewWebpageVisitorsList = ({ 
  visitors, 
  currentUser, 
  onSetStatus, 
  url, 
  onStartPrivateChat,
  socket,
  activeChatWith,
  chatHistoryUsers,
  typingUsers = {}
}: WebpageVisitorsListProps) => {
  // Find the current user's visitor object by nickname
  const currentUserVisitor = visitors.find(v => v.nickname === currentUser);
  const [expandedVisitor, setExpandedVisitor] = useState<string | null>(null);

  // Helper functions for status visualization
  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case UserStatus.ACTIVE:
        return "bg-green-500";
      case UserStatus.IDLE:
        return "bg-yellow-500";
      case UserStatus.AWAY:
        return "bg-gray-400";
      default:
        return "bg-gray-300";
    }
  };

  // Format domain name from URL
  const getDomainFromUrl = (urlString: string) => {
    try {
      const url = new URL(urlString);
      return url.hostname;
    } catch {
      return urlString;
    }
  };

  const domain = getDomainFromUrl(url);

  const handleStartPrivateChat = (nickname: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering the expand/collapse
    if (nickname !== currentUser) {
      onStartPrivateChat(nickname);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden h-full flex flex-col">
      <div className="p-4 bg-gray-50 border-b flex justify-between items-center">
        <div>
          <h3 className="font-medium text-gray-800 flex items-center">
            <Users className="h-4 w-4 mr-2" />
            Visitors on <span className="font-semibold ml-1">{domain}</span>
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {visitors.length} {visitors.length === 1 ? "person" : "people"} browsing
          </p>
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center text-sm text-gray-600 hover:text-gray-900 focus:outline-none">
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-1 ${getStatusColor(
                currentUserVisitor?.status || UserStatus.ACTIVE
              )}`}></div>
              <span>Status</span>
            </div>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onSetStatus(UserStatus.ACTIVE)} className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-2"></div>
              Active
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetStatus(UserStatus.IDLE)} className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-yellow-500 mr-2"></div>
              Idle
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onSetStatus(UserStatus.AWAY)} className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-gray-400 mr-2"></div>
              Away
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="overflow-y-auto flex-1 p-2">
        <ul className="divide-y divide-gray-100">
          {visitors.map((visitor) => (
            <li 
              key={visitor.socketId} 
              id={`visitor-${visitor.nickname}`}
              className={`p-2 hover:bg-gray-50 rounded-md transition-colors ${
                visitor.nickname === currentUser ? "bg-blue-50" : ""
              }`}
              onClick={() => setExpandedVisitor(
                expandedVisitor === visitor.socketId ? null : visitor.socketId
              )}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="relative">
                    <div className="w-8 h-8 bg-gradient-to-r from-blue-100 to-blue-200 rounded-full flex items-center justify-center text-blue-600">
                      <User className="h-4 w-4" />
                    </div>
                    <div className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${getStatusColor(visitor.status)}`}></div>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-gray-700 flex items-center">
                      {visitor.nickname}
                      {visitor.nickname === currentUser && (
                        <span className="ml-2 text-xs font-normal text-gray-500">(you)</span>
                      )}
                      
                      {/* Indicatore messaggi non letti (SENZA NUMERI) usando sia contatore che flag booleano */}
                      {visitor.nickname !== currentUser && 
                       ((visitor.unreadMessages && visitor.unreadMessages > 0) || visitor.hasUnreadMessages) && (
                        <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse">
                          Nuovo
                        </span>
                      )}
                      
                      {/* Indicatore "sta scrivendo" */}
                      {visitor.nickname !== currentUser && typingUsers[visitor.nickname] && (
                        <span className="ml-2 px-2 py-0.5 bg-yellow-400 text-yellow-800 text-xs font-medium rounded-full animate-pulse">
                          sta scrivendo...
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {visitor.nickname !== currentUser && (
                    <>
                    {/* Due pulsanti completamente diversi: uno prima della chat e uno dopo */}
                    {chatHistoryUsers.includes(visitor.nickname) ? (
                      <button
                        type="button"
                        className={`flex items-center justify-center px-3 py-1.5 rounded-full text-sm font-bold shadow-lg ${
                          (visitor.unreadMessages && visitor.unreadMessages > 0) || visitor.hasUnreadMessages
                            ? 'bg-gradient-to-r from-red-500 to-red-600 text-white animate-pulse border-2 border-red-300'
                            : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white border-2 border-blue-300'
                        }`}
                        title={
                          (visitor.unreadMessages && visitor.unreadMessages > 0) || visitor.hasUnreadMessages
                            ? 'Hai nuovi messaggi'
                            : 'Continua chat'
                        }
                        onClick={(e) => handleStartPrivateChat(visitor.nickname, e)}
                      >
                        <MessageCircle className="h-4 w-4 mr-1" />
                        <span>Chat</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="flex items-center justify-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300"
                        title="Inizia chat"
                        onClick={(e) => handleStartPrivateChat(visitor.nickname, e)}
                      >
                        <MessageSquare className="h-3 w-3 mr-1" />
                        <span>Inizia chat</span>
                      </button>
                    )}
                    </>
                  )}
                  <div className="flex items-center text-sm text-gray-500">
                    <Clock className="h-3 w-3 mr-1" />
                    <span className="text-xs">{formatDistanceToNow(new Date(visitor.joinedAt), { addSuffix: true })}</span>
                  </div>
                </div>
              </div>
              
              {expandedVisitor === visitor.socketId && (
                <div className="mt-2 pl-11 text-xs text-gray-500 space-y-1">
                  <p>Joined: {new Date(visitor.joinedAt).toLocaleString()}</p>
                  <p>Last activity: {formatDistanceToNow(new Date(visitor.lastActivity), { addSuffix: true })}</p>
                  <p className="flex items-center">
                    Status: 
                    <span className="flex items-center ml-1">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(visitor.status)}`}></div>
                      <span className="ml-1 capitalize">{visitor.status}</span>
                    </span>
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default NewWebpageVisitorsList;