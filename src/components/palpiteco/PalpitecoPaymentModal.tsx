
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Clock, Copy, Loader2, QrCode } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import confetti from 'canvas-confetti';
import QRCode from 'qrcode';

interface PalpitecoPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  pollId: string;
  pollTitle: string;
  selectedOption: number;
  optionLabel: string;
  entryPrice: number;
}

const PalpitecoPaymentModal: React.FC<PalpitecoPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  pollId,
  pollTitle,
  selectedOption,
  optionLabel,
  entryPrice,
}) => {
  const [timeLeft, setTimeLeft] = useState(600);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'confirmed'>('pending');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixData, setPixData] = useState<{ pix_code: string; payment_id: string } | null>(null);
  const [generatedQrCode, setGeneratedQrCode] = useState<string | null>(null);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && paymentStatus === 'pending') {
      setTimeLeft(600);
      setPixData(null);
      setGeneratedQrCode(null);
      createPayment();

      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) { clearInterval(timer); return 0; }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isOpen, paymentStatus]);

  useEffect(() => {
    if (pixData?.pix_code) {
      QRCode.toDataURL(pixData.pix_code).then(setGeneratedQrCode).catch(console.error);
    }
  }, [pixData]);

  const createPayment = async () => {
    if (!user) return;
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-palpiteco-payment', {
        body: { poll_id: pollId, selected_option: selectedOption, amount: entryPrice }
      });
      if (error) throw new Error(error.message);
      if (!data.success) throw new Error(data.error || 'Erro ao criar pagamento');

      setPixData({ pix_code: data.payment.pix_code, payment_id: data.payment.id });
      startPolling(data.payment.id);

      toast({ title: "PIX gerado! 💳", description: "Use o QR Code ou código PIX para pagar" });
    } catch (error) {
      console.error('Erro ao criar pagamento:', error);
      toast({ title: "Erro", description: error instanceof Error ? error.message : "Erro ao gerar PIX.", variant: "destructive" });
    } finally {
      setIsProcessing(false);
    }
  };

  const startPolling = (paymentId: string) => {
    const interval = setInterval(async () => {
      try {
        const { data } = await supabase.from('pix_payments').select('status').eq('id', paymentId).single();
        if (data?.status === 'paid') {
          clearInterval(interval);
          setPaymentStatus('confirmed');
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          toast({ title: "Pagamento Confirmado! 🎉", description: "Seu palpite foi registrado!" });
          setTimeout(onSuccess, 2000);
        }
      } catch (e) { console.error(e); }
    }, 3000);
    setTimeout(() => clearInterval(interval), 10 * 60 * 1000);
  };

  const copyPixCode = () => {
    if (pixData?.pix_code) {
      navigator.clipboard.writeText(pixData.pix_code);
      toast({ title: "Copiado!", description: "Código PIX copiado" });
    }
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  if (paymentStatus === 'confirmed') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-primary">🎉 Palpite Registrado!</DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mx-auto">
              <span className="text-primary text-2xl">✓</span>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-2">Sucesso!</h3>
              <p className="text-muted-foreground text-sm">Seu palpite "<strong>{optionLabel}</strong>" foi registrado para:</p>
              <p className="font-medium mt-1">{pollTitle}</p>
            </div>
            <Button onClick={onClose} className="w-full">Continuar</Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center">Pagamento via PIX</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-primary/10 rounded-lg p-4">
            <p className="text-sm text-muted-foreground mb-1">Enquete:</p>
            <p className="font-medium text-sm mb-2">{pollTitle}</p>
            <p className="text-sm text-muted-foreground mb-1">Seu palpite:</p>
            <p className="font-medium text-sm mb-3">{optionLabel}</p>
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total:</span>
              <span className="text-primary">R$ {entryPrice.toFixed(2).replace('.', ',')}</span>
            </div>
          </div>

          {isProcessing ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-muted-foreground">Gerando PIX...</p>
            </div>
          ) : pixData ? (
            <>
              <div className="text-center">
                <div className="w-56 h-56 mx-auto mb-4 bg-white rounded-lg p-3 flex items-center justify-center">
                  {generatedQrCode ? (
                    <img src={generatedQrCode} alt="QR Code PIX" className="w-full h-full object-contain" />
                  ) : (
                    <QrCode className="w-16 h-16 text-muted-foreground" />
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Código PIX (Copia e Cola)</label>
                  <div className="flex">
                    <input type="text" value={pixData.pix_code} readOnly className="flex-1 p-3 border rounded-l-lg bg-muted font-mono text-xs" />
                    <Button onClick={copyPixCode} variant="outline" className="rounded-l-none border-l-0">
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-destructive" />
                  <span className="text-sm text-destructive">Expira em <strong>{formatTime(timeLeft)}</strong></span>
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Erro ao gerar PIX. Tente novamente.</p>
            </div>
          )}
          <Button variant="outline" onClick={onClose} className="w-full">Cancelar</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PalpitecoPaymentModal;
