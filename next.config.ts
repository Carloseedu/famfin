import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs";

const nextConfig: NextConfig = {
  output: "standalone",
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,

  // Sentry: source maps upload para debug com código original
  // (não afeta runtime, apenas permite ver stack traces legíveis no Sentry)
  productionBrowserSourceMaps: true,
};

// Envolve o next.config com a configuração do Sentry
export default withSentryConfig(nextConfig, {
  // Silenciar logs detalhados do Sentry durante o build
  silent: true,

  // Não fazer upload automático de source maps sem o SENTRY_AUTH_TOKEN
  // (você pode ativar depois se quiser ver o código original nos traces)
  disableUploadSourceMapsForSourcemaps: true,

  // Ignora rotas de API do navegador do Sentry
  hideSourceMaps: true,

  // Não widen o tree-shaking (mantém bundle leve)
  widenClientFileUpload: false,

  // Transpile apenas o necessário
  transpileClientSDKs: false,
});
