-- Adicionar campos para vídeos dos ganhadores
ALTER TABLE public.raffles 
ADD COLUMN winner_video_url TEXT,
ADD COLUMN winner_video_title TEXT DEFAULT 'Mensagem do Ganhador';

-- Adicionar comentários para documentar os campos
COMMENT ON COLUMN public.raffles.winner_video_url IS 'URL do vídeo HLS da mensagem do ganhador';
COMMENT ON COLUMN public.raffles.winner_video_title IS 'Título do vídeo da mensagem do ganhador';