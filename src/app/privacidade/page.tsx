import { Navbar } from '@/components/layout/Navbar'
import Link from 'next/link'

export const metadata = {
  title: 'Política de Privacidade | Palladino Profumeria',
  description: 'Como a Palladino Profumeria coleta, usa e protege os seus dados pessoais.',
}

/**
 * RASCUNHO. O conteúdo descreve o que a aplicação realmente faz hoje, mas
 * não substitui revisão jurídica: prazos de retenção, base legal e dados
 * da empresa precisam ser conferidos por quem responde pelo negócio.
 */
export default function PrivacidadePage() {
  const secao: React.CSSProperties = { marginBottom: '32px' }
  const titulo: React.CSSProperties = {
    fontFamily: 'var(--font-serif)',
    fontSize: '1.4rem',
    marginBottom: '12px',
    color: 'var(--color-ink)',
  }
  const texto: React.CSSProperties = {
    fontSize: '0.95rem',
    lineHeight: 1.8,
    color: 'var(--color-text-secondary)',
  }

  return (
    <>
      <Navbar />
      <div className="sub-page" style={{ padding: '120px 8% 80px', maxWidth: '820px', margin: '0 auto' }}>
        <h1 style={{ fontFamily: 'var(--font-serif)', fontSize: 'clamp(2rem, 5vw, 3rem)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '10px' }}>
          Política de Privacidade
        </h1>
        <p style={{ ...texto, marginBottom: '40px' }}>
          Esta página explica quais dados pessoais a Palladino Profumeria coleta,
          para que os usa e quais direitos você tem sobre eles, conforme a Lei
          Geral de Proteção de Dados (Lei 13.709/2018).
        </p>

        <section style={secao}>
          <h2 style={titulo}>Quais dados coletamos</h2>
          <p style={texto}>
            Ao criar uma conta: nome, e-mail e senha. Opcionalmente telefone e CPF.
            Ao comprar: endereço de entrega, CEP e os itens do pedido. O pagamento
            é processado pelo Mercado Pago — <strong>não recebemos nem armazenamos
            dados do seu cartão</strong>.
          </p>
          <p style={{ ...texto, marginTop: '12px' }}>
            Por segurança, registramos endereço IP e navegador em eventos de
            autenticação, como tentativas de login e alterações de senha.
          </p>
        </section>

        <section style={secao}>
          <h2 style={titulo}>Para que usamos</h2>
          <p style={texto}>
            Para identificar você na sua conta, processar e entregar pedidos,
            calcular frete, enviar e-mails sobre o andamento das compras e
            proteger a loja contra fraude e acesso indevido. Não vendemos nem
            cedemos seus dados para terceiros com finalidade publicitária.
          </p>
        </section>

        <section style={secao}>
          <h2 style={titulo}>Com quem compartilhamos</h2>
          <p style={texto}>
            Somente com quem é necessário para a compra acontecer: Mercado Pago
            (pagamento), Melhor Envio e transportadoras (entrega) e nosso provedor
            de e-mail. Cada um recebe apenas o mínimo necessário para a sua parte.
          </p>
        </section>

        <section style={secao}>
          <h2 style={titulo}>Como protegemos</h2>
          <p style={texto}>
            Senhas são guardadas apenas como hash bcrypt — não temos como lê-las.
            CPF e credenciais de integração são cifrados em repouso (AES-256-GCM).
            O acesso ao painel administrativo exige autenticação e oferece
            verificação em duas etapas. O site é servido sob HTTPS.
          </p>
        </section>

        <section style={secao}>
          <h2 style={titulo}>Cookies</h2>
          <p style={texto}>
            Usamos um cookie de sessão para manter você conectado — sem ele não é
            possível ter conta nem finalizar compra. Seu carrinho fica guardado no
            próprio navegador. Não utilizamos cookies de publicidade ou de
            rastreamento entre sites.
          </p>
        </section>

        <section style={secao}>
          <h2 style={titulo}>Seus direitos</h2>
          <p style={texto}>
            Você pode solicitar a qualquer momento: confirmação de que tratamos
            seus dados, acesso a eles, correção do que estiver errado,
            portabilidade, e a exclusão da sua conta e dos dados associados.
          </p>
          <p style={{ ...texto, marginTop: '12px' }}>
            Para exercer qualquer um deles, escreva para{' '}
            <a href="mailto:contato@palladinoprofumeria.com.br" style={{ color: 'var(--color-gold-dark)' }}>
              contato@palladinoprofumeria.com.br
            </a>
            . Responderemos em até 15 dias.
          </p>
          <p style={{ ...texto, marginTop: '12px' }}>
            Dados de pedidos concluídos podem ser mantidos pelo prazo exigido pela
            legislação fiscal, mesmo após o pedido de exclusão da conta.
          </p>
        </section>

        <p style={{ ...texto, fontSize: '0.85rem', marginTop: '50px', paddingTop: '20px', borderTop: '1px solid var(--hairline)' }}>
          Voltar para a <Link href="/" style={{ color: 'var(--color-gold-dark)' }}>loja</Link>.
        </p>
      </div>
    </>
  )
}
