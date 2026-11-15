import * as Sentry from "@sentry/nextjs";

// Configuração do Sentry para o navegador (client-side)
// Captura erros JavaScript que acontecem no navegador do usuário
Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Taxa de amostragem para performance tracing (10% das sessões)
  // Aumentar para 1.0 em produção quando precisar de mais detalhes
  tracesSampleRate: 0.1,

  // Captura erros de sessão (quando o usuário encontra erro e fecha)
  replaysSessionSampleRate: 0.05,
  replaysOnErrorSampleRate: 1.0,

  // Ambiente (production / development)
  environment: process.env.NODE_ENV,

  // Não enviar erros em desenvolvimento local
  enabled: process.env.NODE_ENV === "production",

  // Ignorar erros comuns de rede que não são bugs reais
  ignoreErrors: [
    "Network request failed",
    "Failed to fetch",
    "Load failed",
    "AbortError",
  ],
});
