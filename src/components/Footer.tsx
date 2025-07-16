
import React from 'react';
import { Trophy, Instagram, Facebook, MessageCircle, Mail, Phone } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="">
      <div className="container mx-auto px-4">
        {/* Certificações e Garantias */}
        <div className="border-t border-border pt-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center justify-center md:justify-start space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div className="text-center md:text-left">
                <div className="font-semibold text-sm">100% Seguro</div>
                <div className="text-xs text-muted-foreground">Certificado SSL</div>
              </div>
            </div>
            
            <div className="flex items-center justify-center md:justify-center space-x-3">
              <div className="w-10 h-10 bg-accent rounded-lg flex items-center justify-center flex-shrink-0">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="text-center md:text-left">
                <div className="font-semibold text-sm">PIX Instantâneo</div>
                <div className="text-xs text-muted-foreground">Pagamentos em tempo real</div>
              </div>
            </div>
            
            <div className="flex items-center justify-center md:justify-end space-x-3">
              <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center flex-shrink-0">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div className="text-center md:text-left">
                <div className="font-semibold text-sm">Suporte 24/7</div>
                <div className="text-xs text-muted-foreground">Atendimento especializado</div>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-border pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            © 2025 Tome prêmios. Todos os direitos reservados.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            CNPJ: 48.749.603/0001-17
          </p>
          <p className="text-xs text-muted-foreground mt-2">
            Plataforma desenvolvida com tecnologia de ponta para sua segurança e conveniência.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
