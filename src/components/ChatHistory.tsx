import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { getUserChatRooms, type ChatRoom } from "@/lib/chats";
import { MessageSquare, Loader2, MoreVertical, Trash2 } from "lucide-react";
import { Button } from "./ui/button";
import { useNavigate } from "react-router-dom";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "./ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "./ui/alert-dialog";
import { createRoom, deleteUserChat } from "@/lib/socket";

interface ChatHistoryProps {
    user: User | null;
    currentRoomId?: string;
    onRoomSelect?: (roomId: string) => void;
}

export default function ChatHistory({ user, currentRoomId, onRoomSelect }: ChatHistoryProps) {
    const [rooms, setRooms] = useState<ChatRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [roomToDelete, setRoomToDelete] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const navigate = useNavigate();

    // Function to load rooms - extracted for reuse
    const loadRooms = async () => {
        if (!user) {
            setLoading(false);
            return;
        }

        setLoading(true);
        setError(null);
        try {
            const userRooms = await getUserChatRooms(user);
            setRooms(userRooms);
        } catch (err) {
            console.error("Error loading chat history:", err);
            setError("Failed to load chat history");
        } finally {
            setLoading(false);
        }
    };

    // Initial load of chat history
    useEffect(() => {
        loadRooms();

        // Refresh chat history every 30 seconds
        const interval = setInterval(loadRooms, 30000);
        return () => clearInterval(interval);
    }, [user]);

    // Reload when current room changes
    useEffect(() => {
        // When room changes, reload the history to ensure it's up to date
        if (currentRoomId) {
            // Short delay to ensure Firestore has the latest data
            const timer = setTimeout(loadRooms, 500);
            return () => clearTimeout(timer);
        }
    }, [currentRoomId]);

    const handleRoomSelect = (roomId: string) => {
        if (onRoomSelect) {
            onRoomSelect(roomId);
        } else {
            navigate(`/join/${roomId}`);
        }
    };

    const handleDeleteRoom = async () => {
        if (!roomToDelete || !user) return;

        try {
            setIsDeleting(true);
            console.log(`Attempting to delete chat ${roomToDelete} for user ${user.uid}`);

            // Force remove from UI state immediately for responsive UX
            const filteredRooms = rooms.filter(room => room.id !== roomToDelete);
            setRooms(filteredRooms);

            // Preemptively navigate if it's the current room
            if (roomToDelete === currentRoomId) {
                console.log(`Navigating away from deleted room ${roomToDelete}`);
                navigate('/chat');
            }

            // Prepare for auto-creating a new chat if this was the last one
            const isLastChat = rooms.length === 1;

            // Now try the API call (but UI is already updated)
            let success = false;
            try {
                // deleteUserChat will also emit the leave-room event before deleting
                success = await deleteUserChat(user.uid, roomToDelete);
                console.log(`Delete API call result:`, success);
            } catch (apiError) {
                console.error("API error during deletion:", apiError);

                // Even if the API fails, we'll implement a fallback local deletion
                // by manually removing from localStorage as well
                try {
                    // Remove from localStorage cache if present
                    const cachedRooms = localStorage.getItem(`chat_rooms_${user.uid}`);
                    if (cachedRooms) {
                        const parsedRooms = JSON.parse(cachedRooms);
                        const updatedRooms = parsedRooms.filter((room: any) => room.id !== roomToDelete);
                        localStorage.setItem(`chat_rooms_${user.uid}`, JSON.stringify(updatedRooms));
                        console.log("Removed chat from localStorage cache");
                    }
                } catch (localError) {
                    console.error("Failed local cache cleanup:", localError);
                }
            }

            // If this was the last chat, create a new one automatically
            if (isLastChat) {
                try {
                    console.log("Creating new chat after deleting the last one");
                    const newRoomId = await createRoom();

                    // Minor delay to allow backend to set up the room
                    await new Promise(resolve => setTimeout(resolve, 500));

                    // Navigate to the new room
                    navigate(`/join/${newRoomId}`);
                    console.log(`Created and navigating to new room: ${newRoomId}`);
                } catch (createError) {
                    console.error("Failed to create new room after deleting the last one:", createError);
                    // Force reload the page as last resort
                    window.location.href = '/chat';
                }
            }

            // Close the dialog
            setDeleteDialogOpen(false);
            setRoomToDelete(null);
        } catch (error) {
            console.error("Failed to delete chat:", error);
            // Show an error state or message to the user
            setError(`Failed to delete chat: ${error instanceof Error ? error.message : 'Unknown error'}`);

            // Force reload to get fresh data
            setTimeout(() => {
                loadRooms();
            }, 1000);

            // Close the dialog even on error
            setDeleteDialogOpen(false);
            setRoomToDelete(null);
        } finally {
            setIsDeleting(false);
        }
    };

    // Format date for display
    // const formatDate = (date: Date) => {
    //     const today = new Date();
    //     const yesterday = new Date(today);
    //     yesterday.setDate(yesterday.getDate() - 1);

    //     if (date.toDateString() === today.toDateString()) {
    //         return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    //     } else if (date.toDateString() === yesterday.toDateString()) {
    //         return 'Yesterday';
    //     } else {
    //         return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    //     }
    // };

    if (loading) {
        return (
            <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-4">
                <p className="text-sm text-red-400">{error}</p>
                <Button
                    variant="ghost"
                    size="sm"
                    className="mt-2"
                    onClick={loadRooms}
                >
                    Retry
                </Button>
            </div>
        );
    }

    if (rooms.length === 0) {
        return (
            <div className="text-center py-4">
                <p className="text-sm text-gray-400">No previous chats</p>
            </div>
        );
    }

    return (
        <>
            <div className="space-y-1">
                <div className="text-xs text-gray-400 px-2 pt-2 pb-1">Recent Chats</div>
                {rooms.map((room) => (
                    <div
                        key={room.id}
                        className={`flex items-center w-full ${room.id === currentRoomId ? "bg-gray-700" : "hover:bg-gray-700/50"}`}
                    >
                        {/* Chat item button - Make sure it doesn't take full width to leave space for dropdown */}
                        <Button
                            variant="ghost"
                            className="flex-1 flex items-center justify-between gap-2 text-left h-auto py-2 px-3 max-w-[calc(100%-44px)]"
                            onClick={() => handleRoomSelect(room.id)}
                        >
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <MessageSquare size={16} />
                                <div className="flex flex-col overflow-hidden">
                                    <span className="truncate font-medium">{room.title}</span>
                                </div>
                            </div>
                        </Button>

                        {/* Options button - Fixed width, always accessible */}
                        <div className="flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 w-10 p-0"
                                    >
                                        <MoreVertical size={16} />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 bg-gray-800 border-gray-700">
                                    <DropdownMenuItem
                                        className="text-red-400 focus:text-red-400 focus:bg-gray-700 cursor-pointer"
                                        onClick={() => {
                                            setRoomToDelete(room.id);
                                            setDeleteDialogOpen(true);
                                        }}
                                    >
                                        <Trash2 size={16} className="mr-2" />
                                        Delete Chat
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </div>
                ))}
            </div>

            {/* Confirmation Dialog */}
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="bg-gray-900 border-gray-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-white">Delete Chat</AlertDialogTitle>
                        <AlertDialogDescription className="text-gray-300">
                            This will remove the chat from your history.
                            Other participants will still have access to this conversation.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel
                            className="bg-gray-800 text-white hover:bg-gray-700 border-gray-700"
                            disabled={isDeleting}
                        >
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-red-600 hover:bg-red-700 text-white"
                            onClick={(e) => {
                                e.preventDefault();
                                handleDeleteRoom();
                            }}
                            disabled={isDeleting}
                        >
                            {isDeleting ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Deleting...
                                </>
                            ) : (
                                "Delete"
                            )}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
