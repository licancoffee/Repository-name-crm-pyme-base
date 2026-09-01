import type {
  ClientConfig,
} from "@/lib/config/client";

export type SetupStorageResult = {
  ok: boolean;
  message: string;
};

function getStorageConfig() {
  const url =
    process.env.SETUP_STORAGE_URL ||
    process.env.ERP_APPS_SCRIPT_URL;

  const token =
    process.env.SETUP_STORAGE_TOKEN ||
    process.env.CRM_API_TOKEN;

  if (!url) {
    throw new Error(
      "SETUP_STORAGE_URL o ERP_APPS_SCRIPT_URL no configurado.",
    );
  }

  return {
    url,
    token,
  };
}

/**
 * Guarda la configuración fuera del runtime del CRM.
 *
 * Se usa un endpoint externo porque este proyecto puede ejecutarse
 * en entornos serverless/worker donde el sistema de archivos local
 * no es persistente.
 *
 * El endpoint receptor debe implementar la acción:
 * "guardarConfiguracionCliente".
 */
export async function saveSetupConfig(
  config: ClientConfig,
): Promise<SetupStorageResult> {
  const {
    url,
    token,
  } = getStorageConfig();

  const response =
    await fetch(
      url,
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          action:
            "guardarConfiguracionCliente",

          token,

          config,
        }),
      },
    );

  const text =
    await response.text();

  let result:
    | Record<string, unknown>
    | null = null;

  try {
    result =
      JSON.parse(
        text,
      ) as Record<
        string,
        unknown
      >;
  } catch {
    result = null;
  }

  if (!response.ok) {
    throw new Error(
      typeof result?.message ===
        "string"
        ? result.message
        : `El almacenamiento respondió ${response.status}.`,
    );
  }

  if (
    result &&
    result.ok === false
  ) {
    throw new Error(
      typeof result.message ===
        "string"
        ? result.message
        : "No fue posible guardar la configuración.",
    );
  }

  return {
    ok: true,
    message:
      typeof result?.message ===
        "string"
        ? result.message
        : "Configuración guardada correctamente.",
  };
}
