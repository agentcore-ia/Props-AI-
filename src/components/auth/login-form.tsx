"use client";

import { type FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error("Supabase login failed", {
        email,
        message: error.message,
        code: error.code,
        status: error.status,
      });
      setError("Email o password incorrectos.");
      setIsSubmitting(false);
      return;
    }

    router.replace(redirectTo || "/dashboard");
    router.refresh();
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      <input type="hidden" name="redirectTo" value={redirectTo} />

      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            required
            type="email"
            name="email"
            placeholder="admin@inmobiliaria.com"
            className="h-12 rounded-2xl border-0 bg-muted/55 pl-11 shadow-none"
          />
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Password</label>
        <div className="relative">
          <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            required
            type="password"
            name="password"
            placeholder="Tu password"
            className="h-12 rounded-2xl border-0 bg-muted/55 pl-11 shadow-none"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full rounded-2xl text-sm font-semibold"
      >
        {isSubmitting ? "Ingresando..." : "Ingresar"}
      </Button>
    </form>
  );
}
