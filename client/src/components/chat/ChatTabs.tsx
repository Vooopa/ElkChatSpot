import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlobeIcon, XIcon, PlusIcon, MessagesSquare } from "lucide-react";
import { normalizeUrl } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface ChatTab {
  id: string;
  url: string;
  favicon?: string;
  title?: string;
  unread?: boolean;
  isActive?: boolean;
}

interface ChatTabsProps {
  tabs: ChatTab[];
  activeTabId: string;
  onTabChange: (tabId: string) => void;
  onTabClose: (tabId: string) => void;
  onAddNewTab: () => void;
}

export const ChatTabs: React.FC<ChatTabsProps> = ({
  tabs,
  activeTabId,
  onTabChange,
  onTabClose,
  onAddNewTab
}) => {
  // Estrai solo il dominio principale da un URL
  const extractDomain = (url: string) => {
    try {
      const normalizedUrl = normalizeUrl(url);
      const domain = normalizedUrl.split('/')[0];
      return domain;
    } catch (error) {
      return url;
    }
  };

  // Ottieni la favicon per un dominio
  const getFavicon = (url: string) => {
    const domain = extractDomain(url);
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  };

  return (
    <Tabs
      value={activeTabId}
      onValueChange={onTabChange}
      className="w-full border-b"
    >
      <div className="flex items-center px-4 pt-2">
        <TabsList className="h-10 flex-grow overflow-x-auto scrollbar-thin flex gap-1">
          {/* Mostra tutte le tab in orizzontale, una accanto all'altra */}
          {tabs.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className={cn(
                "flex items-center h-10 px-4 py-2 bg-white relative border border-gray-200 rounded-t-md",
                tab.unread ? "after:absolute after:top-2 after:right-2 after:w-2 after:h-2 after:bg-red-500 after:rounded-full" : "",
                activeTabId === tab.id ? "bg-blue-50 border-b-2 border-blue-500" : ""
              )}
            >
              {tab.favicon ? (
                <img
                  src={tab.favicon}
                  alt=""
                  className="mr-2 h-4 w-4 rounded-sm"
                  onError={(e) => {
                    // Fallback to Google favicon service if the favicon fails to load
                    (e.target as HTMLImageElement).src = getFavicon(tab.url);
                  }}
                />
              ) : (
                <GlobeIcon className="mr-2 h-4 w-4" />
              )}
              <span className="truncate max-w-[100px]">{extractDomain(tab.url)}</span>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
                className="ml-2 text-gray-500 hover:text-gray-800"
              >
                <XIcon className="h-3 w-3" />
              </span>
            </TabsTrigger>
          ))}
        </TabsList>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={onAddNewTab}
          className="ml-2 flex-shrink-0 bg-blue-50 hover:bg-blue-100"
        >
          <PlusIcon className="h-4 w-4 mr-1" />
          <span>Nuova tab</span>
        </Button>
      </div>
      
      {/* Tab contents - queste verranno gestite dal componente padre */}
      {tabs.map((tab) => (
        <TabsContent key={tab.id} value={tab.id} className="mt-0 p-0">
          {/* Il componente padre renderizzerà il contenuto appropriato */}
        </TabsContent>
      ))}
    </Tabs>
  );
};

export default ChatTabs;