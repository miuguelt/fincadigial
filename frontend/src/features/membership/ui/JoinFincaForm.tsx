import { useJoinFincaForm } from '@/features/membership/model/useJoinFincaForm';
import { FincaSelectField } from './FincaSelectField';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';
import { Alert, AlertDescription, AlertTitle } from '@/shared/ui/alert';
import { AlertTriangle, Loader2, Search, Send, UserCog } from 'lucide-react';

interface JoinFincaFormProps {
  /** Se ejecuta cuando la solicitud se envía correctamente (p. ej. para cerrar el modal). */
  onSuccess?: () => void;
  /** Se ejecuta al hacer clic en "Cancelar". Si no se pasa, el botón no se muestra. */
  onCancel?: () => void;
}

const REQUESTABLE_ROLES = [
  { value: 'Aprendiz', label: 'Aprendiz / Estudiante' },
  { value: 'Operario', label: 'Operario / Trabajador de campo' },
  { value: 'Veterinario', label: 'Veterinario / Técnico' },
  { value: 'Instructor', label: 'Instructor / Supervisor' },
  { value: 'Administrador', label: 'Co-Administrador' },
];

export const JoinFincaForm = ({ onSuccess, onCancel }: JoinFincaFormProps = {}) => {
  const form = useJoinFincaForm(onSuccess);
  const inputsDisabled = form.loadingFincas || !!form.loadError;

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void form.submit();
      }}
      className="space-y-4 animate-in fade-in duration-300"
    >
      {form.loadError && (
        <Alert className="bg-destructive/5 border-destructive/30">
          <AlertTitle className="font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" aria-hidden />
            No se pudieron cargar las fincas
          </AlertTitle>
          <AlertDescription className="space-y-3">
            <p className="text-sm">{form.loadError}</p>
            <Button type="button" variant="outline" size="sm" onClick={form.reload}>
              Reintentar
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="finca-search" className="text-sm font-semibold flex items-center gap-2">
          <Search className="h-4 w-4 text-success" aria-hidden /> Buscar finca
        </Label>
        <Input
          id="finca-search"
          placeholder="Nombre, municipio o departamento"
          value={form.search}
          onChange={(event) => form.setSearch(event.target.value)}
          disabled={inputsDisabled}
        />
      </div>

      <FincaSelectField
        fincas={form.filteredFincas}
        value={form.selectedFinca}
        onChange={form.setSelectedFinca}
        loading={form.loadingFincas}
        disabled={inputsDisabled}
        hiddenCount={form.hiddenCount}
        hasSearch={!!form.search.trim()}
      />

      <div className="space-y-2">
        <Label htmlFor="role-select" className="text-sm font-semibold flex items-center gap-2">
          <UserCog className="h-4 w-4 text-success" aria-hidden /> Rol solicitado
        </Label>
        <Select
          value={form.selectedRole}
          onValueChange={form.setSelectedRole}
          disabled={!form.selectedFinca}
        >
          <SelectTrigger id="role-select" className="bg-card">
            <SelectValue placeholder="¿Qué rol tendrá en esta finca?" />
          </SelectTrigger>
          <SelectContent>
            {REQUESTABLE_ROLES.map((role) => (
              <SelectItem key={role.value} value={role.value}>
                {role.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="membership-message" className="text-sm font-semibold">
          Mensaje para el administrador (opcional)
        </Label>
        <Textarea
          id="membership-message"
          placeholder="Ej: Soy estudiante del SENA y estaré apoyando en las labores de vacunación."
          value={form.message}
          onChange={(event) => form.setMessage(event.target.value)}
          className="bg-card min-h-[100px]"
          maxLength={500}
        />
      </div>

      <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-1">
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={form.submitting}>
            Cancelar
          </Button>
        )}
        <Button
          type="submit"
          disabled={form.submitting || !form.selectedFinca || !form.selectedRole}
          className="min-w-[200px]"
        >
          {form.submitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
              Enviando solicitud...
            </>
          ) : (
            <>
              <Send className="mr-2 h-4 w-4" aria-hidden />
              Enviar solicitud de acceso
            </>
          )}
        </Button>
      </div>
    </form>
  );
};
