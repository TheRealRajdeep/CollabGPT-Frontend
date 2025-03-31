import { cn } from "@/lib/utils";

interface SparkleEffectProps {
    className?: string;
    isActive?: boolean;
    count?: number;
    colors?: string[];
    minSize?: number;
    maxSize?: number;
    duration?: number;
}

export function SparkleEffect({
    className,
    isActive = false,
    count = 15,
    colors = ["#4F8EF7", "#64DFDF", "#80FFDB", "#FFFFFF", "#7B61FF"],
    minSize = 3,
    maxSize = 6,
}: SparkleEffectProps) {
    if (!isActive) return null;

    // Generate star-like sparkles
    const renderSparkles = () => {
        return Array.from({ length: count }).map((_, i) => {
            const size = Math.random() * (maxSize - minSize) + minSize;
            const left = Math.random() * 100; // Random horizontal position
            const top = Math.random() * 100; // Random vertical position
            const colorIndex = Math.floor(Math.random() * colors.length);
            const delay = Math.random() * 1.5;
            const duration = 1 + Math.random() * 1;

            // Choose between star or circle shape
            const isStarShape = Math.random() > 0.5;

            return (
                <span
                    key={i}
                    className={isStarShape ? "ai-star" : "ai-particle"}
                    style={{
                        position: "absolute",
                        width: `${size}px`,
                        height: `${size}px`,
                        left: `${left}%`,
                        top: `${top}%`,
                        backgroundColor: isStarShape ? "transparent" : colors[colorIndex],
                        boxShadow: isStarShape ? `0 0 ${size / 2}px ${colors[colorIndex]}` : "none",
                        opacity: 0,
                        borderRadius: "50%",
                        animation: isStarShape
                            ? `aiStar ${duration}s ease-in-out infinite`
                            : `aiParticle ${duration}s ease-in-out infinite`,
                        animationDelay: `${delay}s`,
                    }}
                />
            );
        });
    };

    return (
        <div className={cn("absolute inset-0 overflow-hidden pointer-events-none", className)}>
            {renderSparkles()}
            <style dangerouslySetInnerHTML={{
                __html: `
        @keyframes aiStar {
          0%, 100% { transform: scale(0.1); opacity: 0; }
          25% { transform: scale(1); opacity: 1; }
          50% { transform: scale(0.85); opacity: 0.8; }
          75% { transform: scale(1.1); opacity: 0.9; }
        }
        
        @keyframes aiParticle {
          0% { transform: translateY(0) scale(0); opacity: 0; }
          20% { transform: translateY(-10px) scale(1); opacity: 1; }
          50% { opacity: 0.6; }
          100% { transform: translateY(-20px) scale(0); opacity: 0; }
        }

        .ai-star {
          clip-path: polygon(
            50% 0%, 
            61% 35%, 
            98% 35%, 
            68% 57%, 
            79% 91%, 
            50% 70%, 
            21% 91%, 
            32% 57%, 
            2% 35%, 
            39% 35%
          );
        }
      ` }}></style>
        </div>
    );
}
