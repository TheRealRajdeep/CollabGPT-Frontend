import { User } from "firebase/auth";
import { UserCircle2 } from "lucide-react";
import { useState, useEffect } from "react";

interface UserAvatarProps {
    user: User | null | {
        photoURL: string | null;
        displayName?: string;
        name?: string;
        id?: string;
        uid?: string; // Adding uid to support Firestore user objects
    };
    size?: number;
    className?: string;
}

export function UserAvatar({ user, size = 40, className = "" }: UserAvatarProps) {
    const [imageError, setImageError] = useState(false);
    const [photoUrl, setPhotoUrl] = useState<string | null>(null);

    useEffect(() => {
        if (!user) return;

        // Handle potential security issues with photoURL
        const url = user.photoURL;
        if (!url) return;

        // Only allow certain domains for photos
        const safeDomainsRegex = /^https:\/\/(lh3\.googleusercontent\.com|.*\.firebasestorage\.googleapis\.com|.*\.gravatar\.com)/i;

        if (safeDomainsRegex.test(url)) {
            setPhotoUrl(url);
        } else {
            console.warn("Unsafe photo URL detected:", url);
            setImageError(true);
        }
    }, [user]);

    if (!user) {
        return (
            <div
                className={`bg-gray-700 rounded-full flex items-center justify-center ${className}`}
                style={{ width: size, height: size }}
            >
                <UserCircle2 size={size * 0.7} />
            </div>
        );
    }

    // Get the user's name from various possible properties
    const name = user.displayName || (user as any).name || "User";

    // Get user ID from various possible properties
    const userId = (user as any).id || (user as any).uid || name;

    // Get the user's initials for the fallback
    const initials = name.charAt(0).toUpperCase();

    // Generate a consistent background color based on user ID or name
    const colorIndex = userId.split('').reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0) % 8;
    const bgColors = [
        "bg-blue-600", "bg-green-600", "bg-purple-600", "bg-yellow-600",
        "bg-pink-600", "bg-indigo-600", "bg-red-600", "bg-emerald-600"
    ];
    const bgColor = bgColors[colorIndex];

    if (photoUrl && !imageError) {
        return (
            <div className="relative" style={{ width: size, height: size }}>
                <img
                    src={photoUrl}
                    alt={name}
                    className={`rounded-full object-cover ${className}`}
                    style={{ width: size, height: size }}
                    onError={() => setImageError(true)}
                    loading="lazy"
                />
            </div>
        );
    }

    // Fallback to initials avatar
    return (
        <div
            className={`${bgColor} rounded-full flex items-center justify-center ${className}`}
            style={{ width: size, height: size }}
            title={name}
        >
            <span className="text-white font-medium" style={{ fontSize: size * 0.4 }}>
                {initials}
            </span>
        </div>
    );
}
