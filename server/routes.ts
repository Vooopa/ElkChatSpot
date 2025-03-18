import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { Server as SocketIOServer } from "socket.io";
import { Message, MessageType, UserStatus, normalizeUrl } from "@shared/schema";

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
    let isWebpageVisitor = false;

    // Handle user joining a room
    socket.on("user:join", async ({ roomId, nickname }) => {
      if (!roomId || !nickname) return;

      // Leave previous room if exists
      if (currentRoom) {
        await leaveRoom(currentRoom, userNickname || "Anonymous", isWebpageVisitor);
      }

      currentRoom = roomId;
      userNickname = nickname;
      isWebpageVisitor = false;

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
    
    // Handle user joining a webpage
    socket.on("webpage:join", async ({ url, nickname, pageTitle }) => {
      if (!url || !nickname) return;
      
      // Leave previous room if exists
      if (currentRoom) {
        await leaveRoom(currentRoom, userNickname || "Anonymous", isWebpageVisitor);
      }
      
      // Add visitor to the webpage room
      const roomId = storage.addWebpageVisitor(url, socket.id, nickname);
      
      currentRoom = roomId;
      userNickname = nickname;
      isWebpageVisitor = true;
      
      // Join the Socket.IO room
      socket.join(roomId);
      
      // If pageTitle was provided, update the room info
      if (pageTitle && pageTitle.trim()) {
        const room = storage.getRoom(roomId);
        if (room) {
          room.title = pageTitle;
        }
      }
      
      // Get all visitors for this webpage
      const visitors = storage.getWebpageVisitors(roomId);
      
      // Notify everyone that a new user joined
      const joinMessage: Message = {
        roomId,
        nickname,
        text: `${nickname} is now browsing this page`,
        timestamp: new Date().toISOString(),
        type: MessageType.USER_JOINED
      };
      
      // Emit visitor joined event to all clients in the room
      io.to(roomId).emit("webpage:visitor_joined", joinMessage);
      
      // Send current visitor count
      io.to(roomId).emit("webpage:visitor_count", visitors.size);
      
      // Send list of all current visitors to the newly joined user
      socket.emit("webpage:visitors", Array.from(visitors.values()));
      
      // Send room details including the original URL
      const room = storage.getRoom(roomId);
      socket.emit("webpage:room_info", {
        roomId,
        url: room?.url || url,
        title: room?.title || pageTitle || "",
        visitorCount: visitors.size
      });
    });
    
    // Handle user activity on webpage
    socket.on("webpage:activity", () => {
      if (currentRoom && isWebpageVisitor) {
        storage.updateWebpageVisitorActivity(currentRoom, socket.id);
      }
    });
    
    // Handle user status change on webpage
    socket.on("webpage:setStatus", ({ roomId, status }) => {
      if (currentRoom && isWebpageVisitor && Object.values(UserStatus).includes(status)) {
        storage.updateWebpageVisitorStatus(currentRoom, socket.id, status);
        
        // Broadcast updated user status to everyone in the room
        const visitors = storage.getWebpageVisitors(currentRoom);
        io.to(currentRoom).emit("webpage:visitors", Array.from(visitors.values()));
      }
    });

    // Handle user sending a message
    socket.on("chat:message", (message: Message) => {
      if (!message.roomId || !message.text || !message.nickname) return;
      
      // Update activity timestamp if this is a webpage visitor
      if (isWebpageVisitor && currentRoom) {
        storage.updateWebpageVisitorActivity(currentRoom, socket.id);
      }
      
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
        await leaveRoom(currentRoom, userNickname, isWebpageVisitor);
      }
    });

    // Helper function to handle user leaving a room
    async function leaveRoom(roomId: string, nickname: string, isWebpageVisitor = false) {
      if (isWebpageVisitor) {
        // Handle webpage visitor leaving
        storage.removeWebpageVisitor(roomId, socket.id);
        
        // Get updated visitor count
        const visitors = storage.getWebpageVisitors(roomId);
        
        // Notify the room that a visitor has left
        const leaveMessage: Message = {
          roomId,
          nickname,
          text: `${nickname} is no longer browsing this page`,
          timestamp: new Date().toISOString(),
          type: MessageType.USER_LEFT
        };
        
        // Emit visitor left event
        io.to(roomId).emit("webpage:visitor_left", leaveMessage);
        
        // Update visitor count
        io.to(roomId).emit("webpage:visitor_count", visitors.size);
      } else {
        // Handle regular chat user leaving
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
      }
      
      // Leave the socket.io room
      socket.leave(roomId);
    }
  });

  return httpServer;
}
