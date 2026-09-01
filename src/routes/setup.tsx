import {
  useMemo,
  useState,
} from "react";

import {
  createFileRoute,
} from "@tanstack/react-router";

import {
  Building2,
  CheckCircle2,
  ChevronRight,
  Loader2,
  Palette,
  Settings2,
  Truck,
  WalletCards,
  WandSparkles,
} from "lucide-react";

import {
  Button,
} from "@/components/ui/button";

import {
  Input,
} from "@/components/ui/input";

import {
  clientConfig,
  type ClientConfig,
} from "@/lib/config/client";

export const Route =
  createFileRoute(
    "/setup",
  )({
    component:
      SetupPage,
  });

type SetupForm =
  ClientConfig;

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

function cloneClientConfig():
SetupForm {
  return {
    ...clientConfig,

    company: {
      ...clientConfig.company,
    },

    branding: {
      ...clientConfig.branding,
    },

    commercial: {
      ...clientConfig.commercial,

      volumePricingRules: [
        ...clientConfig
          .commercial
          .volumePricingRules,
      ],
    },

    modules: {
      ...clientConfig.modules,
    },

    payments: {
      ...clientConfig.payments,

      methods: [
        ...clientConfig
          .payments
          .methods,
      ],
    },

    shipping: {
      ...clientConfig.shipping,
    },

    whatsapp: {
      ...clientConfig.whatsapp,
    },

    integrations: {
      ...clientConfig.integrations,

      appsScript: {
        ...clientConfig
          .integrations
          .appsScript,
      },

      googleSheets: {
        ...clientConfig
          .integrations
          .googleSheets,
      },
    },
  };
}

