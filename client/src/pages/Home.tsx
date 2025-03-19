import { useState, FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { MessageSquare, Globe, ArrowRight, Code } from "lucide-react";
import { normalizeUrl } from "@shared/schema";

const Home = () => {
  const [url, setUrl] = useState("");
  const [, setLocation] = useLocation();
  const [urlError, setUrlError] = useState("");

  const handleWebpageSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setUrlError("Please enter a valid URL");
      return;
    }

    try {
      // Normalize and encode the URL
      const normalizedUrl = normalizeUrl(url);
      const encodedUrl = encodeURIComponent(normalizedUrl);
      setLocation(`/webpage/${encodedUrl}`);
    } catch (error) {
      setUrlError("Please enter a valid URL with http:// or https://");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <header className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Real-time <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-500 to-indigo-600">Chat Platform</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Connect with others in real-time through chat rooms or discuss any webpage with people viewing the same content.
          </p>
        </header>

        {/* URL input section */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-100 p-8 mb-12 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-4 text-center">
            Enter any webpage URL to start chatting
          </h2>
          <p className="text-center text-gray-600 mb-6">
            Just paste the URL of any webpage you're browsing and connect with others viewing the same content
          </p>
          
          <form onSubmit={handleWebpageSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <input
                type="text"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  if (urlError) setUrlError("");
                }}
                placeholder="https://example.com"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
              {urlError && (
                <p className="text-red-500 text-sm mt-1">{urlError}</p>
              )}
            </div>
            <button
              type="submit"
              className="py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-medium rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all flex items-center justify-center"
            >
              Start Chatting
              <ArrowRight className="ml-2 h-5 w-5" />
            </button>
          </form>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-100">
            <div className="p-6">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Chat Rooms</h2>
              <p className="text-gray-600 mb-6">
                Join topic-based chat rooms and talk with people who share your interests.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-gray-700">
                  <span className="bg-blue-100 text-blue-600 rounded-full p-1 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  Create or join chat rooms
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="bg-blue-100 text-blue-600 rounded-full p-1 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  Real-time messaging
                </li>
              </ul>
              <Link href="/chat" className="block text-center py-3 px-4 bg-primary hover:bg-blue-600 text-white font-medium rounded-lg transition-colors">
                Join a Chat Room
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-100">
            <div className="p-6">
              <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mb-4">
                <Globe className="h-6 w-6 text-indigo-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Webpage Chats</h2>
              <p className="text-gray-600 mb-6">
                See who else is browsing the same webpages you're viewing.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-gray-700">
                  <span className="bg-indigo-100 text-indigo-600 rounded-full p-1 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  URL-based chat rooms
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="bg-indigo-100 text-indigo-600 rounded-full p-1 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  Track user presence
                </li>
              </ul>
              <Link href="/webpage" className="block text-center py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">
                More Options
              </Link>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md hover:shadow-lg transition-shadow overflow-hidden border border-gray-100">
            <div className="p-6">
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Code className="h-6 w-6 text-purple-600" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-800 mb-2">Embed Widget</h2>
              <p className="text-gray-600 mb-6">
                Add chat functionality directly to your own website.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-gray-700">
                  <span className="bg-purple-100 text-purple-600 rounded-full p-1 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  Simple embed code
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="bg-purple-100 text-purple-600 rounded-full p-1 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  Customizable widget
                </li>
              </ul>
              <Link href="/embed-code" className="block text-center py-3 px-4 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg transition-colors">
                Get Embed Code
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;