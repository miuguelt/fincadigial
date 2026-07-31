import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';

// Import pages using lazy loading for better performance
const LandingPage = lazy(() => import('@/pages/landing/index'));
const LoginPage = lazy(() => import('@/pages/auth/login/index.tsx'));
const RegisterPage = lazy(() => import('@/pages/auth/register/index.tsx'));
const RegisterUserPage = lazy(() => import('@/pages/auth/register-user/index.tsx'));
const FincasPublicasPage = lazy(() => import('@/pages/auth/register-user/fincas-publicas.tsx'));
const ForgotPasswordPage = lazy(() => import('@/pages/auth/forgot-password/index.tsx'));
const ResetPasswordPage = lazy(() => import('@/pages/auth/reset-password/index.tsx'));
const InviteAcceptPage = lazy(() => import('@/pages/auth/InviteAcceptPage'));
const DashboardLayout = lazy(() => import('@/widgets/dashboard-layout/DashboardLayout.tsx'));
const AdminDashboard = lazy(() => import('@/pages/dashboard/admin/AdminDashboard.tsx'));
const AdminUsersPage = lazy(() => import('@/pages/dashboard/admin/users/index.tsx'));
const AdminGlobalUsersPage = lazy(() => import('@/pages/dashboard/admin/users/GlobalUsersPage.tsx'));
const UnauthorizedPage = lazy(() => import('@/pages/errors/unauthorized/index.tsx'));
const ApprenticeDashboard = lazy(() => import('@/pages/dashboard/apprentice/ApprenticeDashboard.tsx'));
const InstructorDashboard = lazy(() => import('@/pages/dashboard/instructor/InstructorDashboard.tsx'));
const OperarioDashboard = lazy(() => import('@/pages/dashboard/operario/OperarioDashboard.tsx'));
const VeterinarioDashboard = lazy(() => import('@/pages/dashboard/veterinario/VeterinarioDashboard.tsx'));
const NotFoundPage = lazy(() => import('@/pages/errors/not-found/index.tsx'));
const RoleDashboardRedirect = lazy(() => import('@/pages/dashboard/RoleDashboardRedirect'));
const UserProfilePage = lazy(() => import('@/pages/dashboard/user/UserProfile'));
const AdminMembershipPage = lazy(() => import('@/pages/dashboard/admin/membership/index.tsx'));
const AdminUserApprovalPage = lazy(() => import('@/pages/dashboard/admin/user-approval/index.tsx'));
const FincasAdminPage = lazy(() => import('@/pages/dashboard/admin/fincas/FincasAdminPage.tsx'));
const JoinFincaPage = lazy(() => import('@/features/multi-finca/ui/JoinFincaPage.tsx'));

const AdminDiseasesPage = lazy(() => import('@/pages/dashboard/admin/diseases/index.tsx'));
const AdminMedicationsPage = lazy(() => import('@/pages/dashboard/admin/medications/index.tsx'));
const AdminGeneticImprovementsPage = lazy(() => import('@/pages/dashboard/admin/genetic_improvements/index.tsx'));
const AdminRouteAdministrationPage = lazy(() => import('@/pages/dashboard/admin/route_administration/index.tsx'));
const AdminVaccinationsPage = lazy(() => import('@/pages/dashboard/admin/vaccinations/index.tsx'));
const AdminVaccinesPage = lazy(() => import('@/pages/dashboard/admin/vaccines/index.tsx'));
const AdminFoodTypesPage = lazy(() => import('@/pages/dashboard/admin/food-types/index.tsx'));
const FoodTypesCreatePage = lazy(() => import('@/pages/dashboard/admin/food-types/create.tsx'));
const FoodTypesEditPage = lazy(() => import('@/pages/dashboard/admin/food-types/edit.tsx'));