function SetupPage() {
  const [
    form,
    setForm,
  ] =
    useState<SetupForm>(
      cloneClientConfig,
    );

  const [
    saveState,
    setSaveState,
  ] =
    useState<SaveState>({
      status: "idle",
      message: "",
    });

  const [
    savedConfig,
    setSavedConfig,
  ] =
    useState<
      ClientConfig | null
    >(null);

  const isValid =
    useMemo(() => {
      return (
        form.company.name
          .trim()
          .length > 1 &&
        form.company.legalName
          .trim()
          .length > 1 &&
        form.company.rut
          .trim()
          .length > 3 &&
        form.company.email
          .trim()
          .includes("@")
      );
    }, [form]);

  function updateCompany<
    K extends keyof ClientConfig["company"],
  >(
    key: K,
    value:
      ClientConfig["company"][K],
  ) {
    setForm(
      (current) => ({
        ...current,

        company: {
          ...current.company,
          [key]: value,
        },
      }),
    );

    clearSaveResult();
  }

  function updateBranding<
    K extends keyof ClientConfig["branding"],
  >(
    key: K,
    value:
      ClientConfig["branding"][K],
  ) {
    setForm(
      (current) => ({
        ...current,

        branding: {
          ...current.branding,
          [key]: value,
        },
      }),
    );

    clearSaveResult();
  }

  function updateModule(
    key:
      keyof ClientConfig["modules"],
    value: boolean,
  ) {
    setForm(
      (current) => ({
        ...current,

        modules: {
          ...current.modules,
          [key]: value,
        },
      }),
    );

    clearSaveResult();
  }

  function updateWhatsapp<
    K extends keyof ClientConfig["whatsapp"],
  >(
    key: K,
    value:
      ClientConfig["whatsapp"][K],
  ) {
    setForm(
      (current) => ({
        ...current,

        whatsapp: {
          ...current.whatsapp,
          [key]: value,
        },
      }),
    );

    clearSaveResult();
  }

  function updateShipping<
    K extends keyof ClientConfig["shipping"],
  >(
    key: K,
    value:
      ClientConfig["shipping"][K],
  ) {
    setForm(
      (current) => ({
        ...current,

        shipping: {
          ...current.shipping,
          [key]: value,
        },
      }),
    );

    clearSaveResult();
  }

  function updatePayments<
    K extends keyof ClientConfig["payments"],
  >(
    key: K,
    value:
      ClientConfig["payments"][K],
  ) {
    setForm(
      (current) => ({
        ...current,

        payments: {
          ...current.payments,
          [key]: value,
        },
      }),
    );

    clearSaveResult();
  }

  function clearSaveResult() {
    setSavedConfig(null);

    setSaveState({
      status: "idle",
      message: "",
    });
  }

  async function saveConfiguration() {
    if (
      !isValid ||
      saveState.status ===
        "saving"
    ) {
      return;
    }

    setSaveState({
      status: "saving",
      message:
        "Guardando configuración...",
    });

    setSavedConfig(null);

    try {
      const response =
        await fetch(
          "/api/setup",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body:
              JSON.stringify(
                form,
              ),
          },
        );

      const result:
        any =
        await response.json();

      if (!response.ok) {
        const validationMessage =
          Array.isArray(
            result?.errors,
          )
            ? result.errors.join(
                " ",
              )
            : "";

        throw new Error(
          validationMessage ||
            result?.message ||
            "No fue posible guardar la configuración.",
        );
      }

      setSavedConfig(
        result?.config ??
          form,
      );

      setSaveState({
        status:
          "success",

        message:
          result?.message ||
          "Configuración guardada correctamente.",
      });
    } catch (error) {
      setSaveState({
        status: "error",

        message:
          error instanceof Error
            ? error.message
            : "Error inesperado al guardar la configuración.",
      });
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <header
        className="border-b px-4 py-5 text-white"
        style={{
          backgroundImage:
            `linear-gradient(135deg, ${form.branding.primaryColor}, ${form.branding.secondaryColor})`,
        }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className="grid h-11 w-11 place-items-center rounded-2xl shadow-sm"
              style={{
                backgroundColor:
                  form.branding
                    .accentColor,
              }}
            >
              <WandSparkles className="h-6 w-6" />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-80">
                Instalador automático
              </p>

              <h1 className="text-xl font-bold">
                Configurar nuevo CRM
              </h1>
            </div>
          </div>

          <div className="hidden rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium sm:block">
            Paso 1 · Configuración del cliente
          </div>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-5xl gap-6 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Section
            icon={Building2}
            title="Empresa"
            description="Datos principales que identificarán esta instalación."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Nombre comercial">
                <Input
                  value={
                    form.company
                      .name
                  }
                  onChange={(
                    event,
                  ) =>
                    updateCompany(
                      "name",
                      event.target
                        .value,
                    )
                  }
                />
              </Field>

              <Field label="Razón social">
                <Input
                  value={
                    form.company
                      .legalName
                  }
                  onChange={(
                    event,
                  ) =>
                    updateCompany(
                      "legalName",
                      event.target
                        .value,
                    )
                  }
                />
              </Field>

              <Field label="RUT">
                <Input
                  value={
                    form.company
                      .rut
                  }
                  onChange={(
                    event,
                  ) =>
                    updateCompany(
                      "rut",
                      event.target
                        .value,
                    )
                  }
                />
              </Field>

              <Field label="Teléfono">
                <Input
                  value={
                    form.company
                      .phone
                  }
                  onChange={(
                    event,
                  ) =>
                    updateCompany(
                      "phone",
                      event.target
                        .value,
                    )
                  }
                />
              </Field>

              <Field label="Correo">
                <Input
                  type="email"
                  value={
                    form.company
                      .email
                  }
                  onChange={(
                    event,
                  ) =>
                    updateCompany(
                      "email",
                      event.target
                        .value,
                    )
                  }
                />
              </Field>

              <Field label="Sitio web">
                <Input
                  value={
                    form.company
                      .website
                  }
                  onChange={(
                    event,
                  ) =>
                    updateCompany(
                      "website",
                      event.target
                        .value,
                    )
                  }
                />
              </Field>

              <Field label="Dirección">
                <Input
                  value={
                    form.company
                      .address
                  }
                  onChange={(
                    event,
                  ) =>
                    updateCompany(
                      "address",
                      event.target
                        .value,
                    )
                  }
                />
              </Field>

              <Field label="Ciudad">
                <Input
                  value={
                    form.company
                      .city
                  }
                  onChange={(
                    event,
                  ) =>
                    updateCompany(
                      "city",
                      event.target
                        .value,
                    )
                  }
                />
              </Field>
            </div>
          </Section>

          <Section
            icon={Palette}
            title="Marca"
            description="Identidad visual que verá el cliente dentro del CRM."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Logo">
                <Input
                  value={
                    form.branding
                      .logoUrl
                  }
                  onChange={(
                    event,
                  ) =>
                    updateBranding(
                      "logoUrl",
                      event.target
                        .value,
                    )
                  }
                  placeholder="/logo.png"
                />
              </Field>

              <Field label="Color principal">
                <ColorField
                  value={
                    form.branding
                      .primaryColor
                  }
                  onChange={(
                    value,
                  ) =>
                    updateBranding(
                      "primaryColor",
                      value,
                    )
                  }
                />
              </Field>

              <Field label="Color secundario">
                <ColorField
                  value={
                    form.branding
                      .secondaryColor
                  }
                  onChange={(
                    value,
                  ) =>
                    updateBranding(
                      "secondaryColor",
                      value,
                    )
                  }
                />
              </Field>

              <Field label="Color de acento">
                <ColorField
                  value={
                    form.branding
                      .accentColor
                  }
                  onChange={(
                    value,
                  ) =>
                    updateBranding(
                      "accentColor",
                      value,
                    )
                  }
                />
              </Field>
            </div>
          </Section>

          <Section
            icon={Settings2}
            title="Módulos"
            description="Activa solo las funciones contratadas por cada cliente."
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <Toggle
                label="Dashboard"
                checked={
                  form.modules
                    .dashboard
                }
                onChange={(
                  checked,
                ) =>
                  updateModule(
                    "dashboard",
                    checked,
                  )
                }
              />

              <Toggle
                label="Ventas"
                checked={
                  form.modules
                    .sales
                }
                onChange={(
                  checked,
                ) =>
                  updateModule(
                    "sales",
                    checked,
                  )
                }
              />

              <Toggle
                label="Clientes"
                checked={
                  form.modules
                    .customers
                }
                onChange={(
                  checked,
                ) =>
                  updateModule(
                    "customers",
                    checked,
                  )
                }
              />

              <Toggle
                label="Inventario"
                checked={
                  form.modules
                    .inventory
                }
                onChange={(
                  checked,
                ) =>
                  updateModule(
                    "inventory",
                    checked,
                  )
                }
              />

              <Toggle
                label="Cotizaciones"
                checked={
                  form.modules
                    .quotes
                }
                onChange={(
                  checked,
                ) =>
                  updateModule(
                    "quotes",
                    checked,
                  )
                }
              />

              <Toggle
                label="Historial"
                checked={
                  form.modules
                    .history
                }
                onChange={(
                  checked,
                ) =>
                  updateModule(
                    "history",
                    checked,
                  )
                }
              />

              <Toggle
                label="WhatsApp"
                checked={
                  form.modules
                    .whatsapp
                }
                onChange={(
                  checked,
                ) => {
                  updateModule(
                    "whatsapp",
                    checked,
                  );

                  updateWhatsapp(
                    "enabled",
                    checked,
                  );
                }}
              />

              <Toggle
                label="Asistente IA"
                checked={
                  form.modules
                    .kaizen
                }
                onChange={(
                  checked,
                ) =>
                  updateModule(
                    "kaizen",
                    checked,
                  )
                }
              />
            </div>
          </Section>

          <Section
            icon={WalletCards}
            title="Pagos"
            description="Configura si el CRM debe informar métodos de pago."
          >
            <div className="space-y-4">
              <Toggle
                label="Habilitar pagos"
                checked={
                  form.payments
                    .enabled
                }
                onChange={(
                  checked,
                ) =>
                  updatePayments(
                    "enabled",
                    checked,
                  )
                }
              />

              <Field label="Instrucciones">
                <Input
                  value={
                    form.payments
                      .instructions
                  }
                  onChange={(
                    event,
                  ) =>
                    updatePayments(
                      "instructions",
                      event.target
                        .value,
                    )
                  }
                  placeholder="Ej: Transferir a cuenta empresa..."
                />
              </Field>
            </div>
          </Section>

          <Section
            icon={Truck}
            title="Despacho"
            description="Define cómo se comportará el flujo de entrega."
          >
            <div className="space-y-4">
              <Toggle
                label="Habilitar despacho"
                checked={
                  form.shipping
                    .enabled
                }
                onChange={(
                  checked,
                ) =>
                  updateShipping(
                    "enabled",
                    checked,
                  )
                }
              />

              <Toggle
                label="Solicitar localidad"
                checked={
                  form.shipping
                    .askLocation
                }
                onChange={(
                  checked,
                ) =>
                  updateShipping(
                    "askLocation",
                    checked,
                  )
                }
              />

              <Field label="Instrucciones">
                <Input
                  value={
                    form.shipping
                      .instructions
                  }
                  onChange={(
                    event,
                  ) =>
                    updateShipping(
                      "instructions",
                      event.target
                        .value,
                    )
                  }
                  placeholder="Ej: Despacho coordinado según comuna."
                />
              </Field>
            </div>
          </Section>

          <Section
            icon={WandSparkles}
            title="WhatsApp y asistente"
            description="Configuración del canal automático de atención."
          >
            <div className="space-y-4">
              <Field label="Nombre del asistente">
                <Input
                  value={
                    form.whatsapp
                      .assistantName
                  }
                  onChange={(
                    event,
                  ) =>
                    updateWhatsapp(
                      "assistantName",
                      event.target
                        .value,
                    )
                  }
                />
              </Field>

              <Toggle
                label="Derivación a persona"
                checked={
                  form.whatsapp
                    .humanHandoffEnabled
                }
                onChange={(
                  checked,
                ) =>
                  updateWhatsapp(
                    "humanHandoffEnabled",
                    checked,
                  )
                }
              />

              <Toggle
                label="Cotización automática"
                checked={
                  form.whatsapp
                    .quoteFlowEnabled
                }
                onChange={(
                  checked,
                ) =>
                  updateWhatsapp(
                    "quoteFlowEnabled",
                    checked,
                  )
                }
              />
            </div>
          </Section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              Vista previa
            </p>

            <div
              className="mt-4 rounded-2xl p-5 text-white"
              style={{
                backgroundImage:
                  `linear-gradient(135deg, ${form.branding.primaryColor}, ${form.branding.secondaryColor})`,
              }}
            >
              <div
                className="grid h-12 w-12 place-items-center rounded-2xl"
                style={{
                  backgroundColor:
                    form.branding
                      .accentColor,
                }}
              >
                <Building2 className="h-6 w-6" />
              </div>

              <h2 className="mt-4 text-xl font-bold">
                {form.company.name ||
                  "Nueva empresa"}
              </h2>

              <p className="mt-1 text-sm opacity-80">
                CRM comercial
              </p>
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <SummaryLine
                label="Ventas"
                value={
                  form.modules
                    .sales
                }
              />

              <SummaryLine
                label="Inventario"
                value={
                  form.modules
                    .inventory
                }
              />

              <SummaryLine
                label="Cotizaciones"
                value={
                  form.modules
                    .quotes
                }
              />

              <SummaryLine
                label="WhatsApp"
                value={
                  form.modules
                    .whatsapp
                }
              />

              <SummaryLine
                label="Asistente IA"
                value={
                  form.modules
                    .kaizen
                }
              />
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <h3 className="font-semibold">
              Guardar configuración
            </h3>

            <p className="mt-2 text-sm text-muted-foreground">
              Valida los datos y envía la configuración al backend del instalador.
            </p>

            {!isValid && (
              <p className="mt-3 rounded-xl border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
                Completa nombre comercial, razón social, RUT y correo para continuar.
              </p>
            )}

            {saveState.status ===
              "error" && (
              <p className="mt-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
                {saveState.message}
              </p>
            )}

            <Button
              className="mt-4 w-full"
              disabled={
                !isValid ||
                saveState.status ===
                  "saving"
              }
              onClick={
                saveConfiguration
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
                  Guardar configuración
                  <ChevronRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>

          {saveState.status ===
            "success" &&
            savedConfig && (
              <div className="rounded-2xl border border-success/30 bg-success/10 p-5">
                <div className="flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-5 w-5" />

                  <h3 className="font-semibold">
                    Configuración guardada
                  </h3>
                </div>

                <p className="mt-2 text-sm text-muted-foreground">
                  {saveState.message}
                </p>

                <pre className="mt-4 max-h-72 overflow-auto rounded-xl bg-background p-3 text-[10px] leading-relaxed">
                  {JSON.stringify(
                    savedConfig,
                    null,
                    2,
                  )}
                </pre>
              </div>
            )}
        </aside>
      </main>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon:
    typeof Building2;
  title: string;
  description: string;
  children:
    React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="mb-5 flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted">
          <Icon className="h-5 w-5" />
        </div>

        <div>
          <h2 className="font-semibold">
            {title}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {description}
          </p>
        </div>
      </div>

      {children}
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

function ColorField({
  value,
  onChange,
}: {
  value: string;
  onChange:
    (value: string) =>
      void;
}) {
  return (
    <div className="flex gap-2">
      <input
        type="color"
        value={value}
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .value,
          )
        }
        className="h-10 w-12 cursor-pointer rounded-md border bg-background p-1"
        aria-label="Seleccionar color"
      />

      <Input
        value={value}
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .value,
          )
        }
      />
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange:
    (checked: boolean) =>
      void;
}) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-xl border p-3">
      <span className="text-sm font-medium">
        {label}
      </span>

      <input
        type="checkbox"
        checked={checked}
        onChange={(
          event,
        ) =>
          onChange(
            event.target
              .checked,
          )
        }
        className="h-4 w-4 accent-current"
      />
    </label>
  );
}

function SummaryLine({
  label,
  value,
}: {
  label: string;
  value: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">
        {label}
      </span>

      <span
        className={
          value
            ? "font-medium text-success"
            : "font-medium text-muted-foreground"
        }
      >
        {value
          ? "Activo"
          : "No"}
      </span>
    </div>
  );
}
