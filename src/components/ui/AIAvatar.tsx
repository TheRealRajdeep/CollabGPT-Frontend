import { useEffect, useRef, useState } from "react";

interface AIAvatarProps {
    size?: number;
    className?: string;
    videoUrl?: string;
}

export function AIAvatar({
    size = 40,
    className = "",
    videoUrl = "/ai-avatar.mp4" // Default video path
}: AIAvatarProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [needsUserInteraction, setNeedsUserInteraction] = useState(false);
    const [retryCount, setRetryCount] = useState(0);
    const maxRetries = 3;

    useEffect(() => {
        const videoElement = videoRef.current;
        if (!videoElement) return;

        const handleLoaded = () => setIsLoaded(true);
        const handleError = (e: Event) => {
            console.error("Video error:", e);
            setHasError(true);
        };

        videoElement.addEventListener('loadeddata', handleLoaded);
        videoElement.addEventListener('error', handleError);

        // Function to attempt playing with retry logic
        const attemptPlay = async () => {
            try {
                await videoElement.play();
                setNeedsUserInteraction(false);
            } catch (err) {
                console.warn("AI avatar video play error:", err);

                // Handle AbortError specifically (power saving mode or background tab)
                if (err instanceof Error && err.name === "AbortError") {
                    if (retryCount < maxRetries) {
                        setTimeout(() => {
                            setRetryCount(prev => prev + 1);
                            attemptPlay();
                        }, 1000); // Retry after 1 second
                    } else {
                        setNeedsUserInteraction(true);
                    }
                } else {
                    setHasError(true);
                }
            }
        };

        // Initial play attempt
        attemptPlay();

        return () => {
            videoElement.removeEventListener('loadeddata', handleLoaded);
            videoElement.removeEventListener('error', handleError);
        };
    }, [retryCount]);

    // Handle user interaction to play video
    const handleUserInteraction = () => {
        const videoElement = videoRef.current;
        if (videoElement && needsUserInteraction) {
            videoElement.play()
                .then(() => setNeedsUserInteraction(false))
                .catch(() => setHasError(true));
        }
    };

    if (hasError) {
        // Fallback to a static AI icon or avatar
        return (
            <div
                className={`bg-blue-600 rounded-full flex items-center justify-center ${className}`}
                style={{ width: size, height: size }}
            >
                <span className="text-white font-medium" style={{ fontSize: size * 0.4 }}>
                    AI
                </span>
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`relative rounded-full overflow-hidden ${className} ${!isLoaded ? "bg-gray-700" : ""}`}
            style={{ width: size, height: size }}
            onClick={handleUserInteraction}
        >
            <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
            >
                <source src={videoUrl} type="video/mp4" />
                Your browser does not support video tags.
            </video>

            {/* User interaction prompt */}
            {needsUserInteraction && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-800 bg-opacity-80 cursor-pointer">
                    <div className="text-white" style={{ fontSize: Math.max(8, size * 0.2) }}>
                        ▶️
                    </div>
                </div>
            )}

            {/* Loading indicator */}
            {!isLoaded && !needsUserInteraction && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-1/2 h-1/2 border-2 border-t-transparent border-white rounded-full animate-spin" />
                </div>
            )}
        </div>
    );
}
