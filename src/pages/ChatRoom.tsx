import { useState, useRef, useEffect } from "react";
import { User } from "firebase/auth";
import { Button } from "@/components/ui/button";
import {
    Send,
    Plus,
    Menu,
    LogOut,
    UserCircle2,
    Settings,
    Share2,
    Users,
    Loader2
} from "lucide-react";
import { ShareDialog } from "@/components/ShareDialog";
import { useNavigate } from "react-router-dom";
import {
    initSocket,
    joinRoom,
    sendMessage,
    requestAIResponse,
    createRoom,
    sendTypingIndicator,
    sendStoppedTypingIndicator,
    type ChatMessage as SocketChatMessage,
    type RoomUser,
    type TypingIndicator as TypingIndicatorType
} from "@/lib/socket";
import ReactMarkdown from "react-markdown";
import UserList from "@/components/UserList";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { AIAvatar } from "@/components/ui/AIAvatar";
import { TypingIndicator } from "@/components/ui/TypingIndicator";
import ChatHistory from "@/components/ChatHistory";
import { v4 as uuidv4 } from 'uuid';

interface ChatMessage {
    id: string;
    content: string;
    role: "user" | "assistant";
    timestamp: Date;
    userId?: string;
    userName?: string;
    userPhotoURL?: string | null;
    isTyping?: boolean;
    isError?: boolean;
}

interface ChatRoomProps {
    user: User | null;
    onSignOut: () => Promise<void>;
    roomId?: string;
}

interface ChatInfo {
    title: string;
    description?: string;
    createdAt: Date;
}

