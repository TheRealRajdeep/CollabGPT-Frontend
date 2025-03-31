import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { User } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { SparkleEffect } from "@/components/ui/SparkleEffect";
import AboutMeModal from "@/components/ui/AboutMeModal";

interface LandingPageProps {
    user: User | null;
    isLoading: boolean;
    onGoogleSignIn: () => Promise<void>;
    onSignOut: () => Promise<void>;
}

function LandingPage({ user, isLoading, onGoogleSignIn, onSignOut }: LandingPageProps) {
    const navigate = useNavigate();
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);
    const [showAboutCard, setShowAboutCard] = useState(false);
    const words = ["Friends", "Family", "Colleagues"];

    useEffect(() => {
        if (user) {
            navigate("/chat");
        }
    }, [user, navigate]);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsAnimating(true);
            setTimeout(() => {
                setCurrentWordIndex((prev) => (prev + 1) % words.length);
                setIsAnimating(false);
            }, 500); // Half of the animation duration
        }, 3000); // Change word every 3 seconds

        return () => clearInterval(interval);
    }, []);

    const toggleAboutCard = () => {
        setShowAboutCard(prev => !prev);
    };

    return (
        <div className="min-h-screen bg-gray-950 text-white w-full flex">
            {/* Left Section */}
            <div className="p-12 flex-1 flex flex-col justify-between max-w-2xl">
                {/* Logo */}
                <div className="flex items-center gap-2 mb-12">
                    <video
                        className="h-10 w-10 rounded-full object-cover border-2 border-gray-400 shadow-lg"
                        autoPlay
                        loop
                        muted
                        playsInline
                    >
                        <source src="/ai-avatar.mp4" type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                    <h1 className="font-bold text-3xl">CollabGPT</h1>
                </div>

                {/* Main Content */}
                <div className="flex-grow flex flex-col justify-center mb-15 ml-10">
                    <img src="/ghibli-art.png" alt="Ghibli Art" className="absolute top-0 left-0 w-full h-full object-cover opacity-10 z-0" />
                    <div className="z-5">
                        <h1 className="text-[3.5rem] font-bold italic mb-4">
                            AI with{" "}
                            <span className={`inline-block relative ${isAnimating ? 'opacity-0 transform -translate-y-4 transition-all duration-500' : 'opacity-100 transform translate-y-0 transition-all duration-500'}`}>
                                {words[currentWordIndex]}
                            </span>
                        </h1>
                        <p className="text-xl italic text-muted-foreground">
                            A Collaborative AI experience for you and your loved ones 💖
                        </p>
                    </div>
                </div>

                {/* Optional footer content for the left section */}
                <div className="mt-8 z-5">
                    <Button
                        variant="ghost"
                        onClick={toggleAboutCard}
                        className="text-gray-400 hover:text-white"
                    >
                        About Me
                    </Button>
                </div>
            </div>

            {/* Right Section */}
            <div className="flex-1 bg-muted/30 p-12 flex flex-col justify-between">
                {/* Empty space to align with logo */}
                <div className="h-10"></div>

                {/* Auth content - centered vertically */}
                <div className="flex-grow mb-10 flex items-center justify-center">
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
                                <div className="relative pt-5">
                                    <SparkleEffect isActive={isLoading} count={12} />
                                    <Button
                                        variant="outline"
                                        className={`w-full h-12 bg-white text-black hover:border-amber-50 text-base font-normal ${isLoading ? 'animate-pulse' : ''}`}
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
                                </div>

                                {/* <div className="flex items-center gap-4">
                                    <Separator className="flex-1" />
                                    <p className="text-sm p-2 rounded-2xl bg-white text-black font-semibold">OR</p>
                                    <Separator className="flex-1" />
                                </div> */}

                                {/* Email Form
                                <div className="space-y-4">
                                    <Input
                                        type="email"
                                        placeholder="Enter your personal or work email"
                                        className="h-12"
                                    />
                                    <Button className="w-full h-12 text-base bg-white text-black">
                                        Continue with email
                                    </Button>
                                </div> */}

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

                {/* Empty footer space to match left section */}
                <div className="h-8"></div>
            </div>

            {/* About Me Modal Component */}
            <AboutMeModal isOpen={showAboutCard} onClose={toggleAboutCard} />
        </div>
    );
}

export default LandingPage;
