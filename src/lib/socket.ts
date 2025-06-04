import { io, Socket } from "socket.io-client";
import { User } from "firebase/auth";

// Define socket event types
export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userPhotoURL: string | null;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  isTyping?: boolean;
  isError?: boolean;
}

export interface RoomUser {
  id: string;
  name: string;
  photoURL: string | null;
  socketId?: string; // Add socket ID to distinguish between connections
  // Add color coding field if needed
  avatarColor?: string;
}

export interface ChatInfo {
  title: string;
  description?: string;
  createdAt: Date;
}

export interface RoomData {
  roomId: string;
  users: RoomUser[];
  messages: ChatMessage[];
  chatInfo?: ChatInfo;
}

export interface TypingIndicator {
  userId: string;
  userName: string;
  isTyping: boolean;
}

// Socket.io client instance
let socket: Socket | null = null;
let currentRoomId: string | null = null; // Track the current room

// Get the socket server URL from environment variables or use default
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:8080';

// Initialize socket connection with enhanced connection handling
export const initSocket = (): Socket => {
  if (!socket) {
    console.log(`Connecting to socket server at ${SOCKET_URL}`);
    
    socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'], // Start with polling first, then try websocket
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      forceNew: true, // Force a new connection
    });
    
    socket.on('connect', () => {
      console.log('Connected to socket server successfully');
      
      // Rejoin current room if there is one (helps with reconnection)
      if (currentRoomId) {
        console.log(`Reconnecting to room ${currentRoomId}`);
        const user = localStorage.getItem('currentUser') 
          ? JSON.parse(localStorage.getItem('currentUser') || '{}') 
          : null;
        
        if (socket) {
          socket.emit('join-room', { roomId: currentRoomId, user });
        }
      }
    });
    
    socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });
    
    socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      console.log('Connection error details:', error.message);
      
      // Try to force polling if websocket fails
      if (socket && socket.io.opts && socket.io.opts.transports && 
          (socket.io.opts.transports as string[]).includes('websocket')) {
        console.log('Falling back to long polling transport');
        socket.io.opts.transports = ['polling'];
        socket.connect();
      }
    });
    
    // Add additional error handling
    socket.on('error', (error) => {
      console.error('Socket general error:', error);
    });
    
    // Handle reconnect attempts
    socket.io.on('reconnect_attempt', (attempt) => {
      console.log(`Reconnection attempt ${attempt}`);
    });
    
    socket.io.on('reconnect', (attempt) => {
      console.log(`Reconnected after ${attempt} attempts`);
    });
    
    socket.io.on('reconnect_failed', () => {
      console.error('Failed to reconnect to socket server');
      // Reset socket so a new connection can be attempted
      socket = null;
    });
  }
  
  return socket;
};

// Join a chat room
export const joinRoom = (roomId: string, user: User | null) => {
  if (!socket) initSocket();
  
  // If joining a different room than the current one
  if (currentRoomId && currentRoomId !== roomId) {
    // Leave the current room first
    socket?.emit('leave-room', { roomId: currentRoomId });
    console.log(`Left room ${currentRoomId}`);
    
    // Important: Add a slight delay to ensure server processes the leave event
    setTimeout(() => {
      actuallyJoinRoom(roomId, user);
    }, 100);
  } else {
    // Join the room directly if not leaving another room
    actuallyJoinRoom(roomId, user);
  }
};

// Helper function to actually join a room
const actuallyJoinRoom = (roomId: string, user: User | null) => {
  currentRoomId = roomId; // Store the current room ID
  
  // Create a safe user object with validated photoURL
  const safeUser = user ? {
    uid: user.uid,
    displayName: user.displayName || 'User',
    email: user.email,
    photoURL: user.photoURL,  // Will be validated server-side
  } : null;
  
  // Store user info for reconnection purposes
  if (safeUser) {
    localStorage.setItem('currentUser', JSON.stringify(safeUser));
  }
  
  socket?.emit('join-room', { roomId, user: safeUser });
  console.log(`Joined room ${roomId}`);
};

// Send a message to the room
export const sendMessage = (roomId: string, content: string, role: "user" | "assistant" = "user", messageId?: string) => {
  if (!socket) initSocket();
  socket?.emit('send-message', {
    roomId,
    message: {
      id: messageId, // Allow passing a message ID to keep consistency
      content,
      role,
    },
  });
};

