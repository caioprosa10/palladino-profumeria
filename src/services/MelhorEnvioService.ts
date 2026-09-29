import { prisma } from '@/lib/prisma'
import { decifrar } from '@/lib/cripto'

export interface ShippingRequest {
  cepDestino: string;
  produtos: Array<{
    id: string;
    weight: number;
    width: number;
    height: number;
    length: number;
    insurance_value: number;
    quantity: number;
  }>;
}

export interface ShippingResponse {
  id: number;
  name: string;
  price: string;
  custom_delivery_time: number;
  company: {
    id: number;
    name: string;
    picture: string;
  };
  error?: string;
}

export class MelhorEnvioService {
  private async getCredentials() {
    // 1. Tenta buscar no Banco de Dados
    const dbConfig = await prisma.configuracaoFrete.findFirst()
    
    // 2. Fallback para variáveis de ambiente
    const envToken = process.env.MELHOR_ENVIO_TOKEN
    const envAmbiente = process.env.MELHOR_ENVIO_ENV || 'production'
    const envCep = process.env.CEP_ORIGEM || '00000000'

    // O token do banco é gravado cifrado; decifrar devolve valores antigos
    // em claro como estão, então a migração dos dados pode ser gradual.
    const token = decifrar(dbConfig?.token) || envToken
    const ambiente = dbConfig?.ambiente || envAmbiente
    const cepOrigem = dbConfig?.cepOrigem || envCep

    if (!token) {
      throw new Error('CONFIG_MISSING')
    }

    const baseUrl = ambiente === 'sandbox' 
      ? 'https://sandbox.melhorenvio.com.br/api/v2/me' 
      : 'https://www.melhorenvio.com.br/api/v2/me'

    return { token, baseUrl, cepOrigem }
  }

  public async testConnection(): Promise<boolean> {
    try {
      const { token, baseUrl } = await this.getCredentials()
      
      const res = await fetch(`${baseUrl}/shipment/agencies`, {
        headers: {
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Aplicação E-commerce (suporte@exemplo.com)'
        },
      })

      return res.ok
    } catch (error) {
      return false
    }
  }

  public async calculate(request: ShippingRequest): Promise<ShippingResponse[]> {
    const { cepDestino, produtos } = request
    
    const cepNumerico = cepDestino.replace(/\D/g, '')
    if (cepNumerico.length !== 8) {
      throw new Error('CEP_INVALID')
    }

    // Validação gratuita via ViaCEP para evitar consumo desnecessário na API de fretes
    try {
      const viaCepRes = await fetch(`https://viacep.com.br/ws/${cepNumerico}/json/`)
      if (viaCepRes.ok) {
        const viaCepData = await viaCepRes.json()
        if (viaCepData.erro) {
          throw new Error('CEP_NOT_FOUND')
        }
      }
    } catch (error: any) {
      if (error.message === 'CEP_NOT_FOUND') throw error
      // Se a API do ViaCEP falhar por outro motivo (timeout, etc), ignoramos e seguimos para o ME
    }

    try {
      const { token, baseUrl, cepOrigem } = await this.getCredentials()

      const res = await fetch(`${baseUrl}/shipment/calculate`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'User-Agent': 'Aplicação E-commerce (suporte@exemplo.com)'
        },
        body: JSON.stringify({
          from: { postal_code: cepOrigem },
          to: { postal_code: cepNumerico },
          products: produtos
        })
      })

      if (!res.ok) {
        let errorData
        try {
          errorData = await res.json()
        } catch (e) {
          errorData = { message: 'Erro desconhecido da API' }
        }
        console.error('Erro na API Melhor Envio:', errorData)

        if (errorData?.errors?.postal_code) {
          throw new Error('CEP_NOT_FOUND')
        }
        
        if (errorData?.errors) {
          const firstErrorKey = Object.keys(errorData.errors)[0]
          const firstErrorMsg = errorData.errors[firstErrorKey][0]
          throw new Error(`VALIDATION_ERROR: ${firstErrorMsg}`)
        }

        if (errorData?.message === 'Unauthenticated.') {
          throw new Error('CONFIG_MISSING')
        }

        throw new Error('API_ERROR')
      }

      const data = await res.json()
      
      // Filtrar transportadoras que retornaram erro (ex: dimensões excedidas para correios)
      const validOptions = data.filter((option: any) => !option.error)
      
      if (validOptions.length === 0) {
         throw new Error('NO_CARRIERS')
      }

      return validOptions
    } catch (error: any) {
      if (
        error.message === 'CONFIG_MISSING' || 
        error.message === 'CEP_INVALID' || 
        error.message === 'NO_CARRIERS' ||
        error.message === 'CEP_NOT_FOUND' ||
        error.message.startsWith('VALIDATION_ERROR:')
      ) {
        throw error
      }
      throw new Error('SERVICE_UNAVAILABLE')
    }
  }
}

export const shippingService = new MelhorEnvioService()
