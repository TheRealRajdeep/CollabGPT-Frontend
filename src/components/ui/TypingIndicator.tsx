import { cn } from "@/lib/utils";
import { UserAvatar } from "./UserAvatar";

interface TypingIndicatorProps {
    userName: string;
    userPhotoURL?: string | null;
    userId: string;
    className?: string;
}

export function TypingIndicator({ userName, userPhotoURL, userId, className }: TypingIndicatorProps) {
    return (
        <div className={cn("flex items-center gap-2", className)}>
            <UserAvatar
                user={{
                    photoURL: userPhotoURL || null,
                    name: userName,
                    id: userId
                }}
                size={24}
            />
            <div className="bg-gray-800 rounded-full px-3 py-1.5 flex items-center">
                <span className="text-xs text-gray-300 mr-2">{userName} is typing</span>
                <div className="flex space-x-1">
                    {[0, 1, 2].map((dot) => (
                        <div
                            key={dot}
                            className="h-1.5 w-1.5 bg-gray-400 rounded-full animate-bounce"
                            style={{
                                animationDelay: `${dot * 0.15}s`,
                                animationDuration: '0.8s',
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
