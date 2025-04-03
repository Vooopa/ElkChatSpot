import React, { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GlobeIcon, XIcon, PlusIcon } from "lucide-react";
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

/**
 * Componente che visualizza le tab di chat per diverse URL
 */
export const ChatTabs: React.FC<ChatTabsProps> = ({
                                                    tabs = [], // Valore predefinito per prevenire errori
                                                    activeTabId = "",
                                                    onTabChange,
                                                    onTabClose,
                                                    onAddNewTab
                                                  }) => {
  // Estrai solo il dominio principale da un URL
  const extractDomain = useMemo(() => (url: string): string => {
    if (!url) return ""; // Gestisce URL vuoto

    try {
      // Normalizza l'URL
      const normalizedUrl = normalizeUrl(url);
      // Dividi per "/" e prendi la prima parte (dominio)
      return normalizedUrl.includes('/') ? normalizedUrl.split('/')[0] : normalizedUrl;
    } catch (error) {
      console.error("Errore nell'estrazione del dominio:", error);
      return url;
    }
  }, []);

  // Ottieni la favicon per un dominio
  const getFavicon = useMemo(() => (url: string): string => {
    if (!url) return ""; // Gestisce URL vuoto
    const domain = extractDomain(url);
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  }, [extractDomain]);

  // Gestisce il click sul pulsante di chiusura
  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation(); // Evita che l'evento si propaghi al trigger del tab
    onTabClose(tabId);
  };

  // Se non ci sono tab, mostra solo il bottone "+"
  if (!tabs.length) {
    return (
        <div className="w-full border-b flex justify-end px-4 py-2">
          <Button
              variant="ghost"
              size="sm"
              onClick={onAddNewTab}
              className="h-8 px-2"
          >
            <PlusIcon className="h-4 w-4" />
            <span className="ml-1">Nuova tab</span>
          </Button>
        </div>
    );
  }

  return (
      <Tabs
          value={activeTabId}
          onValueChange={onTabChange}
          className="w-full border-b"
      >
        <div className="flex items-center px-4 pt-2">
          <TabsList className="h-10 flex-grow overflow-x-auto flex gap-1">
            {tabs.map((tab) => (
                <TabsTrigger
                    key={tab.id}
                    value={tab.id}
                    className={cn(
                        "flex items-center h-10 px-4 py-2 bg-white relative border border-gray-200 rounded-t-md",
                        tab.unread ? "after:absolute after:top-2 after:right-2 after:w-2 after:h-2 after:bg-red-500 after:rounded-full" : "",
                        activeTabId === tab.id ? "bg-blue-50 border-blue-500" : ""
                    )}
                >
                  {/* Favicon */}
                  {tab.favicon ? (
                      <img
                          src={tab.favicon}
                          alt={`Favicon per ${extractDomain(tab.url)}`}
                          className="mr-2 h-4 w-4 rounded-sm"
                          onError={(e: React.SyntheticEvent<HTMLImageElement>) => {
                            // Fallback al servizio favicon di Google
                            e.currentTarget.src = getFavicon(tab.url);
                            // Secondo fallback
                            e.currentTarget.onerror = () => {
                              e.currentTarget.onerror = null;
                              e.currentTarget.style.display = 'none';
                              return true;
                            };
                          }}
                      />
                  ) : (
                      <GlobeIcon className="mr-2 h-4 w-4" />
                  )}

                  {/* Nome del dominio */}
                  <span className="truncate max-w-[100px]">
                {extractDomain(tab.url)}
              </span>

                  {/* Pulsante di chiusura */}
                  <button
                      type="button"
                      onClick={(e) => handleCloseTab(e, tab.id)}
                      className="ml-2 rounded-full p-1 hover:bg-gray-200 transition-colors"
                      aria-label="Chiudi tab"
                  >
                    <XIcon className="h-3 w-3" />
                  </button>
                </TabsTrigger>
            ))}
          </TabsList>

          {/* Pulsante per aggiungere nuove tab */}
          <Button
              variant="ghost"
              size="sm"
              onClick={onAddNewTab}
              className="h-8 px-2 ml-2"
          >
            <PlusIcon className="h-4 w-4" />
          </Button>
        </div>

        {/* Contenuto delle tab - può essere implementato se necessario */}
        {tabs.map((tab) => (
            <TabsContent
                key={tab.id}
                value={tab.id}
                className="mt-0 p-0"
            >
              {/* Qui puoi inserire il contenuto specifico della tab se necessario */}
            </TabsContent>
        ))}
      </Tabs>
  );
};

export default ChatTabs;