import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Copy, Check, Users } from 'lucide-react';

interface ShareDialogProps {
    roomId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function ShareDialog({ roomId, isOpen, onClose }: ShareDialogProps) {
    const [copied, setCopied] = useState(false);
    const shareUrl = `${window.location.origin}/join/${roomId}`;

    const copyToClipboard = async () => {
        try {
            await navigator.clipboard.writeText(shareUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Failed to copy text: ', err);
        }
    };

    return (
        <Dialog.Root open={isOpen} onOpenChange={onClose}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" />
                <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-lg bg-gray-900 border border-gray-800 p-6 shadow-lg">
                    <Dialog.Title className="text-xl font-semibold text-white mb-4">
                        Share Chat
                    </Dialog.Title>

                    <div className="space-y-4">
                        <p className="text-gray-300 text-sm">
                            Anyone with the link can join this chat. They will need to sign in first.
                        </p>

                        <div className="flex items-center gap-2">
                            <Input
                                value={shareUrl}
                                readOnly
                                className="bg-gray-800 border-gray-700 text-white"
                            />
                            <Button onClick={copyToClipboard} className="w-10 h-10 p-0 flex text-white border-1 items-center justify-center">
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                            </Button>
                        </div>

                        <div className="py-2">
                            <div className="flex items-center gap-2 mb-2 text-gray-300">
                                <Users size={16} />
                                <span className="text-sm font-medium">Room ID</span>
                            </div>
                            <div className="bg-gray-800 p-2 rounded border border-gray-700">
                                <code className="text-white text-xs">{roomId}</code>
                            </div>
                        </div>
                    </div>

                    <div className="border-white text-white mt-6 flex justify-end">
                        <Button variant="outline" onClick={onClose}>
                            Close
                        </Button>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}
