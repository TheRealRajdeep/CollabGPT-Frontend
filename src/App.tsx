import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { signInWithGoogle, signOut, onAuthChanged } from "@/lib/auth";
import type { User } from "firebase/auth";
import LandingPage from "@/pages/LandingPage";
import ChatRoom from "@/pages/ChatRoom";
import { disconnectSocket } from "@/lib/socket";

interface ProtectedRouteProps {
  user: User | null;
  children: React.ReactNode;
}

const ProtectedRoute = ({ user, children }: ProtectedRouteProps) => {
  if (!user) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

// Component to handle joining a specific room
const JoinRoom = ({ user, onSignOut }: { user: User | null, onSignOut: () => Promise<void> }) => {
  const { roomId } = useParams<{ roomId: string }>();

  // Store room ID in localStorage when navigating directly to a room
  useEffect(() => {
    if (roomId) {
      localStorage.setItem('lastRoomId', roomId);
    }
  }, [roomId]);

  // Handle invalid roomId
  if (!roomId) {
    return <Navigate to="/chat" replace />;
  }

  return (
    <ProtectedRoute user={user}>
      <ChatRoom
        user={user}
        onSignOut={onSignOut}
        roomId={roomId}
        key={`room-${roomId}`} // Add a key prop using roomId to force remounting when room changes
      />
    </ProtectedRoute>
  );
};

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Set up auth state listener
    const unsubscribe = onAuthChanged((authUser) => {
      setUser(authUser);
      setIsLoading(false);
      setAuthChecked(true);
    });

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
      disconnectSocket(); // Disconnect socket when app unmounts
    };
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signInWithGoogle();
    } catch (error) {
      console.error("Error signing in with Google:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    try {
      setIsLoading(true);
      await signOut();
      disconnectSocket(); // Disconnect socket on sign out
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            (
              <LandingPage
                user={user}
                isLoading={isLoading}
                onGoogleSignIn={handleGoogleSignIn}
                onSignOut={handleSignOut}
              />
            )
          }
        />
        <Route
          path="/chat"
          element={
            <ProtectedRoute user={user}>
              <ChatRoom user={user} onSignOut={handleSignOut} />
            </ProtectedRoute>
          }
        />
        <Route
          path="/join/:roomId"
          element={<JoinRoom user={user} onSignOut={handleSignOut} />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;