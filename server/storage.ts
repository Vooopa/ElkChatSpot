import { users, type User, type InsertUser, ChatRoom, WebpageVisitor, UserStatus, normalizeUrl } from "@shared/schema";
import { log } from "./vite";

// Interfaccia per i metodi di storage
export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Chat room methods
  createRoom(roomId: string, url?: string, title?: string): void;
  getRooms(): Map<string, ChatRoom>;
  getRoom(roomId: string): ChatRoom | undefined;
  getRoomByUrl(url: string): ChatRoom | undefined;
  addUserToRoom(roomId: string, socketId: string, nickname: string): boolean; // Returns false if nickname is already in use
  removeUserFromRoom(roomId: string, socketId: string): void;
  getRoomUsers(roomId: string): Map<string, string>;
  getRoomUserCount(roomId: string): number;
  isNicknameInUse(roomId: string, nickname: string): boolean;
  getSocketIdByNickname(roomId: string, nickname: string): string | undefined;

  // Webpage visitor methods
  addWebpageVisitor(url: string, socketId: string, nickname: string): string | null; // Returns roomId or null if nickname is in use
  removeWebpageVisitor(roomId: string, socketId: string): void;
  getWebpageVisitors(roomId: string): Map<string, WebpageVisitor>;
  updateWebpageVisitorStatus(roomId: string, socketId: string, status: UserStatus): void;
  updateWebpageVisitorActivity(roomId: string, socketId: string): void;

  // Private chat state methods
  setPrivateChatState(socketId: string, recipientNickname: string, isOpen: boolean): void;
  getPrivateChatState(socketId: string, recipientNickname: string): boolean;
  clearPrivateChatState(socketId: string): void;
}

