import { Link } from "wouter";
import { MessageSquare, Globe } from "lucide-react";

const Home = () => {
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

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
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
                  Create or join chat rooms with custom names
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="bg-blue-100 text-blue-600 rounded-full p-1 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  Real-time messaging with active users
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="bg-blue-100 text-blue-600 rounded-full p-1 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  See who joins and leaves
                </li>
              </ul>
              <Link href="/chat/lobby" className="block text-center py-3 px-4 bg-primary hover:bg-blue-600 text-white font-medium rounded-lg transition-colors">
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
                Enter any webpage URL and chat with others who are viewing the same content.
              </p>
              <ul className="space-y-2 mb-6">
                <li className="flex items-center text-gray-700">
                  <span className="bg-indigo-100 text-indigo-600 rounded-full p-1 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  See who else is viewing the same webpage
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="bg-indigo-100 text-indigo-600 rounded-full p-1 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  Discuss content with other viewers in real-time
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="bg-indigo-100 text-indigo-600 rounded-full p-1 mr-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                  </span>
                  Track user presence and activity status
                </li>
              </ul>
              <Link href="/webpage" className="block text-center py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-lg transition-colors">
                Enter a Webpage URL
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;