const AdminFieldsPage = lazy(() => import('@/pages/dashboard/admin/fields/index.tsx'));
const AdminTreatmentMedicationsPage = lazy(() => import('@/pages/dashboard/admin/treatment_medications/index.tsx'));
const AdminTreatmentMedicationsFormPage = lazy(() => import('@/pages/dashboard/admin/treatment_medications/form.tsx'));
const AdminTreatmentMedicationsDetailPage = lazy(() => import('@/pages/dashboard/admin/treatment_medications/detail.tsx'));
const AdminTreatmentVaccinesPage = lazy(() => import('@/pages/dashboard/admin/treatment_vaccines/index.tsx'));
const AdminTreatmentVaccinesFormPage = lazy(() => import('@/pages/dashboard/admin/treatment_vaccines/form.tsx'));
const AdminTreatmentVaccinesDetailPage = lazy(() => import('@/pages/dashboard/admin/treatment_vaccines/detail.tsx'));
const AdminAnimalDiseasesPage = lazy(() => import('@/pages/dashboard/admin/animalDiseases/index.tsx'));
const AdminAnimalFieldsPage = lazy(() => import('@/pages/dashboard/admin/animalFields/index.tsx'));
const AdminBaseModelPage = lazy(() => import('@/pages/dashboard/admin/base_model/index.tsx'));
const AdminControlPage = lazy(() => import('@/pages/dashboard/admin/control/index.tsx'));
const AdminSpeciesPage = lazy(() => import('@/pages/dashboard/admin/species/index.tsx'));
const AdminBreedsPage = lazy(() => import('@/pages/dashboard/admin/breeds/index.tsx'));
const AdminTreatmentsPage = lazy(() => import('@/pages/dashboard/admin/treatments/index.tsx'));
const AdminTreatmentFormPage = lazy(() => import('@/pages/dashboard/admin/treatments/form.tsx'));
const AdminTreatmentDetailPage = lazy(() => import('@/pages/dashboard/admin/treatments/detail.tsx'));
const AdminTreatmentAnalyticsPage = lazy(() => import('@/pages/dashboard/admin/treatments/analytics.tsx'));
const AdminAnimalsPage = lazy(() => import('@/pages/dashboard/admin/animals/index.tsx'));
const AdminInventoryPage = lazy(() => import('@/pages/dashboard/admin/inventory/index.tsx'));
const AdminReproductionPage = lazy(() => import('@/pages/dashboard/admin/reproduction/index.tsx'));
const FertilityDashboard = lazy(() => import('@/pages/dashboard/admin/reproduction/FertilityDashboard.tsx'));
const SirePerformance = lazy(() => import('@/pages/dashboard/admin/reproduction/SirePerformance.tsx'));
const AdminGrowthPage = lazy(() => import('@/pages/dashboard/admin/growth/index.tsx'));
const RegulatoryReportsPage = lazy(() => import('@/pages/dashboard/admin/regulatory-reports/index.tsx'));

// Páginas cableadas pendientes
const AdminMilkProductionPage = lazy(() => import('@/pages/dashboard/admin/milk_production/index.tsx'));
const AdminTasksPage = lazy(() => import('@/pages/dashboard/admin/tasks/index.tsx'));
const CalendarPage = lazy(() => import('@/pages/dashboard/calendar/CalendarPage'));
const AdminActivityLogPage = lazy(() => import('@/pages/dashboard/admin/activity_log/index.tsx'));
const AdminDataOverviewPage = lazy(() => import('@/pages/dashboard/admin/data-overview/index.tsx'));
const AdminDiagnosticsPage = lazy(() => import('@/pages/dashboard/admin/diagnostics/index.tsx'));
const AdminOperationalPage = lazy(() => import('@/pages/dashboard/admin/operational/index.tsx'));
const AlertsPage = lazy(() => import('@/pages/dashboard/admin/alerts/index.tsx'));
const AlertConfigsPage = lazy(() => import('@/pages/dashboard/admin/alerts/AlertConfigsPage.tsx'));
const ReportsPage = lazy(() => import('@/pages/dashboard/admin/reports/index.tsx'));

// Módulo Campesino
const CampesinoDashboard = lazy(() => import('@/pages/dashboard/campesino/CampesinoDashboard'));
const GanaderiaOperativaPage = lazy(() => import('@/pages/dashboard/campesino/GanaderiaOperativaPage'));
const CampesinoHealthDashboard = lazy(() => import('@/pages/dashboard/campesino/health/index'));
const CropPlotsPage = lazy(() => import('@/pages/dashboard/campesino/CropPlotsPage'));
const CropActivitiesPage = lazy(() => import('@/pages/dashboard/campesino/CropActivitiesPage'));
const RegistroOperativoPage = lazy(() => import('@/pages/dashboard/campesino/RegistroOperativoPage'));
const WaterSourcesPage = lazy(() => import('@/pages/dashboard/campesino/WaterSourcesPage'));
const ClimateAlertsPage = lazy(() => import('@/pages/dashboard/campesino/ClimateAlertsPage'));
const WeatherDashboardPage = lazy(() => import('@/pages/dashboard/campesino/WeatherDashboardPage'));
const MarketOffersPage = lazy(() => import('@/pages/dashboard/campesino/MarketOffersPage'));
const TechnicalAssistancePage = lazy(() => import('@/pages/dashboard/campesino/TechnicalAssistancePage'));

