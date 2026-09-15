import React from 'react';
import { Link, useParams } from 'react-router-dom';

const VERSION = '2026-09-10';

const controllerName =
  import.meta.env.VITE_LEGAL_CONTROLLER_NAME || 'VillaLuz · Software Agropecuario & Finca Digital (Colombia)';
const privacyContact =
  import.meta.env.VITE_PRIVACY_CONTACT || 'privacidad@villaluz.co';

const LegalDocumentsPage: React.FC = () => {
  const { document } = useParams<{ document: string }>();
  const isTerms = document === 'terminos';

  return (
    <main className="min-h-screen bg-background px-4 py-10 text-foreground">
      <article className="w-full space-y-6 rounded-xl border bg-card p-6 shadow-sm">
        <header className="space-y-2 border-b pb-4">
          <p className="text-sm text-muted-foreground">VillaLuz · versión {VERSION} · Ley 1581 de 2012 (Colombia)</p>
          <h1 className="text-2xl font-bold">
            {isTerms ? 'Términos y Condiciones de Uso' : 'Política de Privacidad y Tratamiento de Datos Personales'}
          </h1>
          <p className="text-sm text-muted-foreground">
            Responsable: {controllerName}. Canal oficial de privacidad: {privacyContact}.
          </p>
        </header>

        {isTerms ? (
          <section className="space-y-4 text-sm leading-6">
            <p>
              VillaLuz es una plataforma de gestión agropecuaria integral. Su uso exige proporcionar
              información veraz, proteger las credenciales de acceso y respetar los roles y permisos de cada finca asignada.
            </p>
            <p>
              Los registros productivos, alertas zootécnicas y calendarios sanitarios son herramientas de apoyo a la toma de decisiones. No sustituyen el criterio técnico presencial de un Médico Veterinario matriculado ante COMVEZCOL ni los sistemas oficiales del ICA o SINIGAN.
            </p>
            <p>
              El proveedor y la administración institucional podrán suspender cuentas en caso de fraude, uso indebido, vulneración de seguridad o falsedad en información zootécnica o credenciales profesionales, garantizando el debido proceso.
            </p>
          </section>
        ) : (
          <section className="space-y-4 text-sm leading-6">
            <p>
              <strong>1. Finalidad del Tratamiento:</strong> VillaLuz trata los datos necesarios para administrar cuentas, vincular colaboradores a predios ganaderos, registrar la trazabilidad sanitaria bovina, gestionar inventarios y generar métricas operativas.
            </p>
            <p>
              <strong>2. Datos de Fincas y Fotografías:</strong> Las imágenes de instalaciones, potreros y animales subidas por administradores tienen propósitos técnicos y de identificación de la unidad productiva. Queda restringido publicar rostros de menores o documentos personales en galerías públicas.
            </p>
            <p>
              <strong>3. Niveles de Visibilidad Pública:</strong> Cada predio cuenta con políticas de visibilidad configurables (Mínima, Estándar, Completa). En la modalidad protegida (Mínima), las cabezas de ganado, hembras/machos y alertas de enfermedades permanecen estrictamente confidenciales para salvaguardar el patrimonio del productor.
            </p>
            <p>
              <strong>4. Derechos ARCO (Habeas Data):</strong> De conformidad con la Ley Estatutaria 1581 de 2012 y el Decreto 1377 de 2013 de la República de Colombia, los titulares pueden consultar, actualizar, rectificar o revocar su autorización dirigiéndose al correo {privacyContact}. Las solicitudes son atendidas en un plazo máximo de diez (10) días hábiles.
            </p>
          </section>
        )}

        <footer className="border-t pt-4 text-sm flex items-center justify-between">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="text-primary underline cursor-pointer"
          >
            ← Volver a la pantalla anterior
          </button>
          <Link className="text-muted-foreground hover:text-foreground text-xs" to="/dashboard">
            Ir al Dashboard
          </Link>
        </footer>
      </article>
    </main>
  );
};

export default LegalDocumentsPage;
