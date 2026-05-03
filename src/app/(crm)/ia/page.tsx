import { AIChat } from "@/components/ia/ai-chat";
import { PageHeader } from "@/components/layout/page-header";

export default function IAPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Centro IA"
        description="Un espacio estilo copiloto para ensayar prompts, automatizaciones y respuestas comerciales antes de conectar modelos reales."
      />
      <AIChat />
    </div>
  );
}
