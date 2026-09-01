import { createFileRoute, useNavigate } from "@tanstack/react-router";

import {
  FileText,
  History,
  PlusCircle,
} from "lucide-react";

import { AppShell } from "@/components/AppShell";

import { Button } from "@/components/ui/button";

import { companyConfig } from "@/lib/config/company";

export const Route = createFileRoute("/cotizaciones")({
  head: () => ({
    meta: [
      {
        title: `Cotizaciones — ${companyConfig.name} CRM`,
      },
      {
        name: "description",
        content:
          `Crear, revisar y gestionar cotizaciones comerciales de ${companyConfig.name}.`,
      },
    ],
  }),

  component: Cotizaciones,
});

function Cotizaciones() {
  const navigate = useNavigate();

  return (
    <AppShell
      title="Cotizaciones"
      subtitle="Gestión comercial"
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand text-brand-foreground">
              <FileText className="h-5 w-5" />
            </div>

            <div>
              <h2 className="font-display text-lg font-bold">
                Cotizaciones {companyConfig.name}
              </h2>

              <p className="mt-1 text-sm text-muted-foreground">
                Cotiza utilizando los productos, precios y disponibilidad configurados en el sistema.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            className="h-16 justify-start text-base"
            onClick={() =>
              navigate({
                to: "/nueva-cotizacion",
              })
            }
          >
            <PlusCircle className="mr-3 h-5 w-5" />
            Nueva cotización
          </Button>

          <Button
            variant="outline"
            className="h-16 justify-start text-base"
            onClick={() =>
              navigate({
                to: "/historial-cotizaciones",
              })
            }
          >
            <History className="mr-3 h-5 w-5" />
            Historial de cotizaciones
          </Button>
        </div>

        <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">
          Las cotizaciones consultan productos, precios y disponibilidad del sistema.
          Crear una cotización no descuenta inventario.
        </div>
      </div>
    </AppShell>
  );
}