import { headers } from 'next/headers'
import AdminShell from './AdminShell'

/**
 * Camada servidora do painel.
 *
 * Existe para uma coisa: ler `headers()`, o que opta este segmento por
 * renderização sob demanda. O CSP com nonce de src/proxy.ts gera um valor
 * por requisição, e o Next só consegue aplicá-lo às tags <script> quando
 * a página é dinâmica — numa página prerenderizada os scripts sairiam sem
 * nonce e o navegador os bloquearia, deixando o painel inutilizável.
 *
 * A vitrine pública não passa por aqui e segue prerenderizada.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await headers()

  return <AdminShell>{children}</AdminShell>
}
