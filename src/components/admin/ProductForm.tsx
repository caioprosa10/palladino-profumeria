"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'

type Categoria = { id: string; nome: string }
type Imagem = { id?: string; url: string }

type ProductFormProps = {
  categorias: Categoria[]
  initialData?: any
}

export default function ProductForm({ categorias, initialData }: ProductFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)
  
  const [formData, setFormData] = useState({
    nome: initialData?.nome || '',
    sku: initialData?.sku || '',
    categoria_id: initialData?.categoria_id || categorias[0]?.id || '',
    descricao: initialData?.descricao || '',
    descricao_curta: initialData?.descricao_curta || '',
    preco: initialData?.preco || '',
    preco_promocional: initialData?.preco_promocional || '',
    estoque: initialData?.estoque || 0,
    codigo_barras: initialData?.codigo_barras || '',
    peso: initialData?.peso || '',
    dimensoes: initialData?.dimensoes || '',
    fragrancia: initialData?.fragrancia || '',
    ativo: initialData ? initialData.ativo : true,
  })

  const [imageFiles, setImageFiles] = useState<File[]>([])
  const [previewUrls, setPreviewUrls] = useState<string[]>(
    initialData?.imagens?.map((img: Imagem) => img.url) || []
  )

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked
      setFormData(prev => ({ ...prev, [name]: checked }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files)
      setImageFiles(prev => [...prev, ...files])
      
      const newUrls = files.map(file => URL.createObjectURL(file))
      setPreviewUrls(prev => [...prev, ...newUrls])
    }
  }

  const removeImage = (index: number) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setPreviewUrls(prev => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setMessage(null)

    const formPayload = new FormData()
    Object.entries(formData).forEach(([key, value]) => {
      formPayload.append(key, value.toString())
    })

    imageFiles.forEach(file => {
      formPayload.append('imagens', file)
    })

    const url = initialData ? `/api/admin/produtos/${initialData.id}` : '/api/admin/produtos'
    const method = initialData ? 'PUT' : 'POST'

    try {
      const res = await fetch(url, {
        method,
        body: formPayload
      })
      
      const data = await res.json()
      
      if (!res.ok) throw new Error(data.error || 'Erro ao salvar produto')
      
      setMessage({ type: 'success', text: 'Produto salvo com sucesso!' })
      setTimeout(() => {
        router.back()
        router.refresh()
      }, 1500)
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message })
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} style={{ backgroundColor: '#fff', padding: '30px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
      {message && (
        <div style={{ padding: '15px', marginBottom: '20px', borderRadius: '6px', backgroundColor: message.type === 'success' ? '#dcfce7' : '#fee2e2', color: message.type === 'success' ? '#166534' : '#991b1b' }}>
          {message.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 500 }}>Nome do Produto *</label>
          <input required type="text" name="nome" value={formData.nome} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 500 }}>Categoria *</label>
          <select required name="categoria_id" value={formData.categoria_id} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', backgroundColor: '#fff' }}>
            {categorias.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.nome}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 500 }}>SKU *</label>
          <input 
            type="text" 
            name="sku" 
            value={initialData ? formData.sku : 'Gerado automaticamente (DX-XXXXXX)'} 
            readOnly 
            style={{ 
              width: '100%', 
              padding: '10px', 
              borderRadius: '4px', 
              border: '1px solid #cbd5e1', 
              backgroundColor: '#f1f5f9', 
              color: '#64748b', 
              cursor: 'not-allowed' 
            }} 
          />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 500 }}>Código de Barras</label>
          <input type="text" name="codigo_barras" value={formData.codigo_barras} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 500 }}>Preço (R$) *</label>
          <input required type="number" step="0.01" name="preco" value={formData.preco} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 500 }}>Preço Promocional (R$)</label>
          <input type="number" step="0.01" name="preco_promocional" value={formData.preco_promocional} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 500 }}>Estoque Inicial *</label>
          <input required type="number" name="estoque" value={formData.estoque} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 500 }}>Peso (kg)</label>
          <input type="number" step="0.01" name="peso" value={formData.peso} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
        </div>

        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 500 }}>Dimensões (CxLxA)</label>
          <input type="text" name="dimensoes" placeholder="Ex: 15x15x20" value={formData.dimensoes} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 500 }}>Fragrância / Notas</label>
          <input type="text" name="fragrancia" value={formData.fragrancia} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1' }} />
        </div>
      </div>

      <div style={{ marginTop: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 500 }}>Descrição Curta</label>
        <textarea name="descricao_curta" rows={2} value={formData.descricao_curta} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', resize: 'vertical' }} />
      </div>

      <div style={{ marginTop: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 500 }}>Descrição Completa *</label>
        <textarea required name="descricao" rows={5} value={formData.descricao} onChange={handleChange} style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid #cbd5e1', resize: 'vertical' }} />
      </div>

      <div style={{ marginTop: '20px' }}>
        <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9rem', fontWeight: 500 }}>Status do Produto</label>
        <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
          <input type="checkbox" name="ativo" checked={formData.ativo} onChange={handleChange} style={{ width: '20px', height: '20px' }} />
          <span>Ativo (Visível na loja)</span>
        </label>
      </div>

      <div style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
        <label style={{ display: 'block', marginBottom: '10px', fontSize: '0.9rem', fontWeight: 500 }}>Imagens do Produto (JPEG/PNG)</label>
        <input type="file" multiple accept="image/*" onChange={handleImageChange} style={{ display: 'block', marginBottom: '15px' }} />
        
        <div style={{ display: 'flex', gap: '15px', flexWrap: 'wrap' }}>
          {previewUrls.map((url, i) => (
            <div key={i} style={{ position: 'relative', width: '100px', height: '100px', border: '1px solid #e2e8f0', borderRadius: '4px', overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <button type="button" onClick={() => removeImage(i)} style={{ position: 'absolute', top: '5px', right: '5px', background: 'rgba(255,0,0,0.8)', color: '#fff', border: 'none', borderRadius: '50%', width: '20px', height: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10px' }}>
                X
              </button>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginTop: '30px', display: 'flex', justifyContent: 'flex-end', gap: '15px' }}>
        <button type="button" onClick={() => router.back()} disabled={loading} style={{ padding: '10px 20px', backgroundColor: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500 }}>
          Cancelar
        </button>
        <button type="submit" disabled={loading} style={{ padding: '10px 20px', backgroundColor: '#0f172a', color: '#fff', border: 'none', borderRadius: '4px', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
          {loading ? 'Salvando...' : 'Salvar Produto'}
        </button>
      </div>
    </form>
  )
}
