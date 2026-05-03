import { LockKeyhole, Mail, UserRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function PublicAuthForm({
  mode,
  redirectTo,
  error,
}: {
  mode: "login" | "signup";
  redirectTo: string;
  error?: string;
}) {
  const isSignup = mode === "signup";

  return (
    <form
      className="space-y-5"
      method="post"
      action={isSignup ? "/cuenta/sign-up" : "/cuenta/sign-in"}
    >
      <input type="hidden" name="redirectTo" value={redirectTo} />

      {isSignup ? (
        <div className="space-y-2">
          <label className="text-sm font-medium">Nombre completo</label>
          <div className="relative">
            <UserRound className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              required
              type="text"
              name="fullName"
              placeholder="Juan Perez"
              className="h-12 rounded-2xl border-0 bg-muted/55 pl-11 shadow-none"
            />
          </div>
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-medium">Email</label>
        <div className="relative">
          <Mail className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            required
            type="email"
            name="email"
            placeholder="tu@email.com"
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
            placeholder={isSignup ? "Minimo 8 caracteres" : "Tu password"}
            minLength={8}
            className="h-12 rounded-2xl border-0 bg-muted/55 pl-11 shadow-none"
          />
        </div>
      </div>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <Button type="submit" className="h-12 w-full rounded-2xl text-sm font-semibold">
        {isSignup ? "Crear cuenta" : "Ingresar"}
      </Button>
    </form>
  );
}
