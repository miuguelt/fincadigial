import { useState, useEffect } from 'react';
import { fincaService, Finca } from '@/entities/finca/api/finca.service';
import { membershipService } from '@/entities/user/api/membership.service';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';
import { useToast } from '@/shared/hooks/use-toast';
import { FaBuilding, FaUserTag, FaPaperPlane } from 'react-icons/fa';
import { Loader2 } from 'lucide-react';

export const JoinFincaForm = () => {
  const [fincas, setFincas] = useState<Finca[]>([]);
  const [loadingFincas, setLoadingFincas] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedFinca, setSelectedFinca] = useState<string>('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const { toast } = useToast();

  useEffect(() => {
    const fetchFincas = async () => {
      try {
        const response = await fincaService.getAll();
        setFincas(response.data || []);
      } catch (error) {
        console.error('Error fetching fincas:', error);
      } finally {
        setLoadingFincas(false);
      }
    };
    fetchFincas();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFinca || !selectedRole) {
      toast({
        title: 'Campos incompletos',
        description: 'Por favor selecciona una finca y el rol que deseas tener.',
        variant: 'destructive',
      });
      return;
    }

    setSubmitting(true);
    try {
      await membershipService.sendRequest({
        finca_id: parseInt(selectedFinca),
        requested_role: selectedRole,
        message: message.trim() || undefined,
      });
      toast({
        title: 'Solicitud enviada',
        description: 'Tu solicitud ha sido enviada al administrador de la finca. Debes esperar su aprobación.',
        variant: 'default',
      });
      setSelectedFinca('');
      setSelectedRole('');
      setMessage('');
    } catch (error: any) {
      toast({
        title: 'Error al enviar solicitud',
        description: error?.message || 'No se pudo procesar tu solicitud en este momento.',
        variant: 'destructive',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 animate-in fade-in duration-500">
      <div className="space-y-2">
        <Label htmlFor="finca-select" className="text-sm font-semibold flex items-center gap-2">
          <FaBuilding className="text-green-600" /> Seleccionar Finca
        </Label>
        <Select value={selectedFinca} onValueChange={setSelectedFinca} disabled={loadingFincas}>
          <SelectTrigger id="finca-select" className="bg-white">
            <SelectValue placeholder={loadingFincas ? "Cargando fincas..." : "Selecciona una finca"} />
          </SelectTrigger>
          <SelectContent>
            {fincas.map((finca) => (
              <SelectItem key={finca.id} value={finca.id.toString()}>
                {finca.name} {finca.location ? `(${finca.location})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="role-select" className="text-sm font-semibold flex items-center gap-2">
          <FaUserTag className="text-green-600" /> Rol Solicitado
        </Label>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger id="role-select" className="bg-white">
            <SelectValue placeholder="¿Qué rol tendrás en esta finca?" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Aprendiz">Aprendiz / Estudiante</SelectItem>
            <SelectItem value="Operario">Operario / Trabajador de campo</SelectItem>
            <SelectItem value="Veterinario">Veterinario / Técnico</SelectItem>
            <SelectItem value="Instructor">Instructor / Supervisor</SelectItem>
            <SelectItem value="Administrador">Co-Administrador</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="message" className="text-sm font-semibold">Mensaje para el Administrador (Opcional)</Label>
        <Textarea 
          id="message" 
          placeholder="Ej: Soy estudiante del SENA y estaré apoyando en las labores de vacunación."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="bg-white min-h-[100px]"
        />
      </div>

      <Button 
        type="submit" 
        disabled={submitting || !selectedFinca || !selectedRole}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 shadow-lg transition-all hover:scale-[1.01] active:scale-[0.99]"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Enviando solicitud...
          </>
        ) : (
          <>
            <FaPaperPlane className="mr-2" />
            Enviar Solicitud de Membresía
          </>
        )}
      </Button>
    </form>
  );
};
