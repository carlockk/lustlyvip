import PoliticsContent from '@/app/components/PoliticsContent';

export const metadata = {
  title: 'Políticas del servicio | Lustly',
  description: 'Conoce las reglas, lineamientos y responsabilidades para creadores y fans dentro de Lustly.',
};

export default function PoliticsPage() {
  return (
    <div className="min-h-screen bg-gray-900 text-gray-100">
      <div className="max-w-4xl mx-auto px-6 py-16">
        <PoliticsContent />
      </div>
    </div>
  );
}