// Send typing indicator
export const sendTypingIndicator = (roomId: string) => {
  if (!socket) initSocket();
  socket?.emit('user-typing', { roomId });
  console.log('Sent typing indicator for room:', roomId);
};

// Send stopped typing indicator
export const sendStoppedTypingIndicator = (roomId: string) => {
  if (!socket) initSocket();
  socket?.emit('user-stopped-typing', { roomId });
  console.log('Sent stopped typing indicator for room:', roomId);
};

// Request AI response
export const requestAIResponse = (roomId: string, prompt: string) => {
  if (!socket) initSocket();
  socket?.emit('request-ai-response', { roomId, prompt });
};

// Create a new room
export const createRoom = async (): Promise<string> => {
  try {
    if (!socket) initSocket();
    
    // If we're in a room already, leave it first
    if (currentRoomId) {
      socket?.emit('leave-room', { roomId: currentRoomId });
      console.log(`Left room ${currentRoomId} before creating new room`);
      currentRoomId = null; // Clear current room before creating new one
    }
    
    const response = await fetchWithCORS(`/api/rooms`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`Failed to create room: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.roomId;
  } catch (error) {
    console.error('Error creating room:', error);
    throw error;
  }
};

// Update chat info
export const updateChatInfo = (roomId: string, chatInfo: Partial<ChatInfo>) => {
  if (!socket) initSocket();
  socket?.emit('update-chat-info', { roomId, chatInfo });
};

// Check if room exists
export const checkRoomExists = async (roomId: string): Promise<boolean> => {
  try {
    const response = await fetch(`${SOCKET_URL}/api/rooms/${roomId}`);
    const data = await response.json();
    return data.exists;
  } catch (error) {
    console.error('Error checking room:', error);
    return false;
  }
};

// Delete a chat from user's history
export const deleteUserChat = async (userId: string, roomId: string): Promise<boolean> => {
  try {
    if (!socket) initSocket();
    
    console.log(`Sending delete request for user ${userId}, room ${roomId}`);
    
    // First, leave the room before deleting
    socket?.emit('leave-room', { roomId });
    console.log(`Left room ${roomId} as part of deletion process`);
    
    // If this was the current room, clear it
    if (currentRoomId === roomId) {
      currentRoomId = null;
    }
    
    // Add a timeout for the request (10 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetchWithCORS(`/api/users/${userId}/chats/${roomId}`, {
        method: 'DELETE',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      // Log the full response status for debugging
      console.log(`Delete response status: ${response.status}`);
      
      // Try to parse the response as JSON
      try {
        const responseText = await response.text();
        console.log('Raw response:', responseText);
        responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.warn('Could not parse response as JSON:', parseError);
      }
      
      if (!response.ok) {
        console.warn(`Delete request returned non-OK status: ${response.status}`);
      }
      
      // Emit a socket event to notify server about deletion
      socket?.emit('user-deleted-chat', { userId, roomId });
      
      return true;
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error('Fetch error while deleting chat:', fetchError);
      return true; // Return true so UI updates even if the fetch fails
    }
  } catch (error) {
    console.error('Error deleting chat:', error);
    return true;
  }
};

// Disconnect socket
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentRoomId = null; // Clear the current room
  }
};

// Add a new function to test the connection
export const testConnection = async (): Promise<{success: boolean, message: string}> => {
  try {
    const response = await fetch(`${SOCKET_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    return {
      success: true,
      message: `Server is ${data.status} in ${data.environment} environment`
    };
  } catch (error) {
    return {
      success: false,
      message: `Failed to connect to server: ${error instanceof Error ? error.message : String(error)}`
    };
  }
};

// Enhanced fetchWithCORS function
export const fetchWithCORS = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const fullUrl = url.startsWith('http') ? url : `${SOCKET_URL}${url}`;
  
  const fetchOptions: RequestInit = {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      // Remove credentials header which can cause CORS issues
      ...options.headers,
    },
    // Use 'omit' instead of 'include' for cross-origin requests
    credentials: 'omit',
    mode: 'cors',
  };
  
  try {
    return await fetch(fullUrl, fetchOptions);
  } catch (error) {
    console.error(`Fetch error for ${fullUrl}:`, error);
    throw error;
  }
};
