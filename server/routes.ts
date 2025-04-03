import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { Server as SocketIOServer } from "socket.io";
import { Message, MessageType, UserStatus, normalizeUrl } from "@shared/schema";
import path from "path";
import fs from "fs";
import cors from "cors";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Implementazione corretta di CORS per l'applicazione Express
  app.use(cors({
    origin: "*", // In produzione sostituire con specifici domini consentiti
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
    credentials: true,
    maxAge: 86400 // Cache preflight request per 24 ore
  }));

  // Add route to serve the widget script
  app.get('/widget/chat-widget.js', (req: Request, res: Response) => {
    try {
      const embedFilePath = path.resolve(__dirname, '../client/src/widget/embed.ts');
      const widgetEntryPath = path.resolve(__dirname, '../client/src/widget/widget-entry.ts');

      const embedCode = fs.readFileSync(embedFilePath, 'utf8');
      const entryCode = fs.readFileSync(widgetEntryPath, 'utf8');

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
      origin: "*", // In produzione sostituire con specifici domini consentiti
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      credentials: true
    }
  });

  // Socket.IO connection handling
  io.on("connection", (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    let currentRoom: string | null = null;
    let userNickname: string | null = null;
    let isWebpageVisitor = false;

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
        io.to(roomId).emit("user:left", { ...leaveMessage, roomBroadcast: true, isBroadcast: false });

        // Send updated user count
        io.to(roomId).emit("user:count", userCount);
      }

      // Leave the socket.io room
      socket.leave(roomId);
    }

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
          message: "Questo nickname è già in uso. Per favore, scegline un altro."
        });
        return;
      }

      // Add user to the room
      try {
        storage.addUserToRoom(roomId, socket.id, nickname);

        // Update local variables
        currentRoom = roomId;
        userNickname = nickname;
        isWebpageVisitor = false;

        // Join the Socket.IO room
        socket.join(roomId);

        // Get current room users
        const roomUsers = storage.getRoomUsers(roomId);
        const userCount = roomUsers.size;

        // Notify everyone that a new user joined
        const joinMessage: Message = {
          roomId,
          nickname,
          text: `${nickname} joined the room`,
          timestamp: new Date().toISOString(),
          type: MessageType.USER_JOINED
        };

        // Send join notification to all clients in the room
        io.to(roomId).emit("user:joined", { ...joinMessage, roomBroadcast: true, isBroadcast: false });

        // Send updated user count
        io.to(roomId).emit("user:count", userCount);

        // Send list of all users to the newly joined user
        const userList = Array.from(roomUsers.values()).map(user => user.nickname);
        socket.emit("room:users", userList);

        console.log(`User ${nickname} joined room ${roomId}`);
      } catch (error) {
        console.error(`Error adding user ${nickname} to room ${roomId}:`, error);
        socket.emit("error:message", {
          message: "Si è verificato un errore durante l'accesso alla stanza. Per favore, riprova."
        });
      }
    });

    // Handle visitor joining a webpage
    socket.on("webpage:join", async ({ url, nickname, pageTitle }) => {
      if (!url || !nickname) {
        socket.emit("error:message", {
          message: "URL e nickname sono richiesti per unirsi a una chat di pagina web."
        });
        return;
      }

      // Leave previous room if exists
      if (currentRoom && userNickname) {
        await leaveRoom(currentRoom, userNickname, isWebpageVisitor);
      }

      // Normalize URL and create/get room ID
      let newRoomId;
      try {
        const normalizedUrl = await normalizeUrl(url);
        newRoomId = storage.getOrCreateRoomIdForUrl(normalizedUrl);

        // Check if the nickname is already in use in this room
        if (storage.isNicknameInUse(newRoomId, nickname)) {
          console.log(`Nickname ${nickname} is already in use in room ${newRoomId}`);
          socket.emit("error:nickname", {
            message: "Questo nickname è già in uso. Per favore, scegline un altro."
          });
          return;
        }
      } catch (error) {
        console.error("Error normalizing URL or checking nickname:", error);
        socket.emit("error:message", {
          message: "Si è verificato un errore durante l'accesso alla stanza. Per favore, riprova."
        });
        return;
      }

      // Add visitor to the webpage room
      let addedRoomId;
      try {
        addedRoomId = storage.addWebpageVisitor(url, socket.id, nickname);

        if (addedRoomId === null) {
          console.log(`Failed to add visitor ${nickname} to room for ${url}`);
          socket.emit("error:nickname", {
            message: "Questo nickname è già in uso. Per favore, scegline un altro."
          });
          return;
        }
      } catch (error) {
        console.error(`Error adding visitor ${nickname} to room for ${url}:`, error);
        socket.emit("error:message", {
          message: "Si è verificato un errore durante l'accesso alla chat. Per favore, riprova."
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

      // Add required fields to the message
      const completeMessage: Message = {
        ...message,
        type: message.type || MessageType.USER_MESSAGE,
        timestamp: new Date().toISOString(),
        senderSocketId: socket.id,
        isBroadcast: false
      };

      console.log(`✅ Broadcasting message from ${message.nickname} to room ${message.roomId}`);

      // Update activity timestamp if this is a webpage visitor
      if (isWebpageVisitor && currentRoom) {
        storage.updateWebpageVisitorActivity(currentRoom, socket.id);
      }

      // Convert any private message requests to regular messages
      if (message.type === MessageType.PRIVATE_MESSAGE && message.recipient) {
        console.log("Private message request - this should go through chat:private event");
        completeMessage.type = MessageType.USER_MESSAGE;
      }

      // Broadcast to everyone in the room
      io.to(message.roomId).emit("chat:message", completeMessage);
    });

    // Handle private chat state changes
    socket.on("chat:private_state", (data: { recipient: string, isOpen: boolean }) => {
      if (!data.recipient) return;

      // Update the private chat state in storage
      storage.setPrivateChatState(socket.id, data.recipient, data.isOpen);
      console.log(`🔒 Private chat state changed: ${socket.id} ${data.isOpen ? 'opened' : 'closed'} chat with ${data.recipient}`);
    });

    // Handle typing status updates
    socket.on("user:typing", (data: { roomId: string, nickname: string, isTyping: boolean }) => {
      if (!data.roomId || !data.nickname) return;

      console.log(`👆 User ${data.nickname} is ${data.isTyping ? 'typing' : 'stopped typing'} in room ${data.roomId}`);

      // Update activity timestamp if this is a webpage visitor
      if (isWebpageVisitor && currentRoom) {
        storage.updateWebpageVisitorActivity(currentRoom, socket.id);
      }

      // Broadcast typing status to everyone else in the room
      socket.to(data.roomId).emit("user:typing", {
        roomId: data.roomId,
        nickname: data.nickname,
        isTyping: data.isTyping
      });
    });

    // Handle private messages
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

      // Find the recipient's socket ID - with case-insensitive matching
      let recipientSocketId: string | undefined = undefined;
      const room = storage.getRoom(message.roomId);

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
        senderSocketId: socket.id
      });

      if (recipientSocketId) {
        // Verifica se il destinatario ha già la chat aperta con il mittente
        const isChatOpen = storage.getPrivateChatState(recipientSocketId, message.nickname);
        console.log(`Chat già aperta tra ${recipientSocketId} e ${message.nickname}? ${isChatOpen ? 'SI' : 'NO'}`);

        // Invia il messaggio normale per la cronologia della chat
        io.to(recipientSocketId).emit("chat:private", {
          ...completeMessage,
          isNotification: true
        });

        // Invia la notifica SOLO se la chat non è già aperta
        if (!isChatOpen) {
          io.to(recipientSocketId).emit("msg_notification", {
            ...completeMessage,
            isNotification: true, // Flag per la notifica
            forceAlert: true // Flag per forzare l'alert
          });

          console.log(`💥 NOTIFICA INVIATA A ${recipientSocketId} DA ${message.nickname} (chat chiusa)`);
        } else {
          console.log(`⏩ NESSUNA NOTIFICA A ${recipientSocketId} DA ${message.nickname} (chat già aperta)`);
        }

        // Invia anche al mittente (senza flag di notifica)
        socket.emit("chat:private", completeMessage);
      } else {
        // Caso speciale: prova una ricerca più ampia usando il broadcast nella stanza
        const broadcastMessage = {
          ...completeMessage,
          broadcastPrivate: true // Flag speciale per il filtraggio del client
        };

        // Broadcast a tutti i socket nella stanza - i client filtreranno per destinatario
        io.to(message.roomId).emit("chat:private", broadcastMessage);
        console.log(`Broadcasting private message to room as fallback`);

        // Notifica al mittente che stiamo usando la modalità broadcast
        socket.emit("error:message", {
          message: `L'utente '${message.recipient}' non può essere raggiunto direttamente. Il messaggio è stato trasmesso alla stanza.`
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
  });

  return httpServer;
}