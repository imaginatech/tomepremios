import React, { useState, useEffect } from 'react';
import { QrCode, Copy, CheckCircle, Clock, DollarSign } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

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
  const { toast } = useToast();

  // PIX code de demonstração
  const pixCode = "00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426655440000520400005303986540525.005802BR5925PIX DA SORTE DEMONSTRACAO6008SAO PAULO62070503***6304";

  useEffect(() => {
    if (!isOpen) return;

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
  }, [isOpen, onClose, toast]);

  // Simular confirmação de pagamento após 30 segundos (para demonstração)
  useEffect(() => {
    if (!isOpen || paymentStatus !== 'pending') return;

    const simulatePayment = setTimeout(() => {
      setPaymentStatus('processing');
      toast({
        title: "Pagamento detectado!",
        description: "Processando sua transação...",
      });

      setTimeout(() => {
        setPaymentStatus('confirmed');
        toast({
          title: "Pagamento confirmado!",
          description: "Seus números foram reservados com sucesso!",
        });

        setTimeout(() => {
          onSuccess();
          onClose();
        }, 2000);
      }, 3000);
    }, 30000); // 30 segundos para demonstração

    return () => clearTimeout(simulatePayment);
  }, [isOpen, paymentStatus, onSuccess, onClose, toast]);

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
        <DialogContent className="max-w-md">
          <div className="text-center py-6">
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-green-600 mb-2">Pagamento Confirmado!</h2>
            <p className="text-muted-foreground mb-4">
              Seus números foram reservados com sucesso!
            </p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <p className="text-sm text-green-700">
                Números reservados: {selectedNumbers.sort((a, b) => a - b).map(n => n.toString().padStart(3, '0')).join(', ')}
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {paymentStatus === 'processing' ? 'Processando Pagamento' : 'Pagamento via PIX'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Timer */}
          <div className="text-center">
            <div className="inline-flex items-center bg-orange-100 text-orange-800 px-3 py-2 rounded-lg">
              <Clock className="w-4 h-4 mr-2" />
              <span className="font-mono text-lg">{formatTime(countdown)}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
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
                <div className="bg-white p-4 rounded-lg border-2 border-dashed border-muted inline-block">
                  <QrCode className="w-32 h-32 mx-auto text-foreground" />
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Escaneie o QR Code com seu app de pagamentos
                </p>
              </div>

              {/* PIX Code */}
              <div className="space-y-3">
                <div className="text-center">
                  <span className="text-sm text-muted-foreground">ou copie o código PIX:</span>
                </div>
                <div className="bg-muted p-3 rounded-lg">
                  <p className="text-xs font-mono break-all text-center">{pixCode}</p>
                </div>
                <Button 
                  onClick={copyPixCode}
                  variant="outline" 
                  className="w-full"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copiar código PIX
                </Button>
              </div>

              {/* Instruções */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-800 mb-2">Como pagar:</h4>
                <ol className="text-sm text-blue-700 space-y-1">
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
              onClick={() => setPaymentStatus('processing')}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <DollarSign className="w-4 h-4 mr-2" />
              Simular Pagamento (Demo)
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PixPaymentModal;