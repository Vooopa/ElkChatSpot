import { pgTable, text, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export enum MessageType {
  USER_MESSAGE = "user_message",
  SYSTEM = "system",
  USER_JOINED = "user_joined",
  USER_LEFT = "user_left"
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
}

export interface ChatRoom {
  id: string;
  users: Map<string, string>; // socketId -> nickname
}

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
