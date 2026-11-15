import * as Sentry from "@sentry/nextjs";

// Configuração do Sentry para Edge Runtime (middleware, edge functions)
// Captura erros em código que roda próximo ao usuário (CDN edge)
Sentry.init({
  dsn: process.env.SENTRY_DSN,

  tracesSampleRate: 0.1,

  environment: process.env.NODE_ENV,

  enabled: process.env.NODE_ENV === "production",
});
