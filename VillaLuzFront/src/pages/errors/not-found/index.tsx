import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Button } from '@/shared/ui/button'
import { IconMap2, IconHome2 } from '@/shared/ui/icons'

const Custom404: React.FC = () => {
  const navigate = useNavigate()

  return (
    <div className="h-[100dvh] bg-gradient-to-b from-green-50 to-green-100 flex items-center justify-center px-4">
      <div className="max-w-xl w-full bg-card rounded-[3rem] shadow-2xl p-8 sm:p-12 text-center border border-green-200/50 backdrop-blur-sm">
        <div className="flex h-24 w-24 items-center justify-center rounded-full bg-primary/10 mx-auto mb-8">
          <IconMap2 size={48} className="text-primary opacity-80" />
        </div>
        
        <h1 className="text-3xl sm:text-4xl font-black text-foreground mb-4 tracking-tighter">
          No encontramos esa página
        </h1>
        
        <p className="text-base sm:text-lg text-muted-foreground mb-10 leading-relaxed">
          Parece que se perdió caminando por la finca digital. No se preocupe, 
          incluso a los mejores vaqueros se les escapa el camino a veces.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button 
            onClick={() => navigate('/dashboard')} 
            size="lg" 
            className="w-full sm:w-auto rounded-2xl font-bold px-8 py-6 h-auto shadow-lg shadow-primary/20"
          >
            <IconHome2 size={20} className="mr-2" />
            Volver al Inicio
          </Button>
          <Button 
            onClick={() => navigate(-1)} 
            variant="outline" 
            size="lg" 
            className="w-full sm:w-auto rounded-2xl font-bold px-8 py-6 h-auto border-border/60"
          >
            Regresar
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Custom404
