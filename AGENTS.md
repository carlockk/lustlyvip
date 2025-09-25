# AGENTS.md

Este archivo define instrucciones persistentes para el agente que trabaja en este repositorio y sirve como "memoria" del proyecto. Su alcance es toda la carpeta del repositorio.

## Instrucciones principales

- Idioma: Responder SIEMPRE en español.
- Estilo: Respuestas concisas, directas y útiles. Preambulos breves antes de comandos.
- Memoria: Mantener y actualizar las secciones de "Contexto del proyecto" y "Decisiones" cuando cambien.
- Continuidad: Al abrir una nueva sesión con Codex en este repo, retomar SIEMPRE desde "Último contexto de conversación" de este archivo, salvo que el usuario indique lo contrario.

## Contexto del proyecto (Memoria)

Actualiza estas secciones con cambios relevantes para que persistan entre sesiones.

### Preferencias del usuario
- Responder siempre en español.

### Último contexto de conversación
- Preferencia: continuar desde la última conversación registrada en AGENTS.md.
- Idioma: español.
- Estado: Stripe en modo pruebas funcionando. Implementado flujo OnlyFans-like:
  - Portal de cliente activado y accesible.
  - Endpoints y página `/billing` para ver/marcar método de pago por defecto y abrir portal.
  - Monetización del creador: endpoints y página `/monetization` para crear Product/Price mensual y guardar `priceId`.
  - Perfil del creador: botón “Suscribirse” que abre Checkout con `priceId` y CTA de “Comprar PPV” en posts exclusivos. Textos de posts exclusivos se ocultan si no hay acceso.
  - Webhooks listos; falta conectar `STRIPE_WEBHOOK_SECRET` en dev si aún no está.
  - Añadidos (sesión actual):
    - Suscripción con planes múltiples opcionales (1 semana, 1/3/6/12 meses): submenú en botón “Suscribirse” con tooltip explicativo. Back-end valida que el `priceId` pertenezca al creador.
    - Endpoint `/api/creators/[id]/price` ahora devuelve `plans` (lista normalizada de planes disponibles) manteniendo compatibilidad con `priceId` mensual.
    - Control de acceso actualizado para considerar múltiples `priceId` del creador antes de tratar contenido exclusivo como público por `no-price`.
    - Monetización avanzada: página `/monetization` ampliada para configurar planes (monto) y descuento introductorio (%) por plan. Nuevo endpoint `POST/GET /api/creators/monetization/plans` crea prices y cupones (`duration:'once'`) y los guarda en `User.stripePrices`/`stripeCoupons`/`stripeIntroPercents`.
    - Monedas: añadido CLP en monetización (UI y cálculo sin decimales para CLP).
    - i18n básico: `LanguageProvider` con persistencia en localStorage, componente `LanguageToggle` en la Sidebar (ES/EN). Por ahora strings clave listos en el provider; se puede ir migrando vistas a `t(key)` gradualmente.
    - PPV por post configurable (precio y moneda por contenido). Checkout PPV toma precio de la DB; fallback a `NEXT_PUBLIC_PPV_DEFAULT_CENTS`.
    - Cálculo y almacenamiento de fee de plataforma y neto del creador en webhook (`PLATFORM_FEE_PERCENT`).
    - Página de ganancias PPV (`/earnings`) y API de agregados (`/api/earnings/ppv`).
    - Panel del creador `/creator/dashboard` con resumen por rango (7/30/90 días): totales PPV, suscriptores activos, top por compras y top por vistas. API: `/api/analytics/creator/summary`.
    - Tracking de vistas (`PostView`) + endpoint `/api/analytics/views` y envío desde perfil y detalle.
    - Página de detalle de post `/posts/[id]` (valida acceso, CTAs, registra vista) con navegación Anterior/Siguiente, navegación con teclado (←/→), autoscroll y tooltips con mini‑preview.
    - Perfil del creador: blur/overlay en contenido bloqueado; botón de compra PPV con precio; tooltips de previsualización en tarjetas.
    - Edición de monetización por post desde el perfil (Público / Exclusivo / Exclusivo con PPV) vía PATCH `/api/posts/[id]`.
    - Página “Mis compras” (`/purchases`) + API `/api/purchases`, enlazando al detalle del post.
    - Sidebar: enlaces “Mis compras”, “Ganancias” y “Panel” solo para creadores; callout “Empieza a crear” para no creadores (CTAs a crear post/monetizar). Flag de creador vía `/api/me/flags`.
    - Éxito de pago con redirección automática desde `/payments/success?redirect=...` y refresh.
    - Mejoras UI (sesión actual):
      - Panel deslizante de sugerencias que se abre automáticamente si hay nuevas, con cierre por “X” o clic fuera.
      - Inicio muestra solo publicaciones de creadores suscritos; el compositor ahora es un botón “Crea una nueva publicación”.
      - Buscador en Inicio “Encontrar un creador” con resultados y navegación al perfil.
      - Menú incluye “Explorar” con página `/explore` listando creadores con contenido reciente.
      - Barra superior con banners en tiempo casi real: avatar, portada/último post, likes totales, conteo de imágenes y videos.
      - En perfil de creador: botón para cancelar suscripción (Stripe) cuando el usuario está suscrito.
      - Estilo global de cursor: `a`, `button` y `[role=button]` muestran cursor de mano; `button:disabled` usa `not-allowed`.
      - Modo claro con selector (botones circulares Light/Dark), persistencia en localStorage y `data-theme` en `<html>/<body>`.
      - Paleta modo claro tipo “arsmate”: fondos claros (#f7f8fc / #fff), bordes #e5e7eb, textos oscuros (#111827). Acento primario #3ca9b2 con hover #2f8c94 y texto blanco en botones.
      - Logo invertido por CSS en modo claro (`filter: invert(1)` sobre `img.app-logo`); considerar asset específico si el logo es a color.
      - Panel de sugerencias forzado siempre en oscuro (mejor contraste) aunque el tema sea claro.
      - Inicio: mensaje vacío actualizado a “Sin publicaciones agregadas aún”.
      - Perfil: CRUD completo de publicaciones para el dueño (editar texto inline, cambiar imagen/video, quitar media y eliminar). Corrección: soporte real de video (videoUrl) y render en perfil/detalle con tamaños responsivos y fullscreen nativo.
      - Favoritos: modelo + APIs para agregar/quitar y listar; página `/favorites` y link en Sidebar; “Suscribirse” agrega a favoritos si el creador no tiene precio.
- Acceso: si el creador no tiene `stripePriceId`, el contenido exclusivo se trata como público (reason: `no-price`).
 - Acceso (actualizado 2025-09-16): si el creador no tiene precio, el contenido exclusivo permanece bloqueado; el usuario puede suscribirse gratis (solo accede a contenido público) o comprar PPV.
      - Propinas: endpoint `/api/stripe/checkout/tip` y botones en perfil y detalle.
  - Fix UI Inicio (2025-09-18): en el feed de suscripciones las imágenes no se mostraban mientras que los videos sí. Se corrigió el renderizado de media en `PostList` (detección robusta por ruta de Cloudinary `/image/upload` vs `/video/upload`) y, para máxima compatibilidad, las imágenes se renderizan con la URL original (sin transformaciones). Además, `cloudinaryLoader/cloudinaryUrl` ahora conservan query/hash. Usuario confirma: “ahora sí, quedó muy bien”.
  - Likes (2025-09-18): el toggle de me gusta no funcionaba correctamente. Se corrigió el endpoint `/api/likes` para detectar si el usuario ya dio like usando comparación robusta por string de ObjectId (antes usaba `includes` con ObjectId). En el feed `PostList`, el estado visual del like ahora usa `.some(String(id)===String(userId))` para que pinte correctamente.
  - Likes en perfil (2025-09-18): se añadió el botón y lógica de “Me gusta” a la página de perfil del creador (`/profile/[id]`), con actualización optimista del arreglo `likes` en `posts`.

### Próximos pasos sugeridos
- Confirmar y configurar variables de entorno en .env.local (MONGODB_URI, STRIPE_SECRET_KEY test, NEXTAUTH_SECRET, NEXT_PUBLIC_APP_URL).
- Verificar que el usuario está autenticado antes de abrir el portal.
- Probar de nuevo y capturar el mensaje de error del servidor.
- Activar y guardar la configuración del Customer Portal en modo test (Stripe dashboard) o proporcionar STRIPE_PORTAL_CONFIGURATION_ID.
- Configurar STRIPE_WEBHOOK_SECRET y probar webhooks (checkout.session.completed, invoice.paid, customer.subscription.updated/deleted, payment_intent.succeeded).
- Revisar `PLATFORM_FEE_PERCENT` y validar cálculo en webhook para PPV.
- Extender UI de monetización para permitir crear/gestionar precios de 1 semana, 3/6/12 meses (hoy solo mensual). Crear precios en Stripe y guardarlos en `User.stripePrices`.
- En Checkout de suscripción, si el plan tiene cupón de introducción, se envía automáticamente y Stripe lo aplica solo en la primera factura.
 - Migrar textos de vistas críticas a `t(key)` empezando por botones (Suscribirse/Comprar PPV) y tooltips.
 - Considerar `lang` en `<html>` (server) leyendo preferencia vía cookie para SEO/i18n, o Next i18n routing en el futuro.
- Mejorar UX de éxito: redirección automática desde `/payments/success` ya implementada con `redirect` y `refresh=1`.
- Añadir badges de estado en cards de post (Público/Suscriptores/PPV) y confirmación al pasar de Público→Exclusivo.
- Pulir toasts y mensajes (estados de “procesando pago”, errores de red, etc.).
- Opcional: script `dev:clean` para borrar `.next` y levantar limpio.
- Theming: evaluar asset `logo-light.png` para reemplazar `filter: invert(1)` si el logo es a color.
- Theming: revisar contrastes de textos secundarios en modo claro y estados deshabilitados.
- Perfil: añadir spinner/estado “subiendo” al cambiar media y preview antes de guardar.
- Explorar: paginación y criterios (rango temporal, peso por likes/vistas) y cacheado.
- Unificar acentos `text-pink-*` en modo claro si se desea coherencia total con `#3ca9b2`.
 - Reintroducir optimización de imágenes con Cloudinary sólo si la URL es `/image/upload/` y validando transformaciones sin romper parámetros; mantener fallback a URL cruda.

### Registro de sesiones
- 2025-09-13: Se crea AGENTS.md y se establece la regla de continuidad.
- 2025-09-13: Flujo Stripe pruebas operativo; añadidas `/billing`, `/monetization`, endpoints de métodos de pago, monetización y acceso a posts; integrado Checkout de suscripción y PPV en perfil.
- 2025-09-14: Añadido PPV por post (monto + moneda), botón de compra muestra precio, Checkout PPV valida precio desde DB, cálculo y almacenamiento de fee de plataforma y neto creador en webhook; success page redirecciona de vuelta al perfil.
- 2025-09-14: Panel del creador con filtros (7/30/90d), tracking de vistas y top por vistas/compras; páginas de “Ganancias” y “Mis compras”; detalle de post con prev/next, teclado y tooltips; edición de monetización por post; sidebar condicionada por creador y callout para no creadores.
- 2025-09-15: UI de sugerencias como panel deslizante autoabierto; Inicio solo suscripciones con botón de compositor; buscador de creadores; página y botón “Explorar”; barra superior de creadores con métricas.
- 2025-09-15: Modo claro con selector Light/Dark (círculos), primario #3ca9b2 con texto blanco, logo invertido en claro; panel de sugerencias siempre oscuro; mensaje vacío del Home actualizado; CRUD de posts en perfil (texto e imagen/video) con `PATCH` multipart.
 - 2025-09-15: Arreglado que los videos no se mostraban: añadido `videoUrl` al modelo, subida a Cloudinary con detección de tipo, PATCH crea/limpia `videoUrl`, y render de video en perfil propio y detalle. Actualizado feed para exponer `videoUrl`. Actualizado NextAuth para refrescar avatar en sidebar tras editar perfil.

### Objetivo actual
- Implementación base completa de pagos en modo pruebas (portal, suscripciones y PPV) integrada en UI.
  - Próximo: robustecer UX (refrescar acceso tras volver de Checkout, manejar errores/evaluar estados) y preparar despliegue.
  - Añadir UI de edición de precio PPV en edición de post (ahora se setea al crear).
  - Consolidar panel del creador (badges, enlaces rápidos, métricas adicionales) y preparar pruebas end‑to‑end.
  - Integrar descubrimiento: explorar creadores y barra en tiempo real.
  - Diseño: completar modo claro (afinar contrastes, assets) y UX del selector.

### Decisiones clave
- Usar este AGENTS.md como memoria persistente del proyecto.
- Usar claves de Stripe en modo test para este flujo hasta nuevo aviso.
- Crear productos/precios en Stripe por creador y guardar priceId en el usuario.
  - Ahora se soportan múltiples `priceId` por creador en `User.stripePrices` (week_1, month_1, month_3, month_6, year_1).
  - Descuento introductorio por plan: cupones de Stripe `duration: 'once'` guardados en `User.stripeCoupons`.
- PPV se define por post: `ppvEnabled`, `ppvAmountCents`, `ppvCurrency` (base USD; CLP opcional).
- Media en posts: usar `imageUrl` para imágenes y `videoUrl` para videos; Cloudinary `resource_type:auto` y detección por `media.type`.
 - Favoritos: se almacenan en `User.favorites` (array de `ObjectId` de usuarios); endpoints REST `/api/favorites` y `/api/favorites/[id]`.
 - Suscripción sin precio: “Suscribirse” cae en “Agregar a favoritos”; y el acceso a posts exclusivos se considera público si el creador no configuró precio.
 - Propinas: Checkout de Stripe modo `payment` con `metadata.type='tip'` (sin contabilidad aún, solo cobro básico).
 - Stripe Connect (opcional): si `STRIPE_CONNECT_ENABLED=1` y el creador tiene `stripeConnectId`, los Checkouts usan `transfer_data.destination` al creador y `application_fee_percent` (suscripción) o `application_fee_amount` (PPV) para retener la comisión de la plataforma.
- Fee de plataforma configurable por env `PLATFORM_FEE_PERCENT` (default 3); se calcula en pagos (PPV y suscripción) y se guarda en `Purchase`.
- Navegación del menú: links “Mis compras”, “Ganancias” y “Panel” solo visibles para creadores (isCreator=true si tiene `stripePriceId` o al menos 1 post).
- Usuarios no creadores verán un callout en la sidebar con CTAs “Crear post” y “Monetizar”.
- Requerir sesión para pagar y ver contenido exclusivo/PPV; no se soportan compras anónimas (solo tracking de vistas anónimas con `anonymousId`).
- Estados de post: Público (gratis), Exclusivo (solo suscriptores) y Exclusivo (suscriptores o PPV); editable en cualquier momento por el creador.
- Inicio (feed) solo muestra publicaciones de creadores a los que estás suscrito; para descubrimiento se usa “Explorar” y la barra superior.
- Theming: uso de `data-theme` para claro/oscuro; color primario en modo claro `#3ca9b2` con hover `#2f8c94`; botones primarios con texto blanco en modo claro.
- Sugerencias: panel deslizante siempre en tema oscuro para contraste.

### Convenciones
- Registrar acuerdos y convenciones relevantes aquí.

### Tareas pendientes (backlog)
 - Propinas: contabilizar en DB (modelo de Tip) y reflejar en dashboard de creador.
 - Favoritos: estado “ya en favoritos” y botón “Quitar de favoritos” + paginación.
 - Mejorar tooltips: miniatura para videos (thumbnail o poster) en prev/next y cards.
 - Revisar accesibilidad y textos de toasts para nuevas acciones.
- Conectar Stripe CLI o configurar webhook en dashboard para obtener y usar `STRIPE_WEBHOOK_SECRET` en dev.
- Refrescar acceso automáticamente tras volver de Checkout (suscripción/PPV), idealmente por query param y refetch del acceso.
- Afinar UI de contenido exclusivo: blur de imagen/video y estados de “procesando pago”.
- Manejo de errores y toasts en `/billing`, perfil y flujos de pago.
- Opcional: definir `STRIPE_PORTAL_CONFIGURATION_ID` para no depender de la default.
- Opcional: `NEXT_PUBLIC_PPV_DEFAULT_CENTS` para precio PPV por defecto (ahora 500 si no se define).
- Agregar edición de PPV en posts existentes y visualización del neto del creador en dashboard.
- Evaluar Stripe Connect para reparto automático (application_fee + destination charges) en futuro.
- Agregar métricas de vistas por post (modelo `PostView`, tracking en cliente y agregados por rango de fechas).
- Añadido: tracking de vistas (PostView), endpoint `/api/analytics/views`, filtros de rango en summary y UI de rango en panel del creador.
- Añadido: página de detalle de post (`/posts/[id]`), GET de post por id y enlaces desde “Mis compras” y “Panel del creador”.
- Añadido: navegación Anterior/Siguiente en detalle de post y cabecera con avatar/@usuario.
- Añadido: navegación con teclado (←/→) en detalle de post y desplazamiento suave al navegar entre posts.
- Añadido: tooltips de previsualización en botones Anterior/Siguiente (miniatura, snippet y fecha), con datos servidos desde GET `/api/posts/[id]`.
- Añadido: tooltips de previsualización en tarjetas de posts del perfil (miniatura, snippet seguro y PPV/estado) con link a detalle.
- Badges de estado de monetización en tarjetas de post y confirmaciones de cambio de visibilidad.
- Mejorar toasts y manejo de errores en `/billing`, perfil y flujos de pago.
- Opcional: script `dev:clean` y chequeos anti‑caché de `.next` en dev.
- Theming: evaluar asset `logo-light.png` para reemplazar `filter: invert(1)` si el logo es a color.
- Theming: revisar contrastes de textos secundarios en modo claro y estados deshabilitados.
- Perfil: añadir spinner/estado “subiendo” al cambiar media y preview antes de guardar.
- Explorar: paginación y criterios (rango temporal, peso por likes/vistas) y cacheado.
- Unificar acentos `text-pink-*` en modo claro si se desea coherencia total con `#3ca9b2`.
- Monetización: UI para definir precios por plan (semanal, trimestral, semestral, anual) y opcionalmente descuentos vs mensual. Endpoint POST que cree y guarde `stripePrices`.
 - Validar en UI que el descuento sea 0-100% y mostrar leyenda de “aplica solo en la primera factura”.
 - Cerrar submenú al hacer clic fuera y mostrar plan seleccionado en el perfil (badge “Plan actual”) si es posible.

### Glosario (opcional)
- (Definir términos, nombres propios o abreviaturas del proyecto.)

## Cómo usar esta memoria

- Al cierre de cada sesión: actualizar "Último contexto de conversación" con un breve resumen (estado, decisiones, próximos pasos) y añadir una línea al "Registro de sesiones" con fecha.
- Al inicio de cada sesión: leer "Último contexto de conversación" y continuar desde ahí de forma predeterminada.
- Cuando el usuario tome una decisión importante (p. ej., stack, rutas, contratos, prioridades), agregarla en "Decisiones clave" o "Convenciones".
- Cuando se establezcan objetivos de sesión, escribirlos en "Objetivo actual" y marcarlos como completados cuando se cumplan.
- Mantener "Tareas pendientes" al día con puntos accionables de corto plazo.

---

Actualización de memoria – 2025-09-16

- Último contexto (delta hoy):
  - Multi‑planes de suscripción listos (1 semana, 1/3/6/12 meses) con validación de `priceId` por creador en checkout.
  - Descuento introductorio por plan (solo 1ª compra) mediante cupones `duration:'once'`; visible en submenú como “−X% 1ª compra”.
  - Monetización: UI extendida para definir planes y descuentos; nuevo endpoint `/api/creators/monetization/plans` que crea prices y cupones y guarda en `User.stripePrices`/`stripeCoupons`/`stripeIntroPercents`.
  - Monedas: CLP agregado (montos enteros) junto con USD/EUR.
  - i18n básico: `LanguageProvider` + `LanguageToggle` (ES/EN) con persistencia; perfil usa `t(key)` para botones clave (Suscribirse/Cancelar suscripción, Mensaje).
- UI: reactivado “Agregar/Quitar de favoritos” desde publicaciones (feed) y en el perfil del creador.
- UI: añadido botón “Compartir” en perfil (Web Share API con fallback a copiar enlace).
  - Media: imágenes y videos ahora son responsivos (max-h 75vh, object-contain, `playsInline`), sin distorsión al entrar en fullscreen.
  - Fix: corregido orden de Hooks en `HomePage` para evitar “Rendered more hooks…”.
  - Suscripciones: agregado plan “1 día” y submenú de planes con precios/moneda y descuento intro; opciones “Renovar automáticamente” y “Duración personalizada” (date input) que programa cancelación (webhook) usando `cancel_at` o `cancel_at_period_end`.
  - Suscripción gratis: si el creador no monetiza, “Suscribirse” crea una suscripción local (free) que incluye al feed solo el contenido público, y el exclusivo queda bloqueado con CTA de PPV.
  - DatePicker: componente ligero tipo flatpickr añadido. Integrado en submenú de suscripción (perfil), en Panel del creador (rango personalizado Desde/Hasta) y en Ganancias (filtro por fechas).
  - Acceso: las suscripciones “free” NO desbloquean exclusivos (solo Stripe con `stripeSubscriptionId`). Feed de suscripciones distingue pagas (todo) vs free (solo público).
  - Éxito de pago: success_url incluye `session_id`; nueva API `/api/stripe/checkout/confirm` confirma compra/suscripción si no llega webhook; página `/payments/success` redirige correctamente y botón “Volver” usa `router.replace`.
  - Éxito de pago (host/puerto): success_url ahora usa el `origin` del request (no `NEXT_PUBLIC_APP_URL`) para evitar 3000 cuando el servidor corre en 3001.
  - Sidebar: se elimina “Ajustes”; “Eliminar cuenta” se mueve al perfil del usuario (botón/Modal). Menús con scroll vertical (`overflow-y-auto`) en Sidebar/drawer y submenú de planes.
  - Perfil: botón único “Suscribirse/Cancelar suscripción” según estado (evitamos mostrar dos botones). Submenú con costo estimado al usar plan diario + fecha.
  - Perfil: badge “Suscripción free” debajo del botón cuando la suscripción es gratuita, aclarando que solo ve contenido público.
  - Mensajes: agregado `ChatPanel` global tipo Messenger (botón flotante abre panel lateral con lista de conversaciones y chat activo). Reusa APIs existentes.
  - Mensajes (mejora): badge de no leídos en el botón (cálculo local por último mensaje no leído) y buscador para iniciar conversación desde el panel.
  - Mensajes (UX): el panel se puede cerrar con “✕” y también al hacer clic fuera del panel.

- Registro de sesiones (hoy):
  - 2025-09-16: Integrados multi-planes + cupones 1ª compra, CLP, i18n básico y visibilidad de descuento en submenú; acceso unificado y validación de `priceId` por creador.
  - 2025-09-16: Recuperado favoritos en posts y perfil; añadido compartir perfil; ajustes responsivos de media; fix de hooks en Home.
  - 2025-09-17: Añadido plan diario; submenú con auto‑renovar y fecha personalizada (DatePicker) + costo estimado; suscripción free solo muestra público; arreglado flujo post‑pago con confirmación y redirect; Sidebar sin Ajustes y “Eliminar cuenta” en perfil; menús con scroll; botón único Suscribirse/Cancelar.
- 2025-09-17: Ajustado success_url para usar el origin del request (host/puerto correctos); ChatPanel con búsqueda, badge de no leídos y cierre con ✕ o clic fuera; badge “Free” en perfil; acceso exclusivo requiere suscripción Stripe.
  - 2025-09-17: Botón rápido de Stripe Connect en el perfil propio con badge de estado (Conectado/Pendiente/No conectado) y acceso a onboarding/refresh; fix en webhook: usa 3% por defecto si falta PLATFORM_FEE_PERCENT.
 - 2025-09-18: Corregido feed de Inicio (imágenes no visibles). `PostList` detecta Cloudinary image/video por ruta y usa URL cruda para imágenes; `cloudinaryLoader/cloudinaryUrl` preservan query/hash. Usuario valida que quedó bien.
 - 2025-09-18: Arreglo de “Me gusta”: backend compara ObjectId por string; frontend pinta estado liked de forma robusta.
 - 2025-09-18: Añadido “Me gusta” en las publicaciones del perfil del creador.

- Próximos pasos sugeridos:
  - Migrar más textos a `t(key)` (tooltips, toasts, CTAs PPV) y considerar `lang` en `<html>` vía cookie.
  - Mostrar importe del plan + moneda en submenú; cerrar submenú al hacer clic fuera y badge de plan actual (opcional).
- Re-formatear `src/app/profile/[id]/page.js` para mejorar legibilidad sin alterar lógica.

- 2025-09-17: Feed con paginación backend (limit/offset) e infinite scroll en Home; medios optimizados (lazy/decoding, preload metadata); caché de búsqueda en Home; barra de creadores refresca solo con pestaña visible.

Actualización de memoria – 2025-09-17 (accesibilidad y rendimiento)

- Accesibilidad/UX: agregado botón flotante global “Nueva publicación” visible para creadores; abre panel deslizante con el compositor existente (NewPost). Siempre disponible en toda la app, separado del botón de Mensajes.
- Sugerencias: añadida columna derecha delgada (rail) en Home para pantallas grandes, mostrando avatar y @usuario; el panel deslizante de sugerencias se mantiene para mobile/acción manual.
- Rendimiento (rápido): búsqueda de creadores con debounce (300 ms, min 2 caracteres); imágenes con `loading="lazy"` en listas y barras; `ChatPanel` y `TopCreatorsBar` cargados dinámicamente (sin SSR) para reducir el bundle inicial; índices en `Post` para `creator` y `createdAt`.

- Próximos pasos (derivados):
  - Enfocar el textarea del compositor al abrir el panel y trampa de foco (focus trap) accesible.
  - Paginación o infinite scroll en el feed de suscripciones; limitar tamaño de media y considerar `next/image`.
  - Reducir frecuencia del refresco en la barra superior o hacerlo basado en visibilidad/interacción.
  - Medir con React Profiler y Lighthouse para localizar cuellos (blur intensivo en exclusivos, tooltips con previews, etc.).

Actualización de memoria – 2025-09-17 (Stripe Connect en perfil)

- UI: añadido acceso rápido a Stripe Connect en el perfil propio con badge de estado (No conectado / Conectado, pendiente / Conectado y listo) y botones para “Conectar pagos (Stripe)” y “Revisar estado”.
- Backend: confirmada la integración Connect en Checkouts (transfer_data.destination + application_fee). Fall‑back de `PLATFORM_FEE_PERCENT` ajustado a 3% en webhook y confirm.
- Próximos pasos: definir `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` y opcional `STRIPE_CONNECT_ENABLED=1`; completar onboarding Express y probar un pago PPV/suscripción hacia cuenta conectada.

Actualización de memoria – 2025-09-18 (Inicio rediseñado y estado Stripe)

- Último contexto (delta hoy):
  - Inicio ya no redirige a Explorar; ahora muestra el feed de posts para usuarios autenticados, un hero público con CTA y el rail de sugerencias estilizado.
  - Explorar actualiza sus tarjetas con portada, avatar circular grande y métrica de última publicación usando formato relativo.
  - Monetización persiste `monetizationEnabled` en el modelo `User` y la vista muestra la última verificación del estado de Stripe con mensajes claros al refrescar.
  - Sidebar oculta temporalmente el enlace a Explorar (se conserva en configuración) y `SuggestionsRail` adopta el nuevo estilo de tarjetas grandes.

- Registro de sesiones (hoy):
  - 2025-09-18: Rediseño de Inicio/Explorar y mejoras de Stripe Connect (estado persistente y feedback en la UI); rail de sugerencias actualizado.
