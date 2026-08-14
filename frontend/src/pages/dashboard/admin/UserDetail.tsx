import { useParams, useNavigate } from 'react-router-dom';
import { useUsers } from '@/entities/user/model/useUser';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/ui/card';
import { Badge } from '@/shared/ui/badge';
import { Button } from '@/shared/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/ui/tabs';
import { ArrowLeft, User, Mail, Phone, MapPin, Calendar, Shield, Building2, TrendingUp, PlusCircle, Activity, CheckCircle2, BadgeCheck } from 'lucide-react';
import { ClimbingBoxLoader } from 'react-spinners';
import { UserCredentialBadge } from '@/entities/professional-credential/ui/UserCredentialBadge';
import { CredentialReviewPanel } from '@/features/professional-credential-review/ui/CredentialReviewPanel';

const UserDetail = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { users, loading, error } = useUsers();

  if (loading) {
    return (
      <div className="flex justify-center items-center h-full">
        <ClimbingBoxLoader color="#2563EB" size={30} />
      </div>
    );
  }

  if (error) return <p className="text-destructive">{error}</p>;

  const user = users.find((u: any) => u.id === Number(userId));

  if (!user) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <Button
            variant="outline"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Volver
          </Button>
        </div>
        <p>Usuario no encontrado.</p>
      </div>
    );
  }

  const isActive = typeof user.status === 'boolean' ? user.status : user.status === 1;

  return (
    <div className="p-6 max-w-5xl mx-auto animate-fade-in">
      <div className="mb-6 flex justify-between items-center">
        <Button
          variant="outline"
          onClick={() => navigate(-1)}
          className="hover:bg-muted/50"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Volver a Usuarios
        </Button>
      </div>

      <Card className="mb-6 border-border/50 shadow-lg overflow-hidden">
        <div className="h-2 bg-gradient-to-r from-success/40 via-success to-success/40" />
        <CardHeader className="bg-muted/10 pb-4 border-b border-border/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-success/20 to-success/5 border border-success/20 flex items-center justify-center text-success shadow-sm">
                 <User className="w-8 h-8" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold flex items-center gap-2">
                  {user.fullname}
                </CardTitle>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant={isActive ? "default" : "secondary"} className={isActive ? "bg-success/10 text-success border border-success/20 hover:bg-success/20" : ""}>
                    {isActive ? 'Activo' : 'Inactivo'}
                  </Badge>
                  <span className="text-sm text-muted-foreground font-mono flex items-center gap-1.5"><Shield className="w-3.5 h-3.5"/> {user.role}</span>
                  <UserCredentialBadge userId={user.id} role={user.role} />
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                onClick={() => navigate(`/admin/user-history/${user.identification}`)}
                variant="outline"
                className="bg-background"
              >
                <Activity className="w-4 h-4 mr-2" />
                Historial de Actividad
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <Tabs defaultValue="general" className="w-full">
            <div className="px-6 border-b border-border/50 bg-muted/5">
              <TabsList className="bg-transparent h-14 -mb-px gap-6">
                <TabsTrigger 
                  value="general" 
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-success data-[state=active]:shadow-none rounded-none px-0 font-medium text-muted-foreground data-[state=active]:text-foreground h-14"
                >
                  <User className="w-4 h-4 mr-2" />
                  Información General
                </TabsTrigger>
                <TabsTrigger 
                  value="fincas" 
                  className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-success data-[state=active]:shadow-none rounded-none px-0 font-medium text-muted-foreground data-[state=active]:text-foreground h-14"
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Fincas y Rendimiento
                </TabsTrigger>
                {/* El cotejo solo aplica al rol que firma actos clínicos. */}
                {user.role === 'Veterinario' && (
                  <TabsTrigger
                    value="credential"
                    className="data-[state=active]:bg-transparent data-[state=active]:border-b-2 data-[state=active]:border-success data-[state=active]:shadow-none rounded-none px-0 font-medium text-muted-foreground data-[state=active]:text-foreground h-14"
                  >
                    <BadgeCheck className="w-4 h-4 mr-2" />
                    Acreditación
                  </TabsTrigger>
                )}
              </TabsList>
            </div>
            
            <TabsContent value="general" className="p-6 m-0 animate-in fade-in-50 duration-500">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-foreground/80">
                      <Shield className="w-5 h-5 text-success" />
                      Datos Personales
                    </h3>
                    <Card className="border-border/50 bg-muted/5">
                       <CardContent className="p-5 space-y-4">
                         <div className="flex items-start gap-4">
                           <div className="p-2 bg-background rounded-lg border border-border/50 text-muted-foreground">
                             <User className="w-4 h-4" />
                           </div>
                           <div>
                             <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Nombre Completo</p>
                             <p className="font-semibold text-foreground">{user.fullname}</p>
                           </div>
                         </div>
                         <div className="flex items-start gap-4">
                           <div className="p-2 bg-background rounded-lg border border-border/50 text-muted-foreground">
                             <Shield className="w-4 h-4" />
                           </div>
                           <div>
                             <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Identificación</p>
                             <p className="font-mono text-base font-semibold text-foreground tracking-tight">{user.identification}</p>
                           </div>
                         </div>
                       </CardContent>
                    </Card>
                  </div>

                  <div>
                     <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-foreground/80">
                        <Calendar className="w-5 h-5 text-success" />
                        Información del Sistema
                      </h3>
                      <Card className="border-border/50 bg-muted/5">
                       <CardContent className="p-5 grid grid-cols-2 gap-4">
                           <div>
                             <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Registro</p>
                             <p className="font-medium text-sm text-foreground">
                               {user.created_at ? new Date(user.created_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No disponible'}
                             </p>
                           </div>
                           <div>
                             <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Actualizado</p>
                             <p className="font-medium text-sm text-foreground">
                               {user.updated_at ? new Date(user.updated_at).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : 'No disponible'}
                             </p>
                           </div>
                       </CardContent>
                      </Card>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2 text-foreground/80">
                      <Mail className="w-5 h-5 text-success" />
                      Datos de Contacto
                    </h3>
                    <Card className="border-border/50 bg-muted/5">
                       <CardContent className="p-5 space-y-4">
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-background rounded-lg border border-border/50 text-muted-foreground">
                              <Mail className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Correo Electrónico</p>
                              <p className="font-medium text-foreground">{user.email}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-background rounded-lg border border-border/50 text-muted-foreground">
                              <Phone className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Teléfono Móvil</p>
                              <p className="font-medium text-foreground">{user.phone || 'No registrado'}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-start gap-4">
                            <div className="p-2 bg-background rounded-lg border border-border/50 text-muted-foreground">
                              <MapPin className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">Dirección de Residencia</p>
                              <p className="font-medium text-foreground">{user.address || 'No registrada'}</p>
                            </div>
                          </div>
                       </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="fincas" className="p-6 m-0 animate-in fade-in-50 duration-500">
               <div className="flex items-center justify-between mb-6">
                 <div>
                   <h3 className="text-xl font-bold text-foreground">Asignación de Fincas</h3>
                   <p className="text-muted-foreground text-sm mt-1">Administra los accesos y visualiza el rendimiento del usuario por cada finca.</p>
                 </div>
                 <Button className="bg-success text-white hover:bg-success/90">
                   <PlusCircle className="w-4 h-4 mr-2" />
                   Vincular a Finca
                 </Button>
               </div>

               {user.fincas && user.fincas.length > 0 ? (
                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   {user.fincas.map((finca: any) => (
                      <Card key={finca.id} className="border-border/60 hover:border-success/40 transition-colors bg-card overflow-hidden">
                        <div className="p-5 border-b border-border/40 flex items-start justify-between bg-muted/5">
                           <div className="flex items-center gap-3">
                             <div className="h-10 w-10 rounded-lg bg-success/10 text-success flex items-center justify-center border border-success/20">
                               <Building2 className="w-5 h-5" />
                             </div>
                             <div>
                               <h4 className="font-bold text-foreground">{finca.name}</h4>
                               <Badge variant="outline" className="mt-1 bg-background text-[10px] uppercase font-semibold">{finca.role}</Badge>
                             </div>
                           </div>
                           <Badge variant={finca.is_active ? "default" : "secondary"} className={finca.is_active ? "bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 border border-emerald-500/20" : ""}>
                              {finca.is_active ? 'Vinculado' : 'Suspendido'}
                           </Badge>
                        </div>
                        <div className="p-5 bg-background">
                           <h5 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-4 flex items-center gap-2">
                             <TrendingUp className="w-4 h-4" />
                             Resumen de Rendimiento
                           </h5>
                           <div className="grid grid-cols-2 gap-4">
                             <div className="space-y-1">
                               <p className="text-sm text-muted-foreground">Días Asignados</p>
                               <p className="text-2xl font-bold text-foreground">142</p>
                             </div>
                             <div className="space-y-1">
                               <p className="text-sm text-muted-foreground">Productividad</p>
                               <div className="flex items-center gap-2">
                                  <p className="text-2xl font-bold text-success">94%</p>
                                  <CheckCircle2 className="w-4 h-4 text-success" />
                               </div>
                             </div>
                           </div>
                           <div className="mt-6 pt-4 border-t border-border/40">
                             <Button variant="outline" className="w-full justify-between group text-success border-success/30 hover:bg-success/5">
                               Ver Reporte Detallado
                               <ArrowLeft className="w-4 h-4 rotate-180 group-hover:translate-x-1 transition-transform" />
                             </Button>
                           </div>
                        </div>
                      </Card>
                   ))}
                 </div>
               ) : (
                 <div className="flex flex-col items-center justify-center py-16 bg-muted/10 rounded-xl border border-dashed border-border/60">
                    <Building2 className="w-12 h-12 text-muted-foreground/30 mb-4" />
                    <h4 className="text-lg font-medium text-foreground mb-2">Sin Fincas Asignadas</h4>
                    <p className="text-muted-foreground text-center max-w-sm mb-6">Este usuario actualmente no está vinculado a ninguna finca. Vincula al usuario para que pueda acceder al sistema.</p>
                    <Button variant="outline" className="border-success/30 text-success hover:bg-success/5">
                      Vincular Ahora
                    </Button>
                 </div>
               )}
            </TabsContent>

            {user.role === 'Veterinario' && (
              <TabsContent value="credential" className="p-6 m-0 animate-in fade-in-50 duration-500">
                <div className="mb-6">
                  <h3 className="text-xl font-bold text-foreground">Acreditación profesional</h3>
                  <p className="text-muted-foreground text-sm mt-1 [overflow-wrap:break-word]">
                    Coteja los datos declarados contra el registro público de COMVEZCOL. Villa Luz
                    no acredita el ejercicio profesional: solo deja constancia de que tú
                    verificaste esa coincidencia y en qué fecha.
                  </p>
                </div>
                <CredentialReviewPanel userId={user.id} userName={user.fullname} />
              </TabsContent>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default UserDetail;