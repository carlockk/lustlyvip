'use client';

import LoginPanelLite from './LoginPanelLite';
import FeaturedGridLite from './FeaturedGridLite';

export default function UnauthLanding() {
  return (
    <div
      className="min-h-[calc(100vh-64px)] bg-cover bg-center"
      style={{ backgroundImage: "url(/images/fondoinicio.jpg)" }}
    >
      <div className="min-h-[calc(100vh-64px)] flex flex-col">
        <div className="flex-1 grid md:grid-cols-2">
          <div className="hidden md:block" />
          <LoginPanelLite />
        </div>
        <section className="mx-auto max-w-6xl w-full px-4 py-8">
          <h3 className="text-xl font-semibold mb-4">Publicaciones destacadas</h3>
          <FeaturedGridLite />
        </section>
      </div>
    </div>
  );
}
