"use client"

import { Product } from "@/store/cartStore"
import Link from "next/link"

interface ProductCardProps {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  return (
    <Link href={`/produto/${product.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
      <div className="perfume-card">
        <div className="card-img-wrapper">
          <img 
            src={product.imagens[0]?.url || '/imagem perfume/perfume-men-1.jpg'} 
            alt={product.nome} 
            className="card-img" 
          />
          <div className="card-hover-overlay">
            <span className="btn-card" style={{ display: 'inline-block', textAlign: 'center' }}>
              Descobrir Fragrância
            </span>
          </div>
        </div>
        <div className="card-info">
          <span className="perfume-family">{product.descricao_curta}</span>
          <h3 className="perfume-name">{product.nome}</h3>
          <p className="perfume-desc">{product.preco.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
        </div>
      </div>
    </Link>
  )
}
