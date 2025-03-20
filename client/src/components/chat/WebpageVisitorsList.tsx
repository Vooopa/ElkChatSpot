import { useState } from "react";
import type { WebpageVisitor } from "@shared/schema";
import { UserStatus } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { User, Users, Clock, MessageSquare } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
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
}

const WebpageVisitorsList = ({ 
  visitors, 
  currentUser, 
  onSetStatus, 
  url, 
  onStartPrivateChat,
  socket,
  activeChatWith,
  chatHistoryUsers
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

  const getStatusDot = (status: UserStatus) => {
    return <div className={`w-2 h-2 rounded-full ${getStatusColor(status)}`}></div>;
  };

  const toggleUserStatus = (status: UserStatus) => {
    if (onSetStatus) {
      let newStatus: UserStatus;
      switch (status) {
        case UserStatus.ACTIVE:
          newStatus = UserStatus.IDLE;
          break;
        case UserStatus.IDLE:
          newStatus = UserStatus.AWAY;
          break;
        case UserStatus.AWAY:
          newStatus = UserStatus.ACTIVE;
          break;
        default:
          newStatus = UserStatus.ACTIVE;
      }
      onSetStatus(newStatus);
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
              } ${visitor.unreadMessages ? "animate-pulse border border-red-400" : ""}`}
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
                      {/* Rimosso l'indicatore "CHAT ATTIVA" come richiesto */}
                      {visitor.nickname !== currentUser && visitor.unreadMessages && visitor.unreadMessages > 0 && (
                        <span className="ml-2 px-2 py-0.5 bg-red-500 text-white text-xs font-bold rounded-full animate-pulse border border-yellow-300">
                          {visitor.unreadMessages} nuovo/i
                        </span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {visitor.nickname !== currentUser && (
                    <Button 
                      variant={visitor.unreadMessages ? 'destructive' : 
                             (activeChatWith === visitor.nickname ? 'default' : 
                             (chatHistoryUsers.includes(visitor.nickname) ? 'default' : 'ghost'))}
                      size="sm"
                      className={`relative px-2 py-1 ${
                        visitor.unreadMessages ? 'chat-button-notification border-2 border-red-300' : 
                        (activeChatWith === visitor.nickname ? 'bg-blue-500 text-white hover:bg-blue-600 border border-blue-400 shadow-md' : 
                        (chatHistoryUsers.includes(visitor.nickname) ? 'bg-blue-500 text-white hover:bg-blue-600 border border-blue-300' : ''))
                      }`}
                      title={`Chat privately with ${visitor.nickname}${visitor.unreadMessages ? ` (${visitor.unreadMessages} unread)` : ''}${activeChatWith === visitor.nickname ? ' - Chat already open' : ''}${chatHistoryUsers.includes(visitor.nickname) && activeChatWith !== visitor.nickname ? ' - Chat history exists' : ''}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        
                        // Mostra conferma clic
                        try {
                          // Aggiungi messaggio di debug
                          console.log(`✅ Clic sul pulsante della chat per ${visitor.nickname}`);
                          console.log(`📝 Stato chat history: ${chatHistoryUsers.includes(visitor.nickname) ? 'Esiste cronologia' : 'Nessuna cronologia'}`);
                          
                          // Solo logging, niente alert
                          console.log(`Iniziando chat con ${visitor.nickname}`);
                        } catch (err) {
                          console.error("Errore durante la notifica:", err);
                        }
                        
                        onStartPrivateChat(visitor.nickname);
                      }}
                    >
                      <div className="flex items-center gap-1 relative">
                        <MessageSquare className={`h-4 w-4 ${
                          visitor.unreadMessages ? 'text-white' : 
                          (activeChatWith === visitor.nickname || chatHistoryUsers.includes(visitor.nickname) ? 'text-white' : 'text-blue-500')
                        }`} />
                        
                        {/* Messaggio non letto in formato badge */}
                        {visitor.unreadMessages && visitor.unreadMessages > 0 ? (
                          <div className="absolute -top-3 -right-3 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center font-bold border-2 border-yellow-300 shadow-lg animate-pulse">
                            {visitor.unreadMessages > 9 ? '9+' : visitor.unreadMessages}
                          </div>
                        ) : null}
                        
                        {/* Indicatore chat attiva o cronologia chat */}
                        {(activeChatWith === visitor.nickname && !visitor.unreadMessages) && (
                          <div className="absolute -top-2 -right-2 bg-blue-400 ring-2 ring-white w-3 h-3 rounded-full animate-pulse"></div>
                        )}
                        
                        {/* Indicatore per chat nella cronologia ma non attiva */}
                        {chatHistoryUsers.includes(visitor.nickname) && activeChatWith !== visitor.nickname && !visitor.unreadMessages && (
                          <div className="absolute -top-2 -right-2 bg-blue-300 ring-1 ring-white w-2 h-2 rounded-full"></div>
                        )}
                      </div>
                    </Button>
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
                      {getStatusDot(visitor.status)}
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

export default WebpageVisitorsList;