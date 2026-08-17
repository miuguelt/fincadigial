import { Building2, ExternalLink, IdCard, Mail, Phone, ShieldCheck, User as UserIcon, Users } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/shared/ui/table';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/ui/cn';
import { getAutoStatusClass } from '@/shared/utils/badgeStyles';
import { isUserActive } from '../utils/user.utils';
import type { UserWithProfile } from '../types';

interface GlobalUsersTableProps {
  users: UserWithProfile[];
  totalUsers: number;
  onSelectUser: (user: UserWithProfile) => void;
}

/** Numero nacional: WhatsApp exige indicativo, y el backend guarda 10 digitos. */
const toWhatsAppNumber = (phone: unknown) => {
  const digits = String(phone ?? '').replace(/\D/g, '');
  return digits.length === 10 ? `57${digits}` : digits;
};

const UserIdentityCell = ({ user }: { user: UserWithProfile }) => {
  const whatsappNumber = toWhatsAppNumber(user.phone);
  const greeting = `Hola ${user.fullname?.split(' ')[0] || ''}, te escribo desde la administración.`;

  return (
    <div className="flex items-start gap-3">
      <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/20 via-emerald-500/10 to-emerald-500/5 flex items-center justify-center text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/20 shadow-sm shrink-0">
        {user.fullname?.charAt(0) || <UserIcon className="h-5 w-5" />}
      </div>
      <div className="flex flex-col min-w-0">
        <span className="font-bold text-foreground group-hover:text-emerald-600 transition-colors fit-clamp">
          {user.fullname}
        </span>
        <div className="flex flex-col gap-0.5 mt-0.5">
          <span className="text-[11px] text-muted-foreground flex items-center gap-1.5 fit-clamp">
            <Mail className="h-3 w-3 text-primary shrink-0 opacity-70" /> {user.email}
          </span>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1">
              <Phone className="h-3 w-3 text-primary shrink-0 opacity-70" /> {user.phone || 'N/A'}
            </span>
            {Boolean(whatsappNumber) && (
              <a
                href={`https://wa.me/${whatsappNumber}?text=${encodeURIComponent(greeting)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                title="Enviar WhatsApp"
                className="text-[#128C7E] dark:text-[#25D366] hover:scale-110 transition-transform"
              >
                <FaWhatsapp className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
            <IdCard className="h-3 w-3 text-primary shrink-0 opacity-70" /> ID: {user.identification}
          </span>
        </div>
      </div>
    </div>
  );
};

const UserFincasCell = ({ user }: { user: UserWithProfile }) => {
  if (!user.fincas || user.fincas.length === 0) {
    return <span className="text-xs text-muted-foreground italic">Sin fincas asignadas</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {user.fincas.map((f: any) => (
        <div
          key={f.id || f.finca_id}
          className="flex items-center gap-1.5 bg-muted/50 border border-border/60 rounded-lg px-2 py-0.5 text-[11px] shadow-sm hover:border-emerald-500/40 transition-all"
          title={`${f.name || f.finca_name} - Rol: ${f.role}`}
        >
          <Building2 className="h-3 w-3 text-emerald-600 shrink-0" />
          <span className="font-bold text-foreground/80 fit-clamp max-w-[110px]">{f.name || f.finca_name}</span>
          <span className="text-[11px] text-muted-foreground uppercase">• {f.role}</span>
          {f.is_active && <div className="h-1.5 w-1.5 bg-emerald-500 rounded-full shrink-0" title="Activa" />}
        </div>
      ))}
    </div>
  );
};

/** Listado maestro en tabla. La vista de tarjetas vive en GlobalUserCard. */
export const GlobalUsersTable = ({ users, totalUsers, onSelectUser }: GlobalUsersTableProps) => (
  <Card className="border-border/60 shadow-lg overflow-hidden">
    <CardHeader className="bg-muted/30 border-b border-border/60 py-3.5 px-5">
      <div className="flex items-center justify-between">
        <div>
          <CardTitle className="text-base text-foreground font-bold flex items-center gap-2">
            <Users className="h-4 w-4 text-emerald-600" />
            Listado Maestro de Usuarios
          </CardTitle>
          <CardDescription className="text-xs">
            Mostrando {users.length} de {totalUsers} usuarios en el sistema
          </CardDescription>
        </div>
      </div>
    </CardHeader>
    <CardContent className="p-0">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[280px]">Identidad y Contacto</TableHead>
              <TableHead>Rol Global</TableHead>
              <TableHead>Fincas Asociadas</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((user) => {
              const active = isUserActive(user);

              return (
                <TableRow
                  key={user.id}
                  className="group hover:bg-emerald-500/5 transition-all border-b border-border/50 last:border-0 cursor-pointer"
                  onClick={() => onSelectUser(user)}
                >
                  <TableCell>
                    <UserIdentityCell user={user} />
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className="rounded-full px-2.5 py-0.5 text-xs font-black uppercase border-primary/30 bg-primary/10 text-primary"
                    >
                      <ShieldCheck className="h-3 w-3 mr-1 opacity-70" />
                      {user.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[360px]">
                    <UserFincasCell user={user} />
                  </TableCell>
                  <TableCell>
                    <Badge
                      className={cn(
                        'rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase',
                        getAutoStatusClass(active ? 'Activo' : 'Inactivo')
                      )}
                    >
                      {active ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-xl font-bold bg-primary/10 text-primary border border-primary/20 hover:bg-primary hover:text-white shadow-none transition-all duration-200 text-xs px-3"
                      aria-label={`Ver detalles de ${user.fullname}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectUser(user);
                      }}
                    >
                      <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                      Ver Perfil Completo
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </CardContent>
  </Card>
);
