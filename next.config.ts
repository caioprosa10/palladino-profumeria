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
  // Em desenvolvimento o hot reload do Next abre um WebSocket; sem ws:
  // o CSP o derruba e o cliente de HMR passa a escrever num stream fechado.
  // Produção continua restrita à própria origem.
  `connect-src 'self'${isDev ? " ws: wss:" : ""}`,
  // O pagamento é redirecionamento de página, não iframe.
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  // Só em produção: em desenvolvimento o site roda sob http, e esta diretiva
  // faria o navegador tentar buscar CSS e imagens em https, quebrando tudo
  // que é acessado por IP da rede local (localhost é exceção no navegador).
  // Força todo recurso para https. Correto em produção atrás de TLS, mas
  // quebra qualquer acesso por http — inclusive testar o build de produção
  // pelo IP da rede. DISABLE_HTTPS_UPGRADE=true desliga só para esse caso.
  ...(isDev || process.env.DISABLE_HTTPS_UPGRADE === "true"
    ? []
    : ["upgrade-insecure-requests"]),
].join("; ");

const nextConfig: NextConfig = {
  // Apenas desenvolvimento: sem isto o Next bloqueia os recursos de dev
  // (bundle e HMR) quando o site é aberto pelo IP da rede local em vez de
  // localhost — o HTML carrega, o JS não, e a página fica presa no loader.
  // Não tem efeito em produção.
  allowedDevOrigins: ['192.168.1.12'],

  // Mantido desligado, como no projeto original: o loader do hero em
  // HeroCanvas.tsx conta os 40 quadros num closure por execução do efeito,
  // e a dupla execução do modo estrito trava esse contador.
  reactStrictMode: false,

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
