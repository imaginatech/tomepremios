
import React from 'react';
import { Trophy, Instagram, Facebook, MessageCircle, Mail, Phone } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-card border-t border-border py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Logo e Descrição */}
          <div className="md:col-span-2">
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-10 h-10 gradient-gold rounded-xl flex items-center justify-center">
                <Trophy className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-xl font-bold golden-text">PIX Fortuna Mobile</h3>
                <p className="text-sm text-muted-foreground">Sua sorte em suas mãos</p>
              </div>
            </div>
            <p className="text-muted-foreground text-sm leading-relaxed mb-4">
              A plataforma de sorteios mais confiável do Brasil. Pagamentos seguros via PIX, 
              sorteios transparentes e prêmios garantidos. Sua próxima conquista está a um clique de distância!
            </p>
            <div className="flex space-x-3">
              <a href="#" className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center hover:bg-primary/80 transition-colors">
                <Instagram className="w-5 h-5 text-white" />
              </a>
              <a href="#" className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center hover:bg-primary/80 transition-colors">
                <Facebook className="w-5 h-5 text-white" />
              </a>
              <a href="#" className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center hover:bg-primary/80 transition-colors">
                <MessageCircle className="w-5 h-5 text-white" />
              </a>
            </div>
          </div>

          {/* Links Rápidos */}
          <div>
            <h4 className="font-semibold mb-4">Links Rápidos</h4>
            <ul className="space-y-2 text-sm">
              <li><a href="#home" className="text-muted-foreground hover:text-primary transition-colors">Início</a></li>
              <li><a href="#sorteios" className="text-muted-foreground hover:text-primary transition-colors">Sorteios Ativos</a></li>
              <li><a href="#ganhadores" className="text-muted-foreground hover:text-primary transition-colors">Ganhadores</a></li>
              <li><a href="#como-funciona" className="text-muted-foreground hover:text-primary transition-colors">Como Funciona</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Termos de Uso</a></li>
              <li><a href="#" className="text-muted-foreground hover:text-primary transition-colors">Privacidade</a></li>
            </ul>
          </div>

          {/* Contato */}
          <div>
            <h4 className="font-semibold mb-4">Contato</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center">
                <MessageCircle className="w-4 h-4 mr-2 text-primary" />
                <span className="text-muted-foreground">(11) 99999-9999</span>
              </li>
              <li className="flex items-center">
                <Mail className="w-4 h-4 mr-2 text-primary" />
                <span className="text-muted-foreground">contato@pixfortuna.com</span>
              </li>
              <li className="flex items-center">
                <Phone className="w-4 h-4 mr-2 text-primary" />
                <span className="text-muted-foreground">Suporte 24h</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Certificações e Garantias */}
        <div className="border-t border-border pt-8 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
            <div className="flex items-center justify-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-sm">100% Seguro</div>
                <div className="text-xs text-muted-foreground">Certificado SSL</div>
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-2">
              <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-sm">PIX Instantâneo</div>
                <div className="text-xs text-muted-foreground">Pagamentos em tempo real</div>
              </div>
            </div>
            
            <div className="flex items-center justify-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <div className="font-semibold text-sm">Suporte 24/7</div>
                <div className="text-xs text-muted-foreground">Atendimento especializado</div>
              </div>
            </div>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-border pt-6 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 PIX Fortuna Mobile. Todos os direitos reservados.
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
