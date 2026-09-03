import { useState } from "react";

import {
  createFileRoute,
} from "@tanstack/react-router";

import {
  AppShell,
} from "@/components/AppShell";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  clientConfig,
} from "@/lib/config/client";

import {
  useDB,
} from "@/lib/crm/store";

import {
  consultarStock,
} from "@/lib/Kaizen/tools";

export const Route =
  createFileRoute(
    "/kaizen",
  )({
    component:
      KaizenPage,
  });

function KaizenPage() {
  const db =
    useDB();

  const assistantName =
    clientConfig.whatsapp
      .assistantName ||
    "Asistente IA";

  const kaizenEnabled =
    clientConfig.modules
      .kaizen;

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    response,
    setResponse,
  ] = useState(
    `Hola. Soy ${assistantName}. Puedes preguntarme por el stock de un producto.`,
  );

  function handleAsk() {
    if (!kaizenEnabled) {
      return;
    }

    const text =
      message.trim();

    if (!text) {
      return;
    }

    const cleanText =
      text
        .replace(
          /[¿?]/g,
          "",
        )
        .replace(
          /[.,;:!]/g,
          "",
        )
        .trim();

    const lower =
      cleanText.toLowerCase();

    const prefixes = [
      "cuanto stock tengo de",
      "cuánto stock tengo de",
      "stock de",
      "cuanto queda de",
      "cuánto queda de",
      "dime el stock de",
      "consultar stock de",
    ];

    let productName =
      cleanText;

    for (
      const prefix
      of prefixes
    ) {
      if (
        lower.startsWith(
          prefix,
        )
      ) {
        productName =
          cleanText
            .slice(
              prefix.length,
            )
            .trim();

        break;
      }
    }

    const result =
      consultarStock(
        db,
        productName,
      );

    setResponse(
      result.message ??
        result.error ??
        "No pude procesar la consulta.",
    );

    setMessage("");
  }

  if (!kaizenEnabled) {
    return (
      <AppShell
        title="Asistente IA"
        subtitle={
          clientConfig
            .company.name
        }
      >
        <div className="mx-auto w-full max-w-2xl p-4">
          <div className="rounded-2xl border bg-card p-6 shadow-sm">
            <h2 className="text-lg font-semibold">
              Módulo no habilitado
            </h2>

            <p className="mt-2 text-sm text-muted-foreground">
              El asistente IA no está habilitado para esta instalación.
            </p>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      title={`${assistantName} IA`}
      subtitle={`Asistente interno de ${clientConfig.company.name}`}
    >
      <div className="mx-auto w-full max-w-2xl space-y-6 p-4">
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-4 rounded-xl bg-muted p-4">
            <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
              {assistantName}
            </div>

            <div className="text-base">
              {response}
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              value={
                message
              }
              onChange={(
                event,
              ) =>
                setMessage(
                  event.target
                    .value,
                )
              }
              onKeyDown={(
                event,
              ) => {
                if (
                  event.key ===
                  "Enter"
                ) {
                  handleAsk();
                }
              }}
              placeholder="Ej: ¿Cuánto stock tengo de Producto Demo A?"
            />

            <Button
              onClick={
                handleAsk
              }
            >
              Consultar
            </Button>
          </div>
        </div>

        <div className="rounded-xl border p-4 text-sm text-muted-foreground">
          Asistente de consulta de stock en modo solo lectura.
        </div>
      </div>
    </AppShell>
  );
}
