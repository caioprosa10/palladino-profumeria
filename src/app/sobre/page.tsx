import { Navbar } from "@/components/layout/Navbar"
import { CartDrawer } from "@/components/cart/CartDrawer"

export default function SobrePage() {
  return (
    <>
      <Navbar />
      <div className="sub-page">
        <section className="about-section">
          <div className="about-container">
            <div className="about-content">
              <h2 className="about-title animate-reveal revealed">Sobre Nós</h2>
              <p className="about-paragraph animate-reveal revealed">
                Somos apaixonados pela perfumaria árabe e oferecemos fragrâncias originais que combinam tradição, qualidade e sofisticação. Nosso compromisso é proporcionar uma experiência de compra segura e ajudar você a encontrar o perfume perfeito para cada momento.
              </p>
            </div>
            <div className="about-image-wrapper animate-reveal revealed" style={{ height: '100%', display: 'flex' }}>
              <div className="about-img-border"></div>
              <img 
                src="/imagem perfume/about-brand.jpg" 
                alt="A Arte da Perfumaria" 
                className="about-img" 
                style={{ height: '100%', objectFit: 'cover' }}
              />
            </div>
          </div>
        </section>
      </div>
      <CartDrawer />
    </>
  )
}
