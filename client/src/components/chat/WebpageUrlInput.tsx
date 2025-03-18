import { useState, FormEvent } from "react";
import { Globe } from "lucide-react";

interface WebpageUrlInputProps {
  onSubmit: (url: string) => void;
}

const WebpageUrlInput = ({ onSubmit }: WebpageUrlInputProps) => {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");

  const validateUrl = (input: string): boolean => {
    if (!input.trim()) {
      setError("Please enter a URL");
      return false;
    }

    // Check if it has a valid URL format or at least contains a domain
    if (!input.includes('.') && !input.startsWith('localhost')) {
      setError("Please enter a valid website URL");
      return false;
    }

    // Add http:// prefix if missing
    if (!input.startsWith('http://') && !input.startsWith('https://')) {
      setUrl(`https://${input}`);
    }

    setError("");
    return true;
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    // Ensure URL has a protocol
    let processedUrl = url;
    if (!processedUrl.startsWith('http://') && !processedUrl.startsWith('https://')) {
      processedUrl = `https://${processedUrl}`;
    }
    
    if (validateUrl(processedUrl)) {
      onSubmit(processedUrl);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl p-6 w-11/12 max-w-md mx-auto">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Enter Webpage URL</h2>
        <p className="text-gray-600 mb-4">
          Enter the URL of the webpage you want to chat about. You'll be connected with others viewing the same page.
        </p>
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-1">Website URL</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-gray-500">
                <Globe className="h-5 w-5" />
              </span>
              <input 
                type="text" 
                id="url" 
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full rounded-lg border border-gray-300 py-2 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent" 
                placeholder="example.com or https://example.com"
                required
              />
            </div>
            {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
          </div>
          <button 
            type="submit" 
            className="w-full bg-primary hover:bg-blue-600 text-white py-2 px-4 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary"
          >
            Join
          </button>
        </form>
      </div>
    </div>
  );
};

export default WebpageUrlInput;