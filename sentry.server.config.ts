import * as Sentry from "@sentry/nextjs";

// Configuração do Sentry para o servidor Node.js (API routes, server components)
// Captura erros que acontecem no backend da aplicação
Sentry.init({
  dsn: process.env.SENTRY_DSN,

  // Taxa de amostragem para performance tracing (10% das requisições)
  tracesSampleRate: 0.1,

  // Ambiente
  environment: process.env.NODE_ENV,

  // Não enviar em desenvolvimento
  enabled: process.env.NODE_ENV === "production",
});
