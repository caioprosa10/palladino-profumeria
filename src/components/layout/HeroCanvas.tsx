"use client"

import { useEffect, useRef, useState } from 'react'

export function HeroCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const loaderRef = useRef<HTMLDivElement>(null)
  const loaderBarRef = useRef<HTMLDivElement>(null)
  const loaderTextRef = useRef<HTMLSpanElement>(null)
  
  const [isLoaded, setIsLoaded] = useState(false)
  const imagesRef = useRef<HTMLImageElement[]>([])
  const [currentFrame, setCurrentFrame] = useState(0)

  useEffect(() => {
    const TOTAL_FRAMES = 40
    let loadedCount = 0
    let animationFrameId: number
    let startTime = 0
    const rotationSpeedPerSecond = 10.0
    const images: HTMLImageElement[] = []

    const updateLoaderProgress = () => {
      const percentage = Math.round((loadedCount / TOTAL_FRAMES) * 100)
      if (loaderBarRef.current) loaderBarRef.current.style.width = `${percentage}%`
      if (loaderTextRef.current) loaderTextRef.current.textContent = `${percentage}%`
      
      if (loadedCount === TOTAL_FRAMES) {
        setTimeout(revealSite, 600)
      }
    }

    const revealSite = () => {
      setIsLoaded(true)
      if (loaderRef.current) {
        loaderRef.current.classList.add('loader-hidden')
        setTimeout(() => {
          if (loaderRef.current) loaderRef.current.style.display = 'none'
        }, 800)
      }
      document.body.classList.add('loaded')
      
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.imageSmoothingEnabled = true
          ctx.imageSmoothingQuality = 'medium'
        }
        resizeCanvas()
      }
      
      startTime = performance.now()
      animationLoop(startTime)
      initScrollReveal()
    }

    const resizeCanvas = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      
      ctx.scale(dpr, dpr)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'medium'
    }

    const drawCurrentFrame = (currentF: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const floorFrame = Math.floor(currentF)
      const activeIndex1 = floorFrame % TOTAL_FRAMES
      const activeIndex2 = (floorFrame + 1) % TOTAL_FRAMES
      const fraction = currentF - floorFrame
      
      const img1 = imagesRef.current[activeIndex1]
      const img2 = imagesRef.current[activeIndex2]
      
      if (!img1 || !img1.complete || !img2 || !img2.complete) return
      
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const canvasWidth = canvas.width / dpr
      const canvasHeight = canvas.height / dpr
      
      // Aumentamos o crop para 13% para garantir que NENHUMA borda preta original do vídeo apareça por trás do header
      const cropY = img1.height * 0.13
      const sourceX = 0
      const sourceY = cropY
      const sourceWidth = img1.width
      const sourceHeight = img1.height - (cropY * 2)
      
      const imgRatio = sourceWidth / sourceHeight
      const canvasRatio = canvasWidth / canvasHeight
      
      let drawWidth, drawHeight, drawX, drawY
      
      if (imgRatio > canvasRatio) {
        drawHeight = canvasHeight
        drawWidth = canvasHeight * imgRatio
        drawY = 0
        // Ancoramos a imagem em 49% para que o frasco fique quase no centro, pendendo de forma extremamente sutil para a direita
        drawX = (canvasWidth - drawWidth) * 0.49
      } else {
        drawWidth = canvasWidth
        drawHeight = canvasWidth / imgRatio
        drawX = 0
        // Cortamos apenas 5% no topo e 95% na base para garantir que a tampa fique visível mas preencha a tela
        drawY = (canvasHeight - drawHeight) * 0.05
      }
      
      // Zoom em 1.00 (sem escala artificial adicional), garantindo o respiro máximo da imagem original que preenche a tela
      const scale = 1.00 
      const newWidth = drawWidth * scale
      const newHeight = drawHeight * scale
      // Âncora 49% para manter coerência
      const finalX = drawX + (drawWidth - newWidth) * 0.49
      // Ancoramos o crescimento da escala em 5% no topo e 95% na base para proteger a tampa
      const finalY = drawY + (drawHeight - newHeight) * 0.05
      
      ctx.clearRect(0, 0, canvasWidth, canvasHeight)
      
      ctx.globalAlpha = 1.0
      ctx.drawImage(img1, sourceX, sourceY, sourceWidth, sourceHeight, finalX, finalY, newWidth, newHeight)
      
      ctx.globalAlpha = fraction
      ctx.drawImage(img2, sourceX, sourceY, sourceWidth, sourceHeight, finalX, finalY, newWidth, newHeight)
      
      ctx.globalAlpha = 1.0
    }

    const animationLoop = (timestamp: number) => {
      animationFrameId = requestAnimationFrame(animationLoop)
      
      const elapsedSeconds = (timestamp - startTime) / 1000
      const current = (elapsedSeconds * rotationSpeedPerSecond) % TOTAL_FRAMES
      setCurrentFrame(current)
      drawCurrentFrame(current)
    }

    const initScrollReveal = () => {
      const revealElements = document.querySelectorAll('.animate-reveal')
      
      const observerOptions = {
        root: null,
        threshold: 0.05,
        rootMargin: "0px 0px -40px 0px"
      }
      
      const revealObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('revealed')
            revealObserver.unobserve(entry.target)
          }
        })
      }, observerOptions)
      
      revealElements.forEach(el => revealObserver.observe(el))
    }

    // Preload
    for (let i = 1; i <= TOTAL_FRAMES; i++) {
      const img = new Image()
      const frameNum = String(i).padStart(3, '0')
      
      img.onload = () => {
        img.decode()
          .then(() => {
            loadedCount++
            updateLoaderProgress()
          })
          .catch(() => {
            loadedCount++
            updateLoaderProgress()
          })
      }
      
      img.onerror = () => {
        loadedCount++ 
        updateLoaderProgress()
      }
      
      img.src = `/imagem perfume/ezgif-frame-${frameNum}.png`
      images.push(img)
    }
    
    imagesRef.current = images

    const handleResize = () => {
      resizeCanvas()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
    }
  }, [])

  return (
    <>
      {!isLoaded && (
        <div id="loader" className="loader-container" ref={loaderRef}>
          <div className="loader-content">
            <h2 className="loader-brand">PALLADINO</h2>
            <div className="loader-bar-container">
              <div id="loader-bar" className="loader-bar" ref={loaderBarRef}></div>
            </div>
            <span id="loader-percentage" className="loader-percentage" ref={loaderTextRef}>0%</span>
          </div>
        </div>
      )}

      <main className="hero-section" id="hero">
        <div className="canvas-container">
          <canvas id="perfume-canvas" ref={canvasRef}></canvas>
          <div className="canvas-overlay"></div>
        </div>

        <div className="hero-content">
          <h1 className="hero-title animate-reveal">Palladino Profumeria</h1>
          <h2 className="hero-subtitle animate-reveal" style={{ fontSize: '1.2rem', fontWeight: 300, marginBottom: '25px', letterSpacing: '1px', opacity: 0.9, transitionDelay: '0.6s' }}>
            O luxo da alta perfumaria italiana em cada fragrância.
          </h2>
          <p className="hero-description animate-reveal">
            Perfumes originais, alta fixação e sofisticação para todos os momentos.
          </p>
        </div>

        <div className="hero-footer">
          <div className="interaction-hint">
            <span className="mouse-icon">
              <span className="mouse-wheel"></span>
            </span>
            <span className="hint-text">PALLADINO AUTOMATIQUE</span>
          </div>
          {/* O site roda em plano gratuito e hiberna sem tráfego. Quem
              chega primeiro depois de um período de calma espera o
              servidor acordar, e sem aviso parece que a página travou. */}
          <p className="aviso-hospedagem">
            O primeiro acesso pode levar até 1 minuto porque o site roda em plano gratuito.
          </p>
        </div>
      </main>
    </>
  )
}
