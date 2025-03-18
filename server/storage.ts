import { users, type User, type InsertUser, ChatRoom, WebpageVisitor, UserStatus, normalizeUrl } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Chat room methods
  createRoom(roomId: string, url?: string, title?: string): void;
  getRooms(): Map<string, ChatRoom>;
  getRoom(roomId: string): ChatRoom | undefined;
  getRoomByUrl(url: string): ChatRoom | undefined;
  addUserToRoom(roomId: string, socketId: string, nickname: string): void;
  removeUserFromRoom(roomId: string, socketId: string): void;
  getRoomUsers(roomId: string): Map<string, string>;
  getRoomUserCount(roomId: string): number;
  
  // Webpage visitor methods
  addWebpageVisitor(url: string, socketId: string, nickname: string): string; // Returns roomId
  removeWebpageVisitor(roomId: string, socketId: string): void;
  getWebpageVisitors(roomId: string): Map<string, WebpageVisitor>;
  updateWebpageVisitorStatus(roomId: string, socketId: string, status: UserStatus): void;
  updateWebpageVisitorActivity(roomId: string, socketId: string): void;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private rooms: Map<string, ChatRoom>;
  currentId: number;

  constructor() {
    this.users = new Map();
    this.rooms = new Map();
    this.currentId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Chat room methods
  createRoom(roomId: string, url?: string, title?: string): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        url,
        title,
        users: new Map(),
        visitors: new Map(),
        createdAt: new Date().toISOString()
      });
    }
  }

  getRooms(): Map<string, ChatRoom> {
    return this.rooms;
  }

  getRoom(roomId: string): ChatRoom | undefined {
    return this.rooms.get(roomId);
  }

  getRoomByUrl(url: string): ChatRoom | undefined {
    const normalizedUrl = normalizeUrl(url);
    return Array.from(this.rooms.values()).find(
      (room) => room.url && normalizeUrl(room.url) === normalizedUrl
    );
  }

  addUserToRoom(roomId: string, socketId: string, nickname: string): void {
    if (!this.rooms.has(roomId)) {
      this.createRoom(roomId);
    }
    
    const room = this.rooms.get(roomId)!;
    room.users.set(socketId, nickname);
  }

  removeUserFromRoom(roomId: string, socketId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.users.delete(socketId);
      
      // If room is empty, consider cleaning it up
      if (room.users.size === 0 && (!room.visitors || room.visitors.size === 0)) {
        this.rooms.delete(roomId);
      }
    }
  }

  getRoomUsers(roomId: string): Map<string, string> {
    const room = this.rooms.get(roomId);
    if (!room) {
      return new Map();
    }
    return room.users;
  }

  getRoomUserCount(roomId: string): number {
    const room = this.rooms.get(roomId);
    if (!room) {
      return 0;
    }
    return room.users.size;
  }

  // Webpage visitor methods
  addWebpageVisitor(url: string, socketId: string, nickname: string): string {
    // Create a room ID based on the normalized URL
    const normalizedUrl = normalizeUrl(url);
    let roomId = `url-${normalizedUrl}`;
    
    // Check if a room for this URL already exists
    let room = this.getRoom(roomId);
    
    if (!room) {
      // Create a new room for this URL
      this.createRoom(roomId, url);
      room = this.getRoom(roomId)!;
    }
    
    // Create the visitor record
    const visitor: WebpageVisitor = {
      socketId,
      nickname,
      joinedAt: new Date().toISOString(),
      status: UserStatus.ACTIVE,
      lastActivity: new Date().toISOString()
    };
    
    // Add visitor to the room
    room.visitors!.set(socketId, visitor);
    
    // Also add to regular users for compatibility
    room.users.set(socketId, nickname);
    
    return roomId;
  }

  removeWebpageVisitor(roomId: string, socketId: string): void {
    const room = this.getRoom(roomId);
    if (room && room.visitors) {
      room.visitors.delete(socketId);
      room.users.delete(socketId);
      
      // Clean up empty rooms
      if (room.users.size === 0 && room.visitors.size === 0) {
        this.rooms.delete(roomId);
      }
    }
  }

  getWebpageVisitors(roomId: string): Map<string, WebpageVisitor> {
    const room = this.getRoom(roomId);
    if (!room || !room.visitors) {
      return new Map();
    }
    return room.visitors;
  }

  updateWebpageVisitorStatus(roomId: string, socketId: string, status: UserStatus): void {
    const room = this.getRoom(roomId);
    if (room && room.visitors && room.visitors.has(socketId)) {
      const visitor = room.visitors.get(socketId)!;
      visitor.status = status;
      visitor.lastActivity = new Date().toISOString();
      room.visitors.set(socketId, visitor);
    }
  }

  updateWebpageVisitorActivity(roomId: string, socketId: string): void {
    const room = this.getRoom(roomId);
    if (room && room.visitors && room.visitors.has(socketId)) {
      const visitor = room.visitors.get(socketId)!;
      visitor.lastActivity = new Date().toISOString();
      visitor.status = UserStatus.ACTIVE;
      room.visitors.set(socketId, visitor);
    }
  }
}

export const storage = new MemStorage();
