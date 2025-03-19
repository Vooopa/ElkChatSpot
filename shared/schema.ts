import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export enum MessageType {
  USER_MESSAGE = "user_message",
  PRIVATE_MESSAGE = "private_message",
  SYSTEM = "system",
  USER_JOINED = "user_joined",
  USER_LEFT = "user_left"
}

export enum UserStatus {
  ACTIVE = "active",
  IDLE = "idle",
  AWAY = "away"
}

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export interface Message {
  roomId: string;
  nickname?: string;
  text: string;
  timestamp?: string;
  type: MessageType;
  recipient?: string; // For private messages
  senderSocketId?: string; // Sender's socket ID
}

export interface WebpageVisitor {
  socketId: string;
  nickname: string;
  joinedAt: string;
  status: UserStatus;
  lastActivity: string;
}

export interface ChatRoom {
  id: string;
  url?: string; // Original webpage URL
  title?: string; // Page title if available
  users: Map<string, string>; // socketId -> nickname
  visitors?: Map<string, WebpageVisitor>; // More detailed user info for webpage visitors
  createdAt?: string;
}

// Utility function to normalize URLs for consistent room IDs
export function normalizeUrl(url: string): string {
  try {
    // Remove protocol
    let normalized = url.replace(/^(https?:\/\/)/, '');
    
    // Remove www prefix if present
    normalized = normalized.replace(/^www\./, '');
    
    // Remove trailing slash if present
    normalized = normalized.replace(/\/$/, '');
    
    // Make lowercase
    normalized = normalized.toLowerCase();
    
    return normalized;
  } catch (error) {
    // If anything goes wrong, return the original URL
    return url;
  }
}

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
