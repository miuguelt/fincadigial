import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import {
  ShieldCheck,
  Lock,
  Eye,
  Globe,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { Link } from 'react-router-dom';

interface FincaPrivacyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FincaPrivacyModal: React.FC<FincaPrivacyModalProps> = ({
  open,
  onOpenChange,
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">
                Políticas de Privacidad y Visibilidad de Fincas
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Marco de protección de datos ganaderos (Ley 1581 de 2012 - Habeas Data Colombia)
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          {/* Niveles de Visibilidad de Fincas */}
          <div>
            <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
              <span>Niveles de Privacidad por Finca</span>
              <Badge variant="outline" className="text-[10px] uppercase font-bold">
                Configurable por Finca
              </Badge>
            </h4>
            <p className="text-xs text-muted-foreground mb-3">
              Cada finca puede definir qué información expone al público en el catálogo de fincas disponibles:
            </p>

            <div className="grid gap-2.5">
              {/* Mínima */}
              <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 mt-0.5">
                  <Lock className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-xs">Mínima (Recomendada para producción comercial)</span>
                    <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-700 dark:text-amber-300">
                      Protegida
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Solo muestra nombre, departamento y municipio. Oculta de forma estricta las estadísticas de ganado, número de cabezas y alertas sanitarias para proteger el patrimonio y seguridad del productor.
                  </p>
                </div>
              </div>

              {/* Estándar */}
              <div className="p-3 rounded-xl border border-sky-500/30 bg-sky-500/5 flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-600 mt-0.5">
                  <Eye className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-xs">Estándar (Fincas gremiales o asociativas)</span>
                    <Badge variant="outline" className="text-[10px] border-sky-500/40 text-sky-700 dark:text-sky-300">
                      Intermedia
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Muestra datos institucionales y de contacto administrativo para facilitar la vinculación de colaboradores y aprendices, reservando la información sanitaria individual.
                  </p>
                </div>
              </div>

              {/* Completa */}
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/5 flex items-start gap-3">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600 mt-0.5">
                  <Globe className="h-4 w-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-foreground text-xs">Completa (Fincas pedagógicas o demostrativas)</span>
                    <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-700 dark:text-emerald-300">
                      Pública
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Expone en tiempo real el censo de animales vivos, distribución por sexo y estado sanitario. Ideal para predios del SENA, centros de investigación o granjas escuela.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Políticas de Tratamiento de Datos Personales */}
          <div className="border-t border-border pt-4">
            <h4 className="font-bold text-foreground mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <span>Protección de Datos Personales y Multimedia</span>
            </h4>
            <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
              <p>
                De acuerdo con la <strong>Ley 1581 de 2012</strong> y el <strong>Decreto 1377 de 2013</strong> de Colombia:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li>
                  <strong>Fotografías de predios:</strong> Las imágenes subidas por el administrador deben limitarse a vistas panorámicas, instalaciones o animales de la finca, evitando exponer rostros de menores o documentos de identidad.
                </li>
                <li>
                  <strong>Ubicación y GPS:</strong> Las coordenadas geográficas se almacenan de forma segura y solo se comparten públicamente si la finca ha configurado visibilidad autorizada.
                </li>
                <li>
                  <strong>Derechos ARCO:</strong> Los propietarios y colaboradores tienen derecho a conocer, actualizar, rectificar y solicitar la supresión de sus datos personales registrados.
                </li>
              </ul>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="border-t border-border pt-4 flex items-center justify-between gap-3">
            <Link
              to="/legal/privacidad"
              target="_blank"
              className="text-xs font-semibold text-primary hover:underline flex items-center gap-1.5"
            >
              <span>Ver Aviso de Privacidad Completo</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>

            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Entendido
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
