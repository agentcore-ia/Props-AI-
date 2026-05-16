import { AIChat } from "@/components/ia/ai-chat";
import { PageHeader } from "@/components/layout/page-header";

export default function IAPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Asistente Props"
        description="Un espacio para resolver dudas del equipo, preparar respuestas, resumir contratos y ejecutar tareas operativas sin buscar en varias secciones."
      />
      <AIChat />
    </div>
  );
}
