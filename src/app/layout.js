// src/app/layout.js
import Providers from './providers';
import './globals.css';
import { Inter } from 'next/font/google';
import AppShellClient from './components/AppShellClient';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Lustly - Contenido Exclusivo',
  description: 'Plataforma de contenido exclusivo para creadores y fans.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={inter.className}>
      <body>
        <Providers>
          {/* 👇 Toda la lógica de mostrar/ocultar Sidebar y el ml-64 vive aquí */}
          <AppShellClient>{children}</AppShellClient>
        </Providers>
      </body>
    </html>
  );
}
