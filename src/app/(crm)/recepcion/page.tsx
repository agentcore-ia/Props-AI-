import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function ReceptionPage() {
  redirect("/mensajes?modo=recepcion");
}
