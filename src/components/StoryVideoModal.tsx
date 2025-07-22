
import React, { useRef, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { X, Play, Pause, Volume2, VolumeX, Loader2 } from 'lucide-react';
import * as VisuallyHidden from '@radix-ui/react-visually-hidden';
import Hls from 'hls.js';

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
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const isHlsUrl = (url: string) => url.includes('.m3u8');

  const cleanupHls = () => {
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }
  };

  useEffect(() => {
    if (!isOpen || !videoUrl || !videoRef.current) return;

    const video = videoRef.current;
    console.log('🎥 Carregando vídeo:', videoUrl);
    console.log('🔍 Tipo de vídeo:', isHlsUrl(videoUrl) ? 'HLS' : 'MP4');
    
    setIsLoading(true);
    setHasError(false);
    setErrorMessage('');
    setIsPlaying(false);

    // Cleanup previous HLS instance
    cleanupHls();

    // Reset video
    video.currentTime = 0;
    video.muted = true;

    // Timeout para evitar carregamento infinito
    const loadingTimeout = setTimeout(() => {
      console.log('⏰ Timeout no carregamento do vídeo');
      setIsLoading(false);
      setHasError(true);
      setErrorMessage('Timeout ao carregar o vídeo');
    }, 30000); // 30 segundos

    const handleLoadedData = () => {
      console.log('✅ Vídeo carregado com sucesso');
      clearTimeout(loadingTimeout);
      setIsLoading(false);
      
      // Auto-play when loaded
      video.play().then(() => {
        setIsPlaying(true);
        console.log('▶️ Vídeo iniciado automaticamente');
      }).catch(error => {
        console.log('⚠️ Autoplay bloqueado, aguardando interação do usuário');
        setIsPlaying(false);
      });
    };

    const handleError = (error: any) => {
      console.error('❌ Erro no vídeo:', error);
      clearTimeout(loadingTimeout);
      setIsLoading(false);
      setHasError(true);
      setErrorMessage('Erro ao carregar o vídeo');
    };

    const handleLoadStart = () => {
      console.log('🔄 Iniciando carregamento...');
      setIsLoading(true);
    };

    // Event listeners do vídeo
    video.addEventListener('loadeddata', handleLoadedData);
    video.addEventListener('error', handleError);
    video.addEventListener('loadstart', handleLoadStart);

    if (isHlsUrl(videoUrl)) {
      console.log('🎬 Configurando HLS...');
      
      // Verificar se o navegador suporta HLS nativamente (Safari)
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        console.log('📱 Usando HLS nativo (Safari)');
        video.src = videoUrl;
      } else if (Hls.isSupported()) {
        console.log('🔧 Usando hls.js');
        
        const hls = new Hls({
          debug: false,
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 90,
          maxBufferLength: 30,
          maxMaxBufferLength: 600,
          maxBufferSize: 60 * 1000 * 1000,
          maxBufferHole: 0.5,
          highBufferWatchdogPeriod: 2,
          nudgeOffset: 0.1,
          nudgeMaxRetry: 3,
          maxFragLookUpTolerance: 0.25,
          liveSyncDurationCount: 3,
          liveMaxLatencyDurationCount: 10
        });

        hlsRef.current = hls;

        hls.on(Hls.Events.MEDIA_ATTACHED, () => {
          console.log('📎 HLS anexado ao vídeo');
        });

        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          console.log('📋 Manifest HLS parseado');
        });

        hls.on(Hls.Events.ERROR, (event, data) => {
          console.error('❌ Erro HLS:', data);
          
          if (data.fatal) {
            switch (data.type) {
              case Hls.ErrorTypes.NETWORK_ERROR:
                console.log('🔄 Tentando recuperar erro de rede...');
                hls.startLoad();
                break;
              case Hls.ErrorTypes.MEDIA_ERROR:
                console.log('🔄 Tentando recuperar erro de mídia...');
                hls.recoverMediaError();
                break;
              default:
                console.log('💥 Erro fatal, destruindo HLS');
                hls.destroy();
                handleError(data);
                break;
            }
          }
        });

        hls.attachMedia(video);
        hls.loadSource(videoUrl);
      } else {
        console.error('❌ HLS não suportado neste navegador');
        setIsLoading(false);
        setHasError(true);
        setErrorMessage('HLS não suportado neste navegador');
      }
    } else {
      console.log('🎞️ Carregando vídeo MP4 diretamente');
      video.src = videoUrl;
    }

    return () => {
      clearTimeout(loadingTimeout);
      video.removeEventListener('loadeddata', handleLoadedData);
      video.removeEventListener('error', handleError);
      video.removeEventListener('loadstart', handleLoadStart);
      cleanupHls();
    };
  }, [isOpen, videoUrl]);

  // Cleanup when modal closes
  useEffect(() => {
    if (!isOpen) {
      cleanupHls();
    }
  }, [isOpen]);

  const togglePlay = () => {
    if (videoRef.current && !isLoading && !hasError) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        videoRef.current.play().then(() => {
          setIsPlaying(true);
        }).catch(error => {
          console.error('❌ Erro ao reproduzir:', error);
          setHasError(true);
          setErrorMessage('Erro ao reproduzir o vídeo');
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
    setErrorMessage('');
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
            preload="metadata"
          />

          {/* Loading overlay */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-30">
              <div className="text-center text-white">
                <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4" />
                <p className="text-sm">Carregando vídeo...</p>
                {isHlsUrl(videoUrl) && (
                  <p className="text-xs mt-2 text-gray-300">Configurando streaming HLS</p>
                )}
              </div>
            </div>
          )}

          {/* Error overlay */}
          {hasError && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/70 z-30">
              <div className="text-center text-white p-4">
                <div className="text-6xl mb-4">⚠️</div>
                <p className="text-lg mb-2">Erro ao carregar o vídeo</p>
                {errorMessage && (
                  <p className="text-sm text-gray-300 mb-4">{errorMessage}</p>
                )}
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
