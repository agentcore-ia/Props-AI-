import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Lead } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const statusColors: Record<Lead["status"], string> = {
  Nuevo: "bg-blue-500/10 text-blue-700",
  Visitando: "bg-violet-500/10 text-violet-700",
  Propuesta: "bg-amber-500/10 text-amber-700",
  Cerrado: "bg-emerald-500/10 text-emerald-700",
};

export function LeadsTable({ leads }: { leads: Lead[] }) {
  return (
    <div className="overflow-hidden rounded-[28px] border bg-card shadow-sm">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead>Nombre</TableHead>
            <TableHead>Teléfono</TableHead>
            <TableHead>Interés</TableHead>
            <TableHead>Estado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id} className="hover:bg-muted/40">
              <TableCell>
                <div>
                  <p className="font-medium">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.email}</p>
                </div>
              </TableCell>
              <TableCell>{lead.phone}</TableCell>
              <TableCell>{lead.interest}</TableCell>
              <TableCell>
                <Badge className={cn("rounded-full border-0", statusColors[lead.status])}>{lead.status}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
