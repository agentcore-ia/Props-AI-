import { PageHeader } from "@/components/layout/page-header";
import { MessageCenter } from "@/components/messages/message-center";

export default function MessagesPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Mensajes"
        description="Inbox unificado para responder rapido, mantener contexto y dejar lista la integracion con IA y WhatsApp."
      />
      <MessageCenter />
    </div>
  );
}
