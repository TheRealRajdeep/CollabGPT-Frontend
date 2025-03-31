import React from 'react';

const MobileBlocker: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6 text-center">
            <div className="w-20 h-20 mb-6 relative">
                <div className="absolute inset-0 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                        <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                </div>
            </div>

            <h1 className="text-2xl font-bold mb-4">Desktop Only</h1>

            <p className="mb-6 max-w-md">
                CollabGPT is optimized for desktop use only. Please access this application from a desktop or laptop computer.
            </p>

            <div className="p-4 bg-gray-800 rounded-md max-w-md">
                <p className="text-gray-400 text-sm">
                    Our collaborative features require a larger screen size for the best experience. Thank you for understanding.
                </p>
            </div>
        </div>
    );
};

export default MobileBlocker;
