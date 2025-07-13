import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Copy, Loader2, QrCode } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import confetti from 'canvas-confetti';
import AffiliateSignupButton from '@/components/affiliate/AffiliateSignupButton';

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedNumbers: number[];
  total: number;
}

const PixPaymentModal: React.FC<PixPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  selectedNumbers,
  total
}) => {
  const [timeLeft, setTimeLeft] = useState(600); // 10 minutos
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'confirmed'>('pending');
  const [isProcessing, setIsProcessing] = useState(false);
  const [pixData, setPixData] = useState<{
    pix_code: string;
    qr_code_image: string;
    payment_id: string;
  } | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();

  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF6347', '#32CD32', '#1E90FF', '#DA70D6']
    });
  };

  // Iniciar countdown e criar pagamento quando modal abrir
  useEffect(() => {
    if (isOpen && paymentStatus === 'pending') {
      setTimeLeft(600); // 10 minutos
      setPixData(null); // Limpar dados anteriores
      
      // Criar pagamento PIX automaticamente
      createPixPayment();
      
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, paymentStatus]);

  // Criar pagamento PIX real
  const createPixPayment = async () => {
    if (!user) return;
    
    setIsProcessing(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: {
          selectedNumbers,
          amount: total
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      if (!data.success) {
        throw new Error(data.error || 'Erro ao criar pagamento');
      }

      // Gerar QR Code a partir do código PIX
      let qrCodeImage = data.payment.qr_code_image;
      if (data.payment.pix_code && !qrCodeImage) {
        try {
          const qrResponse = await supabase.functions.invoke('generate-qr-code', {
            body: { pix_code: data.payment.pix_code }
          });
          
          if (qrResponse.data?.success) {
            qrCodeImage = qrResponse.data.qr_code_url;
          }
        } catch (qrError) {
          console.error('Erro ao gerar QR Code:', qrError);
        }
      }

      setPixData({
        pix_code: data.payment.pix_code,
        qr_code_image: qrCodeImage,
        payment_id: data.payment.id
      });

      // Iniciar polling para verificar status do pagamento
      startPaymentPolling(data.payment.id);

      toast({
        title: "PIX gerado com sucesso! 💳",
        description: "Use o QR Code ou código PIX para pagar",
      });

    } catch (error) {
      console.error('Erro ao criar pagamento PIX:', error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao gerar PIX. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Polling para verificar status do pagamento
  const startPaymentPolling = (paymentId: string) => {
    const pollInterval = setInterval(async () => {
      try {
        const { data, error } = await supabase
          .from('pix_payments')
          .select('status')
          .eq('id', paymentId)
          .single();

        if (error) {
          console.error('Erro ao verificar status:', error);
          return;
        }

        if (data.status === 'paid') {
          clearInterval(pollInterval);
          setPaymentStatus('confirmed');
          triggerConfetti();
          toast({
            title: "Pagamento Confirmado! 🎉",
            description: "Seus números foram reservados com sucesso!",
          });
          
          setTimeout(() => {
            onSuccess();
          }, 2000);
        }
      } catch (error) {
        console.error('Erro no polling:', error);
      }
    }, 3000); // Verificar a cada 3 segundos

    // Limpar polling após 10 minutos (timeout do PIX)
    setTimeout(() => {
      clearInterval(pollInterval);
    }, 10 * 60 * 1000);
  };

  const copyPixCode = () => {
    if (pixData?.pix_code) {
      navigator.clipboard.writeText(pixData.pix_code);
      toast({
        title: "Copiado!",
        description: "Código PIX copiado para a área de transferência",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (paymentStatus === 'confirmed') {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center text-green-600">
              🎉 Pagamento Confirmado!
            </DialogTitle>
          </DialogHeader>
          
          <div className="text-center space-y-4">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
              <span className="text-green-600 text-2xl">✓</span>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold mb-2">Sucesso!</h3>
              <p className="text-muted-foreground">
                Seus números foram reservados e você está participando do sorteio!
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-800 mb-2">Números Reservados:</h4>
              <div className="flex flex-wrap gap-2 justify-center">
                {selectedNumbers.sort((a, b) => a - b).map(number => (
                  <Badge key={number} className="bg-green-600 text-white">
                    {String(number).padStart(3, '0')}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <AffiliateSignupButton />
              
              <Button onClick={onClose} className="w-full">
                Continuar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center">
            Pagamento via PIX
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="bg-primary/10 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="font-medium">Números selecionados:</span>
              <span className="text-sm text-muted-foreground">{selectedNumbers.length} números</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-3">
              {selectedNumbers.sort((a, b) => a - b).map(number => (
                <Badge key={number} variant="secondary">
                  {String(number).padStart(3, '0')}
                </Badge>
              ))}
            </div>
            <div className="flex justify-between items-center text-lg font-bold">
              <span>Total a pagar:</span>
              <span className="text-primary">R$ {total.toFixed(2)}</span>
            </div>
          </div>

          <div className="space-y-6">
            {isProcessing ? (
              <div className="text-center py-8">
                <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-muted-foreground">Gerando PIX...</p>
              </div>
            ) : pixData ? (
              <>
                <div className="text-center">
                  <div className="w-64 h-64 mx-auto mb-4 bg-white rounded-lg p-4 flex items-center justify-center">
                    {pixData.qr_code_image ? (
                      <img 
                        src={pixData.qr_code_image} 
                        alt="QR Code PIX" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <div className="text-muted-foreground">
                        <QrCode className="w-16 h-16 mx-auto mb-2" />
                        QR Code será exibido aqui
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium mb-2">Código PIX (Copia e Cola)</label>
                      <div className="flex">
                        <input
                          type="text"
                          value={pixData.pix_code || "Carregando..."}
                          readOnly
                          className="flex-1 p-3 border rounded-l-lg bg-muted font-mono text-sm"
                        />
                        <Button
                          onClick={copyPixCode}
                          variant="outline"
                          className="rounded-l-none border-l-0"
                          disabled={!pixData.pix_code}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Clock className="w-5 h-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800">Tempo para pagamento</h4>
                      <p className="text-amber-700 text-sm">
                        Este PIX expira em <span className="font-bold">{formatTime(timeLeft)}</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <h4 className="font-medium">Como pagar:</h4>
                  <ol className="text-sm text-muted-foreground space-y-2">
                    <li className="flex items-start">
                      <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">1</span>
                      Abra o app do seu banco
                    </li>
                    <li className="flex items-start">
                      <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">2</span>
                      Escolha a opção PIX
                    </li>
                    <li className="flex items-start">
                      <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">3</span>
                      Escaneie o QR Code ou cole o código PIX
                    </li>
                    <li className="flex items-start">
                      <span className="bg-primary text-white rounded-full w-5 h-5 flex items-center justify-center text-xs mr-3 mt-0.5 flex-shrink-0">4</span>
                      Confirme o pagamento
                    </li>
                  </ol>
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Erro ao gerar PIX. Tente novamente.</p>
              </div>
            )}

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} className="flex-1">
                Cancelar
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PixPaymentModal;