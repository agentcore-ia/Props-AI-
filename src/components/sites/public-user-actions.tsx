import Link from "next/link";

type PublicViewer = {
  fullName: string | null;
  email: string | null;
  role: "superadmin" | "agency_admin" | "agent" | "customer";
};

export function PublicUserActions({
  currentUser,
}: {
  currentUser: PublicViewer | null;
}) {
  if (currentUser?.role === "customer") {
    return (
      <div className="flex shrink-0 items-center gap-2 sm:gap-3">
        <Link
          href="/cuenta"
          className="inline-flex h-10 shrink-0 items-center rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:text-slate-950 sm:h-auto sm:px-4 sm:py-2"
        >
          <span className="sm:hidden">Cuenta</span>
          <span className="hidden sm:inline">{currentUser.fullName?.split(" ")[0] ?? "Mi cuenta"}</span>
        </Link>
        <form method="post" action="/cuenta/logout">
          <button
            type="submit"
            className="inline-flex h-10 shrink-0 items-center rounded-2xl bg-slate-950 px-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 sm:h-11 sm:px-5"
          >
            <span className="sm:hidden">Salir</span>
            <span className="hidden sm:inline">Cerrar sesion</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex shrink-0 items-center gap-2 sm:gap-3">
      <Link
        href="/cuenta/login"
        className="inline-flex h-10 shrink-0 items-center rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 transition-colors hover:text-slate-950 sm:h-auto sm:px-4 sm:py-2"
      >
        <span className="sm:hidden">Entrar</span>
        <span className="hidden sm:inline">Ingresar</span>
      </Link>
      <Link
        href="/cuenta/registro"
        className="inline-flex h-10 shrink-0 items-center rounded-2xl bg-slate-950 px-3 text-sm font-semibold text-white transition-colors hover:bg-slate-800 sm:h-11 sm:px-5"
      >
        <span className="sm:hidden">Crear</span>
        <span className="hidden sm:inline">Crear cuenta</span>
      </Link>
    </div>
  );
}
