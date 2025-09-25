"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSession } from "next-auth/react";
import PostList from "@/app/components/PostList";
import SuggestionsRail from "@/app/components/SuggestionsRail";
import PublicHighlights from "@/app/components/PublicHighlights";
import PublicSuggestionsRail from "@/app/components/PublicSuggestionsRail";
import PublicTopbar from "@/app/components/PublicTopbar";
import { useLanguage } from "@/lib/i18n";

function AuthenticatedHome({ title, subtitle, suggestionsTitle }) {
  return (
    <div className="flex flex-col xl:flex-row min-h-[calc(100vh-4rem)] bg-gray-900 text-gray-100">
      <main className="flex-1 px-4 sm:px-6 lg:px-10 py-6">
        <div className="max-w-3xl mx-auto w-full space-y-6">
          <header className="flex flex-col gap-1">
            <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
            <p className="text-sm text-gray-400">{subtitle}</p>
          </header>
          <PostList endpoint="/api/posts" />
        </div>
      </main>

      <SuggestionsRail limit={6} title={suggestionsTitle} />
    </div>
  );
}

function UnauthenticatedHome({ title, subtitle, signupLabel, loginLabel, note }) {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <PublicTopbar />
      <section className="relative overflow-hidden border-b border-gray-800">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_#3ca9b230,_transparent_60%)]" aria-hidden="true" />
        <div className="relative max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-10 px-6 md:px-10 py-20">
          <div className="flex-1 text-center md:text-left space-y-4">
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              {title}
            </h1>
            <p className="text-base md:text-lg text-gray-300 max-w-xl mx-auto md:mx-0">
              {subtitle}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-3 pt-2">
              <Link
                href="/auth/signup?callbackUrl=%2F"
                className="px-6 py-3 rounded-full bg-pink-600 hover:bg-pink-700 text-white font-semibold transition-colors"
              >
                {signupLabel}
              </Link>
              <Link
                href="/auth/login?callbackUrl=%2F"
                className="px-6 py-3 rounded-full border border-gray-700 hover:border-pink-500 text-gray-100 hover:text-white transition-colors"
              >
                {loginLabel}
              </Link>
            </div>
          </div>
          <div className="w-full max-w-sm rounded-3xl bg-gray-900/60 border border-gray-800 p-6 backdrop-blur">
            <p className="text-sm text-gray-300">{note}</p>
          </div>
        </div>
      </section>

      <div className="flex flex-col xl:flex-row">
        <div className="flex-1">
          <PublicHighlights limit={18} />
        </div>
        <PublicSuggestionsRail limit={8} />
      </div>
    </div>
  );
}

function HomeInner() {
  const { data: session, status } = useSession();
  const { t } = useLanguage();

  if (status === "loading") {
    return <div className="p-6 text-gray-300">{t("loadingGeneric") || "Cargando…"}</div>;
  }

  const heroTitle = t("homeHeroTitle") || "Descubre a creadores increíbles";
  const heroSubtitle =
    t("homeHeroSubtitle") ||
    "Conecta con artistas y recibe contenido exclusivo en cualquier momento.";
  const signupLabel = t("signupCta") || "Regístrate";
  const loginLabel = t("loginCta") || "Iniciar sesión";
  const feedTitle = t("homeFeedTitle") || "Inicio";
  const feedSubtitle =
    t("homeFeedSubtitle") ||
    "Descubre contenido de tus creadores favoritos y encuentra nuevas recomendaciones.";
  const suggestionsTitle = t("suggestedCreators") || "Creadores sugeridos";
  const heroNote =
    t("homeHeroNote") ||
    "Explora avances de publicaciones públicas, descubre nuevos creadores y activa notificaciones personalizadas cuando te unas.";

  if (status === "authenticated" && session?.user?.id) {
    return (
      <AuthenticatedHome
        title={feedTitle}
        subtitle={feedSubtitle}
        suggestionsTitle={suggestionsTitle}
      />
    );
  }

  return (
    <UnauthenticatedHome
      title={heroTitle}
      subtitle={heroSubtitle}
      signupLabel={signupLabel}
      loginLabel={loginLabel}
      note={heroNote}
    />
  );
}

export default function Home() {
  return (
    <Suspense fallback={<div className="p-6 text-gray-300">Cargando…</div>}>
      <HomeInner />
    </Suspense>
  );
}
