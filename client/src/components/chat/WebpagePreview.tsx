import { useState, useEffect } from 'react';
import { ExternalLink, Globe, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface WebpagePreviewProps {
  url: string;
}

// Componente che mostra un'anteprima della pagina web
const WebpagePreview: React.FC<WebpagePreviewProps> = ({ url }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [favIconUrl, setFavIconUrl] = useState('');

  // Formatta l'URL per l'anteprima e ottiene il dominio
  const formatUrlForDisplay = (url: string) => {
    try {
      // Assicuriamoci che l'URL abbia un protocollo
      let formattedUrl = url;
      if (!formattedUrl.startsWith('http')) {
        formattedUrl = 'https://' + formattedUrl;
      }
      
      const urlObj = new URL(formattedUrl);
      return urlObj.hostname;
    } catch (error) {
      return url;
    }
  };

  // Formatta l'URL completo per visita
  const getFullUrl = (url: string) => {
    try {
      let formattedUrl = url;
      if (!formattedUrl.startsWith('http')) {
        formattedUrl = 'https://' + formattedUrl;
      }
      return formattedUrl;
    } catch (error) {
      return url;
    }
  };

  // Ottiene il favicon della pagina
  const getFaviconUrl = (url: string) => {
    try {
      let formattedUrl = url;
      if (!formattedUrl.startsWith('http')) {
        formattedUrl = 'https://' + formattedUrl;
      }
      
      const urlObj = new URL(formattedUrl);
      return `https://www.google.com/s2/favicons?domain=${urlObj.hostname}&sz=64`;
    } catch (error) {
      return '';
    }
  };

  // Se conoscessi il titolo e la descrizione, potremmo mostrarli
  // Ma per adesso mostro solo una versione stilizzata del dominio
  useEffect(() => {
    setFavIconUrl(getFaviconUrl(url));
  }, [url]);

  return (
    <div className={`bg-white border rounded-md overflow-hidden mb-4 transition-all duration-300 ${isExpanded ? 'shadow-md' : 'shadow-sm'}`}>
      <div className="p-3 flex justify-between items-center cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center">
          {favIconUrl ? (
            <img src={favIconUrl} alt="favicon" className="w-5 h-5 mr-2" />
          ) : (
            <Globe className="w-5 h-5 mr-2 text-blue-500" />
          )}
          <span className="font-medium">{formatUrlForDisplay(url)}</span>
        </div>
        <button className="text-gray-500 hover:text-gray-700">
          {isExpanded ? '▲' : '▼'}
        </button>
      </div>
      
      {isExpanded && (
        <div className="border-t p-4">
          <div className="rounded-md overflow-hidden border shadow-sm bg-gray-50 aspect-video flex items-center justify-center">
            <div className="text-center p-4">
              <div className="mb-2 flex justify-center">
                <div className="w-12 h-12 flex items-center justify-center bg-blue-100 rounded-full">
                  <LinkIcon className="w-6 h-6 text-blue-600" />
                </div>
              </div>
              <h3 className="font-medium text-gray-800">Visita la pagina web</h3>
              <p className="text-gray-500 text-sm mb-3">Vai a {formatUrlForDisplay(url)} in una nuova scheda</p>
              <a 
                href={getFullUrl(url)} 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                <ExternalLink className="w-4 h-4 mr-1" />
                <span>Visita pagina</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WebpagePreview;