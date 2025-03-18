import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { Server as SocketIOServer } from "socket.io";
import { Message, MessageType } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Set up Socket.IO with path to avoid conflicts with Vite's HMR websocket
  const io = new SocketIOServer(httpServer, {
    path: "/api/socket.io",
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    }
  });

  // Socket.IO connection handling
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    let currentRoom: string | null = null;
    let userNickname: string | null = null;

    // Handle user joining a room
    socket.on("user:join", async ({ roomId, nickname }) => {
      if (!roomId || !nickname) return;

      // Leave previous room if exists
      if (currentRoom) {
        await leaveRoom(currentRoom, userNickname || "Anonymous");
      }

      currentRoom = roomId;
      userNickname = nickname;

      // Join the room
      socket.join(roomId);
      
      // Add user to the room in storage
      storage.addUserToRoom(roomId, socket.id, nickname);
      
      // Get current user count in the room
      const roomUsers = storage.getRoomUsers(roomId);
      const userCount = roomUsers.size;
      
      // Notify the room that a user has joined
      const joinMessage: Message = {
        roomId,
        nickname,
        text: `${nickname} joined the room`,
        timestamp: new Date().toISOString(),
        type: MessageType.USER_JOINED
      };
      
      // Send join notification to everyone in the room
      io.to(roomId).emit("user:joined", joinMessage);
      
      // Send the current user count to everyone in the room
      io.to(roomId).emit("user:count", userCount);
      
      // Notify the user they've joined successfully
      socket.emit("room:join", { count: userCount });
    });

    // Handle user sending a message
    socket.on("chat:message", (message: Message) => {
      if (!message.roomId || !message.text || !message.nickname) return;
      
      const completeMessage: Message = {
        ...message,
        type: MessageType.USER_MESSAGE,
        timestamp: new Date().toISOString()
      };
      
      // Broadcast the message to everyone in the room
      io.to(message.roomId).emit("chat:message", completeMessage);
    });

    // Handle disconnection
    socket.on("disconnect", async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      if (currentRoom && userNickname) {
        await leaveRoom(currentRoom, userNickname);
      }
    });

    // Helper function to handle user leaving a room
    async function leaveRoom(roomId: string, nickname: string) {
      // Remove user from the room in storage
      storage.removeUserFromRoom(roomId, socket.id);
      
      // Get updated user count
      const roomUsers = storage.getRoomUsers(roomId);
      const userCount = roomUsers.size;
      
      // Notify the room that a user has left
      const leaveMessage: Message = {
        roomId,
        nickname,
        text: `${nickname} left the room`,
        timestamp: new Date().toISOString(),
        type: MessageType.USER_LEFT
      };
      
      // Send leave notification to everyone in the room
      io.to(roomId).emit("user:left", leaveMessage);
      
      // Send updated user count
      io.to(roomId).emit("user:count", userCount);
      
      // Leave the socket.io room
      socket.leave(roomId);
    }
  });

  return httpServer;
}
