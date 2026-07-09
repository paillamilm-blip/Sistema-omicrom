import Link from "next/link";

import { Logo } from "@/components/dashboard/logo";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-omicron-radial px-4 text-center">
      <Logo />
      <div className="space-y-2">
        <p className="text-6xl font-extrabold text-gradient">404</p>
        <h1 className="text-xl font-semibold">Página no encontrada</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          La ruta que buscas no existe o fue movida. Volvamos a un lugar
          conocido.
        </p>
      </div>
      <Button variant="gradient" asChild>
        <Link href="/dashboard">Ir al dashboard</Link>
      </Button>
    </div>
  );
}
