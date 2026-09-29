"use client"

import { useState } from 'react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import * as XLSX from 'xlsx'

export default function AdminFinanceiroClient({ children }: { children: React.ReactNode }) {
  const [exportingPDF, setExportingPDF] = useState(false)
  const [exportingExcel, setExportingExcel] = useState(false)

  const fetchExportData = async () => {
    const res = await fetch('/api/admin/financeiro/export')
    if (!res.ok) throw new Error('Falha na autenticação ou erro no servidor.')
    return await res.json()
  }

  const handleExportPDF = async () => {
    try {
      setExportingPDF(true)
      const data = await fetchExportData()
      
      if (!data || data.length === 0) {
        alert('Não há dados para exportar no momento.')
        return
      }
      
      const doc = new jsPDF()
      
      // Cabeçalho
      doc.setFontSize(20)
      doc.text('Dubai Elixir', 14, 22)
      doc.setFontSize(12)
      doc.setTextColor(100)
      doc.text('Relatório Financeiro Consolidado', 14, 32)
      doc.setFontSize(10)
      doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, 14, 40)
      
      const formatCurrency = (val: number) => `R$ ${val.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`

      const tableData = data.map((p: any) => [
        new Date(p.createdAt).toLocaleDateString('pt-BR'),
        `#${p.id.slice(-6).toUpperCase()}`,
        p.usuario?.nome || 'Cliente Anônimo',
        formatCurrency(p.subtotal),
        formatCurrency(p.frete),
        formatCurrency(p.total)
      ])

      const totalFaturado = data.reduce((acc: number, p: any) => acc + p.total, 0)
      
      // Tabela Principal
      autoTable(doc, {
        startY: 50,
        head: [['Data', 'Pedido', 'Cliente', 'Subtotal', 'Frete', 'Total']],
        body: tableData,
        theme: 'striped',
        headStyles: { fillColor: [15, 23, 42] },
        styles: { fontSize: 9 }
      })
      
      // Resumo final
      const finalY = (doc as any).lastAutoTable?.finalY || 50
      doc.setFontSize(12)
      doc.setTextColor(15, 23, 42)
      doc.text(`Total Faturado no Período: ${formatCurrency(totalFaturado)}`, 14, finalY + 15)

      doc.save(`Dubai_Elixir_Financeiro_${new Date().getTime()}.pdf`)

    } catch (error) {
      console.error(error)
      alert('Erro ao exportar PDF. Verifique suas permissões.')
    } finally {
      setExportingPDF(false)
    }
  }

  const handleExportExcel = async () => {
    try {
      setExportingExcel(true)
      const data = await fetchExportData()
      
      if (!data || data.length === 0) {
        alert('Não há dados para exportar no momento.')
        return
      }
      
      const worksheetData = data.map((p: any) => ({
        'Data': new Date(p.createdAt).toLocaleDateString('pt-BR'),
        'ID Pedido': `#${p.id.slice(-6).toUpperCase()}`,
        'Cliente': p.usuario?.nome || 'Anônimo',
        'Email': p.usuario?.email || 'N/A',
        'Status': p.status.toUpperCase(),
        'Subtotal (R$)': p.subtotal,
        'Frete (R$)': p.frete,
        'Total (R$)': p.total
      }))

      const worksheet = XLSX.utils.json_to_sheet(worksheetData)
      const workbook = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Financeiro')

      // Auto-size columns (simple approach)
      const wscols = [
        { wch: 12 }, { wch: 12 }, { wch: 25 }, { wch: 30 }, { wch: 15 }, { wch: 15 }, { wch: 15 }, { wch: 15 }
      ]
      worksheet['!cols'] = wscols

      XLSX.writeFile(workbook, `Dubai_Elixir_Financeiro_${new Date().getTime()}.xlsx`)

    } catch (error) {
      console.error(error)
      alert('Erro ao exportar Excel. Verifique suas permissões.')
    } finally {
      setExportingExcel(false)
    }
  }

  const handleLimparTestes = async () => {
    if (confirm('Tem certeza? Isso apagará todos os pedidos "pendentes" (não pagos). Use apenas para limpar testes.')) {
      if (confirm('Confirmação dupla: Deseja realmente APAGAR os dados de pedidos não aprovados?')) {
        try {
          const res = await fetch('/api/admin/financeiro/limpar-testes', { method: 'POST' })
          if (res.ok) {
            alert('Pedidos de teste limpados com sucesso.')
            window.location.reload()
          } else {
            alert('Erro ao limpar pedidos.')
          }
        } catch (error) {
          alert('Erro de conexão.')
        }
      }
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '-50px', position: 'relative', zIndex: 10, paddingRight: '10px' }}>
        <button 
          onClick={handleLimparTestes}
          style={{ padding: '8px 15px', backgroundColor: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 500, fontSize: '0.85rem' }}
        >
          Limpar Testes
        </button>
        <button 
          onClick={handleExportPDF}
          disabled={exportingPDF}
          style={{ padding: '8px 15px', backgroundColor: '#e2e8f0', color: '#0f172a', border: 'none', borderRadius: '4px', cursor: exportingPDF ? 'wait' : 'pointer', fontWeight: 500, fontSize: '0.85rem' }}
        >
          {exportingPDF ? 'Gerando PDF...' : 'Exportar PDF'}
        </button>
        <button 
          onClick={handleExportExcel}
          disabled={exportingExcel}
          style={{ padding: '8px 15px', backgroundColor: '#e2e8f0', color: '#0f172a', border: 'none', borderRadius: '4px', cursor: exportingExcel ? 'wait' : 'pointer', fontWeight: 500, fontSize: '0.85rem' }}
        >
          {exportingExcel ? 'Gerando Excel...' : 'Exportar Excel'}
        </button>
      </div>
      
      <div style={{ marginTop: '50px' }}>
        {children}
      </div>
    </div>
  )
}
