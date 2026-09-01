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
  PackagePlus,
  Plus,
  Save,
  Trash2,
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
  createEmptyProductDraft,
  validateProductDrafts,
  type ProductDraft,
} from "@/lib/setup/products";

export const Route =
  createFileRoute(
    "/setup-productos",
  )({
    component:
      SetupProductsPage,
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

function SetupProductsPage() {
  const [
    drafts,
    setDrafts,
  ] =
    useState<
      ProductDraft[]
    >([
      createEmptyProductDraft(),
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
        validateProductDrafts(
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
      keyof ProductDraft,
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

  function addProduct() {
    setDrafts(
      (current) => [
        ...current,
        createEmptyProductDraft(),
      ],
    );

    setValidated(
      false,
    );

    resetSaveState();
  }

  function removeProduct(
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

  function validateProducts() {
    setValidated(
      true,
    );

    resetSaveState();
  }

  async function saveProducts() {
    const validation =
      validateProductDrafts(
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
          "Corrige los errores del catálogo antes de guardar.",
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
        "Guardando catálogo...",
    });

    setSavedCount(
      0,
    );

    try {
      const response =
        await fetch(
          "/api/setup-products",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify({
                products:
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
            "No fue posible guardar el catálogo.",
        );
      }

      setSavedCount(
        typeof data?.saved ===
          "number"
          ? data.saved
          : validation.products.length,
      );

      setSaveState({
        status: "success",
        message:
          data?.message ||
          "Catálogo guardado correctamente.",
      });
    } catch (error) {
      setSaveState({
        status: "error",
        message:
          error instanceof Error
            ? error.message
            : "No fue posible guardar el catálogo.",
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
              <PackagePlus className="h-6 w-6" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
                Instalador automático
              </p>

              <h1 className="text-xl font-bold">
                Productos de {clientConfig.company.name}
              </h1>
            </div>
          </div>

          <div className="hidden rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium sm:block">
            Paso 2 · Catálogo inicial
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
              <ProductCard
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
                  removeProduct(
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
              addProduct
            }
          >
            <Plus className="mr-2 h-4 w-4" />
            Agregar otro producto
          </Button>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h2 className="font-semibold">
              Resumen
            </h2>

            <div className="mt-4 space-y-2 text-sm">
              <SummaryLine
                label="Productos"
                value={String(
                  drafts.length,
                )}
              />

              <SummaryLine
                label="Válidos"
                value={String(
                  result.products.length,
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
                validateProducts
              }
            >
              Validar catálogo
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
                saveProducts
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
                  Guardar catálogo
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
                    Catálogo válido
                  </h3>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                  Los productos están listos para guardarse en el backend del instalador.
                </p>
              </div>
            )}

          {validated &&
            !result.ok && (
              <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-5">
                <h3 className="font-semibold text-destructive">
                  Revisa el catálogo
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
                    Catálogo guardado
                  </h3>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                  {saveState.message}
                </p>

                <p className="mt-3 text-sm font-medium">
                  Productos guardados: {savedCount}
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

function ProductCard({
  number,
  draft,
  onChange,
  onRemove,
  canRemove,
}: {
  number: number;
  draft:
    ProductDraft;
  onChange: (
    key:
      keyof ProductDraft,
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
            Producto {number}
          </p>

          <h2 className="mt-1 font-semibold">
            {draft.name ||
              "Nuevo producto"}
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
            aria-label="Eliminar producto"
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
            placeholder="Ej: Café Premium"
          />
        </Field>

        <Field label="Categoría">
          <Input
            value={
              draft.category
            }
            onChange={(
              event,
            ) =>
              onChange(
                "category",
                event.target
                  .value,
              )
            }
            placeholder="Ej: Productos"
          />
        </Field>

        <Field label="Unidad física de stock">
          <Input
            value={
              draft.stockUnitLabel
            }
            onChange={(
              event,
            ) =>
              onChange(
                "stockUnitLabel",
                event.target
                  .value,
              )
            }
            placeholder="unidad, caja, bolsa..."
          />
        </Field>

        <Field label="Kg por unidad (opcional)">
          <Input
            inputMode="decimal"
            value={
              draft.kgPerUnit
            }
            onChange={(
              event,
            ) =>
              onChange(
                "kgPerUnit",
                event.target
                  .value,
              )
            }
            placeholder="0,5"
          />
        </Field>

        <Field label="Costo neto">
          <Input
            inputMode="decimal"
            value={
              draft.netCost
            }
            onChange={(
              event,
            ) =>
              onChange(
                "netCost",
                event.target
                  .value,
              )
            }
            placeholder="4500"
          />
        </Field>

        <Field label="Stock inicial">
          <Input
            inputMode="decimal"
            value={
              draft.stock
            }
            onChange={(
              event,
            ) =>
              onChange(
                "stock",
                event.target
                  .value,
              )
            }
            placeholder="0"
          />
        </Field>

        <Field label="Stock mínimo">
          <Input
            inputMode="decimal"
            value={
              draft.min
            }
            onChange={(
              event,
            ) =>
              onChange(
                "min",
                event.target
                  .value,
              )
            }
            placeholder="0"
          />
        </Field>

        <Field label="Formato de venta">
          <Input
            value={
              draft.formatLabel
            }
            onChange={(
              event,
            ) =>
              onChange(
                "formatLabel",
                event.target
                  .value,
              )
            }
            placeholder="Unidad"
          />
        </Field>

        <Field label="Unidades que descuenta">
          <Input
            inputMode="decimal"
            value={
              draft.formatUnits
            }
            onChange={(
              event,
            ) =>
              onChange(
                "formatUnits",
                event.target
                  .value,
              )
            }
            placeholder="1"
          />
        </Field>

        <Field label="Precio lista">
          <Input
            inputMode="decimal"
            value={
              draft.price
            }
            onChange={(
              event,
            ) =>
              onChange(
                "price",
                event.target
                  .value,
              )
            }
            placeholder="7990"
          />
        </Field>

        <Field label="Precio preferente">
          <Input
            inputMode="decimal"
            value={
              draft.prefPrice
            }
            onChange={(
              event,
            ) =>
              onChange(
                "prefPrice",
                event.target
                  .value,
              )
            }
            placeholder="7490"
          />
        </Field>
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
