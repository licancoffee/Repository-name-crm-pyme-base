import {
  useMemo,
  useState,
} from "react";

import {
  createFileRoute,
} from "@tanstack/react-router";

import {
  CheckCircle2,
  Loader2,
  Plus,
  Save,
  Trash2,
  UserPlus,
} from "lucide-react";

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
  createEmptyCustomerDraft,
  validateCustomerDrafts,
  type CustomerDraft,
} from "@/lib/setup/customers";

export const Route =
  createFileRoute(
    "/setup-clientes",
  )({
    component:
      SetupCustomersPage,
  });

type SaveState =
  | {
      status: "idle";
      message: "";
    }
  | {
      status: "saving";
      message: string;
    }
  | {
      status: "success";
      message: string;
    }
  | {
      status: "error";
      message: string;
    };

function SetupCustomersPage() {
  const [
    drafts,
    setDrafts,
  ] =
    useState<
      CustomerDraft[]
    >([
      createEmptyCustomerDraft(),
    ]);

  const [
    validated,
    setValidated,
  ] =
    useState(false);

  const [
    saveState,
    setSaveState,
  ] =
    useState<SaveState>({
      status: "idle",
      message: "",
    });

  const [
    savedCount,
    setSavedCount,
  ] =
    useState(0);

  const result =
    useMemo(
      () =>
        validateCustomerDrafts(
          drafts,
        ),
      [drafts],
    );

  function resetSaveState() {
    setSaveState({
      status: "idle",
      message: "",
    });

    setSavedCount(
      0,
    );
  }

  function updateDraft(
    id: string,
    key:
      keyof CustomerDraft,
    value: string,
  ) {
    setDrafts(
      (current) =>
        current.map(
          (draft) =>
            draft.id === id
              ? {
                  ...draft,
                  [key]:
                    value,
                }
              : draft,
        ),
    );

    setValidated(
      false,
    );

    resetSaveState();
  }

  function addCustomer() {
    setDrafts(
      (current) => [
        ...current,
        createEmptyCustomerDraft(),
      ],
    );

    setValidated(
      false,
    );

    resetSaveState();
  }

  function removeCustomer(
    id: string,
  ) {
    setDrafts(
      (current) =>
        current.filter(
          (draft) =>
            draft.id !== id,
        ),
    );

    setValidated(
      false,
    );

    resetSaveState();
  }

  function validateCustomers() {
    setValidated(
      true,
    );

    resetSaveState();
  }

  async function saveCustomers() {
    const validation =
      validateCustomerDrafts(
        drafts,
      );

    setValidated(
      true,
    );

    if (
      !validation.ok
    ) {
      setSaveState({
        status: "error",
        message:
          "Corrige los errores antes de guardar.",
      });

      return;
    }

    if (
      saveState.status ===
      "saving"
    ) {
      return;
    }

    setSaveState({
      status: "saving",
      message:
        "Guardando clientes...",
    });

    setSavedCount(
      0,
    );

    try {
      const response =
        await fetch(
          "/api/setup-customers",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body:
              JSON.stringify({
                customers:
                  drafts,
              }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        const errors =
          Array.isArray(
            data?.errors,
          )
            ? data.errors.join(
                " ",
              )
            : "";

        throw new Error(
          errors ||
            data?.message ||
            "No fue posible guardar los clientes.",
        );
      }

      setSavedCount(
        typeof data?.saved ===
          "number"
          ? data.saved
          : validation.customers.length,
      );

      setSaveState({
        status: "success",
        message:
          data?.message ||
          "Clientes guardados correctamente.",
      });
    } catch (error) {
      setSaveState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "No fue posible guardar los clientes.",
      });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header
        className="border-b px-4 py-5 text-white"
        style={{
          backgroundImage:
            `linear-gradient(135deg, ${clientConfig.branding.primaryColor}, ${clientConfig.branding.secondaryColor})`,
        }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="grid h-11 w-11 place-items-center rounded-2xl shadow-sm"
              style={{
                backgroundColor:
                  clientConfig
                    .branding
                    .accentColor,
              }}
            >
              <UserPlus className="h-6 w-6" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
                Instalador automático
              </p>

              <h1 className="text-xl font-bold">
                Clientes de {clientConfig.company.name}
              </h1>
            </div>
          </div>

          <div className="hidden rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium sm:block">
            Paso 3 · Clientes iniciales
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="space-y-4">
          {drafts.map(
            (
              draft,
              index,
            ) => (
              <CustomerCard
                key={
                  draft.id
                }
                number={
                  index + 1
                }
                draft={
                  draft
                }
                onChange={(
                  key,
                  value,
                ) =>
                  updateDraft(
                    draft.id,
                    key,
                    value,
                  )
                }
                onRemove={() =>
                  removeCustomer(
                    draft.id,
                  )
                }
                canRemove={
                  drafts.length >
                  1
                }
              />
            ),
          )}

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={
              addCustomer
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar otro cliente
          </Button>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="font-semibold">
              Resumen
            </h2>

            <div className="mt-4 space-y-2 text-sm">
              <SummaryLine
                label="Clientes"
                value={String(
                  drafts.length,
                )}
              />

              <SummaryLine
                label="Válidos"
                value={String(
                  result.customers.length,
                )}
              />

              <SummaryLine
                label="Errores"
                value={String(
                  result.errors.length,
                )}
              />
            </div>

            <Button
              type="button"
              variant="outline"
              className="mt-5 w-full"
              onClick={
                validateCustomers
              }
            >
              Validar clientes
            </Button>

            <Button
              type="button"
              className="mt-3 w-full"
              disabled={
                !result.ok ||
                saveState.status ===
                  "saving"
              }
              onClick={
                saveCustomers
              }
            >
              {saveState.status ===
              "saving" ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar clientes
                </>
              )}
            </Button>
          </div>

          {validated &&
            result.ok && (
              <div className="rounded-2xl border border-success/30 bg-success/10 p-5">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />

                  <h3 className="font-semibold">
                    Clientes válidos
                  </h3>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                  Los clientes están listos para guardarse en el backend del instalador.
                </p>
              </div>
            )}

          {validated &&
            !result.ok && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5">
                <h3 className="font-semibold text-destructive">
                  Revisa los clientes
                </h3>

                <div className="mt-3 space-y-2 text-xs text-destructive">
                  {result.errors.map(
                    (
                      error,
                      index,
                    ) => (
                      <p
                        key={`${error}-${index}`}
                      >
                        {error}
                      </p>
                    ),
                  )}
                </div>
              </div>
            )}

          {saveState.status ===
            "success" && (
              <div className="rounded-2xl border border-success/30 bg-success/10 p-5">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />

                  <h3 className="font-semibold">
                    Clientes guardados
                  </h3>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                  {saveState.message}
                </p>

                <p className="mt-3 text-sm font-medium">
                  Clientes guardados: {savedCount}
                </p>
              </div>
            )}

          {saveState.status ===
            "error" && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5">
                <h3 className="font-semibold text-destructive">
                  No se pudo guardar
                </h3>

                <p className="mt-2 text-sm text-destructive">
                  {saveState.message}
                </p>
              </div>
            )}
        </aside>
      </main>
    </div>
  );
}

