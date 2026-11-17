"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, FileText, Lock } from "lucide-react";

type LegalType = "privacidade" | "termos" | "seguranca";

const TITULOS: Record<LegalType, string> = {
  privacidade: "Política de Privacidade",
  termos: "Termos de Uso",
  seguranca: "Segurança da Plataforma",
};

const ICONS: Record<LegalType, any> = {
  privacidade: Shield,
  termos: FileText,
  seguranca: Lock,
};

// Textos jurídicos como array de linhas (à prova de erros de copy-paste)
// Cada linha é uma string entre aspas duplas, sem template literals
const TEXTS: Record<LegalType, string> = {
  privacidade: [
    "POLÍTICA DE PRIVACIDADE",
    "",
    "A sua privacidade é fundamental para nós. Esta Política descreve como o FamFin coleta,",
    "usa, armazena e protege os dados pessoais, em conformidade com a LGPD (Lei nº 13.709/2018).",
    "",
    "1. DADOS COLETADOS",
    "- Nome, e-mail e senha (criptografada com PBKDF2-SHA512)",
    "- Dados financeiros: descrição, valores, datas, categorias, contas, cartões",
    "- Dados de uso: IP, data/hora de acesso, navegador e dispositivo",
    "",
    "2. FINALIDADE",
    "- Prestação do serviço de gestão financeira familiar",
    "- Autenticação, controle de acesso, relatórios, suporte",
    "",
    "3. COMPARTILHAMENTO",
    "Não compartilhamos dados com terceiros para fins comerciais.",
    "Processadores autorizados: Vercel (hospedagem) e Supabase (banco de dados).",
    "",
    "4. TRANSFERÊNCIA INTERNACIONAL",
    "Dados podem ser processados nos EUA (Vercel) e Brasil (Supabase).",
    "Conforme art. 33 da LGPD.",
    "",
    "5. ARMAZENAMENTO",
    "Dados mantidos enquanto a conta estiver ativa.",
    "Após exclusão, apagados em até 30 dias.",
    "",
    "6. DIREITOS DO TITULAR (LGPD)",
    "- Acessar seus dados",
    "- Corrigir dados incompletos ou inexatos",
    "- Portabilidade (exportar em JSON)",
    "- Eliminação (direito ao esquecimento)",
    "- Revogação do consentimento",
    "",
    "Use os botões em Configurações ou contate: privacidade@famfin.com.br",
    "",
    "7. MEDIDAS DE SEGURANÇA",
    "- Senhas com PBKDF2-SHA512 (100.000 iterações)",
    "- Cookies httpOnly (proteção XSS)",
    "- HTTPS com SSL",
    "- Isolamento por família",
    "- Auditoria de operações",
    "",
    "8. COOKIES",
    "Apenas cookies essenciais: fin_session (sessão) e localStorage (preferências).",
    "Sem cookies de rastreamento ou publicidade.",
    "",
    "9. ALTERAÇÕES",
    "Esta política pode ser atualizada a qualquer momento.",
    "Mudanças significativas serão comunicadas por e-mail.",
    "",
    "10. CONTATO (DPO)",
    "E-mail: privacidade@famfin.com.br",
    "",
    "11. LEI APLICÁVEL",
    "Legislação brasileira, especialmente LGPD (Lei nº 13.709/2018).",
  ].join("\n"),

  termos: [
    "TERMOS DE USO",
    "",
    "Ao usar o FamFin, você concorda com estes Termos.",
    "",
    "1. DESCRIÇÃO DO SERVIÇO",
    "Aplicação web de gestão financeira familiar: receitas, despesas, cartões,",
    "orçamentos, metas e relatórios. Acessível por computador, tablet e celular.",
    "",
    "2. ELEGIBILIDADE",
    "- Maior de 18 anos OU com autorização dos responsáveis",
    "- Fornecer informações verdadeiras no cadastro",
    "",
    "3. CONTA E SEGURANÇA",
    "Você é responsável por manter a confidencialidade de sua senha",
    "e por todas as atividades realizadas com sua conta.",
    "",
    "4. RESPONSABILIDADES DO USUÁRIO",
    "- Usar o serviço apenas para fins lícitos",
    "- Não acessar dados de outras famílias",
    "- Não realizar engenharia reversa",
    "- Fornecer informações financeiras verdadeiras",
    "",
    "5. RESPONSABILIDADES DO FAMFIN",
    "- Manter o serviço disponível (exceto manutenções programadas)",
    "- Proteger dados conforme Política de Privacidade",
    "- Notificar violação de dados em até 72 horas",
    "",
    "6. LIMITAÇÃO DE RESPONSABILIDADE",
    "Serviço fornecido 'como está', sem garantias expressas ou implícitas.",
    "Não nos responsabilizamos por danos indiretos ou perda de dados financeiros.",
    "",
    "7. PROPRIEDADE INTELECTUAL",
    "Código, design e marca são propriedade do FamFin.",
    "Dados financeiros inseridos pelo usuário são de propriedade do usuário.",
    "",
    "8. ENCERRAMENTO",
    "Podemos suspender contas que violem os Termos.",
    "Você pode encerrar sua conta em Configurações.",
    "",
    "9. MODIFICAÇÕES",
    "Podemos atualizar funcionalidades e estes Termos a qualquer momento.",
    "Mudanças significativas comunicadas por e-mail.",
    "",
    "10. PLANOS PAGOS (FUTURO)",
    "Atualmente gratuito. Quando introduzir planos pagos:",
    "- Aviso prévio de 30 dias",
    "- Período de teste gratuito",
    "- Cancelamento a qualquer momento",
    "",
    "11. LEI APLICÁVEL",
    "Leis brasileiras. Foro do domicílio do usuário.",
    "",
    "12. CONTATO",
    "suporte@famfin.com.br",
  ].join("\n"),

  seguranca: [
    "SEGURANÇA DA PLATAFORMA",
    "",
    "CRIPTOGRAFIA DE SENHAS",
    "Senhas nunca em texto puro. Usamos PBKDF2 com SHA-512 e 100.000 iterações.",
    "Mesmo desenvolvedores não conseguem ver sua senha.",
    "",
    "SESSÕES SEGURAS",
    "- Cookies httpOnly (não acessíveis por JavaScript)",
    "- Transmitidos apenas via HTTPS",
    "- Expiração automática",
    "",
    "ISOLAMENTO POR FAMÍLIA",
    "Cada família tem ambiente isolado no banco de dados.",
    "Tecnicamente impossível uma família acessar dados de outra.",
    "",
    "CONEXÃO HTTPS",
    "Tráfego criptografado com TLS 1.3.",
    "Certificado SSL renovado automaticamente pela Vercel.",
    "",
    "VALIDAÇÃO DE ENTRADA",
    "Todas as APIs validam dados com biblioteca Zod.",
    "Previne injeção de SQL e dados malformados.",
    "",
    "AUDITORIA",
    "Operações importantes (criar, editar, excluir) são registradas.",
    "Inclui quem fez, quando e o que foi alterado.",
    "",
    "BACKUPS",
    "Banco no Supabase com backups automáticos diários.",
    "Restauração até o dia anterior em caso de falha.",
    "",
    "PROTEÇÃO CONTRA ATAQUES",
    "- Cross-Site Scripting (XSS) - React escapa HTML",
    "- Cross-Site Request Forgery (CSRF) - validação de origem",
    "- Brute force - rate limiting",
    "",
    "MONITORAMENTO 24/7",
    "Infraestrutura monitorada pela Vercel e Supabase.",
    "Detecção automática de comportamento anômalo.",
    "",
    "DICAS DE SEGURANÇA",
    "- Use senha forte (mínimo 8 caracteres)",
    "- Não compartilhe sua senha",
    "- Faça logout em computadores públicos",
    "- Mantenha seu navegador atualizado",
    "",
    "RELATAR VULNERABILIDADE",
    "seguranca@famfin.com.br",
    "Resposta em até 48 horas.",
  ].join("\n"),
};

export function LegalModal({
  type,
  open,
  onOpenChange,
}: {
  type: LegalType | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!type) return null;
  const Icon = ICONS[type];
  const text = TEXTS[type];
  const titulo = TITULOS[type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            {titulo}
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[70vh] pr-4">
          <pre className="text-xs leading-relaxed whitespace-pre-wrap font-sans text-foreground/90">
            {text}
          </pre>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

export function useLegalModal() {
  const [open, setOpen] = useState(false);
  const [type, setType] = useState<LegalType | null>(null);

  function openModal(t: LegalType) {
    setType(t);
    setOpen(true);
  }

  return { open, type, setOpen, openModal };
}
