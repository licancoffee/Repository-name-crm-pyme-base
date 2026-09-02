import type {
  Customer,
} from "@/lib/crm/types";

type RemoteCustomersResponse = {
  ok?: boolean;
  message?: string;
  clientId?: string;
  customers?: Customer[];
  count?: number;
};

function getInstallerSettings(
  clientIdOverride?: string,
) {
  const url =
    process.env.SETUP_STORAGE_URL;

  const token =
    process.env.SETUP_STORAGE_TOKEN;

  const clientId =
    clientIdOverride ||
    process.env.CLIENT_ID;

  if (!url) {
    throw new Error(
      "SETUP_STORAGE_URL no configurado.",
    );
  }

  if (!token) {
    throw new Error(
      "SETUP_STORAGE_TOKEN no configurado.",
    );
  }

  if (!clientId) {
    throw new Error(
      "CLIENT_ID no configurado.",
    );
  }

  return {
    url,
    token,
    clientId,
  };
}

export async function readInstalledCustomers(
  clientIdOverride?: string,
) {
  const {
    url,
    token,
    clientId,
  } =
    getInstallerSettings(
      clientIdOverride,
    );

  const endpoint =
    new URL(url);

  endpoint.searchParams.set(
    "action",
    "obtenerClientesCliente",
  );
  endpoint.searchParams.set(
    "token",
    token,
  );
  endpoint.searchParams.set(
    "clientId",
    clientId,
  );

  const response =
    await fetch(
      endpoint.toString(),
      {
        method: "GET",
        headers: {
          Accept:
            "application/json",
        },
        cache: "no-store",
      },
    );

  const text =
    await response.text();

  let result:
    RemoteCustomersResponse;

  try {
    result = JSON.parse(
      text,
    ) as RemoteCustomersResponse;
  } catch {
    throw new Error(
      "El backend del instalador devolvió clientes en un formato inválido.",
    );
  }

  if (
    !response.ok ||
    result.ok === false
  ) {
    throw new Error(
      result.message ||
        "No fue posible cargar los clientes del cliente.",
    );
  }

  if (
    result.clientId &&
    result.clientId !== clientId
  ) {
    throw new Error(
      "Los clientes recibidos pertenecen a otro CLIENT_ID.",
    );
  }

  return {
    clientId,
    customers:
      Array.isArray(
        result.customers,
      )
        ? result.customers
        : [],
    count:
      typeof result.count ===
        "number"
        ? result.count
        : Array.isArray(
              result.customers,
            )
          ? result.customers.length
          : 0,
  };
}
