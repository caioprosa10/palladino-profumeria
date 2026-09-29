import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

/**
 * Turnstile precisa carregar script e abrir um iframe de challenge no
 * domínio da Cloudflare. As entradas só são adicionadas quando a
 * integração está configurada — sem a chave, o CSP continua fechado.
 *
 * Como headers() é resolvido no build, TURNSTILE_SITE_KEY precisa existir
 * no ambiente de build, não só em execução.
 */
const turnstileAtivo = Boolean(process.env.TURNSTILE_SITE_KEY);
const cfChallenges = "https://challenges.cloudflare.com";

/**
 * Content Security Policy.
 *
 * Estado medido em 2026-09-29:
 *
 * script-src mantém 'unsafe-inline' porque o Next injeta scripts de
 * hidratação sem nonce. Adotar nonce por requisição custa a
 * prerenderização de 13 das 27 páginas — incluindo a home, que é a mais
 * visitada —, porque o nonce obriga renderização dinâmica.
 *
 * style-src mantém 'unsafe-inline' porque existem 697 atributos
 * `style={{...}}` no JSX (662 estáticos, 35 dependentes de valor), e
 * nonce não cobre atributo de estilo: resolver exige migrar para classes.
 *
 * CSP_REPORT_ONLY=true publica a política estrita em paralelo, sem
 * bloquear, para medir o que ainda quebraria. Ver cspEstrita abaixo.
 *
 * 'unsafe-eval' só em desenvolvimento: o React usa eval para reconstruir
 * stacks de erro. Em produção nada no projeto usa eval.
 */
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${turnstileAtivo ? ` ${cfChallenges}` : ""}`,
  "style-src 'self' 'unsafe-inline'",
  // Só imagens da própria origem: o catálogo é servido de /public.
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  // Em desenvolvimento o hot reload do Next abre um WebSocket; sem ws:
  // o CSP o derruba e o cliente de HMR passa a escrever num stream fechado.
  // Produção continua restrita à própria origem.
  `connect-src 'self'${isDev ? " ws: wss:" : ""}${turnstileAtivo ? ` ${cfChallenges}` : ""}`,
  // O pagamento é redirecionamento de página, não iframe. O único iframe
  // legítimo é o challenge do Turnstile, quando ativo.
  turnstileAtivo ? `frame-src ${cfChallenges}` : "frame-src 'none'",
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

/**
 * A política que queremos alcançar, sem 'unsafe-inline' em lugar nenhum.
 *
 * Publicada apenas como Content-Security-Policy-Report-Only quando
 * CSP_REPORT_ONLY=true: o navegador não bloqueia nada, só relata em
 * /api/csp-report o que seria bloqueado. É assim que se mede o tamanho da
 * migração dos estilos inline antes de passar a impor.
 */
const cspEstrita = [
  "default-src 'self'",
  `script-src 'self'${turnstileAtivo ? ` ${cfChallenges}` : ""}`,
  "style-src 'self'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  `connect-src 'self'${turnstileAtivo ? ` ${cfChallenges}` : ""}`,
  turnstileAtivo ? `frame-src ${cfChallenges}` : "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "report-uri /api/csp-report",
  "report-to csp",
].join("; ");

const medirCspEstrita = process.env.CSP_REPORT_ONLY === "true";

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

  // A site key do Turnstile é pública por natureza — vai no HTML de
  // qualquer forma. Injetar por aqui evita pedir que a mesma chave seja
  // configurada duas vezes, com e sem o prefixo NEXT_PUBLIC_.
  // A secret NUNCA entra aqui: ela só é usada no servidor.
  env: {
    TURNSTILE_SITE_KEY_PUBLICA: process.env.TURNSTILE_SITE_KEY ?? '',
  },

  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          ...(medirCspEstrita
            ? [
                { key: "Content-Security-Policy-Report-Only", value: cspEstrita },
                {
                  key: "Reporting-Endpoints",
                  value: 'csp="/api/csp-report"',
                },
              ]
            : []),
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