// Implementazione in memoria dello storage
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private rooms: Map<string, ChatRoom>;
  private privateChatStates: Map<string, Set<string>>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.rooms = new Map();
    this.privateChatStates = new Map(); // socketId -> Set of recipientNicknames
    this.currentId = 1;
    log("Storage in memoria inizializzato", "storage", "info");
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    if (!username) return undefined;

    const normalizedUsername = username.toLowerCase();
    for (const user of this.users.values()) {
      if (user.username.toLowerCase() === normalizedUsername) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(user: InsertUser): Promise<User> {
    const newUser = {
      id: this.currentId++,
      ...user,
      createdAt: new Date(),
      updatedAt: new Date()
    } as User;

    this.users.set(newUser.id, newUser);
    log(`Utente creato: ${newUser.username} (ID: ${newUser.id})`, "storage", "info");
    return newUser;
  }

  // Chat room methods
  createRoom(roomId: string, url?: string, title?: string): void {
    if (!roomId) {
      log("Impossibile creare stanza: ID non valido", "storage", "error");
      return;
    }

    if (this.rooms.has(roomId)) {
      log(`La stanza esiste già: ${roomId}`, "storage", "warn");
      return;
    }

    const room: ChatRoom = {
      id: roomId,
      url: url || null,
      title: title || null,
      users: new Map(),
      createdAt: new Date()
    };

    this.rooms.set(roomId, room);
    log(`Stanza creata: ${roomId}${url ? ` (URL: ${url})` : ''}`, "storage", "info");
  }

  getRooms(): Map<string, ChatRoom> {
    return this.rooms;
  }

  getRoom(roomId: string): ChatRoom | undefined {
    if (!roomId) return undefined;
    return this.rooms.get(roomId);
  }

  getRoomByUrl(url: string): ChatRoom | undefined {
    if (!url) return undefined;

    try {
      const normalizedUrl = normalizeUrl(url);

      // Cerca tra tutte le stanze quella con l'URL corrispondente
      for (const [roomId, room] of this.rooms.entries()) {
        if (room.url && normalizeUrl(room.url) === normalizedUrl) {
          return room;
        }
      }
      return undefined;
    } catch (error) {
      log(`Errore nel recupero della stanza per URL (${url}): ${error instanceof Error ? error.message : 'Errore sconosciuto'}`, "storage", "error");
      return undefined;
    }
  }

  addUserToRoom(roomId: string, socketId: string, nickname: string): boolean {
    if (!roomId || !socketId || !nickname) {
      log(`Parametri mancanti per addUserToRoom: roomId (${roomId}), socketId (${socketId}), nickname (${nickname})`, "storage", "error");
      return false;
    }

    const room = this.getRoom(roomId);
    if (!room) {
      log(`Stanza non trovata: ${roomId}`, "storage", "error");
      return false;
    }

    // Check if nickname is already in use in this room
    if (this.isNicknameInUse(roomId, nickname)) {
      log(`Nickname già in uso nella stanza ${roomId}: ${nickname}`, "storage", "warn");
      return false;
    }

    // Add user to room
    room.users.set(socketId, nickname);
    log(`Utente aggiunto alla stanza ${roomId}: ${socketId} (${nickname})`, "storage", "info");
    return true;
  }

  removeUserFromRoom(roomId: string, socketId: string): void {
    if (!roomId || !socketId) {
      log(`Parametri mancanti per removeUserFromRoom: roomId (${roomId}), socketId (${socketId})`, "storage", "error");
      return;
    }

    const room = this.getRoom(roomId);
    if (!room) {
      log(`Stanza non trovata: ${roomId}`, "storage", "warn");
      return;
    }

    const nickname = room.users.get(socketId);
    if (room.users.delete(socketId)) {
      log(`Utente rimosso dalla stanza ${roomId}: ${socketId}${nickname ? ` (${nickname})` : ''}`, "storage", "info");
    }

    // Se la stanza è vuota e non è una stanza predefinita, rimuovila
    if (room.users.size === 0 && roomId !== 'lobby') {
      this.rooms.delete(roomId);
      log(`Stanza vuota rimossa: ${roomId}`, "storage", "info");
    }
  }

  getRoomUsers(roomId: string): Map<string, string> {
    if (!roomId) {
      return new Map();
    }

    const room = this.getRoom(roomId);
    if (!room) {
      return new Map();
    }

    return room.users;
  }

  getRoomUserCount(roomId: string): number {
    if (!roomId) return 0;

    const room = this.getRoom(roomId);
    if (!room) return 0;

    return room.users.size;
  }

  isNicknameInUse(roomId: string, nickname: string): boolean {
    if (!roomId || !nickname) return false;

    const room = this.getRoom(roomId);
    if (!room) return false;

    // Normalizza il nickname per un confronto case-insensitive
    const normalizedNickname = nickname.toLowerCase();

    // Controlla se il nickname è già in uso (case-insensitive)
    for (const existingNickname of room.users.values()) {
      if (existingNickname.toLowerCase() === normalizedNickname) {
        return true;
      }
    }

    return false;
  }

  getSocketIdByNickname(roomId: string, nickname: string): string | undefined {
    if (!roomId || !nickname) return undefined;

    const room = this.getRoom(roomId);
    if (!room) return undefined;

    // Normalizza il nickname per un confronto case-insensitive
    const normalizedNickname = nickname.toLowerCase();

    // Trova il socketId corrispondente al nickname
    for (const [socketId, existingNickname] of room.users.entries()) {
      if (existingNickname.toLowerCase() === normalizedNickname) {
        return socketId;
      }
    }

    return undefined;
  }

  // Webpage visitor methods
  addWebpageVisitor(url: string, socketId: string, nickname: string): string | null {
    if (!url || !socketId || !nickname) {
      log(`Parametri mancanti per addWebpageVisitor: URL (${url}), socketId (${socketId}), nickname (${nickname})`, "storage", "error");
      return null;
    }

    try {
      // Normalizza l'URL per garantire confronti coerenti
      const normalizedUrl = normalizeUrl(url);

      // Prima controlla se esiste già una stanza per questo URL
      let room = this.getRoomByUrl(normalizedUrl);

      // Se non esiste, crea una nuova stanza
      if (!room) {
        // Usa l'URL normalizzato come ID della stanza
        const roomId = normalizedUrl;
        this.createRoom(roomId, normalizedUrl);
        room = this.rooms.get(roomId);

        if (!room) {
          log(`Impossibile creare stanza per URL: ${normalizedUrl}`, "storage", "error");
          return null;
        }
      }

      // Controlla se il nickname è già in uso nella stanza
      if (this.isNicknameInUse(room.id, nickname)) {
        log(`Nickname già in uso nella stanza ${room.id}: ${nickname}`, "storage", "warn");
        return null;
      }

      // Aggiungi il visitatore
      if (!room.users) {
        room.users = new Map();
      }

      // Aggiungi l'utente alla stanza
      room.users.set(socketId, nickname);

      log(`Visitatore aggiunto alla stanza ${room.id}: ${socketId} (${nickname})`, "storage", "info");
      return room.id;
    } catch (error) {
      log(`Errore nell'aggiunta del visitatore: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`, "storage", "error");
      return null;
    }
  }

  removeWebpageVisitor(roomId: string, socketId: string): void {
    // Riutilizza il metodo removeUserFromRoom poiché la logica è identica
    this.removeUserFromRoom(roomId, socketId);
  }

  getWebpageVisitors(roomId: string): Map<string, WebpageVisitor> {
    if (!roomId) {
      return new Map();
    }

    const room = this.getRoom(roomId);
    if (!room) {
      return new Map();
    }

    const visitors = new Map<string, WebpageVisitor>();

    for (const [socketId, nickname] of room.users.entries()) {
      visitors.set(socketId, {
        nickname,
        socketId,
        status: UserStatus.ONLINE,
        lastActivity: new Date()
      });
    }

    return visitors;
  }

  updateWebpageVisitorStatus(roomId: string, socketId: string, status: UserStatus): void {
    if (!roomId || !socketId) {
      log(`Parametri mancanti per updateWebpageVisitorStatus: roomId (${roomId}), socketId (${socketId})`, "storage", "error");
      return;
    }

    const room = this.getRoom(roomId);
    if (!room) {
      log(`Stanza non trovata: ${roomId}`, "storage", "warn");
      return;
    }

    // Verifica che l'utente sia nella stanza
    const nickname = room.users.get(socketId);
    if (!nickname) {
      log(`Visitatore non trovato nella stanza ${roomId}: ${socketId}`, "storage", "warn");
      return;
    }

    log(`Stato visitatore aggiornato in ${roomId}: ${socketId} (${nickname}) -> ${status}`, "storage", "debug");
  }

  updateWebpageVisitorActivity(roomId: string, socketId: string): void {
    if (!roomId || !socketId) {
      log(`Parametri mancanti per updateWebpageVisitorActivity: roomId (${roomId}), socketId (${socketId})`, "storage", "error");
      return;
    }

    const room = this.getRoom(roomId);
    if (!room) {
      log(`Stanza non trovata: ${roomId}`, "storage", "warn");
      return;
    }

    // Verifica che l'utente sia nella stanza
    const nickname = room.users.get(socketId);
    if (!nickname) {
      log(`Visitatore non trovato nella stanza ${roomId}: ${socketId}`, "storage", "warn");
      return;
    }

    log(`Attività visitatore aggiornata in ${roomId}: ${socketId} (${nickname})`, "storage", "debug");
  }

  // Private chat state methods
  setPrivateChatState(socketId: string, recipientNickname: string, isOpen: boolean): void {
    if (!socketId || typeof socketId !== 'string') {
      log(`ID socket non valido: ${socketId}`, "storage", "error");
      return;
    }

    if (!recipientNickname || typeof recipientNickname !== 'string') {
      log(`Nickname destinatario non valido: ${recipientNickname}`, "storage", "error");
      return;
    }

    // Normalize nickname for case-insensitive comparison
    const normalizedRecipient = recipientNickname.toLowerCase();

    try {
      if (isOpen) {
        // Add to open chats
        if (!this.privateChatStates.has(socketId)) {
          this.privateChatStates.set(socketId, new Set());
        }
        this.privateChatStates.get(socketId)!.add(normalizedRecipient);
        log(`Chat aperta: ${socketId} con ${normalizedRecipient}`, "storage", "debug");
      } else {
        // Remove from open chats
        if (this.privateChatStates.has(socketId)) {
          this.privateChatStates.get(socketId)!.delete(normalizedRecipient);
          log(`Chat chiusa: ${socketId} con ${normalizedRecipient}`, "storage", "debug");
        }
      }
    } catch (error) {
      log(`Errore nell'impostazione dello stato della chat: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`, "storage", "error");
    }
  }

  getPrivateChatState(socketId: string, recipientNickname: string): boolean {
    if (!socketId || !recipientNickname) {
      return false;
    }

    // Normalize nickname for case-insensitive comparison
    const normalizedRecipient = recipientNickname.toLowerCase();

    try {
      if (!this.privateChatStates.has(socketId)) {
        return false;
      }
      return this.privateChatStates.get(socketId)!.has(normalizedRecipient);
    } catch (error) {
      log(`Errore nel recupero dello stato della chat: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`, "storage", "error");
      return false;
    }
  }

  clearPrivateChatState(socketId: string): void {
    if (!socketId) {
      return;
    }

    try {
      if (this.privateChatStates.has(socketId)) {
        this.privateChatStates.delete(socketId);
        log(`Stati chat privata cancellati per: ${socketId}`, "storage", "debug");
      }
    } catch (error) {
      log(`Errore nella cancellazione dello stato della chat: ${error instanceof Error ? error.message : 'Errore sconosciuto'}`, "storage", "error");
    }
  }
}

// Singleton instance for global use
const storage = new MemStorage();
export { storage };