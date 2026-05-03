"use client";

import { useMemo, useState } from "react";
import { Bot, SendHorizonal } from "lucide-react";

import { conversations } from "@/lib/mock-data";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function MessageCenter() {
  const [selectedId, setSelectedId] = useState(conversations[0]?.id ?? "");
  const [draft, setDraft] = useState("");
  const [messagesByConversation, setMessagesByConversation] = useState(
    Object.fromEntries(conversations.map((conversation) => [conversation.id, conversation.messages]))
  );

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0],
    [selectedId]
  );

  if (!selectedConversation) {
    return null;
  }

  const currentMessages = messagesByConversation[selectedConversation.id] ?? [];

  return (
    <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
      <div className="overflow-hidden rounded-[30px] border bg-card shadow-sm">
        <div className="border-b px-5 py-4">
          <h3 className="font-semibold">Conversaciones</h3>
          <p className="mt-1 text-sm text-muted-foreground">Mensajes de WhatsApp, Instagram y web.</p>
        </div>
        <ScrollArea className="h-[640px]">
          <div className="space-y-2 p-3">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                className={cn(
                  "w-full rounded-2xl border p-4 text-left transition-all",
                  selectedId === conversation.id ? "border-primary bg-primary/5" : "bg-background hover:bg-muted/40"
                )}
                onClick={() => setSelectedId(conversation.id)}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">{conversation.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.2em] text-muted-foreground">{conversation.channel}</p>
                  </div>
                  {conversation.unread > 0 && (
                    <span className="rounded-full bg-primary px-2 py-1 text-xs font-semibold text-primary-foreground">
                      {conversation.unread}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm text-muted-foreground">{conversation.lastMessage}</p>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      <div className="flex h-[640px] flex-col overflow-hidden rounded-[30px] border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <div className="flex items-center gap-3">
            <Avatar className="rounded-2xl">
              <AvatarFallback className="rounded-2xl bg-primary/10 text-primary">
                {selectedConversation.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="font-semibold">{selectedConversation.name}</p>
              <p className="text-sm text-muted-foreground">{selectedConversation.channel}</p>
            </div>
          </div>
          <Button variant="outline" className="rounded-2xl">
            <Bot className="size-4" />
            Responder con IA
          </Button>
        </div>

        <ScrollArea className="flex-1 bg-[linear-gradient(180deg,rgba(255,255,255,0.5),rgba(255,255,255,0))] px-6 py-5">
          <div className="space-y-4">
            {currentMessages.map((message) => (
              <div
                key={message.id}
                className={cn("flex", message.role === "agent" ? "justify-end" : "justify-start")}
              >
                <div
                  className={cn(
                    "max-w-[78%] rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm",
                    message.role === "agent"
                      ? "bg-primary text-primary-foreground"
                      : "border bg-background text-foreground"
                  )}
                >
                  <p>{message.content}</p>
                  <p
                    className={cn(
                      "mt-2 text-[11px]",
                      message.role === "agent" ? "text-primary-foreground/80" : "text-muted-foreground"
                    )}
                  >
                    {message.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="border-t px-4 py-4">
          <div className="flex items-center gap-3 rounded-[24px] border bg-background p-2">
            <Input
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Escribí una respuesta..."
              className="border-0 shadow-none focus-visible:ring-0"
            />
            <Button
              className="rounded-2xl"
              onClick={() => {
                if (!draft.trim()) return;

                setMessagesByConversation((prev) => ({
                  ...prev,
                  [selectedConversation.id]: [
                    ...(prev[selectedConversation.id] ?? []),
                    {
                      id: crypto.randomUUID(),
                      role: "agent",
                      content: draft,
                      time: "Ahora",
                    },
                  ],
                }));
                setDraft("");
              }}
            >
              <SendHorizonal className="size-4" />
              Enviar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
