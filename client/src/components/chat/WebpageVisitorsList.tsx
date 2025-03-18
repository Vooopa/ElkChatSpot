import { WebpageVisitor, UserStatus } from "@shared/schema";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Users, User, UserRoundCheck, Clock, LinkIcon } from "lucide-react";

interface WebpageVisitorsListProps {
  visitors: WebpageVisitor[];
  currentUser: string;
  onSetStatus: (status: UserStatus) => void;
  url: string;
}

const WebpageVisitorsList = ({ visitors, currentUser, onSetStatus, url }: WebpageVisitorsListProps) => {
  const [isExpanded, setIsExpanded] = useState(true);

  const getStatusColor = (status: UserStatus) => {
    switch (status) {
      case UserStatus.ACTIVE:
        return "text-green-500";
      case UserStatus.IDLE:
        return "text-amber-500";
      case UserStatus.AWAY:
        return "text-gray-400";
      default:
        return "text-gray-400";
    }
  };

  const getStatusDot = (status: UserStatus) => {
    const color = status === UserStatus.ACTIVE 
      ? "bg-green-500" 
      : status === UserStatus.IDLE 
        ? "bg-amber-500" 
        : "bg-gray-400";
    
    return <div className={`w-2 h-2 ${color} rounded-full mr-2`} />;
  };

  const getInitial = (nickname: string) => {
    return nickname.charAt(0).toUpperCase();
  };

  const formatLastActivity = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch (e) {
      return "recently";
    }
  };

  const toggleStatus = () => {
    // Cycle between statuses: ACTIVE -> IDLE -> AWAY -> ACTIVE
    const currentVisitor = visitors.find(v => v.nickname === currentUser);
    if (!currentVisitor) return;
    
    const currentStatus = currentVisitor.status;
    let newStatus: UserStatus;
    
    switch (currentStatus) {
      case UserStatus.ACTIVE:
        newStatus = UserStatus.IDLE;
        break;
      case UserStatus.IDLE:
        newStatus = UserStatus.AWAY;
        break;
      default:
        newStatus = UserStatus.ACTIVE;
    }
    
    onSetStatus(newStatus);
  };

  const copyUrlToClipboard = () => {
    if (!url) return;
    
    navigator.clipboard.writeText(url).then(
      () => {
        // Show a success toast or notification
        console.log("URL copied to clipboard");
      },
      (err) => {
        // Show an error toast or notification
        console.error("Could not copy URL: ", err);
      }
    );
  };

  return (
    <div className={`sidebar bg-gray-50 border-l border-gray-200 transition-all ${isExpanded ? 'w-72' : 'w-12'}`}>
      <div className="h-full flex flex-col">
        <div className="border-b border-gray-200 p-3 flex items-center justify-between">
          <div className={`flex items-center ${!isExpanded && 'hidden'}`}>
            <Users className="h-4 w-4 text-gray-500 mr-2" />
            <span className="text-sm font-medium">Active Visitors</span>
          </div>
          <button 
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded-md hover:bg-gray-200 text-gray-500"
          >
            {isExpanded ? (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 6-6 6 6 6" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m9 18 6-6-6-6" />
              </svg>
            )}
          </button>
        </div>
      
        <div className={`flex-1 overflow-y-auto p-3 ${!isExpanded && 'hidden'}`}>
          {visitors.length === 0 ? (
            <div className="text-center text-gray-500 text-sm p-4">
              No active visitors
            </div>
          ) : (
            <ul className="space-y-2">
              {visitors.map((visitor) => (
                <li 
                  key={visitor.socketId}
                  className={`flex items-start p-2 rounded-md ${visitor.nickname === currentUser ? 'bg-blue-50' : 'hover:bg-gray-100'}`}
                >
                  <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center mr-3">
                    {getInitial(visitor.nickname)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {visitor.nickname} {visitor.nickname === currentUser && '(you)'}
                      </p>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      {getStatusDot(visitor.status)}
                      <span className={getStatusColor(visitor.status)}>
                        {visitor.status.charAt(0).toUpperCase() + visitor.status.slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center text-xs text-gray-500 mt-1">
                      <Clock className="w-3 h-3 mr-1" />
                      <span>Active {formatLastActivity(visitor.lastActivity)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        {isExpanded && (
          <div className="border-t border-gray-200 p-3 space-y-2">
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">Your Status:</div>
              <button 
                onClick={toggleStatus}
                className="flex items-center text-xs px-2 py-1 rounded-full border border-gray-200 hover:bg-gray-100"
              >
                {getStatusDot(visitors.find(v => v.nickname === currentUser)?.status || UserStatus.ACTIVE)}
                <span>
                  {visitors.find(v => v.nickname === currentUser)?.status || UserStatus.ACTIVE}
                </span>
              </button>
            </div>
            
            <div className="flex justify-between items-center">
              <div className="text-xs text-gray-500">Share Page:</div>
              <button 
                onClick={copyUrlToClipboard}
                className="flex items-center text-xs px-2 py-1 rounded-full border border-gray-200 hover:bg-gray-100"
              >
                <LinkIcon className="w-3 h-3 mr-1" />
                <span>Copy URL</span>
              </button>
            </div>
            
            <div className="text-xs text-gray-500 pt-2 border-t border-gray-100">
              <div>Total visitors: {visitors.length}</div>
              <div className="mt-1">
                <UserRoundCheck className="w-3 h-3 inline mr-1 text-green-500" />
                <span>{visitors.filter(v => v.status === UserStatus.ACTIVE).length} active</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default WebpageVisitorsList;