// Calculadoras y herramientas
const FrameScoreCalculator = lazy(() => import('@/features/cattle/ui/FrameScoreCalculator'));
const RationCalculator = lazy(() => import('@/features/operational/ui/RationCalculator'));

const AnimalScannerPage = lazy(() => import('@/pages/scanner/AnimalScannerPage'));
const ChatPage = lazy(() => import('@/pages/chat/ChatPage'));

// Academy / Training pages
const CourseListPage = lazy(() => import('@/pages/dashboard/instructor/courses/CourseListPage'));
const CourseDetailPage = lazy(() => import('@/pages/dashboard/instructor/courses/CourseDetailPage'));
const LessonPage = lazy(() => import('@/pages/dashboard/instructor/courses/LessonPage'));

// Analytics Pages
const DashboardExecutive = lazy(() => import('@/pages/dashboard/admin/analytics/DashboardExecutive'));
const FieldsPage = lazy(() => import('@/pages/dashboard/admin/analytics/FieldsPage'));
const CustomReports = lazy(() => import('@/pages/dashboard/admin/analytics/CustomReports'));
const ICADashboard = lazy(() => import('@/pages/dashboard/admin/analytics/ICADashboard'));
const FinancialDashboard = lazy(() => import('@/pages/dashboard/admin/financial/index'));
const MultiFincaAnalytics = lazy(() => import('@/pages/dashboard/admin/analytics/MultiFincaAnalytics'));

// Auth & Loading
import { useAuth } from '@/features/auth/model/useAuth';
import LoadingScreen from '@/shared/ui/common/LoadingScreen';

// Helper for generating common routes for different roles
const renderRoleRoutes = (prefix: string) => (
  <>
    <Route path={`${prefix}/analytics/executive`} element={<DashboardExecutive />} />
    <Route path={`${prefix}/analytics/fields`} element={<FieldsPage />} />
    <Route path={`${prefix}/analytics/reports`} element={<CustomReports />} />
    <Route path={`${prefix}/analytics/ica-compliance`} element={<ICADashboard />} />
    <Route path={`${prefix}/users`} element={<AdminUsersPage />} />
    <Route path={`${prefix}/users/global`} element={<AdminGlobalUsersPage />} />
    <Route path={`${prefix}/membership`} element={<AdminMembershipPage />} />
    <Route path={`${prefix}/fincas`} element={<FincasAdminPage />} />
    <Route path={`${prefix}/user-approval`} element={<AdminUserApprovalPage />} />
    <Route path={`${prefix}/data-overview`} element={<AdminDataOverviewPage />} />
    <Route path={`${prefix}/animals`} element={<AdminAnimalsPage />} />
    <Route path={`${prefix}/animals/:id`} element={<AdminAnimalsPage />} />
    <Route path={`${prefix}/fields`} element={<AdminFieldsPage />} />
    <Route path={`${prefix}/vaccines`} element={<AdminVaccinesPage />} />
    <Route path={`${prefix}/vaccinations`} element={<AdminVaccinationsPage />} />
    <Route path={`${prefix}/medications`} element={<AdminMedicationsPage />} />
    <Route path={`${prefix}/diseases`} element={<AdminDiseasesPage />} />
    <Route path={`${prefix}/treatment_medications`} element={<AdminTreatmentMedicationsPage />} />
    <Route path={`${prefix}/treatment_vaccines`} element={<AdminTreatmentVaccinesPage />} />
    <Route path={`${prefix}/treatments/analytics`} element={<AdminTreatmentAnalyticsPage />} />
    <Route path={`${prefix}/treatments`} element={<AdminTreatmentsPage />} />
    <Route path={`${prefix}/treatments/form`} element={<AdminTreatmentFormPage />} />
    <Route path={`${prefix}/treatments/form/:id`} element={<AdminTreatmentFormPage />} />
    <Route path={`${prefix}/treatments/detail/:id`} element={<AdminTreatmentDetailPage />} />
    <Route path={`${prefix}/controls`} element={<AdminControlPage />} />
    <Route path={`${prefix}/animal-fields`} element={<AdminAnimalFieldsPage />} />
    <Route path={`${prefix}/disease-animals`} element={<AdminAnimalDiseasesPage />} />
    <Route path={`${prefix}/genetic-improvements`} element={<AdminGeneticImprovementsPage />} />
    <Route path={`${prefix}/species`} element={<AdminSpeciesPage />} />
    <Route path={`${prefix}/breeds`} element={<AdminBreedsPage />} />
    <Route path={`${prefix}/food-types`} element={<AdminFoodTypesPage />} />
    <Route path={`${prefix}/inventory`} element={<AdminInventoryPage />} />
    <Route path={`${prefix}/reproduction`} element={<AdminReproductionPage />} />
    <Route path={`${prefix}/reproduction/fertility`} element={<FertilityDashboard />} />
    <Route path={`${prefix}/reproduction/sire-performance`} element={<SirePerformance />} />
    <Route path={`${prefix}/growth`} element={<AdminGrowthPage />} />
    <Route path={`${prefix}/regulatory-reports`} element={<RegulatoryReportsPage />} />
    <Route path={`${prefix}/reports`} element={<ReportsPage />} />
    <Route path={`${prefix}/milk-production`} element={<AdminMilkProductionPage />} />
    <Route path={`${prefix}/tasks`} element={<AdminTasksPage />} />
    <Route path={`${prefix}/calendar`} element={<CalendarPage />} />
    <Route path={`${prefix}/tools/frame-calculator`} element={<FrameScoreCalculator />} />
    <Route path={`${prefix}/tools/ration-calculator`} element={<RationCalculator />} />
  </>
);

