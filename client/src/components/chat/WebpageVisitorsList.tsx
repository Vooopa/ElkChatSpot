import { useState } from "react";
import type { WebpageVisitor } from "@/../../shared/schema";
import { UserStatus } from "@/../../shared/schema";
import { formatDistanceToNow } from "date-fns";
import { User, Users, Clock } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface WebpageVisitorsListProps {
  visitors: WebpageVisitor[];
  currentUser: string;
  onSetStatus: (status: UserStatus) => void;
  url: string;
}

const WebpageVisitorsList = ({ visitors, currentUser, onSetStatus, url }: WebpageVisitorsListProps) => {
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
                visitors.find(v => v.socketId === currentUser)?.status || UserStatus.ACTIVE
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
              className={`p-2 hover:bg-gray-50 rounded-md transition-colors ${
                visitor.socketId === currentUser ? "bg-blue-50" : ""
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
                      {visitor.socketId === currentUser && (
                        <span className="ml-2 text-xs font-normal text-gray-500">(you)</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="flex items-center text-sm text-gray-500">
                  <Clock className="h-3 w-3 mr-1" />
                  <span className="text-xs">{formatDistanceToNow(new Date(visitor.joinedAt), { addSuffix: true })}</span>
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