import React from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/shared/ui/card';
import { IconUserPlus, IconLoader2, IconInfoCircle } from '@/shared/ui/icons';

interface SignupSuccessProps {
  message?: string;
}

export const SignupSuccess: React.FC<SignupSuccessProps> = () => {
  return (
    <div className="min-h-screen overflow-y-auto flex justify-center bg-gradient-to-br from-green-50 to-green-100 px-4 py-8">
      <Card className="w-full max-w-md h-fit my-auto">
        <CardContent className="pt-8">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center w-12 h-12 rounded-[var(--radius-full)] bg-success/10 mb-4">
              <IconUserPlus size="md" className="text-success" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              ¡Cuenta registrada!
            </h2>
            <div className="bg-warning/5 border border-amber-200 rounded-lg p-4 mb-4 text-left">
              <p className="text-warning text-sm font-medium mb-1 flex items-center gap-2">
                <IconInfoCircle size="sm" /> Importante: Pendiente de aprobación
              </p>
              <p className="text-warning text-xs leading-relaxed">
                Tu cuenta ha sido creada, pero un administrador de la finca Villa Luz debe <strong>aprobar tu registro</strong> antes de que puedas acceder.
                <br /><br />
                Este proceso suele ser rápido. Intenta iniciar sesión más tarde para verificar tu estado.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <IconLoader2 size="sm" className="animate-spin text-success" />
              Redirigiendo a inicio de sesión...
            </div>
            <div className="mt-4">
              <Link to="/login" className="text-sm text-success hover:text-success font-medium">
                Ir al inicio de sesión ahora
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
