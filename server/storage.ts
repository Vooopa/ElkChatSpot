import { users, type User, type InsertUser, ChatRoom } from "@shared/schema";

// modify the interface with any CRUD methods
// you might need

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Chat room methods
  createRoom(roomId: string): void;
  getRooms(): Map<string, ChatRoom>;
  getRoom(roomId: string): ChatRoom | undefined;
  addUserToRoom(roomId: string, socketId: string, nickname: string): void;
  removeUserFromRoom(roomId: string, socketId: string): void;
  getRoomUsers(roomId: string): Map<string, string>;
  getRoomUserCount(roomId: string): number;
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
  createRoom(roomId: string): void {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, {
        id: roomId,
        users: new Map()
      });
    }
  }

  getRooms(): Map<string, ChatRoom> {
    return this.rooms;
  }

  getRoom(roomId: string): ChatRoom | undefined {
    return this.rooms.get(roomId);
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
      if (room.users.size === 0) {
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
}

export const storage = new MemStorage();
