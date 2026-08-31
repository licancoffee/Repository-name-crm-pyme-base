import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { useDB } from "@/lib/crm/store";
import { consultarStock } from "@/lib/kaizen/tools";

export const Route = createFileRoute("/kaizen")({
  component: KaizenPage,
});

function KaizenPage() {
  const db = useDB();

  const [message, setMessage] = useState("");
  const [response, setResponse] = useState(
    "Hola. Soy Kaizen. Puedes preguntarme por el stock de un producto.",
  );

  function handleAsk() {
    const text = message.trim();

    if (!text) return;

    const cleanText = text
      .replace(/[¿?]/g, "")
      .replace(/[.,;:!]/g, "")
      .trim();

    const lower = cleanText.toLowerCase();

    const prefixes = [
      "cuanto stock tengo de",
      "cuánto stock tengo de",
      "stock de",
      "cuanto queda de",
      "cuánto queda de",
      "dime el stock de",
      "consultar stock de",
    ];

    let productName = cleanText;

    for (const prefix of prefixes) {
      if (lower.startsWith(prefix)) {
        productName = cleanText.slice(prefix.length).trim();
        break;
      }
    }

    const result = consultarStock(db, productName);

    setResponse(
      result.message ??
        result.error ??
        "No pude procesar la consulta.",
    );

    setMessage("");
  }

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl space-y-6 p-4">
        <div>
          <h1 className="text-2xl font-bold">Kaizen IA</h1>

          <p className="text-sm text-muted-foreground">
            Asistente interno de Lican Coffee
          </p>
        </div>

        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <div className="mb-4 rounded-xl bg-muted p-4">
            <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
              Kaizen
            </div>

            <div className="text-base">
              {response}
            </div>
          </div>

          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAsk();
                }
              }}
              placeholder="Ej: ¿Cuánto stock tengo de Chocolate?"
            />

            <Button onClick={handleAsk}>
              Consultar
            </Button>
          </div>
        </div>

        <div className="rounded-xl border p-4 text-sm text-muted-foreground">
          Primera versión de Kaizen: consulta de stock en modo solo lectura.
        </div>
      </div>
    </AppShell>
  );
}
