import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';

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
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    if (!isOpen || !videoUrl || !videoRef.current) return;

    const video = videoRef.current;
    setIsLoading(true);
    setHasError(false);
    setIsPlaying(false);

    // Reset video
    video.currentTime = 0;
    video.muted = true;

    // Timeout de 10 segundos
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false);
      setHasError(true);
    }, 10000);

    const handleCanPlay = () => {
      clearTimeout(loadingTimeout);
      setIsLoading(false);
      
      // Tentar autoplay
      video.play().then(() => {
        setIsPlaying(true);
      }).catch(() => {
        setIsPlaying(false);
      });
    };

    const handleError = () => {
      clearTimeout(loadingTimeout);
      setIsLoading(false);
      setHasError(true);
    };

    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    
    // Definir fonte diretamente
    video.src = videoUrl;
    video.load();

    return () => {
      clearTimeout(loadingTimeout);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, [isOpen, videoUrl]);

  const togglePlay = () => {
    if (videoRef.current && !isLoading && !hasError) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(() => {
          setHasError(true);
        });
      }
    }
  };

  const toggleMute = () => {
    if (videoRef.current) {
      const newMutedState = !isMuted;
      videoRef.current.muted = newMutedState;
      setIsMuted(newMutedState);
    }
  };

  const retryLoad = () => {
    setHasError(false);
    setIsLoading(true);
    
    if (videoRef.current) {
      videoRef.current.load();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="p-0 w-full max-w-sm mx-auto h-[80vh] bg-black border-none" onInteractOutside={(e) => e.preventDefault()}>
        <VisuallyHidden.Root>
          <DialogTitle>{title}</DialogTitle>
        </VisuallyHidden.Root>
        
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
            className="w-full h-full object-cover cursor-pointer"
            onClick={togglePlay}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            loop
            playsInline
            muted={isMuted}
            controls={false}
            preload="auto"
          />

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-30">
              <div className="text-center text-white">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
                <p className="text-sm">Carregando vídeo...</p>
              </div>
            </div>
          )}

          {/* Error overlay */}
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-30">
              <div className="text-center text-white p-4">
                <div className="text-6xl mb-4">⚠️</div>
                <p className="text-lg mb-2">Erro ao carregar o vídeo</p>
                <Button 
                  onClick={retryLoad}
                  className="bg-white text-black hover:bg-gray-200"
                >
                  Tentar Novamente
                </Button>
              </div>
            </div>
          )}

          {/* Play/Pause overlay */}
          {!isPlaying && !isLoading && !hasError && (
            <div 
              className="absolute inset-0 flex items-center justify-center cursor-pointer z-30"
              onClick={togglePlay}
            >
              <div className="bg-black/50 rounded-full p-4 hover:bg-black/70 transition-colors">
                <Play className="w-12 h-12 text-white" fill="white" />
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="absolute bottom-4 left-4 z-40 flex items-center gap-2">
            <Button
              onClick={togglePlay}
              variant="ghost"
              size="icon"
              className="bg-black/30 hover:bg-black/50 text-white rounded-full"
              disabled={isLoading || hasError}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </Button>
            
            <Button
              onClick={toggleMute}
              variant="ghost"
              size="icon"
              className="bg-black/30 hover:bg-black/50 text-white rounded-full"
              disabled={isLoading || hasError}
            >
              {isMuted ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default StoryVideoModal;