const AppRoutes = () => {
  const { loading } = useAuth() as any;
  const location = useLocation();

  useEffect(() => {
    try {
      const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
      if (isMobile) {
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
        document.documentElement.scrollTop = 0;
        document.body.scrollTop = 0;
      }
    } catch (_) {
      return;
    }
  }, [location.pathname]);

  if (loading) {
    return <LoadingScreen message="Verificando autenticación..." />;
  }

  return (
    <Suspense fallback={<LoadingScreen message="Cargando módulo..." />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        {/* Registro - Semántica unificada */}
        <Route path="/register" element={<Navigate to="/register/finca" replace />} />
        <Route path="/register/finca" element={<RegisterPage />} />
        <Route path="/register/user" element={<RegisterUserPage />} />
        <Route path="/fincas-disponibles" element={<FincasPublicasPage />} />
        {/* Legacy redirects */}
        <Route path="/signup" element={<Navigate to="/register/user" replace />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/unauthorized" element={<UnauthorizedPage />} />
        <Route path="/invite/:token" element={<InviteAcceptPage />} />

        {/* Protected Routes */}
        <Route element={<DashboardLayout />}>
          <Route element={<ProtectedRoute allowedRoles={['Administrador', 'Instructor', 'Aprendiz', 'Propietario', 'Capataz', 'Veterinario', 'Operario']} />}>
            <Route path="/dashboard" element={<RoleDashboardRedirect />} />
            <Route path="/profile" element={<UserProfilePage />} />
            <Route path="/select-finca" element={<JoinFincaPage />} />
            {/* Compatibilidad con enlaces antiguos: la creación real se abre en el modal global. */}
            <Route path="/fincas/crear" element={<Navigate to="/dashboard?modal=create-finca" replace />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="/alerts" element={<AlertsPage />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['Administrador', 'Propietario', 'Capataz']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/administrador/dashboard" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/administrador" element={<Navigate to="/admin/dashboard" replace />} />
            <Route path="/admin/chat" element={<ChatPage />} />
            <Route path="/admin/scanner" element={<AnimalScannerPage />} />
            <Route path="/admin/analytics/executive" element={<DashboardExecutive />} />
            <Route path="/admin/analytics/fields" element={<FieldsPage />} />
            <Route path="/admin/analytics/reports" element={<CustomReports />} />
            <Route path="/admin/analytics/ica-compliance" element={<ICADashboard />} />
            <Route path="/admin/analytics/multi-finca" element={<MultiFincaAnalytics />} />
            <Route path="/admin/financial" element={<FinancialDashboard />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/users/global" element={<AdminGlobalUsersPage />} />
            <Route path="/admin/user-approval" element={<AdminUserApprovalPage />} />
            <Route path="/admin/membership" element={<AdminMembershipPage />} />
<Route path="/admin/fincas" element={<FincasAdminPage />} />
            <Route path="/admin/animals" element={<AdminAnimalsPage />} />
            <Route path="/admin/animals/:id" element={<AdminAnimalsPage />} />
            <Route path="/admin/fields" element={<AdminFieldsPage />} />
            <Route path="/admin/species" element={<AdminSpeciesPage />} />
            <Route path="/admin/breeds" element={<AdminBreedsPage />} />
            <Route path="/admin/control" element={<AdminControlPage />} />
            <Route path="/admin/treatment_medications" element={<AdminTreatmentMedicationsPage />} />
            <Route path="/admin/treatment_medications/form" element={<AdminTreatmentMedicationsFormPage />} />
            <Route path="/admin/treatment_medications/form/:id" element={<AdminTreatmentMedicationsFormPage />} />
            <Route path="/admin/treatment_medications/detail/:id" element={<AdminTreatmentMedicationsDetailPage />} />
            <Route path="/admin/treatment_vaccines" element={<AdminTreatmentVaccinesPage />} />
            <Route path="/admin/treatment_vaccines/form" element={<AdminTreatmentVaccinesFormPage />} />
            <Route path="/admin/treatment_vaccines/form/:id" element={<AdminTreatmentVaccinesFormPage />} />
            <Route path="/admin/treatment_vaccines/detail/:id" element={<AdminTreatmentVaccinesDetailPage />} />
            <Route path="/admin/disease-animals" element={<AdminAnimalDiseasesPage />} />
            <Route path="/admin/animal-fields" element={<AdminAnimalFieldsPage />} />
            <Route path="/admin/animalDiseases" element={<Navigate to="/admin/disease-animals" replace />} />
            <Route path="/admin/animalFields" element={<Navigate to="/admin/fields" replace />} />
            <Route path="/admin/user" element={<Navigate to="/admin/users" replace />} />
            <Route path="/admin/base_model" element={<AdminBaseModelPage />} />
            <Route path="/admin/route_administration" element={<AdminRouteAdministrationPage />} />
            <Route path="/admin/vaccinations" element={<AdminVaccinationsPage />} />
            <Route path="/admin/vaccines" element={<AdminVaccinesPage />} />
            <Route path="/admin/diseases" element={<AdminDiseasesPage />} />
            <Route path="/admin/medications" element={<AdminMedicationsPage />} />
            <Route path="/admin/food-types" element={<AdminFoodTypesPage />} />
            <Route path="/admin/food-types/create" element={<FoodTypesCreatePage />} />
            <Route path="/admin/food-types/edit/:id" element={<FoodTypesEditPage />} />
            <Route path="/admin/genetic_improvements" element={<AdminGeneticImprovementsPage />} />
            <Route path="/admin/genetic-improvements" element={<AdminGeneticImprovementsPage />} />
            <Route path="/admin/controls" element={<AdminControlPage />} />
            <Route path="/admin/treatments/analytics" element={<AdminTreatmentAnalyticsPage />} />
            <Route path="/admin/treatments" element={<AdminTreatmentsPage />} />
            <Route path="/admin/treatments/form" element={<AdminTreatmentFormPage />} />
            <Route path="/admin/treatments/form/:id" element={<AdminTreatmentFormPage />} />
            <Route path="/admin/treatments/detail/:id" element={<AdminTreatmentDetailPage />} />
            <Route path="/admin/inventory" element={<AdminInventoryPage />} />
            <Route path="/admin/reproduction" element={<AdminReproductionPage />} />
            <Route path="/admin/reproduction/fertility" element={<FertilityDashboard />} />
            <Route path="/admin/reproduction/sire-performance" element={<SirePerformance />} />
            <Route path="/admin/growth" element={<AdminGrowthPage />} />
            <Route path="/admin/regulatory-reports" element={<RegulatoryReportsPage />} />
            <Route path="/admin/reports" element={<ReportsPage />} />
            <Route path="/admin/milk-production" element={<AdminMilkProductionPage />} />
            <Route path="/admin/tasks" element={<AdminTasksPage />} />
            <Route path="/admin/calendar" element={<CalendarPage />} />
            <Route path="/admin/activity-log" element={<AdminActivityLogPage />} />
            <Route path="/admin/data-overview" element={<AdminDataOverviewPage />} />
            <Route path="/admin/diagnostics" element={<AdminDiagnosticsPage />} />
            <Route path="/admin/operational" element={<AdminOperationalPage />} />
            <Route path="/admin/alerts" element={<AlertsPage />} />
            <Route path="/admin/alerts/configs" element={<AlertConfigsPage />} />
            <Route path="/admin/tools/frame-calculator" element={<FrameScoreCalculator />} />
            <Route path="/admin/tools/ration-calculator" element={<RationCalculator />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['Aprendiz', 'Operario', 'Administrador']} />}>
            <Route path="/apprentice/dashboard" element={<ApprenticeDashboard />} />
            <Route path="/operario/dashboard" element={<OperarioDashboard />} />
            {renderRoleRoutes('/apprentice')}
            {renderRoleRoutes('/operario')}
          </Route>
          {/* Quick-add forms accesibles para todos los roles de la finca */}
          <Route element={<ProtectedRoute allowedRoles={['Administrador', 'Propietario', 'Capataz', 'Instructor', 'Veterinario', 'Aprendiz', 'Operario']} />}>
            {/* Los formularios rápidos viven en el modal global para conservar la vista activa. */}
            <Route path="/quick/control" element={<Navigate to="/dashboard?quick=control" replace />} />
            <Route path="/quick/transfer" element={<Navigate to="/dashboard?quick=transfer" replace />} />
            <Route path="/quick/disease" element={<Navigate to="/dashboard?quick=disease" replace />} />
            <Route path="/quick/treatment" element={<Navigate to="/dashboard?quick=treatment" replace />} />
            <Route path="/quick/milk" element={<Navigate to="/dashboard?quick=milk" replace />} />
            <Route path="/quick/water" element={<Navigate to="/dashboard?quick=water" replace />} />
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['Instructor', 'Veterinario', 'Administrador']} />}>
            <Route path="/instructor/dashboard" element={<InstructorDashboard />} />
            <Route path="/veterinario/dashboard" element={<VeterinarioDashboard />} />
            <Route path="/instructor/scanner" element={<AnimalScannerPage />} />
            <Route path="/veterinario/scanner" element={<AnimalScannerPage />} />
            <Route path="/instructor/courses" element={<CourseListPage />} />
            <Route path="/instructor/courses/:slug" element={<CourseDetailPage />} />
            <Route path="/instructor/courses/:slug/lessons/:lessonId" element={<LessonPage />} />
            <Route path="/instructor/user-approval" element={<AdminUserApprovalPage />} />
            {renderRoleRoutes('/instructor')}
            {renderRoleRoutes('/veterinario')}
          </Route>
          <Route element={<ProtectedRoute allowedRoles={['Administrador', 'Propietario', 'Capataz', 'Operario']} />}>
            <Route path="/scanner" element={<AnimalScannerPage />} />
          </Route>
          {/* Módulo Campesino - Accesible para todos los roles */}
          <Route element={<ProtectedRoute allowedRoles={['Administrador', 'Propietario', 'Capataz', 'Instructor', 'Veterinario', 'Aprendiz', 'Operario']} />}>
            <Route path="/campesino" element={<CampesinoDashboard />} />
            <Route path="/campesino/registro-operativo" element={<RegistroOperativoPage />} />
            <Route path="/campesino/ganaderia" element={<GanaderiaOperativaPage />} />
            <Route path="/campesino/health" element={<CampesinoHealthDashboard />} />
            <Route path="/campesino/crop-plots" element={<CropPlotsPage />} />
            <Route path="/campesino/crop-activities" element={<CropActivitiesPage />} />
            <Route path="/campesino/water-sources" element={<WaterSourcesPage />} />
            <Route path="/campesino/climate-alerts" element={<ClimateAlertsPage />} />
            <Route path="/campesino/weather" element={<WeatherDashboardPage />} />
            <Route path="/campesino/market-offers" element={<MarketOffersPage />} />
            <Route path="/campesino/technical-assistance" element={<TechnicalAssistancePage />} />
          </Route>
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
