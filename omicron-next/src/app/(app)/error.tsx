"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // En produccion, reportar a un servicio de observabilidad.
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-destructive/15">
        <TriangleAlert className="h-7 w-7 text-destructive" />
      </span>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Algo salió mal</h2>
        <p className="max-w-md text-sm text-muted-foreground">
          Ocurrió un error al cargar esta sección. Puedes intentar de nuevo.
        </p>
      </div>
      <Button variant="gradient" onClick={reset}>
        <RotateCcw className="h-4 w-4" />
        Reintentar
      </Button>
    </div>
  );
}
