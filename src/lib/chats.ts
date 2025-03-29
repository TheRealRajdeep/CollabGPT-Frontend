import { db } from './firebase';
import { collection, query, where, orderBy, limit, getDocs, doc, getDoc } from 'firebase/firestore';
import { User } from 'firebase/auth';
import { fetchWithCORS } from './socket';

/**
 * Interface for chat message
 */
export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  userId: string;
  userName: string;
  userPhotoURL?: string | null;
  timestamp: Date;
  createdAt: Date;
}

/**
 * Interface for chat room
 */
export interface ChatRoom {
  id: string;
  title: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  lastMessage?: {
    content: string;
    timestamp: Date;
    userId: string;
    userName: string;
  };
  messageCount: number;
  participantCount: number;
}

/**
 * Get recent chat rooms for the current user
 * @param user The current user
 * @param maxRooms Maximum number of rooms to fetch
 * @returns Array of chat rooms
 */
export async function getUserChatRooms(user: User | null, maxRooms = 20): Promise<ChatRoom[]> {
  if (!user) return [];
  
  try {
    // Try to fetch from API first (most reliable and up-to-date)
    try {
      console.log("Fetching user chats from API for user:", user.uid);
      const response = await fetchWithCORS(`/api/users/${user.uid}/chats?limit=${maxRooms}`);
      
      if (response.ok) {
        const data = await response.json();
        if (data.chats && Array.isArray(data.chats)) {
          // Format dates properly
          const chats = data.chats.map((chat: any) => ({
            ...chat,
            createdAt: chat.createdAt ? new Date(chat.createdAt) : new Date(),
            updatedAt: chat.updatedAt ? new Date(chat.updatedAt) : new Date(),
            lastMessage: chat.lastMessage ? {
              ...chat.lastMessage,
              timestamp: chat.lastMessage.timestamp ? new Date(chat.lastMessage.timestamp) : new Date(),
            } : undefined
          }));
          
          console.log("Received chats from API:", chats.length);
          return chats;
        }
      } else {
        console.warn(`API returned ${response.status} when fetching user chats`);
      }
    } catch (apiError) {
      console.error('Error fetching from API, falling back to Firestore:', apiError);
    }
    
    // Fallback to direct Firestore query
    // 1. Check user's rooms subcollection first (faster)
    const userRoomsRef = collection(db, `users/${user.uid}/rooms`);
    const userRoomsQuery = query(
      userRoomsRef,
      orderBy('lastAccessTime', 'desc'),
      limit(maxRooms)
    );
    
    const userRoomsSnapshot = await getDocs(userRoomsQuery);
    
    if (!userRoomsSnapshot.empty) {
      // Get full room details for each room ID
      const roomPromises = userRoomsSnapshot.docs.map(async (roomDoc) => {
        const roomId = roomDoc.id;
        const roomRef = doc(db, 'rooms', roomId);
        const roomSnapshot = await getDoc(roomRef);
        
        if (!roomSnapshot.exists()) return null;
        
        const data = roomSnapshot.data();
        return {
          id: roomSnapshot.id,
          title: data.title || 'Untitled Chat',
          description: data.description || '',
          createdAt: data.createdAt?.toDate() || new Date(),
          updatedAt: data.updatedAt?.toDate() || new Date(),
          createdBy: data.createdBy,
          lastMessage: data.lastMessage ? {
            ...data.lastMessage,
            timestamp: data.lastMessage.timestamp.toDate(),
          } : undefined,
          messageCount: data.messageCount || 0,
          participantCount: data.participantCount || 0,
        };
      });
      
      const rooms = await Promise.all(roomPromises);
      return rooms.filter(Boolean) as ChatRoom[];
    }
    
    // 2. Fallback to querying rooms collection directly (slower)
    const roomsRef = collection(db, 'rooms');
    const q = query(
      roomsRef, 
      where(`participants.${user.uid}`, '!=', null),
      orderBy(`participants.${user.uid}.joinedAt`, 'desc'),
      limit(maxRooms)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || 'Untitled Chat',
        description: data.description || '',
        createdAt: data.createdAt?.toDate() || new Date(),
        updatedAt: data.updatedAt?.toDate() || new Date(),
        createdBy: data.createdBy,
        lastMessage: data.lastMessage ? {
          ...data.lastMessage,
          timestamp: data.lastMessage.timestamp.toDate(),
        } : undefined,
        messageCount: data.messageCount || 0,
        participantCount: data.participantCount || 0,
      };
    });
  } catch (error) {
    console.error('Error fetching user chat rooms:', error);
    return [];
  }
}

/**
 * Get chat room details by ID
 * @param roomId Room ID
 * @returns Chat room details or null if not found
 */
export async function getChatRoom(roomId: string): Promise<ChatRoom | null> {
  try {
    const roomRef = doc(db, 'rooms', roomId);
    const roomSnapshot = await getDoc(roomRef);
    
    if (!roomSnapshot.exists()) return null;
    
    const data = roomSnapshot.data();
    return {
      id: roomSnapshot.id,
      title: data.title || 'Untitled Chat',
      description: data.description || '',
      createdAt: data.createdAt?.toDate() || new Date(),
      updatedAt: data.updatedAt?.toDate() || new Date(),
      createdBy: data.createdBy,
      lastMessage: data.lastMessage ? {
        ...data.lastMessage,
        timestamp: data.lastMessage.timestamp.toDate(),
      } : undefined,
      messageCount: data.messageCount || 0,
      participantCount: data.participantCount || 0,
    };
  } catch (error) {
    console.error(`Error fetching chat room ${roomId}:`, error);
    return null;
  }
}

/**
 * Get chat room messages
 * @param roomId Room ID
 * @param maxLimit Maximum number of messages to fetch
 * @returns Array of chat messages
 */
export async function getChatMessages(roomId: string, maxLimit = 100): Promise<ChatMessage[]> {
  try {
    const messagesRef = collection(db, `rooms/${roomId}/messages`);
    const q = query(
      messagesRef,
      orderBy('timestamp', 'asc'),
      limit(maxLimit)
    );
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        content: data.content,
        role: data.role,
        userId: data.userId,
        userName: data.userName,
        userPhotoURL: data.userPhotoURL,
        timestamp: data.timestamp?.toDate() || new Date(),
        createdAt: data.createdAt?.toDate() || new Date(),
      };
    });
  } catch (error) {
    console.error(`Error fetching messages for room ${roomId}:`, error);
    return [];
  }
}
