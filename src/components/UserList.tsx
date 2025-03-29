import { UserAvatar } from "@/components/ui/UserAvatar";
import { type RoomUser } from "@/lib/socket";
import { User } from "firebase/auth";
import { memo } from "react";

interface UserListProps {
    users: RoomUser[];
    currentUser: User | null;
}

// Using memo to prevent unnecessary rerenders
const UserList = memo(function UserList({ users, currentUser }: UserListProps) {
    // Filter out duplicate users by keeping only one instance of each user ID
    const uniqueUsers = users.reduce((acc: RoomUser[], user) => {
        // Check if we already have this user in our accumulator
        if (!acc.some(u => u.id === user.id)) {
            acc.push(user);
        }
        return acc;
    }, []);

    return (
        <div className="bg-gray-800/50 rounded-md">
            <h3 className="text-xs font-medium mb-1 text-gray-300">Collaborators</h3>
            <div className="flex flex-wrap gap-2">
                {uniqueUsers.map((user) => (
                    <div
                        key={`user-${user.id}`}
                        className={`flex items-center gap-1.5 bg-gray-700/50 rounded-full px-2 py-1 ${user.id === currentUser?.uid ? "ring-1 ring-blue-500" : ""
                            }`}
                        title={user.name}
                    >
                        <UserAvatar
                            user={user}
                            size={20}
                        />
                        <span className="text-xs max-w-[80px] truncate">
                            {user.id === currentUser?.uid ? 'You' : user.name}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
});

export default UserList;