function CustomerCard({
  number,
  draft,
  onChange,
  onRemove,
  canRemove,
}: {
  number: number;
  draft:
    CustomerDraft;
  onChange: (
    key:
      keyof CustomerDraft,
    value: string,
  ) => void;
  onRemove:
    () => void;
  canRemove:
    boolean;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Cliente {number}
          </p>

          <h2 className="mt-1 font-semibold">
            {draft.name ||
              "Nuevo cliente"}
          </h2>
        </div>

        {canRemove && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={
              onRemove
            }
            aria-label="Eliminar cliente"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nombre">
          <Input
            value={
              draft.name
            }
            onChange={(
              event,
            ) =>
              onChange(
                "name",
                event.target
                  .value,
              )
            }
            placeholder="Ej: Cliente Uno"
          />
        </Field>

        <Field label="Teléfono">
          <Input
            value={
              draft.phone
            }
            onChange={(
              event,
            ) =>
              onChange(
                "phone",
                event.target
                  .value,
              )
            }
            placeholder="+56 9..."
          />
        </Field>

        <Field label="Dirección">
          <Input
            value={
              draft.address
            }
            onChange={(
              event,
            ) =>
              onChange(
                "address",
                event.target
                  .value,
              )
            }
            placeholder="Dirección"
          />
        </Field>

        <Field label="Tipo de precio">
          <select
            value={
              draft.priceType
            }
            onChange={(
              event,
            ) =>
              onChange(
                "priceType",
                event.target
                  .value,
              )
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="LISTA">
              Lista
            </option>

            <option value="PREFERENTE">
              Preferente
            </option>

            <option value="PERSONALIZADO">
              Personalizado
            </option>
          </select>
        </Field>

        <div className="sm:col-span-2">
          <Field label="Observación">
            <Input
              value={
                draft.note
              }
              onChange={(
                event,
              ) =>
                onChange(
                  "note",
                  event.target
                    .value,
                )
              }
              placeholder="Opcional"
            />
          </Field>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children:
    React.ReactNode;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium">
        {label}
      </span>

      {children}
    </label>
  );
}

function SummaryLine({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">
        {label}
      </span>

      <span className="font-medium">
        {value}
      </span>
    </div>
  );
}
