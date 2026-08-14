import { useState, useEffect } from 'react';
import { Button } from '@/shared/ui/button';
import { Label } from '@/shared/ui/label';
import { Input } from '@/shared/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';
import { useToast } from '@/shared/hooks/use-toast';
import { invitationService, InvitationRequest } from '@/features/invitations/api/invitation.service';
import { membershipService } from '@/entities/user/api/membership.service';
import { Loader2, Copy, QrCode, Search, UserPlus, Share2, Check, ArrowRight, Sparkles } from 'lucide-react';
import { FaWhatsapp, FaUserShield, FaIdCard, FaEnvelope } from 'react-icons/fa';

interface InviteFormProps {
  fincaId: number;
  onSuccess?: () => void;
}

interface SearchedUser {
  id: number;
  fullname: string;
  identification: string;
  email: string;
  role: string;
}

export const InviteForm = ({ fincaId, onSuccess }: InviteFormProps) => {
  const [activeTab, setActiveTab] = useState<'search' | 'external'>('search');
  const { toast } = useToast();

  // Tab 1: Buscar y Agregar
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchedUser[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState<SearchedUser | null>(null);
  const [directRole, setDirectRole] = useState('Operario');
  const [directNotes, setDirectNotes] = useState('');
  const [submittingDirect, setSubmittingDirect] = useState(false);

  // Tab 2: Enlace Externo (WhatsApp / QR)
  const [externalEmail, setExternalEmail] = useState('');
  const [externalRole, setExternalRole] = useState('Operario');
  const [externalNotes, _setExternalNotes] = useState('');
  const [expiresHours, setExpiresHours] = useState('72');
  const [method, setMethod] = useState<'link' | 'qr' | 'email'>('link');
  const [submittingExternal, setSubmittingExternal] = useState(false);

  // Resultado
  const [createdInvitation, setCreatedInvitation] = useState<{
    token: string;
    url: string;
    qr_data: string;
  } | null>(null);

  // Efecto de búsqueda en tiempo real
  useEffect(() => {
    if (searchQuery.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await membershipService.searchUsers(searchQuery.trim());
        setSearchResults(response.data || []);
      } catch (error) {
        console.error('Error buscando usuarios:', error);
      } finally {
        setSearching(false);
      }
    }, 400);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery]);

  const handleSendDirectInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setSubmittingDirect(true);
    try {
      const data: InvitationRequest = {
        finca_id: fincaId,
        user_id: selectedUser.id,
        role: directRole,
        notes: directNotes.trim() || undefined,
        expires_hours: 168, // 7 días para invitaciones directas por defecto
        method: 'link',
      };

      await invitationService.create(data);
      toast({
        title: '¡Invitación Enviada!',
        description: `Se ha notificado a ${selectedUser.fullname} para unirse a tu equipo.`,
      });
      
      // Resetear
      setSelectedUser(null);
      setSearchQuery('');
      setDirectNotes('');
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'No se pudo enviar la invitación.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingDirect(false);
    }
  };

  const handleGenerateExternalInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingExternal(true);
    try {
      const data: InvitationRequest = {
        finca_id: fincaId,
        email: externalEmail.trim() || undefined,
        role: externalRole,
        notes: externalNotes.trim() || undefined,
        expires_hours: parseInt(expiresHours),
        method: externalEmail.trim() ? 'email' : method,
      };

      const response = await invitationService.create(data);
      setCreatedInvitation({
        token: response.data.token,
        url: response.data.url,
        qr_data: response.data.qr_data,
      });

      toast({
        title: '¡Invitación Generada!',
        description: 'Se ha creado el enlace de acceso correctamente.',
      });
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error?.response?.data?.message || 'No se pudo generar la invitación.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingExternal(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: '¡Copiado!', description: 'Enlace copiado al portapapeles' });
  };

  const shareOnWhatsApp = (url: string) => {
    const text = `¡Hola! Te invito a unirse a nuestro equipo en la finca utilizando la aplicación VillaLuz. Registrate o inicia sesión con este enlace: ${url}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(whatsappUrl, '_blank');
  };

  if (createdInvitation) {
    return (
      <div className="space-y-5 animate-in fade-in zoom-in-95 duration-300 bg-card p-6 rounded-2xl border shadow-xl">
        <div className="text-center space-y-2">
          <div className="mx-auto w-12 h-12 bg-success/20 text-success rounded-full flex items-center justify-center animate-bounce">
            <Check className="h-6 w-6" />
          </div>
          <h3 className="text-lg font-bold text-foreground">¡Invitación Creada con Éxito!</h3>
          <p className="text-sm text-muted-foreground">
            Comparte el enlace de abajo con tu invitado para que se una al instante.
          </p>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-xl border flex flex-col md:flex-row items-stretch md:items-center gap-3">
            <div className="flex-1 min-w-0">
              <span className="text-xs text-muted-foreground block font-semibold mb-1">Enlace de acceso</span>
              <code className="text-sm font-mono text-success block fit-clamp bg-background p-2 rounded-lg border">
                {createdInvitation.url}
              </code>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => copyToClipboard(createdInvitation.url)}
                className="flex-1 md:flex-none"
              >
                <Copy className="h-4 w-4 mr-2" /> Copiar
              </Button>
              <Button
                type="button"
                onClick={() => shareOnWhatsApp(createdInvitation.url)}
                className="bg-[#25D366] hover:bg-[#20ba56] text-white flex-1 md:flex-none"
                size="sm"
              >
                <FaWhatsapp className="h-4 w-4 mr-2" /> WhatsApp
              </Button>
            </div>
          </div>

          {method === 'qr' && (
            <div className="p-4 bg-background rounded-xl border flex flex-col items-center justify-center space-y-3">
              <p className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <QrCode className="h-4 w-4 text-success" /> Escanear Código QR
              </p>
              <div className="bg-white p-4 rounded-xl border shadow-inner">
                {/* Visual fallback for QR data */}
                <div className="w-40 h-40 flex flex-col items-center justify-center border-2 border-dashed border-muted rounded bg-muted/10 p-2 text-center">
                  <QrCode className="h-12 w-12 text-muted-foreground mb-2" />
                  <span className="text-[10px] text-muted-foreground font-mono break-anywhere line-clamp-3">
                    {createdInvitation.url}
                  </span>
                </div>
              </div>
              <p className="text-xs text-muted-foreground text-center">
                Muestra este código al usuario para que lo escanee directamente con su celular.
              </p>
            </div>
          )}
        </div>

        <Button
          variant="ghost"
          className="w-full text-success hover:bg-success/5 border border-dashed border-success/30"
          onClick={() => setCreatedInvitation(null)}
        >
          Crear otra invitación
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Selector de modo súper fácil */}
      <div className="grid grid-cols-2 p-1.5 bg-muted rounded-xl gap-1">
        <button
          type="button"
          onClick={() => {
            setActiveTab('search');
            setSelectedUser(null);
          }}
          className={`flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'search'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Search className="h-4 w-4" /> Buscar en Sistema
        </button>
        <button
          type="button"
          onClick={() => {
            setActiveTab('external');
            setSelectedUser(null);
          }}
          className={`flex items-center justify-center gap-2 py-2.5 text-sm font-semibold rounded-lg transition-all ${
            activeTab === 'external'
              ? 'bg-card text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          <Share2 className="h-4 w-4" /> Compartir Enlace/WhatsApp
        </button>
      </div>

      {/* --- MODO A: BUSCAR EN EL SISTEMA --- */}
      {activeTab === 'search' && (
        <div className="space-y-4 animate-in fade-in duration-300">
          {!selectedUser ? (
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-sm font-bold text-foreground">
                  Buscar usuario para invitar
                </Label>
                <p className="text-xs text-muted-foreground">
                  Busca por nombre, número de identificación (cédula) o correo electrónico.
                </p>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-10 bg-card rounded-xl border shadow-sm"
                  placeholder="Ej: Juan Perez o 100293..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {/* Resultados */}
              {searching ? (
                <div className="py-8 flex justify-center items-center gap-2 text-muted-foreground text-sm">
                  <Loader2 className="h-4 w-4 animate-spin text-success" />
                  Buscando en el sistema...
                </div>
              ) : searchResults.length > 0 ? (
                <div className="max-h-[250px] overflow-y-auto rounded-xl border border-muted divide-y divide-muted bg-card shadow-lg animate-in slide-in-from-top-2 duration-200">
                  {searchResults.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => setSelectedUser(u)}
                      className="w-full text-left p-3.5 hover:bg-muted/40 transition-colors flex items-center justify-between group"
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <span className="font-bold text-sm block group-hover:text-success transition-colors">
                          {u.fullname}
                        </span>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <FaIdCard className="h-3 w-3" /> C.C. {u.identification}
                          </span>
                          <span className="flex items-center gap-1 fit-clamp">
                            <FaEnvelope className="h-3 w-3" /> {u.email}
                          </span>
                        </div>
                      </div>
                      <div className="h-8 w-8 bg-success/10 text-success rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <UserPlus className="h-4 w-4" />
                      </div>
                    </button>
                  ))}
                </div>
              ) : searchQuery.trim().length >= 3 ? (
                <div className="p-8 text-center border border-dashed rounded-xl text-muted-foreground text-sm">
                  No encontramos ningún usuario con ese nombre o identificación. Intenta con otros datos o genera un Enlace Externo.
                </div>
              ) : null}
            </div>
          ) : (
            /* Usuario seleccionado, configurar rol y enviar */
            <form onSubmit={handleSendDirectInvite} className="bg-card p-5 rounded-2xl border border-success/30 shadow-lg space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-muted">
                <div>
                  <span className="text-xs text-success font-semibold tracking-wider uppercase block">
                    Usuario seleccionado
                  </span>
                  <h4 className="font-extrabold text-foreground text-base leading-tight">
                    {selectedUser.fullname}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Identificación: {selectedUser.identification} | Correo: {selectedUser.email}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedUser(null)}
                  className="text-xs hover:bg-muted"
                >
                  Cambiar
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direct-role" className="text-sm font-bold flex items-center gap-2">
                  <FaUserShield className="text-success h-4 w-4" /> Rol asignado
                </Label>
                <Select value={directRole} onValueChange={setDirectRole}>
                  <SelectTrigger id="direct-role" className="bg-muted/40 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Operario">Operario / Auxiliar de campo</SelectItem>
                    <SelectItem value="Veterinario">Veterinario / Técnico</SelectItem>
                    <SelectItem value="Capataz">Capataz / Encargado</SelectItem>
                    <SelectItem value="Administrador">Co-Administrador</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="direct-notes" className="text-sm font-bold">
                  Mensaje personalizado (opcional)
                </Label>
                <Textarea
                  id="direct-notes"
                  placeholder="Hola! Te invito a formar parte de nuestra finca..."
                  value={directNotes}
                  onChange={(e) => setDirectNotes(e.target.value)}
                  className="bg-muted/40 min-h-[70px] rounded-xl"
                />
              </div>

              <Button
                type="submit"
                disabled={submittingDirect}
                className="w-full bg-success hover:bg-green-700 text-white font-bold py-2.5 rounded-xl shadow-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {submittingDirect ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando invitación...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Invitar al Equipo
                  </>
                )}
              </Button>
            </form>
          )}
        </div>
      )}

      {/* --- MODO B: COMPARTIR ENLACE EXTERNO --- */}
      {activeTab === 'external' && (
        <form onSubmit={handleGenerateExternalInvite} className="space-y-4 animate-in fade-in duration-300">
          <div className="space-y-2">
            <div className="space-y-1">
              <Label htmlFor="ext-role" className="text-sm font-bold flex items-center gap-2">
                <FaUserShield className="text-success h-4 w-4" /> Rol para el invitado
              </Label>
              <p className="text-xs text-muted-foreground">
                Define el nivel de acceso que tendrá la persona cuando se registre.
              </p>
            </div>
            <Select value={externalRole} onValueChange={setExternalRole}>
              <SelectTrigger id="ext-role" className="bg-card rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Operario">Operario / Auxiliar de campo</SelectItem>
                <SelectItem value="Veterinario">Veterinario / Técnico</SelectItem>
                <SelectItem value="Capataz">Capataz / Encargado</SelectItem>
                <SelectItem value="Administrador">Co-Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="ext-method" className="text-sm font-bold">
                Método preferido
              </Label>
              <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
                <SelectTrigger id="ext-method" className="bg-card rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="link">Enlace / WhatsApp</SelectItem>
                  <SelectItem value="qr">Código QR</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ext-expires" className="text-sm font-bold">
                Expiración
              </Label>
              <Select value={expiresHours} onValueChange={setExpiresHours}>
                <SelectTrigger id="ext-expires" className="bg-card rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="24">24 horas</SelectItem>
                  <SelectItem value="72">3 días</SelectItem>
                  <SelectItem value="168">7 días</SelectItem>
                  <SelectItem value="720">30 días</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="ext-email" className="text-sm font-bold">
              Enviar por Correo Electrónico (opcional)
            </Label>
            <Input
              id="ext-email"
              type="email"
              placeholder="ejemplo@correo.com"
              value={externalEmail}
              onChange={(e) => setExternalEmail(e.target.value)}
              className="bg-card rounded-xl border shadow-sm"
            />
          </div>

          <Button
            type="submit"
            disabled={submittingExternal}
            className="w-full bg-success hover:bg-green-700 text-white font-bold py-2.5 rounded-xl shadow-lg transition-transform active:scale-[0.98] flex items-center justify-center gap-2"
          >
            {submittingExternal ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generando enlace...
              </>
            ) : (
              <>
                Generar Enlace de Invitación <ArrowRight className="h-4 w-4" />
              </>
            )}
          </Button>
        </form>
      )}
    </div>
  );
};
