"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useLanguage } from "@/lib/i18n";

export default function LoginFormCard({
  callbackUrl = "/",
  containerClassName = "",
  showTitle = true,
  heading,
  showSignupLink = true,
}) {
  const { t } = useLanguage();
  const router = useRouter();

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setMessage(t("loggingIn"));
    setIsError(false);

    try {
      const result = await signIn("credentials", {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });

      if (result?.error) {
        setMessage(t("invalidCredentials"));
        setIsError(true);
      } else {
        setMessage(t("loginSuccessRedirect"));
        setIsError(false);
        router.replace(callbackUrl || "/");
      }
    } catch {
      setMessage(t("connectionError"));
      setIsError(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className={`w-full max-w-md bg-gray-900/85 backdrop-blur-sm border border-gray-800 rounded-3xl px-8 py-10 flex flex-col ${containerClassName}`}
    >
      {showTitle && (
        <>
          <h2 className="text-3xl font-bold">{heading || t("loginTitle")}</h2>
          <p className="mt-1 text-sm text-gray-400">
            {t("welcomeTo") || "Bienvenido a:"} Lustly
          </p>
        </>
      )}

      <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
        <div>
          <label htmlFor="home-email" className="block text-sm font-medium text-gray-300">
            {t("email")}
          </label>
          <input
            type="email"
            id="home-email"
            name="email"
            autoComplete="email"
            value={formData.email}
            onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
            className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
            placeholder="tu@correo.com"
            required
          />
        </div>

        <div>
          <label htmlFor="home-password" className="block text-sm font-medium text-gray-300">
            {t("password")}
          </label>
          <input
            type="password"
            id="home-password"
            name="password"
            autoComplete="current-password"
            value={formData.password}
            onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
            className="mt-1 block w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-md shadow-sm focus:outline-none focus:ring-pink-500 focus:border-pink-500 sm:text-sm"
            placeholder="********"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-2 px-4 rounded-md text-sm font-semibold text-white bg-pink-600 hover:bg-pink-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {loading ? t("loggingIn") || "Ingresando…" : t("loginCta") || "Iniciar sesión"}
        </button>
      </form>

      {message && (
        <div
          className={`mt-4 text-center text-sm font-medium ${
            isError ? "text-red-400" : "text-green-400"
          }`}
        >
          {message}
        </div>
      )}

      {showSignupLink && (
        <div className="mt-8 text-center">
          <p className="text-sm text-gray-300">
            {t("noAccountQuestion")}{" "}
            <Link
              href={`/auth/signup?callbackUrl=${encodeURIComponent(callbackUrl || "/")}`}
              className="font-semibold text-pink-500 hover:text-pink-400"
            >
              {t("signupHere")}
            </Link>
          </p>
        </div>
      )}

      <div className="mt-10 text-[11px] text-gray-500 text-center">
        © {new Date().getFullYear()} Lustly
      </div>
    </div>
  );
}

