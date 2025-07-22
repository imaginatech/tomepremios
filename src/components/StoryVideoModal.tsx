
import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Play, Pause, Heart, Volume2, VolumeX, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Hls from 'hls.js';
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
  const [showHeart, setShowHeart] = useState(false);
  const [hearts, setHearts] = useState<{ id: number; x: number; y: number }[]>([]);
  const [hlsInstance, setHlsInstance] = useState<Hls | null>(null);

  useEffect(() => {
    if (isOpen && videoRef.current && videoUrl) {
      const video = videoRef.current;
      console.log('🎥 Carregando vídeo:', videoUrl);
      
      setIsLoading(true);
      setHasError(false);
      setIsPlaying(false);
      
      // Limpar HLS anterior se existir
      if (hlsInstance) {
        hlsInstance.destroy();
        setHlsInstance(null);
      }
      
      const setupVideo = async () => {
        try {
          // Configurar vídeo como mutado para permitir autoplay
          video.muted = true;
          video.currentTime = 0;
          
          if (Hls.isSupported()) {
            console.log('✅ HLS suportado, configurando...');
            const hls = new Hls({
              debug: true,
              enableWorker: false,
              startLevel: -1,
              capLevelToPlayerSize: true,
              maxLoadingDelay: 4,
              maxBufferLength: 30,
              maxBufferSize: 60 * 1000 * 1000,
            });
            
            hls.loadSource(videoUrl);
            hls.attachMedia(video);
            setHlsInstance(hls);
            
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              console.log('📊 Manifest HLS carregado com sucesso');
              setIsLoading(false);
              
              // Tentar iniciar o vídeo automaticamente
              video.play().then(() => {
                setIsPlaying(true);
                console.log('▶️ Vídeo iniciado automaticamente (mutado)');
              }).catch(error => {
                console.error('❌ Erro ao iniciar vídeo automaticamente:', error);
                setIsPlaying(false);
              });
            });
            
            hls.on(Hls.Events.ERROR, (event, data) => {
              console.error('❌ Erro HLS:', event, data);
              setIsLoading(false);
              
              if (data.fatal) {
                setHasError(true);
                switch (data.type) {
                  case Hls.ErrorTypes.NETWORK_ERROR:
                    console.error('❌ Erro de rede HLS');
                    // Tentar recuperar
                    hls.startLoad();
                    break;
                  case Hls.ErrorTypes.MEDIA_ERROR:
                    console.error('❌ Erro de mídia HLS');
                    hls.recoverMediaError();
                    break;
                  default:
                    console.error('❌ Erro fatal HLS, destruindo...');
                    hls.destroy();
                    break;
                }
              }
            });
            
            hls.on(Hls.Events.MEDIA_ATTACHED, () => {
              console.log('🔗 Mídia anexada ao HLS');
            });
            
          } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
            console.log('🍎 Safari - usando HLS nativo');
            video.src = videoUrl;
            
            video.addEventListener('loadedmetadata', () => {
              console.log('📊 Metadata carregada (Safari)');
              setIsLoading(false);
              
              video.play().then(() => {
                setIsPlaying(true);
                console.log('▶️ Vídeo iniciado automaticamente (Safari, mutado)');
              }).catch(error => {
                console.error('❌ Erro ao iniciar vídeo (Safari):', error);
                setIsPlaying(false);
              });
            });
            
            video.addEventListener('error', (error) => {
              console.error('❌ Erro no vídeo (Safari):', error);
              setIsLoading(false);
              setHasError(true);
            });
            
          } else {
            console.error('❌ HLS não suportado neste navegador');
            setIsLoading(false);
            setHasError(true);
          }
          
        } catch (error) {
          console.error('❌ Erro ao configurar vídeo:', error);
          setIsLoading(false);
          setHasError(true);
        }
      };

      // Aguardar um frame antes de configurar
      requestAnimationFrame(setupVideo);
    }
    
    return () => {
      if (hlsInstance) {
        hlsInstance.destroy();
        setHlsInstance(null);
      }
    };
  }, [isOpen, videoUrl]);

  const togglePlay = () => {
    if (videoRef.current && !isLoading && !hasError) {
      console.log('🎬 Toggle play - estado atual:', isPlaying);
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(error => {
          console.error('❌ Erro ao reproduzir:', error);
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
      console.log('🔊 Áudio', newMutedState ? 'mutado' : 'desmutado');
    }
  };

  const addHeart = (event: React.MouseEvent) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    
    const newHeart = {
      id: Date.now(),
      x: x,
      y: y,
    };
    
    setHearts(prev => [...prev, newHeart]);
    
    setTimeout(() => {
      setHearts(prev => prev.filter(heart => heart.id !== newHeart.id));
    }, 2000);
  };

  const handleVideoClick = (event: React.MouseEvent) => {
    if (isLoading || hasError) return;
    
    if (event.detail === 2) {
      // Double tap para adicionar coração
      addHeart(event);
      setShowHeart(true);
      setTimeout(() => setShowHeart(false), 500);
    } else {
      // Single tap para toggle play/pause
      setTimeout(() => {
        if (event.detail === 1) {
          togglePlay();
        }
      }, 200);
    }
  };

  const retryLoad = () => {
    setHasError(false);
    setIsLoading(true);
    
    if (videoRef.current) {
      // Forçar reload do componente
      const currentTime = videoRef.current.currentTime;
      videoRef.current.currentTime = 0;
      
      if (hlsInstance) {
        hlsInstance.destroy();
        setHlsInstance(null);
      }
      
      // Recriar o setup
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.currentTime = currentTime;
        }
      }, 100);
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
            onClick={handleVideoClick}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onLoadStart={() => setIsLoading(true)}
            onCanPlay={() => setIsLoading(false)}
            loop
            playsInline
            muted={isMuted}
            controls={false}
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
                <p className="text-lg mb-4">Erro ao carregar o vídeo</p>
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

          {/* Heart button */}
          <Button
            onClick={addHeart}
            variant="ghost"
            size="icon"
            className="absolute bottom-4 right-4 z-40 bg-black/30 hover:bg-black/50 text-white rounded-full"
            disabled={isLoading || hasError}
          >
            <Heart className="w-6 h-6" />
          </Button>

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
