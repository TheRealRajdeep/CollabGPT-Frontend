import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { User } from "firebase/auth";
import { useNavigate } from "react-router-dom";

interface LandingPageProps {
    user: User | null;
    isLoading: boolean;
    onGoogleSignIn: () => Promise<void>;
    onSignOut: () => Promise<void>;
}

function LandingPage({ user, isLoading, onGoogleSignIn, onSignOut }: LandingPageProps) {
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            navigate("/chat");
        }
    }, [user, navigate]);

    return (
        <div className="min-h-screen bg-gray-950 text-white w-full flex">
            {/* Left Section */}
            <div className="p-12 flex-1 flex-col justify-between space-x-2 max-w-2xl">
                {/* Logo */}
                <div className="flex items-center gap-2">
                    <h1 className="font-bold text-3xl">CollabGPT</h1>
                </div>

                {/* Main Content */}
                <div className="mt-50 ml-15">
                    <h1 className="text-[3.5rem] font-bold italic mb-4">
                        AI with Friends
                    </h1>
                    <p className="text-xl italic text-muted-foreground">
                        Privacy-first AI that helps you create in confidence.
                    </p>
                </div>

                {/* Learn More Button */}
            </div>

            {/* Right Section */}
            <div className="flex-1 bg-muted/30 p-12 flex items-center justify-center">
                <div className="w-full max-w-md space-y-6">
                    {user ? (
                        <div className="space-y-4">
                            <div className="bg-white text-black p-4 rounded-md">
                                <p className="font-medium">Signed in as:</p>
                                <p>{user.displayName || 'User'}</p>
                                <p className="text-sm text-gray-500">{user.email}</p>
                            </div>
                            <Button
                                variant="outline"
                                className="w-full h-12 bg-white text-black hover:border-amber-50 text-base font-normal"
                                onClick={onSignOut}
                                disabled={isLoading}
                            >
                                <p className="font-semibold">{isLoading ? "Signing out..." : "Sign out"}</p>
                            </Button>
                        </div>
                    ) : (
                        <>
                            {/* Google Sign In */}
                            <Button
                                variant="outline"
                                className="w-full h-12 bg-white text-black hover:border-amber-50 text-base font-normal"
                                onClick={onGoogleSignIn}
                                disabled={isLoading}
                            >
                                <img
                                    src="https://www.google.com/favicon.ico"
                                    alt="Google"
                                    className="w-5 h-5 mr-2"
                                />
                                <p className="font-semibold">{isLoading ? "Signing in..." : "Continue with Google"}</p>
                            </Button>

                            <div className="flex items-center gap-4">
                                <Separator className="flex-1" />
                                <p className="text-sm p-2 rounded-2xl bg-white text-black font-semibold">OR</p>
                                <Separator className="flex-1" />
                            </div>

                            {/* Email Form */}
                            <div className="space-y-4">
                                <Input
                                    type="email"
                                    placeholder="Enter your personal or work email"
                                    className="h-12"
                                />
                                <Button className="w-full h-12 text-base bg-white text-black">
                                    Continue with email
                                </Button>
                            </div>

                            {/* Terms */}
                            <p className="text-sm text-muted-foreground text-center">
                                By continuing, you agree to our{" "}
                                <a href="#" className="underline hover:text-foreground">
                                    Terms of Service
                                </a>{" "}
                                and{" "}
                                <a href="#" className="underline hover:text-foreground">
                                    Privacy Policy
                                </a>
                                .
                            </p>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

export default LandingPage;
