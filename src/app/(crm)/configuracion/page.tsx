import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Configuracion"
        description="Datos base de la inmobiliaria, listos para persistencia real y futuras integraciones de canales."
      />

      <Card className="max-w-3xl rounded-[32px] border-0 bg-card shadow-sm">
        <CardHeader>
          <CardTitle>Perfil de la inmobiliaria</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <label className="text-sm font-medium">Nombre</label>
            <Input defaultValue="Agentcore Realty" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Email</label>
            <Input defaultValue="contacto@props.com.ar" />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Telefono</label>
            <Input defaultValue="+54 11 5555 0000" />
          </div>
          <div className="md:col-span-2">
            <Button className="rounded-2xl">Guardar cambios</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