const ChatRoom = ({ user, onSignOut, roomId: initialRoomId }: ChatRoomProps) => {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputValue, setInputValue] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [roomId, setRoomId] = useState<string | undefined>(initialRoomId);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [roomUsers, setRoomUsers] = useState<RoomUser[]>([]);
    const [typingUsers, setTypingUsers] = useState<Map<string, { name: string, photoURL: string | null }>>(new Map());
    const [chatInfo, setChatInfo] = useState<ChatInfo>({
        title: "New Conversation",
        description: "Start typing to chat with AI and collaborators",
        createdAt: new Date()
    });
    // Add state to track if we're switching rooms
    const [isSwitchingRoom, setIsSwitchingRoom] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const roomCreatedRef = useRef(false);

    // Auto scroll to bottom when messages update
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, typingUsers]);

    // Generate chat title from first message
    useEffect(() => {
        // If we already have a custom title or no messages yet, skip
        if (chatInfo.title !== "New Conversation" || messages.length === 0) return;

        // If we have a user message, use it to create a title
        const firstUserMessage = messages.find(msg => msg.role === "user");
        if (firstUserMessage) {
            // Create a short title from the first message
            let newTitle = firstUserMessage.content.substring(0, 30);
            if (firstUserMessage.content.length > 30) newTitle += "...";

            setChatInfo(prev => ({
                ...prev,
                title: newTitle
            }));
        }
    }, [messages, chatInfo.title]);

    // Initialize socket connection and join/create room
    useEffect(() => {
        const socket = initSocket();

        // Room management logic
        const setupRoom = async () => {
            try {
                // Clear existing state for room switch
                if (isSwitchingRoom) {
                    setMessages([]);
                    setTypingUsers(new Map());
                    setRoomUsers([]);
                    setIsSwitchingRoom(false);
                }

                // Check if we have a roomId from props (URL param)
                if (roomId) {
                    joinRoom(roomId, user);
                    // Store current roomId in localStorage
                    localStorage.setItem('lastRoomId', roomId);
                    roomCreatedRef.current = true;
                } else {
                    // Check if we have a room in localStorage
                    const savedRoomId = localStorage.getItem('lastRoomId');

                    if (savedRoomId && !roomCreatedRef.current) {
                        // Use the saved room
                        setRoomId(savedRoomId);
                        joinRoom(savedRoomId, user);
                        // Update URL without reloading
                        navigate(`/join/${savedRoomId}`, { replace: true });
                        roomCreatedRef.current = true;
                    } else if (!roomCreatedRef.current) {
                        // Create a new room only if we don't have one
                        const newRoomId = await createRoom();
                        setRoomId(newRoomId);
                        joinRoom(newRoomId, user);
                        // Update URL without reloading
                        navigate(`/join/${newRoomId}`, { replace: true });
                        // Store new room in localStorage
                        localStorage.setItem('lastRoomId', newRoomId);
                        roomCreatedRef.current = true;
                    }
                }
            } catch (error) {
                console.error("Error setting up room:", error);
            }
        };

        // Handle socket events
        socket.on('room-history', (data: { roomId: string, messages: SocketChatMessage[], users: RoomUser[], chatInfo?: ChatInfo }) => {
            // Ensure messages are properly sorted by timestamp
            setMessages(data.messages.map(msg => ({
                ...msg,
                timestamp: new Date(msg.timestamp)
            })).sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime()));

            // Ensure unique users by user ID
            const uniqueUsers = data.users.reduce((acc: RoomUser[], user) => {
                if (!acc.some(u => u.id === user.id)) {
                    acc.push(user);
                }
                return acc;
            }, []);

            setRoomUsers(uniqueUsers);

            // If we have chat info from the server, use it
            if (data.chatInfo) {
                setChatInfo({
                    ...data.chatInfo,
                    createdAt: new Date(data.chatInfo.createdAt)
                });
            }
        });

        // Handle new messages
        socket.on('new-message', (message: SocketChatMessage) => {
            setMessages(prev => {
                // Check if this is updating an existing message (like replacing a typing indicator)
                const messageIndex = prev.findIndex(m => m.id === message.id);
                if (messageIndex >= 0) {
                    const newMessages = [...prev];
                    newMessages[messageIndex] = {
                        ...message,
                        timestamp: new Date(message.timestamp)
                    };
                    return newMessages;
                }
                // Otherwise add as a new message and sort by timestamp
                const newTimestamp = new Date(message.timestamp);
                const updatedMessages = [...prev, {
                    ...message,
                    timestamp: newTimestamp
                }];

                // Always ensure proper timestamp-based sorting
                return updatedMessages.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
            });

            // If this was an AI response, we're no longer loading
            if (message.role === 'assistant') {
                setIsLoading(false);
            }
        });

        // Handle AI typing indicator
        socket.on('ai-typing', (message: SocketChatMessage) => {
            setMessages(prev => {
                // Add typing indicator message
                return [...prev, {
                    ...message,
                    timestamp: new Date(message.timestamp)
                }];
            });
        });

        // Handle user typing indicator
        socket.on('typing-indicator', (data: TypingIndicatorType) => {
            console.log('Typing indicator received:', data);
            setTypingUsers(prev => {
                const newMap = new Map(prev);

                // If the user is typing, add them to the map
                if (data.isTyping) {
                    // Find user details from roomUsers
                    const userInfo = roomUsers.find(u => u.id === data.userId);
                    newMap.set(data.userId, {
                        name: data.userName,
                        photoURL: userInfo?.photoURL || null
                    });
                } else {
                    // If the user stopped typing, remove them from the map
                    newMap.delete(data.userId);
                }

                return newMap;
            });
        });

        // Handle user joining
        socket.on('user-joined', (data: { user: RoomUser, users: RoomUser[] }) => {
            // Ensure unique users by user ID
            const uniqueUsers = data.users.reduce((acc: RoomUser[], user) => {
                if (!acc.some(u => u.id === user.id)) {
                    acc.push(user);
                }
                return acc;
            }, []);

            setRoomUsers(uniqueUsers);
        });

        // Handle user leaving
        socket.on('user-left', (data: { userId: string, socketId: string, users: RoomUser[] }) => {
            // Ensure unique users by user ID
            const uniqueUsers = data.users.reduce((acc: RoomUser[], user) => {
                if (!acc.some(u => u.id === user.id)) {
                    acc.push(user);
                }
                return acc;
            }, []);

            setRoomUsers(uniqueUsers);

            // Remove user from typing users if they leave
            setTypingUsers(prev => {
                const newMap = new Map(prev);
                newMap.delete(data.userId);
                return newMap;
            });
        });

        setupRoom();

        // Cleanup on unmount
        return () => {
            socket.off('room-history');
            socket.off('new-message');
            socket.off('ai-typing');
            socket.off('user-joined');
            socket.off('user-left');
            socket.off('typing-indicator');
        };
    }, [user, roomId, navigate]);

    // Add debugging log for typing users
    useEffect(() => {
        console.log('Current typing users:', Array.from(typingUsers.keys()));
    }, [typingUsers]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (inputValue.trim() === "" || isLoading || !roomId) return;

        setInputValue("");
        setIsLoading(true);

        try {
            // Clear typing indicator when sending message
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
            sendStoppedTypingIndicator(roomId);

            // Generate a message ID to track this message
            const messageId = uuidv4();

            // IMPORTANT CHANGE: Don't add message to local state immediately
            // Instead, send the message with its ID and let the socket event handle displaying it

            // Send message via socket with the generated ID
            sendMessage(roomId, inputValue, "user", messageId);

            // Request AI response
            requestAIResponse(roomId, inputValue);
        } catch (error) {
            console.error("Failed to send message:", error);
            setIsLoading(false);
        }
    };

    // Enhanced input change handler with more responsive typing indicator
    const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const value = e.target.value;
        setInputValue(value);

        // Only send typing indicator if we have a value and a roomId
        if (value.trim() && roomId) {
            // Send typing indicator with debouncing
            sendTypingIndicator(roomId);

            // Clear any existing timeout
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }

            // Set timeout to stop typing indicator after 2 seconds of no input
            typingTimeoutRef.current = setTimeout(() => {
                if (roomId) {
                    sendStoppedTypingIndicator(roomId);
                }
                typingTimeoutRef.current = null;
            }, 2000); // Reduced from 3s to 2s for better responsiveness
        } else if (!value.trim() && roomId) {
            // If input is empty, clear typing indicator immediately
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
                typingTimeoutRef.current = null;
            }
            sendStoppedTypingIndicator(roomId);
        }
    };

    const handleNewChat = async () => {
        try {
            // First, clean up current state and prevent showing old messages
            setIsSwitchingRoom(true);
            setMessages([]);
            setTypingUsers(new Map());

            // Reset chat info to default values
            setChatInfo({
                title: "New Conversation",
                description: "Start typing to chat with AI and collaborators",
                createdAt: new Date()
            });

            // Stop tracking the current room
            if (roomId) {
                // Leave current room before creating a new one
                const socket = initSocket();
                socket.emit('leave-room', { roomId });
                console.log(`Left room ${roomId} to create a new chat`);
            }

            // Reset roomId state to null first to ensure we don't fetch old data
            setRoomId(undefined);

            // Create a new room on the backend
            const newRoomId = await createRoom();

            // Important: set roomCreatedRef to true to prevent auto-joining old room
            roomCreatedRef.current = true;

            // Update localStorage with new room ID
            localStorage.setItem('lastRoomId', newRoomId);

            // Set the new room ID
            setRoomId(newRoomId);

            // Navigate to the new room URL
            navigate(`/join/${newRoomId}`, { replace: true });

            console.log(`Created new blank chat with ID: ${newRoomId}`);
        } catch (error) {
            console.error("Failed to create new chat:", error);
            setIsSwitchingRoom(false);
        }
    };

    // Add effect to create a new room if no room ID is available and none in localStorage
    useEffect(() => {
        if (!roomId && !localStorage.getItem('lastRoomId') && !roomCreatedRef.current && user) {
            console.log("No room ID or saved room found, creating a new room");
            handleNewChat();
        }
    }, [roomId, user]);

    // Add handler for switching to another room
    const handleRoomSelect = (newRoomId: string) => {
        if (newRoomId === roomId) return;

        // Set switching room flag to trigger cleanup and reload
        setIsSwitchingRoom(true);

        // Reset room creation flag so we don't create a new room
        roomCreatedRef.current = true;

        // Update localStorage
        localStorage.setItem('lastRoomId', newRoomId);

        // Navigate to the selected room
        navigate(`/join/${newRoomId}`);
    };

    // Format the date for display
    const formatDate = (date: Date) => {
        return date.toLocaleDateString(undefined, {
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    };

    return (
        <div className="flex h-screen bg-gray-900 text-gray-100">
            {/* Sidebar */}
            <div className={`${sidebarOpen ? "w-70" : "w-0 md:w-16"} bg-gray-800 transition-all duration-300 flex flex-col`}>
                <div className="p-4 flex items-center justify-between">
                    <h1 className={`font-bold text-xl ${!sidebarOpen && "md:hidden"}`}>CollabGPT</h1>
                    <Button
                        variant="ghost"
                        size="sm"
                        className="p-1 h-auto"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        <Menu size={18} />
                    </Button>
                </div>

                {/* New Chat Button */}
                <div className="p-3">
                    <Button
                        className="w-full flex items-center justify-start gap-2 bg-gray-700 hover:bg-gray-600"
                        onClick={handleNewChat}
                    >
                        <Plus size={16} />
                        {sidebarOpen && <span>New Chat</span>}
                    </Button>
                </div>

                {/* Current Chat Info */}
                {sidebarOpen && roomId && (
                    <div className="px-3 py-2">
                        <div className="bg-gray-700 rounded-md p-3 mb-3">
                            <h2 className="text-sm font-medium mb-1">{chatInfo.title}</h2>
                            <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs text-gray-400">{formatDate(chatInfo.createdAt)}</span>
                                <span className="text-xs bg-gray-600 text-gray-300 px-1.5 py-0.5 rounded">
                                    {roomUsers.length} {roomUsers.length === 1 ? 'collaborator' : 'collaborators'}
                                </span>
                            </div>

                            {/* Collaborators list */}
                            <div className="mt-2">
                                <UserList users={roomUsers} currentUser={user} />
                            </div>
                        </div>
                    </div>
                )}

                {/* Chat History List */}
                <div className="flex-1 overflow-y-auto p-2">
                    {sidebarOpen && (
                        <ChatHistory
                            user={user}
                            currentRoomId={roomId}
                            onRoomSelect={handleRoomSelect}
                        />
                    )}
                </div>

                {/* User Profile Section */}
                <div className="p-3 border-t border-gray-700">
                    {sidebarOpen ? (
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-2">
                                <UserCircle2 size={24} />
                                <div className="text-sm">
                                    <div className="font-medium truncate max-w-[150px]">
                                        {user?.displayName || 'User'}
                                    </div>
                                    <div className="text-xs text-gray-400 truncate max-w-[150px]">
                                        {user?.email}
                                    </div>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="ghost" size="sm" className="p-1 h-auto">
                                    <Settings size={16} />
                                </Button>
                                <Button variant="ghost" size="sm" className="p-1 h-auto" onClick={onSignOut}>
                                    <LogOut size={16} />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center gap-3">
                            <Button variant="ghost" size="sm" className="p-1 h-auto">
                                <UserCircle2 size={20} />
                            </Button>
                            <Button variant="ghost" size="sm" className="p-1 h-auto">
                                <Settings size={20} />
                            </Button>
                            <Button variant="ghost" size="sm" className="p-1 h-auto" onClick={onSignOut}>
                                <LogOut size={20} />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header with room info and share button */}
                <div className="bg-gray-800 p-3 flex items-center justify-between border-b border-gray-700">
                    <div className="flex items-center gap-2">
                        <Users size={18} />
                        <div>
                            <h2 className="font-medium">{chatInfo.title}</h2>
                            <div className="text-xs text-gray-400">
                                {roomUsers.length} {roomUsers.length === 1 ? 'user' : 'users'} online
                            </div>
                        </div>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="flex gap-2 items-center"
                        onClick={() => setShareDialogOpen(true)}
                    >
                        <Share2 size={16} />
                        <span>Share</span>
                    </Button>
                </div>

                {/* Chat Messages */}
                <div className="flex-1 overflow-y-auto p-4">
                    {messages.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-center p-8">
                            <h2 className="text-2xl font-bold mb-2">Welcome to CollabGPT</h2>
                            <p className="text-gray-400 mb-4">
                                Start a conversation with the AI or collaborate with friends
                            </p>
                            {roomId && (
                                <div className="mb-8 p-3 bg-gray-800 rounded-md">
                                    <p className="text-sm text-gray-300">Share this room: </p>
                                    <code className="text-xs bg-gray-700 p-1 rounded">{`${window.location.origin}/join/${roomId}`}</code>
                                </div>
                            )}
                            <div className="grid grid-cols-2 gap-4 max-w-2xl">
                                {["What can you help me with?", "Explain quantum computing",
                                    "Write a poem about AI", "Give me a coding challenge"].map((prompt, i) => (
                                        <Button
                                            key={i}
                                            variant="outline"
                                            className="p-4 h-auto text-left"
                                            onClick={() => setInputValue(prompt)}
                                        >
                                            {prompt}
                                        </Button>
                                    ))}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={`flex ${message.userId === user?.uid ? "justify-end" : "justify-start"}`}
                                >
                                    <div className="flex items-start gap-2 max-w-3xl">
                                        {message.userId !== user?.uid && (
                                            <div className="flex flex-col items-center mt-1">
                                                {message.userId === "ai" ? (
                                                    <AIAvatar size={32} />
                                                ) : (
                                                    <UserAvatar
                                                        user={{
                                                            photoURL: message.userPhotoURL || null,
                                                            name: message.userName,
                                                            id: message.userId
                                                        }}
                                                        size={32}
                                                    />
                                                )}
                                            </div>
                                        )}
                                        <div
                                            className={`rounded-lg p-4 ${message.userId === user?.uid
                                                ? "bg-blue-700 text-white"
                                                : message.role === "assistant"
                                                    ? "bg-gray-700 text-white"
                                                    : "bg-gray-800 text-white"
                                                }`}
                                        >
                                            {message.userName && message.userId !== user?.uid && (
                                                <div className="text-xs font-medium mb-1 text-gray-300">
                                                    {message.userName}
                                                </div>
                                            )}

                                            {message.isTyping ? (
                                                <div className="flex items-center gap-2 min-h-6">
                                                    <Loader2 className="h-4 w-4 animate-spin" />
                                                    <span>CollabGPT is thinking...</span>
                                                </div>
                                            ) : message.isError ? (
                                                <div className="text-red-300">{message.content}</div>
                                            ) : message.role === "assistant" ? (
                                                <ReactMarkdown
                                                    components={{
                                                        div: ({ node, ...props }) => <div className="prose prose-invert max-w-none" {...props} />
                                                    }}
                                                >
                                                    {message.content}
                                                </ReactMarkdown>
                                            ) : (
                                                <div>{message.content}</div>
                                            )}

                                            <div className="text-xs text-gray-300 mt-2 text-right">
                                                {message.timestamp.toLocaleTimeString()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {/* Typing indicators */}
                            {typingUsers.size > 0 && (
                                <div className="space-y-2 mt-2">
                                    {Array.from(typingUsers.entries())
                                        .filter(([userId]) => userId !== user?.uid) // Don't show typing indicator for current user
                                        .map(([userId, userInfo]) => (
                                            <TypingIndicator
                                                key={`typing-${userId}`}
                                                userName={userInfo.name}
                                                userPhotoURL={userInfo.photoURL}
                                                userId={userId}
                                            />
                                        ))}
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-gray-800">
                    <form onSubmit={handleSubmit} className="relative flex gap-2">
                        <div className="relative w-full">
                            <textarea
                                value={inputValue}
                                onChange={handleInputChange}
                                placeholder="Type your message here..."
                                className="w-full rounded-lg bg-gray-800 border border-gray-700 text-white resize-none min-h-[50px] max-h-[200px] p-4 pr-12 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-lg transition-all"
                                disabled={isLoading}
                                rows={1}
                                style={{ height: 'auto', overflowY: 'hidden' }}
                                onInput={(e) => {
                                    // Auto-resize the textarea based on content, but limit to max height
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    const newHeight = Math.min(target.scrollHeight, 200);
                                    target.style.height = `${newHeight}px`;

                                    // Show scrollbar only when content exceeds max height
                                    target.style.overflowY = target.scrollHeight > 200 ? 'auto' : 'hidden';
                                }}
                                onKeyDown={(e) => {
                                    // Submit on Enter key (unless Shift is pressed for new line)
                                    if (e.key === 'Enter' && !e.shiftKey) {
                                        e.preventDefault();
                                        if (inputValue.trim() !== '') {
                                            handleSubmit(e as any);
                                        }
                                    }
                                }}
                                onBlur={() => {
                                    // Clear typing indicator when input loses focus
                                    if (roomId && typingTimeoutRef.current) {
                                        clearTimeout(typingTimeoutRef.current);
                                        typingTimeoutRef.current = null;
                                        sendStoppedTypingIndicator(roomId);
                                    }
                                }}
                            />
                            <Button
                                type="submit"
                                disabled={inputValue.trim() === "" || isLoading}
                                className="absolute right-7 bottom-5 bg-blue-600 hover:bg-blue-700 flex-shrink-0 rounded-full p-2 h-auto w-auto"
                            >
                                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send size={16} />}
                            </Button>
                        </div>
                    </form>
                    <div className="text-xs text-gray-400 mt-2 text-center">
                        CollabGPT may produce inaccurate information about people, places, or facts.
                    </div>
                </div>
            </div>

            {/* Share Dialog */}
            {roomId && (
                <ShareDialog
                    roomId={roomId}
                    isOpen={shareDialogOpen}
                    onClose={() => setShareDialogOpen(false)}
                />
            )}
        </div>
    );
};

export default ChatRoom;
