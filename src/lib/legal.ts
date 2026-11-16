// Textos jurídicos do FamFin
// Versão inicial gerada para atender à LGPD. Recomenda-se revisão por advogado
// especializado quando iniciar a cobrança pelo serviço.

export const PRIVACIDADE_TEXT = `
POLÍTICA DE PRIVACIDADE

Última atualização: ${new Date().getFullYear()}

A sua privacidade é fundamental para nós. Esta Política de Privacidade descreve como o FamFin coleta, usa, armazena e protege os dados pessoais dos usuários da plataforma, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).

1. DADOS COLETADOS

Coletamos os seguintes dados pessoais:

Dados de cadastro:
- Nome
- E-mail
- Senha (armazenada com criptografia PBKDF2-SHA512, nunca em texto puro)

Dados financeiros (inseridos pelo usuário):
- Descrição de receitas e despesas
- Valores
- Datas de transações
- Categorias
- Contas bancárias (nome e instituição)
- Cartões de crédito (nome, instituição, limite)

Dados de uso:
- Endereço IP (para segurança)
- Data e hora de acessos
- Tipo de navegador e dispositivo

2. FINALIDADE DO TRATAMENTO

Os dados são utilizados para:
- Prestação do serviço de gestão financeira familiar
- Autenticação e controle de acesso
- Geração de relatórios e estatísticas
- Suporte ao usuário
- Cumprimento de obrigações legais

3. COMPARTILHAMENTO DE DADOS

NÃO compartilhamos seus dados com terceiros para fins comerciais. Os dados são processados apenas pelos seguintes prestadores de serviços, sob contratos de confidencialidade:

- Vercel (hospedagem da aplicação) - Estados Unidos
- Supabase (banco de dados PostgreSQL) - São Paulo, Brasil

Nenhum outro terceiro tem acesso aos seus dados.

4. TRANSFERÊNCIA INTERNACIONAL

Os dados podem ser processados nos Estados Unidos (pela Vercel) e no Brasil (pela Supabase). A transferência internacional ocorre apenas para a execução do serviço contratado, em conformidade com o art. 33 da LGPD.

5. TEMPO DE ARMAZENAMENTO

Seus dados são mantidos enquanto sua conta estiver ativa. Após solicitação de exclusão, todos os dados são permanentemente apagados em até 30 dias.

6. DIREITOS DO TITULAR (LGPD)

Você tem direito a:
- Confirmar a existência de tratamento de seus dados
- Acessar seus dados
- Corrigir dados incompletos, inexatos ou desatualizados
- Anonimizar, bloquear ou eliminar dados desnecessários
- Portabilidade dos dados (exportar em formato estruturado)
- Eliminação dos dados pessoais tratados (direito ao esquecimento)
- Informação sobre compartilhamento
- Revogação do consentimento

Para exercer seus direitos, use os botões "Exportar meus dados" e "Excluir minha conta" disponíveis em Configurações, ou contate: privacidade@famfin.com.br

7. MEDIDAS DE SEGURANÇA

Adotamos as seguintes medidas técnicas:
- Senhas criptografadas com PBKDF2-SHA512 (100.000 iterações)
- Sessões em cookies httpOnly (não acessíveis por JavaScript)
- Conexão HTTPS com certificado SSL
- Isolamento de dados por família (uma família nunca acessa dados de outra)
- Auditoria de operações importantes
- Validação de entrada em todas as APIs

8. COOKIES

Utilizamos apenas cookies essenciais para o funcionamento:
- fin_session: mantém sua sessão logada (não rastreia você)
- localStorage: preferências do usuário (período selecionado, etc.)

NÃO utilizamos cookies de rastreamento, publicidade ou analytics de terceiros.

9. ALTERAÇÕES DESTA POLÍTICA

Esta política pode ser atualizada a qualquer momento. Recomendamos consulta periódica. Alterações significativas serão comunicadas por e-mail.

10. CONTATO DO ENCARREGADO (DPO)

Em caso de dúvidas sobre privacidade, contate:
E-mail: privacidade@famfin.com.br
Responsável: [Nome do responsável pela LGPD no FamFin]

11. LEI APLICÁVEL

Esta política é regida pela legislação brasileira, especialmente a LGPD (Lei nº 13.709/2018).
`

