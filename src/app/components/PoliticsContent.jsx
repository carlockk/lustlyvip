import Link from 'next/link';

export default function PoliticsContent({ showReturnButtons = true }) {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-4xl font-bold mb-4">Políticas del servicio</h1>
        <p className="text-gray-300 text-lg">
          Lustly es un espacio privado para que creadores compartan experiencias exclusivas con sus fans. Al
          utilizar la plataforma aceptas las siguientes condiciones pensadas para proteger a la comunidad y
          mantener un entorno seguro, consensuado y transparente.
        </p>
      </div>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Elegibilidad y consentimiento</h2>
        <p className="text-gray-300">
          Debes tener al menos 18 años cumplidos y la capacidad legal para celebrar contratos. Nos reservamos el
          derecho de solicitar verificaciones adicionales cuando detectemos actividad sospechosa o inconsistencias
          en la información aportada.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Contenido permitido</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-300">
          <li>Se admiten publicaciones para adultos siempre que todos los participantes hayan dado su consentimiento.</li>
          <li>Está prohibido cualquier material que involucre menores de edad, conductas no consensuadas o violencia extrema.</li>
          <li>No se permiten discursos de odio, apología del delito, suplantación de identidad ni actividades con fines ilícitos.</li>
          <li>Todo contenido debe pertenecer al creador o contar con las licencias necesarias para su distribución.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Pagos, propinas y suscripciones</h2>
        <p className="text-gray-300">
          Las transacciones se procesan a través de Stripe en modo seguro. Las suscripciones son recurrentes y
          pueden cancelarse en cualquier momento desde el portal de facturación. Las propinas y compras PPV se
          consideran definitivas, salvo que el equipo de soporte determine lo contrario al evaluar una disputa.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Privacidad y uso de datos</h2>
        <p className="text-gray-300">
          Utilizamos la información personal con el objetivo de prestar el servicio, prevenir fraudes y cumplir con
          obligaciones legales. Nunca compartiremos datos sensibles con terceros sin tu autorización, salvo que una
          autoridad competente lo requiera formalmente.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Medidas disciplinarias</h2>
        <p className="text-gray-300">
          Podemos suspender o cerrar cuentas cuando detectemos violaciones a estas políticas, reclamos reiterados, uso
          de bots, compras fraudulentas o cualquier acción que ponga en riesgo a la comunidad. Determinaciones graves
          se notifican por correo electrónico con los motivos y pasos para una posible apelación.
        </p>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Recomendaciones para fans</h2>
        <ul className="list-disc pl-6 space-y-2 text-gray-300">
          <li>Respeta los límites fijados por cada creador y evita solicitar contenido que vaya contra estas normas.</li>
          <li>No redistribuyas material sin permiso; la piratería puede acarrear acciones legales.</li>
          <li>Activa la autenticación de dos factores cuando esté disponible y nunca compartas tus credenciales.</li>
        </ul>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-semibold">Actualizaciones</h2>
        <p className="text-gray-300">
          Estas políticas pueden modificarse según evolucione la plataforma o cambien los requisitos legales del país
          en el que operamos. Publicaremos avisos destacados siempre que ocurra una actualización relevante.
        </p>
      </section>

      {showReturnButtons && (
        <div className="pt-10 flex flex-wrap items-center gap-3 text-sm text-gray-300">
          <Link href="/auth/login" className="px-4 py-2 rounded bg-pink-600 hover:bg-pink-700 text-white transition-colors">
            Volver al inicio de sesión
          </Link>
          <Link href="/explore" className="px-4 py-2 rounded border border-gray-700 hover:bg-gray-800 text-white transition-colors">
            Explorar creadores públicos
          </Link>
        </div>
      )}
    </div>
  );
}
