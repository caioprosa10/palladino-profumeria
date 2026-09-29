import nodemailer from 'nodemailer';

// Configuração do Transportador de E-mail (Exemplo genérico, substituir por SMTP real)
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: Number(process.env.SMTP_PORT) || 587,
  auth: {
    user: process.env.SMTP_USER || 'ethereal_user',
    pass: process.env.SMTP_PASS || 'ethereal_pass',
  },
});

const STORE_NAME = 'Dubai Elixir';
const STORE_EMAIL = 'contato@dubaielixir.com.br';
const LOGO_URL = 'https://dubaielixir.com.br/logo.png'; // Substituir pela URL real

export class EmailService {
  
  private static baseHtml(title: string, content: string) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Helvetica Neue', Arial, sans-serif; background-color: #fafafa; margin: 0; padding: 40px 20px; color: #333; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 40px; border-radius: 8px; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
          .header { text-align: center; margin-bottom: 40px; }
          .header h1 { font-family: 'Georgia', serif; font-size: 24px; color: #111; letter-spacing: 2px; text-transform: uppercase; }
          .content { font-size: 16px; line-height: 1.6; color: #555; }
          .content h2 { color: #111; font-family: 'Georgia', serif; font-size: 20px; border-bottom: 1px solid #eee; padding-bottom: 10px; }
          .btn { display: inline-block; padding: 15px 30px; background-color: #111; color: #fff; text-decoration: none; border-radius: 4px; text-transform: uppercase; font-size: 14px; letter-spacing: 1px; margin-top: 20px; }
          .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${STORE_NAME}</h1>
          </div>
          <div class="content">
            ${content}
          </div>
          <div class="footer">
            <p>Este é um e-mail automático, por favor não responda.</p>
            <p>&copy; ${new Date().getFullYear()} ${STORE_NAME}. Todos os direitos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  static async sendOrderConfirmed(to: string, userName: string, orderId: string, total: number) {
    const html = this.baseHtml('Confirmação de Pedido', `
      <h2>Seu pedido foi confirmado na Dubai Elixir ✨</h2>
      <p>Olá <strong>${userName}</strong>,</p>
      <p>Agradecemos pela sua compra! O seu pagamento foi processado com sucesso e nós já estamos separando o seu pedido.</p>
      <div style="background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 4px; border: 1px solid #eee;">
        <p><strong>Pedido Nº:</strong> ${orderId}</p>
        <p><strong>Valor Total:</strong> R$ ${total.toFixed(2).replace('.', ',')}</p>
      </div>
      <p>Você receberá um novo e-mail assim que o seu pedido for enviado.</p>
      <div style="text-align: center;">
        <a href="https://dubaielixir.com.br/cliente" class="btn" style="color: #ffffff;">Acompanhar Pedido</a>
      </div>
    `);

    return transporter.sendMail({
      from: `"${STORE_NAME}" <${STORE_EMAIL}>`,
      to,
      subject: 'Seu pedido foi confirmado na Dubai Elixir ✨',
      html
    });
  }

  static async sendOrderPreparing(to: string, userName: string, orderId: string) {
    const html = this.baseHtml('Pedido em Preparação', `
      <h2>Estamos preparando seu perfume com todo cuidado.</h2>
      <p>Olá <strong>${userName}</strong>,</p>
      <p>Temos boas notícias! A nossa equipe iniciou a separação e embalagem do seu pedido <strong>#${orderId}</strong>.</p>
      <p>Trabalhamos com os mais altos padrões para garantir que a sua fragrância chegue impecável até você.</p>
      <p>Logo enviaremos o código de rastreamento.</p>
    `);

    return transporter.sendMail({
      from: `"${STORE_NAME}" <${STORE_EMAIL}>`,
      to,
      subject: 'Estamos preparando seu perfume com todo cuidado.',
      html
    });
  }

  static async sendOrderShipped(to: string, userName: string, orderId: string, trackingCode: string, carrier: string) {
    const html = this.baseHtml('Pedido Enviado', `
      <h2>Seu pedido foi enviado!</h2>
      <p>Olá <strong>${userName}</strong>,</p>
      <p>O seu pedido <strong>#${orderId}</strong> foi coletado pela transportadora e já está a caminho do seu endereço.</p>
      <div style="background: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 4px; border: 1px solid #eee;">
        <p><strong>Transportadora:</strong> ${carrier}</p>
        <p><strong>Código de Rastreio:</strong> ${trackingCode}</p>
      </div>
      <div style="text-align: center;">
        <a href="https://rastreamento.correios.com.br/app/index.php" class="btn" style="color: #ffffff;">Rastrear Pedido</a>
      </div>
    `);

    return transporter.sendMail({
      from: `"${STORE_NAME}" <${STORE_EMAIL}>`,
      to,
      subject: 'Seu pedido foi enviado!',
      html
    });
  }

  static async sendOrderDelivered(to: string, userName: string, orderId: string) {
    const html = this.baseHtml('Pedido Entregue', `
      <h2>Esperamos que você aproveite sua nova fragrância.</h2>
      <p>Olá <strong>${userName}</strong>,</p>
      <p>O seu pedido <strong>#${orderId}</strong> consta como entregue em nosso sistema.</p>
      <p>Gostaríamos de agradecer por escolher a Dubai Elixir. Se você amou a sua experiência, adoraríamos saber! Avalie-nos em nosso site.</p>
      <div style="text-align: center;">
        <a href="https://dubaielixir.com.br" class="btn" style="color: #ffffff;">Voltar para a Loja</a>
      </div>
    `);

    return transporter.sendMail({
      from: `"${STORE_NAME}" <${STORE_EMAIL}>`,
      to,
      subject: 'Esperamos que você aproveite sua nova fragrância.',
      html
    });
  }
}
