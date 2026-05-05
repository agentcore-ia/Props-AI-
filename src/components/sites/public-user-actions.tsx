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
      <div className="flex items-center gap-3">
        <Link
          href="/cuenta"
          className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-slate-950 sm:inline-flex"
        >
          {currentUser.fullName?.split(" ")[0] ?? "Mi cuenta"}
        </Link>
        <form method="post" action="/cuenta/logout">
          <button
            type="submit"
            className="inline-flex h-10 items-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 sm:h-11 sm:px-5"
          >
            <span className="hidden sm:inline">Cerrar sesion</span>
            <span className="sm:hidden">Salir</span>
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/cuenta/login"
        className="hidden rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:text-slate-950 sm:inline-flex"
      >
        Ingresar
      </Link>
      <Link
        href="/cuenta/registro"
        className="inline-flex h-10 items-center rounded-2xl bg-slate-950 px-4 text-sm font-semibold text-white transition-colors hover:bg-slate-800 sm:h-11 sm:px-5"
      >
        Crear cuenta
      </Link>
    </div>
  );
}
