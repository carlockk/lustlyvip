// src/app/monetization/page.js
"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/lib/i18n";

export default function MonetizationPage() {
  const { t } = useLanguage();

  // precio base
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("usd");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const [current, setCurrent] = useState(null);

  // planes
  const [plans, setPlans] = useState({
    day_1: { amount: "", introPercent: "" },
    week_1: { amount: "", introPercent: "" },
    month_1: { amount: "", introPercent: "" },
    month_3: { amount: "", introPercent: "" },
    month_6: { amount: "", introPercent: "" },
    year_1: { amount: "", introPercent: "" },
  });
  const [savingPlans, setSavingPlans] = useState(false);

  // stripe connect + portal
  const [connect, setConnect] = useState({
    connected: false,
    chargesEnabled: false,
    accountId: null,
    loading: false,
    error: null,
  });

  // ayuda móvil
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/creators/monetization");
        const data = await res.json();
        if (res.ok) setCurrent(data);
      } catch {}
      try {
        const r2 = await fetch("/api/creators/monetization/plans");
        const d2 = await r2.json();
        if (r2.ok) {
          const intro = d2.introPercents || {};
          setPlans((prev) => ({
            ...prev,
            day_1: { amount: "", introPercent: intro.day_1 || "" },
            week_1: { amount: "", introPercent: intro.week_1 || "" },
            month_1: { amount: "", introPercent: intro.month_1 || "" },
            month_3: { amount: "", introPercent: intro.month_3 || "" },
            month_6: { amount: "", introPercent: intro.month_6 || "" },
            year_1: { amount: "", introPercent: intro.year_1 || "" },
          }));
        }
      } catch {}
      try {
        const cs = await fetch("/api/stripe/connect/status");
        const j = await cs.json();
        if (cs.ok) setConnect((c) => ({ ...c, ...j }));
      } catch {}
    })();
  }, []);

  // ───────────────────────────────────────────────────────────
  // Actions
  // ───────────────────────────────────────────────────────────
  async function handleConnect() {
    try {
      setConnect((c) => ({ ...c, loading: true, error: null }));
      const r = await fetch("/api/stripe/connect/onboard", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || "Error");
      window.location.href = j.url; // Stripe onboarding
    } catch (e) {
      setConnect((c) => ({ ...c, loading: false, error: e.message }));
    }
  }

  async function refreshConnectStatus() {
    try {
      setConnect((c) => ({ ...c, loading: true, error: null }));
      const r = await fetch("/api/stripe/connect/status", { method: "POST" });
      const j = await r.json();
      if (!r.ok) throw new Error(j.message || "Error");
      setConnect((c) => ({ ...c, ...j, loading: false }));
    } catch (e) {
      setConnect((c) => ({ ...c, loading: false, error: e.message }));
    }
  }

  async function openPortal() {
    try {
      setConnect((c) => ({ ...c, loading: true, error: null }));
      const endpoint =
        process.env.NODE_ENV === "production"
          ? "/api/stripe/portal"
          : "/api/stripe/portal/dev";
      const res = await fetch(endpoint, { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.url)
        throw new Error((data && data.message) || t("openStripePortal"));
      window.location.href = data.url; // Stripe customer portal
    } catch (e) {
      setConnect((c) => ({ ...c, loading: false, error: e.message }));
    }
  }

  async function save(e) {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      const cents =
        currency.toLowerCase() === "clp"
          ? parseInt(amount, 10)
          : Math.round(parseFloat(amount || "0") * 100);

      if (!Number.isFinite(cents) || cents <= 0)
        throw new Error(t("invalidAmount") || "Monto inválido");

      const res = await fetch("/api/creators/monetization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: cents, currency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error");
      setMessage(t("saved") || "Guardado");
      setCurrent(data);
    } catch (e) {
      setMessage(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function savePlans(e) {
    e.preventDefault();
    setSavingPlans(true);
    setMessage(null);
    try {
      const bodyPlans = {};
      for (const [k, v] of Object.entries(plans)) {
        const amt = (v.amount || "").trim();
        const pct = (v.introPercent || "").trim();
        if (amt) {
          const cents =
            currency.toLowerCase() === "clp"
              ? parseInt(amt, 10)
              : Math.round(parseFloat(amt) * 100);
          if (!Number.isFinite(cents) || cents <= 0)
            throw new Error(`Monto inválido para ${k}`);
          const introPercent = pct ? parseInt(pct, 10) : 0;
          bodyPlans[k] = { amount: cents, introPercent };
        }
      }
      if (Object.keys(bodyPlans).length === 0)
        throw new Error(
          t("defineAtLeastOnePlan") || "Define al menos un plan con monto."
        );

      const res = await fetch("/api/creators/monetization/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currency, plans: bodyPlans }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Error");
      setMessage(t("saved") || "Guardado");
    } catch (e) {
      setMessage(e.message);
    } finally {
      setSavingPlans(false);
    }
  }

  // ───────────────────────────────────────────────────────────
  // UI
  // ───────────────────────────────────────────────────────────
  return (
    // Aplica `inert` cuando el modal está abierto para impedir foco detrás
    <div className="max-w-md mx-auto p-6" {...(showHelp ? { inert: "" } : {})}>
      <h1 className="text-2xl font-bold mb-2">
        {t("monetizationTitle") || "Monetización"}
      </h1>
      <p className="text-gray-400 mb-4">
        {t("monetizationDesc") ||
          "Configura tus suscripciones y descuentos introductorios."}
      </p>

      {/* Stripe Connect + Portal (ambos botones) */}
      <div className="mb-6 p-4 border border-gray-700 rounded bg-gray-800">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-sm font-semibold">
              {t("payoutsStripeTitle") || "Pagos a tu cuenta (Stripe)"}
            </div>
            <div className="text-xs text-gray-400">
              {t("status") || "Estado"}:{" "}
              {connect.connected
                ? connect.chargesEnabled
                  ? t("connectedAndReady") || "Conectado y listo para cobrar"
                  : t("connectedPending") || "Conectado, pendiente de verificación"
                : t("notConnected") || "No conectado"}
            </div>
            {connect.accountId && (
              <div className="text-xs text-gray-500 truncate">
                {t("account") || "Cuenta"}: {connect.accountId}
              </div>
            )}
          </div>

          {/* Botones (desktop con tooltip, mobile sin hover) */}
          <div className="flex flex-col items-end gap-2">
            <div className="relative group">
              {!connect.connected ? (
                <button
                  onClick={handleConnect}
                  className={`px-3 py-2 rounded ${
                    connect.loading
                      ? "bg-gray-600"
                      : "bg-pink-600 hover:bg-pink-700"
                  }`}
                >
                  {connect.loading
                    ? t("opening") || "Abriendo…"
                    : t("connectStripe") || "Conectar pagos (Stripe)"}
                </button>
              ) : (
                <button
                  onClick={refreshConnectStatus}
                  className={`px-3 py-2 rounded ${
                    connect.loading
                      ? "bg-gray-600"
                      : "bg-gray-700 hover:bg-gray-600"
                  }`}
                >
                  {t("checkStatus") || "Revisar estado"}
                </button>
              )}

              {/* Tooltip desktop */}
              <div className="hidden md:block absolute -top-16 right-0 w-72 bg-black/90 text-xs text-gray-200 p-2 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none">
                {t("connectStripeHelp") ||
                  "Crea o vincula tu cuenta de Stripe para recibir pagos en tu banco. Es obligatorio para cobrar suscripciones y PPV."}
              </div>
            </div>

            <div className="relative group">
              <button
                onClick={openPortal}
                className={`px-3 py-2 rounded ${
                  connect.loading
                    ? "bg-gray-600"
                    : "bg-gray-700 hover:bg-gray-600"
                }`}
              >
                {t("openPaymentPortal") || "Añadir tarjeta / Portal"}
              </button>

              {/* Tooltip desktop */}
              <div className="hidden md:block absolute -top-16 right-0 w-72 bg-black/90 text-xs text-gray-200 p-2 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none">
                {t("addCardHelp") ||
                  "Abre el portal de Stripe para agregar y gestionar tus métodos de pago (como comprador)."}
              </div>
            </div>
          </div>
        </div>

        {connect.error && (
          <div className="text-xs text-red-400 mt-2">{connect.error}</div>
        )}
        <div className="text-xs text-gray-500 mt-2">
          {t("platformFeeNote") || "Tu comisión de plataforma actual es 3%."}
        </div>
      </div>

      {current?.priceId && (
        <p className="text-sm text-gray-400 mb-2">
          {(t("currentPrice") || "Price actual") + ": "}
          {current.priceId}
        </p>
      )}

      {/* Precio mensual */}
      <form onSubmit={save} className="space-y-3">
        <div>
          <label className="block text-sm text-gray-300 mb-1">
            {t("monthlyPrice") || "Precio mensual"}
          </label>
        <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="9.99"
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
            inputMode="decimal"
          />
        </div>
        <div>
          <label className="block text-sm text-gray-300 mb-1">
            {t("currencyLabel") || "Moneda"}
          </label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
          >
            <option value="usd">USD</option>
            <option value="eur">EUR</option>
            <option value="clp">CLP</option>
          </select>
        </div>
        <button
          disabled={loading}
          className={`px-4 py-2 rounded ${
            loading ? "bg-gray-600" : "bg-pink-600 hover:bg-pink-700"
          }`}
        >
          {loading ? t("saving") || "Guardando…" : t("save") || "Guardar"}
        </button>
      </form>

      {message && <p className="mt-3">{message}</p>}

      <hr className="my-6 border-gray-700" />

      {/* Planes */}
      <form onSubmit={savePlans} className="space-y-4">
        <h2 className="text-xl font-semibold">
          {t("plansTitle") || "Planes"}
        </h2>
        <p className="text-sm text-gray-400">
          {t("plansHelp") ||
            "Ingresa montos (vacío = no crear/actualizar). El descuento introductorio se aplica solo a la primera factura."}
        </p>

        {[
          { key: "day_1", label: t("daily") || "Diario" },
          { key: "week_1", label: t("weekly") || "Semanal" },
          { key: "month_1", label: t("monthly") || "Mensual" },
          { key: "month_3", label: t("quarterly") || "Trimestral" },
          { key: "month_6", label: t("semiannual") || "Semestral" },
          { key: "year_1", label: t("annual") || "Anual" },
        ].map(({ key, label }) => (
          <div
            key={key}
            className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end"
          >
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                {label} - {t("amount") || "Monto"}
              </label>
              <input
                value={plans[key].amount}
                onChange={(e) =>
                  setPlans((p) => ({
                    ...p,
                    [key]: { ...p[key], amount: e.target.value },
                  }))
                }
                placeholder="9.99"
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                inputMode="decimal"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-300 mb-1">
                {t("introDiscountOnce") || "Descuento 1ª compra (%)"}
              </label>
              <input
                value={plans[key].introPercent}
                onChange={(e) =>
                  setPlans((p) => ({
                    ...p,
                    [key]: { ...p[key], introPercent: e.target.value },
                  }))
                }
                placeholder="0"
                className="w-full p-2 bg-gray-800 border border-gray-700 rounded"
                inputMode="numeric"
              />
            </div>
            <div className="text-sm text-gray-400">
              {t("createCouponHelp") ||
                "Crea price y cupón (una vez) si defines monto y % > 0."}
            </div>
          </div>
        ))}

        <button
          disabled={savingPlans}
          className={`px-4 py-2 rounded ${
            savingPlans ? "bg-gray-600" : "bg-pink-600 hover:bg-pink-700"
          }`}
        >
          {savingPlans ? t("saving") || "Guardando…" : t("savePlans") || "Guardar planes"}
        </button>
      </form>

      {/* FAB de ayuda en móvil */}
      <button
        onClick={() => setShowHelp(true)}
        className="md:hidden fixed bottom-20 right-5 p-3 rounded-full bg-pink-600 shadow-lg"
        aria-label={t("help") || "Ayuda"}
      >
        ?
      </button>

      {/* Modal accesible */}
      {showHelp && (
        <div className="fixed inset-0 z-50">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setShowHelp(false)}
          />
          <div
            className="absolute bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-700 rounded-t-2xl p-5"
            role="dialog"
            aria-modal="true"
            aria-labelledby="help-title"
          >
            <h3 id="help-title" className="text-lg font-semibold mb-2">
              {t("whatIsConnectStripeTitle") ||
                "¿Qué es “Conectar pagos (Stripe)”?"}
            </h3>
            <p className="text-sm text-gray-300">
              {t("whatIsConnectStripeBody") ||
                "Es el proceso para crear o vincular tu cuenta de Stripe y poder recibir pagos en tu banco. Stripe te pedirá datos personales y bancarios. Sin completarlo, no podrás cobrar suscripciones ni PPV."}
            </p>

            <h3 className="text-lg font-semibold mt-4 mb-2">
              {t("whatIsAddCardTitle") || "¿Y “Añadir tarjeta / Portal”?"}
            </h3>
            <p className="text-sm text-gray-300">
              {t("whatIsAddCardBody") ||
                "Abre el portal de Stripe para agregar y gestionar tus métodos de pago como comprador. Útil si también compras contenido."}
            </p>

            <button
              onClick={() => setShowHelp(false)}
              className="mt-4 w-full py-2 rounded bg-gray-800 hover:bg-gray-700"
            >
              {t("okUnderstood") || "Entendido"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
