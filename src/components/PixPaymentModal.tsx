import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, CheckCircle, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import confetti from "canvas-confetti";
import AffiliateSignupButton from "./affiliate/AffiliateSignupButton";

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  selectedNumbers: number[];
  total: number;
}

interface PaymentData {
  id: string;
  qr_code: string;
  qr_code_image: string;
  pix_code: string;
  amount: number;
  expires_at: string;
  paggue_transaction_id: string;
}

export function PixPaymentModal({ isOpen, onClose, onSuccess, selectedNumbers, total }: PixPaymentModalProps) {
  const [countdown, setCountdown] = useState(900); // 15 minutos
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'paid' | 'expired'>('pending');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [isCreatingPayment, setIsCreatingPayment] = useState(false);
  const { toast } = useToast();

  // Criar pagamento PIX quando modal abrir
  useEffect(() => {
    if (isOpen && !paymentData && !isCreatingPayment) {
      createPixPayment();
    }
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || paymentStatus !== 'pending' || !paymentData) return;

    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setPaymentStatus('expired');
          toast({
            title: "Tempo esgotado",
            description: "O tempo para pagamento expirou. Tente novamente.",
            variant: "destructive",
          });
          setTimeout(() => {
            onClose();
          }, 3000);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isOpen, paymentStatus, onClose, toast, paymentData]);

  // Verificação de status do pagamento
  useEffect(() => {
    if (!paymentData || paymentStatus !== 'pending') return;

    const checkPaymentStatus = async () => {
      try {
        const { data: payment, error } = await supabase
          .from('pix_payments')
          .select('status, paid_at')
          .eq('paggue_transaction_id', paymentData.paggue_transaction_id)
          .single();

        if (error) {
          console.error('Erro ao verificar status:', error);
          return;
        }

        if (payment.status === 'paid') {
          setPaymentStatus('paid');
          triggerConfetti();
          toast({
            title: "Pagamento confirmado!",
            description: "Seus números foram reservados com sucesso!",
          });
          
          setTimeout(() => {
            onSuccess();
            onClose();
            // Reset states
            setPaymentData(null);
            setPaymentStatus('pending');
            setCountdown(900);
          }, 3000);
        }
      } catch (error) {
        console.error('Erro na verificação de status:', error);
      }
    };

    // Verificar status a cada 3 segundos
    const statusInterval = setInterval(checkPaymentStatus, 3000);
    return () => clearInterval(statusInterval);
  }, [paymentData, paymentStatus, onSuccess, onClose, toast]);

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

  // Criar pagamento PIX real
  const createPixPayment = async () => {
    setIsCreatingPayment(true);
    
    try {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) {
        throw new Error("Usuário não autenticado");
      }

      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: {
          userId: user.user.id,
          selectedNumbers,
          total
        }
      });

      console.log('Resposta da edge function:', { data, error });

      if (error) {
        console.error('Erro ao criar pagamento:', error);
        throw new Error(`Erro ao criar pagamento PIX: ${error.message || 'Erro desconhecido'}`);
      }

      if (!data.success) {
        throw new Error(data.error || "Erro ao criar pagamento PIX");
      }

      setPaymentData(data.payment);
      
      // Calcular countdown baseado na expiração
      const expiresAt = new Date(data.payment.expires_at);
      const now = new Date();
      const timeRemaining = Math.max(0, Math.floor((expiresAt.getTime() - now.getTime()) / 1000));
      setCountdown(timeRemaining);

      toast({
        title: "PIX gerado com sucesso",
        description: "Use o QR Code ou código PIX para pagar",
      });

    } catch (error: any) {
      console.error('Erro ao criar pagamento PIX:', error);
      toast({
        title: "Erro ao gerar PIX",
        description: error.message || "Tente novamente.",
        variant: "destructive",
      });
      onClose();
    } finally {
      setIsCreatingPayment(false);
    }
  };

  // Copy PIX code to clipboard
  const copyPixCode = () => {
    if (!paymentData) return;
    
    navigator.clipboard.writeText(paymentData.pix_code);
    toast({
      title: "Código PIX copiado!",
      description: "Cole no seu app de pagamentos",
    });
  };

  // Format time helper
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Reset states when modal closes
  const handleClose = () => {
    setPaymentData(null);
    setPaymentStatus('pending');
    setCountdown(900);
    setIsCreatingPayment(false);
    setIsProcessing(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {paymentStatus === 'paid' ? 'Pagamento Confirmado!' : 'Pagamento PIX'}
          </DialogTitle>
        </DialogHeader>

        {isCreatingPayment ? (
          <div className="text-center space-y-4 py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Gerando PIX...</p>
          </div>
        ) : paymentStatus === 'paid' ? (
          <div className="text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto" />
            <div>
              <h3 className="text-lg font-semibold text-green-600">
                Parabéns! Seus números foram reservados!
              </h3>
              <p className="text-muted-foreground mt-2">
                Números escolhidos: {selectedNumbers.join(', ')}
              </p>
            </div>
            
            <div className="bg-primary/10 p-4 rounded-lg">
              <h4 className="font-semibold mb-2">Que tal se tornar um afiliado?</h4>
              <p className="text-sm text-muted-foreground mb-3">
                Indique amigos e ganhe números bônus em cada sorteio!
              </p>
              <AffiliateSignupButton />
            </div>
          </div>
        ) : paymentData ? (
          <div className="space-y-4">
            {/* Timer */}
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
              <div className="flex items-center gap-2 text-orange-600">
                <Clock className="w-4 h-4" />
                <span className="text-sm font-medium">
                  Tempo restante: {formatTime(countdown)}
                </span>
              </div>
              <p className="text-xs text-orange-500 mt-1">
                Este PIX expira automaticamente
              </p>
            </div>

            {/* Payment Info */}
            <div className="text-center space-y-2">
              <h3 className="font-semibold">Total a pagar: R$ {total.toFixed(2)}</h3>
              <p className="text-sm text-muted-foreground">
                Números: {selectedNumbers.join(', ')}
              </p>
            </div>

            {/* QR Code */}
            <div className="flex justify-center">
              <div className="bg-white p-4 rounded-lg border">
                <img 
                  src={paymentData.qr_code_image}
                  alt="QR Code PIX" 
                  className="w-48 h-48"
                  onError={(e) => {
                    // Fallback se imagem não carregar
                    e.currentTarget.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
                  }}
                />
              </div>
            </div>

            {/* PIX Code */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Código PIX:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={paymentData.pix_code}
                  readOnly
                  className="flex-1 p-2 text-xs border rounded bg-gray-50 font-mono"
                />
                <Button
                  onClick={copyPixCode}
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <h4 className="font-semibold text-blue-800 mb-2">Como pagar:</h4>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. Abra o app do seu banco</li>
                <li>2. Escaneie o QR Code ou cole o código PIX</li>
                <li>3. Confirme o pagamento</li>
                <li>4. Aguarde a confirmação automática</li>
              </ol>
            </div>

            {/* Status indicator */}
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
                Aguardando pagamento...
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center space-y-4 py-8">
            <p className="text-muted-foreground">Erro ao carregar dados do pagamento</p>
            <Button onClick={handleClose} variant="outline">
              Fechar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};