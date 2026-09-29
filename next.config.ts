import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Content Security Policy.
 *
 * script-src mantém 'unsafe-inline' porque o Next injeta scripts de
 * hidratação sem nonce. A alternativa — nonce por requisição via proxy —
 * obriga renderização dinâmica em todas as páginas e, principalmente,
 * exigiria trocar os 646 atributos `style={{...}}` do JSX por classes,
 * já que style inline também é bloqueado por CSP estrito. Enquanto isso
 * não acontece, o 'unsafe-inline' fica documentado em vez de escondido.
 *
 * 'unsafe-eval' só em desenvolvimento: o React usa eval para reconstruir
 * stacks de erro. Em produção nada no projeto usa eval.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Só imagens da própria origem: o catálogo é servido de /public.
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "connect-src 'self'",
  // O pagamento é redirecionamento de página, não iframe.
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "upgrade-insecure-requests",
].join("; ");

const nextConfig: NextConfig = {
  reactStrictMode: true,

  // Não anunciar a stack para quem sonda o servidor.
  poweredByHeader: false,

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          // O filtro XSS legado dos navegadores foi descontinuado e chegou a
          // introduzir falhas próprias. Desligado de propósito; quem protege
          // contra XSS aqui é o CSP acima.
          { key: "X-XSS-Protection", value: "0" },
        ],
      },
      {
        // Arquivos enviados pelo painel: nunca devem ser interpretados como
        // documento, mesmo que algo escape da validação de upload.
        source: "/uploads/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: "default-src 'none'; sandbox" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Content-Disposition", value: "inline" },
        ],
      },
    ];
  },
};

export default nextConfig;