export const TERMOS_TEXT = `
TERMOS DE USO

Última atualização: ${new Date().getFullYear()}

Bem-vindo ao FamFin! Ao usar nossa plataforma, você concorda com estes Termos de Uso. Leia atentamente.

1. DESCRIÇÃO DO SERVIÇO

O FamFin é uma aplicação web de gestão financeira familiar que permite aos usuários registrar receitas e despesas, gerenciar cartões de crédito, criar orçamentos, metas financeiras e gerar relatórios. O serviço é prestado via internet, acessível por computador, tablet e celular.

2. ELEGIBILIDADE

Para usar o FamFin você deve:
- Ter pelo menos 18 anos de idade OU ter autorização dos responsáveis legais
- Fornecer informações verdadeiras e completas no cadastro
- Manter suas informações atualizadas

3. CONTA E SEGURANÇA

Você é responsável por:
- Manter a confidencialidade de sua senha
- Todas as atividades realizadas com sua conta
- Notificar imediatamente qualquer uso não autorizado

O FamFin não se responsabiliza por perdas decorrentes de compartilhamento de senha.

4. RESPONSABILIDADES DO USUÁRIO

Você concorda em:
- Usar o serviço apenas para fins lícitos
- Não tentar acessar dados de outras famílias
- Não realizar engenharia reversa ou tentar descompilar o código
- Não usar bots ou scripts automatizados sem autorização
- Fornecer informações financeiras verdadeiras

5. RESPONSABILIDADES DO FAMFIN

O FamFin se compromete a:
- Manter o serviço disponível 99% do tempo (exceto manutenções programadas)
- Proteger seus dados conforme nossa Política de Privacidade
- Notificar em caso de violação de dados em até 72 horas
- Fornecer suporte ao usuário

6. LIMITAÇÃO DE RESPONSABILIDADE

O FamFin é fornecido "como está", sem garantias expressas ou implícitas. Não garantimos que:
- O serviço será ininterrupto ou livre de erros
- Os relatórios sejam 100% precisos (dependem dos dados inseridos pelo usuário)
- Não haverá perda de dados (embora façamos backups)

Em nenhum caso o FamFin será responsável por danos indiretos, lucros cessantes ou perda de dados financeiros decorrentes do uso ou impossibilidade de uso do serviço.

7. PROPRIEDADE INTELECTUAL

O código, design, marca e todos os elementos do FamFin são de propriedade exclusiva da plataforma. Você não pode copiar, modificar ou distribuir o serviço sem autorização.

Os dados financeiros inseridos pelo usuário são de propriedade exclusiva do usuário.

8. SUSPENSÃO E ENCERRAMENTO

Podemos suspender ou encerrar contas que:
- Violar estes Termos
- Forem usadas para atividades fraudulentas
- Permanecerem inativas por mais de 12 meses

Você pode encerrar sua conta a qualquer momento em Configurações > Excluir minha conta.

9. MODIFICAÇÕES DO SERVIÇO E TERMOS

Reservamo-nos o direito de:
- Modificar funcionalidades do serviço
- Atualizar estes Termos a qualquer momento
- Introduzir planos pagos no futuro (com aviso prévio de 30 dias)

Notificação de mudanças significativas será enviada por e-mail.

10. PLANOS E COBRANÇA (FUTURO)

Atualmente o serviço está em fase beta gratuita. Quando planos pagos forem introduzidos:
- O usuário será avisado com 30 dias de antecedência
- Período de teste gratuito estará disponível
- Cancelamento pode ser feito a qualquer momento

11. LEI APLICÁVEL E FORO

Estes Termos são regidos pelas leis brasileiras. Fica eleito o foro da comarca do domicílio do usuário para dirimir quaisquer controvérsias.

12. CONTATO

Dúvidas sobre estes Termos: suporte@famfin.com.br
`

export const SEGURANCA_TEXT = `
SEGURANÇA DA PLATAFORMA

Levamos a segurança dos seus dados financeiros a sério. Aqui estão as medidas técnicas que implementamos:

CRIPTOGRAFIA DE SENHAS

Suas senhas nunca são armazenadas em texto puro. Usamos o algoritmo PBKDF2 com SHA-512 e 100.000 iterações, com salt único por usuário. Isso significa que mesmo nossos desenvolvedores não conseguem ver sua senha.

SESSÕES SEGURAS

Sua sessão de login é armazenada em cookies httpOnly, que:
- Não podem ser lidos por JavaScript (proteção contra ataques XSS)
- São transmitidos apenas via HTTPS
- Têm expiração automática

ISOLAMENTO POR FAMÍLIA

Cada família tem seu próprio ambiente financeiro isolado. Implementamos isolamento em nível de banco de dados: todas as consultas são filtradas pelo familyId da família do usuário logado. É tecnicamente impossível uma família acessar dados de outra família.

CONEXÃO HTTPS

Todo o tráfego entre seu dispositivo e nossos servidores é criptografado com TLS 1.3 (HTTPS). O certificado SSL é fornecido pela Vercel e renovado automaticamente.

VALIDAÇÃO DE ENTRADA

Todas as APIs do sistema validam os dados de entrada usando a biblioteca Zod. Isso previne:
- Injeção de SQL
- Dados malformados
- Ataques de schema

AUDITORIA DE AÇÕES

Operações importantes (criar, editar, excluir lançamentos) são registradas em um log de auditoria, incluindo:
- Quem fez a ação
- Quando foi feita
- O que foi alterado

Esse log é consultável por administradores da família.

BACKUPS

O banco de dados é hospedado no Supabase, que realiza backups automáticos diários. Em caso de falha, podemos restaurar os dados até o dia anterior.

PROTEÇÃO CONTRA ATAQUES COMUNS

Implementamos proteções contra:
- Cross-Site Scripting (XSS) - React escapa HTML automaticamente
- Cross-Site Request Forgery (CSRF) - validação de origem
- Brute force de login - rate limiting
- Ataques de tempo em comparação de senhas - usando timingSafeEqual

MONITORAMENTO

A infraestrutura é monitorada 24/7 pela Vercel e Supabase. Em caso de tentativa de invasão, comportamento anômalo ou falha de serviço, os sistemas detectam automaticamente e nossa equipe é notificada.

DICA PARA O USUÁRIO

Para aumentar sua segurança:
- Use uma senha forte (mínimo 8 caracteres, com números, letras e símbolos)
- Não compartilhe sua senha com ninguém
- Faça logout em computadores públicos
- Mantenha seu navegador atualizado

RELATAR VULNERABILIDADE

Encontrou um problema de segurança? Reporte imediatamente para: seguranca@famfin.com.br

Levamos todos os relatórios a sério e responderemos em até 48 horas.
