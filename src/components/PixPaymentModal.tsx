import React, { useState, useEffect } from 'react';
import { QrCode, Copy, CheckCircle, Clock, DollarSign, Gift } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import confetti from 'canvas-confetti';
import AffiliateSignupButton from '@/components/affiliate/AffiliateSignupButton';

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedNumbers: number[];
  total: number;
}

const PixPaymentModal = ({ isOpen, onClose, onSuccess, selectedNumbers, total }: PixPaymentModalProps) => {
  const [countdown, setCountdown] = useState(600); // 10 minutos
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'processing' | 'confirmed'>('pending');
  const [isProcessing, setIsProcessing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  // PIX code de demonstração
  const pixCode = "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000520400005303986540525.005802BR5925PIX DA SORTE DEMONSTRACAO6008SAO PAULO62070503***6304";

  useEffect(() => {
    if (!isOpen || paymentStatus === 'confirmed') return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onClose();
          toast({
            title: "Tempo esgotado",
            description: "O tempo para pagamento expirou. Tente novamente.",
            variant: "destructive",
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, onClose, toast, paymentStatus]);

  // Função para trigger do confete
  const triggerConfetti = () => {
    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

    function randomInRange(min: number, max: number) {
      return Math.random() * (max - min) + min;
    }

    const interval: any = setInterval(function() {
      const timeLeft = animationEnd - Date.now();

      if (timeLeft <= 0) {
        return clearInterval(interval);
      }

      const particleCount = 50 * (timeLeft / duration);
      
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
      });
      confetti({
        ...defaults,
        particleCount,
        origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
      });
    }, 250);
  };

  // Função para processar pagamento demo
  const handleDemoPayment = async () => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setPaymentStatus('processing');
    
    toast({
      title: "Processando pagamento...",
      description: "Aguarde 5 segundos para confirmação",
    });

    // Aguardar 5 segundos e processar
    setTimeout(async () => {
      try {
        const { data, error } = await supabase.rpc('reserve_numbers', {
          p_user_id: user.id,
          p_numbers: selectedNumbers
        });

        if (error) {
          throw error;
        }

        setPaymentStatus('confirmed');
        
        // Trigger confetti
        triggerConfetti();
        
        toast({
          title: "Pagamento confirmado! 🎉",
          description: "Seus números foram reservados com sucesso!",
        });

        // onSuccess(); // Removido para manter o modal aberto
      } catch (error: any) {
        console.error('Erro ao reservar números:', error);
        setPaymentStatus('pending');
        toast({
          title: "Erro no pagamento",
          description: error.message || "Tente novamente",
          variant: "destructive",
        });
      } finally {
        setIsProcessing(false);
      }
    }, 5000);
  };

  const copyPixCode = () => {
    navigator.clipboard.writeText(pixCode);
    toast({
      title: "Código PIX copiado!",
      description: "Cole o código no seu app de pagamentos",
    });
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
            <DialogTitle className="text-center text-2xl font-bold">
              🎉 Pagamento Confirmado!
            </DialogTitle>
            <DialogDescription className="text-center">
              Seus números foram reservados com sucesso!
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <div className="flex items-center gap-2 text-green-700 dark:text-green-300 mb-2">
                <CheckCircle className="w-5 h-5" />
                <span className="font-medium">Participação confirmada!</span>
              </div>
              <p className="text-sm text-green-600 dark:text-green-400">
                Você está concorrendo com os números: {selectedNumbers.join(', ')}
              </p>
            </div>
            
            {/* Botão para se tornar afiliado */}
            <div className="space-y-3">
              <div className="text-center">
                <p className="text-sm font-medium text-foreground mb-2">
                  💰 Quer ganhar números bônus?
                </p>
                <p className="text-xs text-muted-foreground mb-3">
                  Torne-se um afiliado e ganhe números gratuitos para o próximo sorteio a cada indicação que fizer uma compra!
                </p>
              </div>
              <AffiliateSignupButton 
                onSuccess={(code) => {
                  toast({
                    title: "🎉 Agora você é um afiliado!",
                    description: `Compartilhe seu código ${code} e ganhe números bônus!`,
                  });
                }}
              />
            </div>
            
            <div className="text-center">
              <p className="text-sm text-muted-foreground">
                Boa sorte no sorteio! 🍀
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md mx-4 sm:mx-auto max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-center text-lg sm:text-xl">
            {paymentStatus === 'processing' ? 'Processando Pagamento' : 'Pagamento via PIX'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6 px-2 sm:px-0">
          {/* Timer */}
          <div className="text-center">
            <div className="inline-flex items-center bg-orange-100 text-orange-800 px-3 py-2 rounded-lg">
              <Clock className="w-4 h-4 mr-2" />
              <span className="font-mono text-base sm:text-lg">{formatTime(countdown)}</span>
            </div>
            <p className="text-xs sm:text-sm text-muted-foreground mt-2">
              Tempo restante para pagamento
            </p>
          </div>

          {/* Resumo do pedido */}
          <Card className="p-4 bg-muted/50">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>Quantidade:</span>
                <span className="font-semibold">{selectedNumbers.length} título{selectedNumbers.length > 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between">
                <span>Valor unitário:</span>
                <span>R$ 5,00</span>
              </div>
              <div className="border-t pt-2 flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span className="text-primary">R$ {total.toFixed(2)}</span>
              </div>
            </div>
          </Card>

          {paymentStatus === 'processing' ? (
            <div className="text-center py-8">
              <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
              <h3 className="text-lg font-semibold mb-2">Processando pagamento...</h3>
              <p className="text-muted-foreground">
                Aguarde enquanto confirmamos sua transação
              </p>
            </div>
          ) : (
            <>
              {/* QR Code */}
              <div className="text-center">
                <div className="bg-white p-3 sm:p-4 rounded-lg border-2 border-dashed border-muted inline-block">
                  <QrCode className="w-28 h-28 sm:w-32 sm:h-32 mx-auto text-foreground" />
                </div>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2 px-2">
                  Escaneie o QR Code com seu app de pagamentos
                </p>
              </div>

              {/* PIX Code */}
              <div className="space-y-3">
                <div className="text-center">
                  <span className="text-xs sm:text-sm text-muted-foreground">ou copie o código PIX:</span>
                </div>
                <div className="bg-muted p-2 sm:p-3 rounded-lg">
                  <p className="text-xs font-mono break-all text-center leading-relaxed">{pixCode}</p>
                </div>
                <Button 
                  onClick={copyPixCode}
                  variant="outline" 
                  className="w-full h-12"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar código PIX
                </Button>
              </div>

              {/* Instruções */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
                <h4 className="font-semibold text-blue-800 mb-2 text-sm sm:text-base">Como pagar:</h4>
                <ol className="text-xs sm:text-sm text-blue-700 space-y-1">
                  <li>1. Abra seu app de pagamentos</li>
                  <li>2. Escolha a opção PIX</li>
                  <li>3. Escaneie o QR Code ou cole o código</li>
                  <li>4. Confirme o pagamento</li>
                </ol>
              </div>
            </>
          )}

          {/* Botão para simular pagamento (apenas para demonstração) */}
          {paymentStatus === 'pending' && (
            <Button 
              onClick={handleDemoPayment}
              disabled={isProcessing}
              className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              {isProcessing ? 'Processando...' : 'Simular Pagamento (Demo)'}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PixPaymentModal;