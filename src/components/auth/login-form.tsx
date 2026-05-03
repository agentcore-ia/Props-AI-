"use client";

import { useFormState } from "react-dom";
import { LockKeyhole, Mail } from "lucide-react";

import { login } from "@/app/auth/login/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function LoginForm({ redirectTo }: { redirectTo: string }) {
  const [state, formAction] = useFormState(login, undefined);

  return (
    <form className="space-y-5" action={formAction}>
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

      {state?.error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {state.error}
        </div>
      ) : null}

      <Button type="submit" className="h-12 w-full rounded-2xl text-sm font-semibold">
        Ingresar
      </Button>
    </form>
  );
}
