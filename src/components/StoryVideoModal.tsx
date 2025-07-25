import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Play, Pause, Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StoryVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title?: string;
}

const StoryVideoModal: React.FC<StoryVideoModalProps> = ({
  isOpen,
  onClose,
  videoUrl,
  title = "Mensagem do Ganhador"
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const heartButtonRef = useRef<HTMLButtonElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showHeart, setShowHeart] = useState(false);
  const [isHeartActive, setIsHeartActive] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  useEffect(() => {
    if (isOpen && videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
      setIsPlaying(true);
    }
  }, [isOpen]);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const addHeart = (event?: React.MouseEvent) => {
    let x = 0;
    let y = 0;
    
    // Se foi clicado no botão, usar a posição do botão
    if (heartButtonRef.current) {
      const rect = heartButtonRef.current.getBoundingClientRect();
      const containerRect = heartButtonRef.current.closest('.relative')?.getBoundingClientRect();
      if (containerRect) {
        x = rect.left - containerRect.left + rect.width / 2;
        y = rect.top - containerRect.top + rect.height / 2;
      }
    }
    
    const newHeart = {
      id: Date.now(),
      x: x,
      y: y,
    };
    
    setHearts(prev => [...prev, newHeart]);
    setIsHeartActive(true);
    
    // Remove heart after animation
    setTimeout(() => {
      setHearts(prev => prev.filter(heart => heart.id !== newHeart.id));
    }, 2000);
  };

  const handleVideoClick = (event: React.MouseEvent) => {
    // Double tap to add heart
    if (event.detail === 2) {
      addHeart(event);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 500);
    } else {
      // Single tap to toggle play/pause
      setTimeout(() => {
        if (event.detail === 1) {
          togglePlay();
        }
      }, 200);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 w-full max-w-sm mx-auto h-[80vh] bg-black border-none">
        <div className="relative w-full h-full overflow-hidden rounded-lg">
          {/* Close button */}
          <Button
            onClick={onClose}
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 z-50 bg-black/50 hover:bg-black/70 text-white rounded-full"
          >
            <X className="w-5 h-5" />
          </Button>

          {/* Title */}
          <div className="absolute top-4 left-4 z-40">
            <h3 className="text-white font-semibold text-lg drop-shadow-lg">
              {title}
            </h3>
          </div>

          {/* Video */}
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full h-full object-cover cursor-pointer"
            onClick={handleVideoClick}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            loop
            playsInline
            muted={false}
          />

          {/* Play/Pause overlay */}
          {!isPlaying && (
            <div 
              className="absolute inset-0 flex items-center justify-center cursor-pointer"
              onClick={togglePlay}
            >
              <div className="bg-black/50 rounded-full p-4 hover:bg-black/70 transition-colors">
                <Play className="w-12 h-12 text-white" />
              </div>
            </div>
          )}

          {/* Heart button */}
          <Button
            ref={heartButtonRef}
            onClick={addHeart}
            variant="ghost"
            size="icon"
            className={cn(
              "absolute bottom-4 right-4 z-40 bg-black/30 hover:bg-black/50 rounded-full transition-colors",
              isHeartActive ? "text-red-500" : "text-white"
            )}
          >
            <Heart className={cn("w-6 h-6", isHeartActive && "fill-red-500")} />
          </Button>

          {/* Controls */}
          <div className="absolute bottom-4 left-4 z-40 flex items-center gap-2">
            <Button
              onClick={togglePlay}
              variant="ghost"
              size="icon"
              className="bg-black/30 hover:bg-black/50 text-white rounded-full"
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </Button>
          </div>

          {/* Floating hearts animation */}
          {hearts.map((heart) => (
            <div
              key={heart.id}
              className="absolute pointer-events-none z-50 animate-pulse"
              style={{
                left: heart.x,
                top: heart.y,
                animation: 'float-up 2s ease-out forwards',
              }}
            >
              <Heart className="w-8 h-8 text-red-500 fill-red-500" />
            </div>
          ))}

          {/* Heart reaction overlay */}
          {showHeart && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
              <Heart className="w-20 h-20 text-red-500 fill-red-500 animate-ping" />
            </div>
          )}
        </div>

        <style>{`
          @keyframes float-up {
            0% {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
            100% {
              opacity: 0;
              transform: translateY(-100px) scale(1.5);
            }
          }
        `}</style>
      </DialogContent>
    </Dialog>
  );
};

export default StoryVideoModal;