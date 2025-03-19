import { useState, useEffect, FormEvent } from "react";
import { io, Socket } from "socket.io-client";

// Simple Chat Demo - Standalone component for testing
export default function SimpleChatDemo() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);
  const [nickname, setNickname] = useState("");
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [hasJoinedRoom, setHasJoinedRoom] = useState(false);
  const roomId = "demo-room";

  // Connect socket
  useEffect(() => {
    // Create a new socket connection
    const newSocket = io(window.location.origin, {
      path: "/api/socket.io",
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5
    });

    // Set up event listeners
    newSocket.on("connect", () => {
      console.log("Simple demo socket connected with ID:", newSocket.id);
      setConnected(true);
      setError("");
    });

    newSocket.on("disconnect", () => {
      console.log("Simple demo socket disconnected");
      setConnected(false);
    });

    newSocket.on("chat:message", (messageData) => {
      console.log("Message received:", messageData);
      setMessages((prev) => [...prev, messageData]);
    });

    newSocket.on("user:joined", (messageData) => {
      console.log("User joined:", messageData);
      setMessages((prev) => [...prev, messageData]);
    });

    newSocket.on("user:left", (messageData) => {
      console.log("User left:", messageData);
      setMessages((prev) => [...prev, messageData]);
    });

    newSocket.on("room:join", (data) => {
      console.log("Joined room successfully:", data);
      setHasJoinedRoom(true);
      setMessages((prev) => [...prev, {
        text: `You joined the room with ${data.count} other users`,
        type: "system"
      }]);
    });

    newSocket.on("error:nickname", (data) => {
      console.error("Nickname error:", data.message);
      setError(data.message);
    });

    // Save the socket to state
    setSocket(newSocket);

    // Clean up function
    return () => {
      console.log("Cleaning up socket");
      newSocket.disconnect();
    };
  }, []);

  // Handle joining the room
  const handleJoinRoom = (e: FormEvent) => {
    e.preventDefault();
    
    if (!socket || !connected) {
      setError("Socket not connected yet, please wait...");
      return;
    }

    if (!nickname.trim()) {
      setError("Please enter a nickname");
      return;
    }

    console.log(`Emitting user:join event with roomId=${roomId}, nickname=${nickname}`);
    socket.emit("user:join", { roomId, nickname });
  };

  // Handle sending messages
  const handleSendMessage = (e: FormEvent) => {
    e.preventDefault();
    
    if (!socket || !connected) {
      setError("Socket not connected yet, please wait...");
      return;
    }

    if (!hasJoinedRoom) {
      setError("Please join the room first");
      return;
    }

    if (!message.trim()) {
      return;
    }

    console.log(`Sending message to room ${roomId}: ${message}`);
    socket.emit("chat:message", {
      roomId,
      text: message,
      nickname,
      timestamp: new Date().toISOString()
    });

    setMessage("");
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Simple Chat Demo</h1>
      
      <div className="mb-4 p-2 border rounded bg-gray-100">
        <p>
          Status: <span className={connected ? "text-green-600 font-bold" : "text-red-600 font-bold"}>
            {connected ? "Connected" : "Disconnected"}
          </span>
        </p>
        <p>Socket ID: {socket?.id || "None"}</p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-600 rounded">
          {error}
        </div>
      )}

      {!hasJoinedRoom ? (
        <div className="mb-6 p-4 border rounded shadow-sm">
          <h2 className="text-xl font-semibold mb-2">Join Chat Room</h2>
          <form onSubmit={handleJoinRoom} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Nickname</label>
              <input 
                type="text"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="w-full p-2 border rounded focus:ring focus:ring-blue-300 focus:border-blue-500"
                placeholder="Enter your nickname"
                required
              />
            </div>
            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              disabled={!connected}
            >
              Join Chat
            </button>
          </form>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="border rounded shadow-sm h-64 overflow-y-auto p-4 bg-white">
            {messages.map((msg, index) => (
              <div key={index} className={`mb-2 p-2 rounded ${
                msg.type === "system" ? "bg-gray-100" :
                msg.nickname === nickname ? "bg-blue-100 text-right" : "bg-gray-100"
              }`}>
                {msg.nickname && <span className="font-bold">{msg.nickname}: </span>}
                {msg.text}
              </div>
            ))}
          </div>

          <form onSubmit={handleSendMessage} className="flex space-x-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-1 p-2 border rounded focus:ring focus:ring-blue-300 focus:border-blue-500"
              placeholder="Type your message..."
            />
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              disabled={!connected || !hasJoinedRoom}
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}