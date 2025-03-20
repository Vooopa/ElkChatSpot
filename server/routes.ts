import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { Server as SocketIOServer } from "socket.io";
import { Message, MessageType, UserStatus, normalizeUrl } from "@shared/schema";
import path from "path";
import fs from "fs";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Add route to serve the widget script
  app.get('/widget/chat-widget.js', (req: Request, res: Response) => {
    // Read embed.ts and convert it to a standalone JavaScript file
    try {
      const embedFilePath = path.resolve(__dirname, '../client/src/widget/embed.ts');
      const widgetEntryPath = path.resolve(__dirname, '../client/src/widget/widget-entry.ts');
      
      // Read both files and combine them
      const embedCode = fs.readFileSync(embedFilePath, 'utf8');
      const entryCode = fs.readFileSync(widgetEntryPath, 'utf8');
      
      // Generate a JavaScript bundle by combining the files
      // For a development scenario, we'll just serve them directly
      const combinedCode = `
/* Chat Widget JavaScript Bundle */
${embedCode}

/* Widget Entry Point */
${entryCode}
      `;
      
      res.type('application/javascript');
      res.send(combinedCode);
    } catch (error) {
      console.error('Error serving widget script:', error);
      res.status(500).send('Error generating widget script');
    }
  });

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
      
      // Check if the nickname is already in use
      if (storage.isNicknameInUse(roomId, nickname)) {
        // Notify user that the nickname is already taken
        socket.emit("error:nickname", { 
          message: "This nickname is already in use. Please choose another one."
        });
        return;
      }

      // Make sure the room exists in storage
      if (!storage.getRoom(roomId)) {
        console.log(`Creating new room: ${roomId}`);
        storage.createRoom(roomId);
      }
      
      currentRoom = roomId;
      userNickname = nickname;
      isWebpageVisitor = false;

      // Join the room
      socket.join(roomId);
      console.log(`User ${nickname} (${socket.id}) joining room: ${roomId}`);
      
      // Add user to the room in storage
      const success = storage.addUserToRoom(roomId, socket.id, nickname);
      
      if (!success) {
        // This shouldn't happen since we checked above, but just to be safe
        socket.emit("error:nickname", { 
          message: "This nickname is already in use. Please choose another one."
        });
        return;
      }
      
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
      
      // Send join notification only to everyone in the room
      // Add isBroadcast flag to distinguish direct room messages
      io.to(roomId).emit("user:joined", { ...joinMessage, isBroadcast: false });
      
      // Send the current user count to everyone in the room
      io.to(roomId).emit("user:count", userCount);
      
      // Notify the user they've joined successfully
      socket.emit("room:join", { count: userCount });
    });
    
    // Handle user joining a webpage
    socket.on("webpage:join", async ({ url, nickname, pageTitle }) => {
      if (!url || !nickname) return;
      
      console.log(`User ${nickname} attempting to join webpage: ${url}`);
      
      // Leave previous room if exists
      if (currentRoom) {
        await leaveRoom(currentRoom, userNickname || "Anonymous", isWebpageVisitor);
      }
      
      // Create a room ID based on the normalized URL
      let normalizedUrl, newRoomId;
      try {
        normalizedUrl = normalizeUrl(url);
        newRoomId = `url-${normalizedUrl}`;
        
        console.log(`Normalized URL: ${normalizedUrl}, Room ID: ${newRoomId}`);
        
        // Check if the nickname is already in use in this room
        if (storage.isNicknameInUse(newRoomId, nickname)) {
          console.log(`Nickname ${nickname} is already in use in room ${newRoomId}`);
          // Notify user that the nickname is already taken
          socket.emit("error:nickname", { 
            message: "This nickname is already in use. Please choose another one."
          });
          return;
        }
      } catch (error) {
        console.error("Error normalizing URL or checking nickname:", error);
        socket.emit("error:message", {
          message: "An error occurred when joining the room. Please try again."
        });
        return;
      }
      
      // Add visitor to the webpage room
      let addedRoomId;
      try {
        addedRoomId = storage.addWebpageVisitor(url, socket.id, nickname);
        
        if (addedRoomId === null) {
          console.log(`Failed to add visitor ${nickname} to room for ${url}`);
          // This shouldn't happen since we checked above, but just to be safe
          socket.emit("error:nickname", { 
            message: "This nickname is already in use. Please choose another one."
          });
          return;
        }
      } catch (error) {
        console.error(`Error adding visitor ${nickname} to room for ${url}:`, error);
        socket.emit("error:message", {
          message: "An error occurred when joining the chat. Please try again."
        });
        return;
      }
      
      console.log(`Successfully added visitor ${nickname} (${socket.id}) to room ${addedRoomId}`);
      
      // We've confirmed the roomId is valid
      newRoomId = addedRoomId;
      currentRoom = addedRoomId;
      userNickname = nickname;
      isWebpageVisitor = true;
      
      // Join the Socket.IO room with a non-null roomId
      socket.join(addedRoomId);
      
      // Log all users in this room
      const roomInfo = storage.getRoom(addedRoomId);
      if (roomInfo && roomInfo.visitors) {
        console.log(`Current visitors in room ${addedRoomId}:`, 
          Array.from(roomInfo.visitors.values()).map(v => `${v.nickname} (${v.socketId})`).join(', '));
      }
      
      // If pageTitle was provided, update the room info
      if (pageTitle && pageTitle.trim()) {
        const roomData = storage.getRoom(addedRoomId);
        if (roomData) {
          roomData.title = pageTitle;
        }
      }
      
      // Get all visitors for this webpage
      const visitors = storage.getWebpageVisitors(addedRoomId);
      
      // Notify everyone that a new user joined
      const joinMessage: Message = {
        roomId: addedRoomId,
        nickname,
        text: `${nickname} is now browsing this page`,
        timestamp: new Date().toISOString(),
        type: MessageType.USER_JOINED
      };
      
      // Emit visitor joined event only to clients in the room
      // Add roomBroadcast flag for direct room messages
      io.to(addedRoomId).emit("visitor:joined", { ...joinMessage, roomBroadcast: true, isBroadcast: false });
      
      // Send current visitor count
      io.to(addedRoomId).emit("webpage:userCount", visitors.size);
      
      // Send list of all current visitors to the newly joined user
      socket.emit("webpage:visitors", Array.from(visitors.values()));
      
      // Broadcast updated visitor list to all clients in this room
      io.to(addedRoomId).emit("webpage:visitors", Array.from(visitors.values()));
      
      // Send room details including the original URL
      const roomDetails = storage.getRoom(addedRoomId);
      socket.emit("webpage:room", {
        roomId: addedRoomId,
        url: roomDetails?.url || url,
        title: roomDetails?.title || pageTitle || "",
        visitorCount: visitors.size
      });
      
      // Send title to the client
      socket.emit("webpage:title", {
        title: roomDetails?.title || pageTitle || ""
      });
    });
    
    // Handle user activity on webpage
    socket.on("webpage:activity", () => {
      if (currentRoom && isWebpageVisitor) {
        storage.updateWebpageVisitorActivity(currentRoom, socket.id);
      }
    });
    
    // Get latest visitors list
    socket.on("webpage:getVisitors", (data: { roomId: string }) => {
      const { roomId } = data;
      if (!roomId) return;
      
      console.log(`Sending updated visitor list for room ${roomId}`);
      const visitors = storage.getWebpageVisitors(roomId);
      socket.emit("webpage:visitors", Array.from(visitors.values()));
    });
    
    // Handle user status change on webpage
    socket.on("webpage:updateStatus", ({ roomId, status }) => {
      if (currentRoom && isWebpageVisitor && Object.values(UserStatus).includes(status)) {
        storage.updateWebpageVisitorStatus(currentRoom, socket.id, status);
        
        // Broadcast updated user status to everyone in the room
        const visitors = storage.getWebpageVisitors(currentRoom);
        io.to(currentRoom).emit("webpage:visitors", Array.from(visitors.values()));
      }
    });

    // Handle user sending a message
    socket.on("chat:message", (message: Message) => {
      if (!message.roomId || !message.text || !message.nickname) {
        console.log("❌ Invalid message format", message);
        return;
      }
      
      // Update activity timestamp if this is a webpage visitor
      if (isWebpageVisitor && currentRoom) {
        storage.updateWebpageVisitorActivity(currentRoom, socket.id);
      }
      
      // Add required fields to the message
      const completeMessage: Message = {
        ...message,
        type: message.type || MessageType.USER_MESSAGE,
        timestamp: new Date().toISOString(),
        senderSocketId: socket.id
      };
      
      // Is this a private message request?
      if (message.type === MessageType.PRIVATE_MESSAGE && message.recipient) {
        console.log("Private message request - this should go through chat:private event");
        // Convert to regular message - private messages should use the chat:private event
        completeMessage.type = MessageType.USER_MESSAGE;
      }
      
      // SUPER SIMPLE: Regular message - broadcast to everyone in the room
      console.log(`✅ Broadcasting message from ${completeMessage.nickname} to room ${message.roomId}`);
      io.to(message.roomId).emit("chat:message", completeMessage);
    });
    
    // Handle private chat state changes (when a private chat window is opened or closed)
    socket.on("chat:private_state", (data: { recipient: string, isOpen: boolean }) => {
      if (!data.recipient) return;
      
      // Update the private chat state in storage
      storage.setPrivateChatState(socket.id, data.recipient, data.isOpen);
      console.log(`🔒 Private chat state changed: ${socket.id} ${data.isOpen ? 'opened' : 'closed'} chat with ${data.recipient}`);
    });
    
    // Handle private message
    socket.on("chat:private", (message: Message) => {
      if (!message.roomId || !message.text || !message.nickname || !message.recipient) return;
      
      // Update activity timestamp if this is a webpage visitor
      if (isWebpageVisitor && currentRoom) {
        storage.updateWebpageVisitorActivity(currentRoom, socket.id);
      }
      
      const completeMessage: Message = {
        ...message,
        type: MessageType.PRIVATE_MESSAGE,
        timestamp: new Date().toISOString(),
        senderSocketId: socket.id
      };
      
      // Debug log for current socket and nickname mapping
      console.log(`Current sender socket info: ${socket.id} as ${message.nickname}`);
      
      // Debug: log all visitors in this room
      const room = storage.getRoom(message.roomId);
      if (room && room.visitors) {
        console.log(`Current visitors in room ${message.roomId}:`);
        // Convert to array first to avoid iterator issues
        const visitorEntries = Array.from(room.visitors.entries());
        for (const [socketId, visitor] of visitorEntries) {
          console.log(`  - ${visitor.nickname} (${socketId})`);
        }
      }
      
      // Find the recipient's socket ID - with extra case-insensitive matching
      let recipientSocketId: string | undefined = undefined;
      if (room && room.visitors) {
        // Convert to array first to avoid iterator issues
        const visitorEntries = Array.from(room.visitors.entries());
        for (const [socketId, visitor] of visitorEntries) {
          if (visitor.nickname.toLowerCase() === message.recipient.toLowerCase()) {
            recipientSocketId = socketId;
            break;
          }
        }
      }
      
      console.log(`Private message from ${message.nickname} to ${message.recipient}`, { 
        recipientFound: !!recipientSocketId,
        senderSocketId: socket.id,
        recipientSocketId,
        recipientLookup: message.recipient.toLowerCase()
      });
      
      if (recipientSocketId) {
        // Verifica se il destinatario ha già la chat aperta con il mittente
        const isChatOpen = storage.getPrivateChatState(recipientSocketId, message.nickname);
        console.log(`Chat già aperta tra ${recipientSocketId} e ${message.nickname}? ${isChatOpen ? 'SI' : 'NO'}`);
        
        // Invia il messaggio normale per la cronologia della chat sempre
        io.to(recipientSocketId).emit("chat:private", {
          ...completeMessage,
          isNotification: true
        });
        
        // Invia la notifica SOLO se la chat non è già aperta
        if (!isChatOpen) {
          io.to(recipientSocketId).emit("msg_notification", {
            ...completeMessage,
            isNotification: true, // Flag speciale per forzare la notifica
            forceAlert: true // Flag per forzare l'alert
          });
          
          console.log(`💥 NOTIFICA INVIATA A ${recipientSocketId} DA ${message.nickname} (chat chiusa)`);
        } else {
          console.log(`⏩ NESSUNA NOTIFICA A ${recipientSocketId} DA ${message.nickname} (chat già aperta)`);
        }
        
        // Also send back to sender (without notification flag)
        socket.emit("chat:private", completeMessage);
      } else {
        // Special case: try a broader search by using the room broadcast
        // This helps if the socket mapping is inconsistent but the user is in the room
        const broadcastMessage = {
          ...completeMessage,
          broadcastPrivate: true // Special flag for client filtering
        };
        
        // Broadcast to all sockets in the room - clients will filter by recipient
        io.to(message.roomId).emit("chat:private", broadcastMessage);
        console.log(`Broadcasting private message to room as fallback`);
        
        // Also notify sender that we're using broadcast mode 
        socket.emit("error:message", {
          message: `User '${message.recipient}' could not be directly reached. The message was broadcast to the room.`
        });
      }
    });

    // Handle disconnection
    socket.on("disconnect", async () => {
      console.log(`Socket disconnected: ${socket.id}`);
      
      // Clear all private chat states for this socket
      storage.clearPrivateChatState(socket.id);
      
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
        
        // Emit visitor left event only to clients in the room
        // Add roomBroadcast flag for direct room messages
        io.to(roomId).emit("visitor:left", { ...leaveMessage, roomBroadcast: true, isBroadcast: false });
        
        // Update visitor count
        io.to(roomId).emit("webpage:userCount", visitors.size);
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
        
        // Send leave notification only to clients in the room
        // Add roomBroadcast flag for direct room messages
        io.to(roomId).emit("user:left", { ...leaveMessage, roomBroadcast: true, isBroadcast: false });
        
        // Send updated user count
        io.to(roomId).emit("user:count", userCount);
      }
      
      // Leave the socket.io room
      socket.leave(roomId);
    }
  });

  return httpServer;
}
