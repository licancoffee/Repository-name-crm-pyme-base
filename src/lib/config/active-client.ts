import { clientConfig } from "./client";

const ACTIVE_CLIENT_KEY =
  "crm-pyme-active-client-id";

export function clientIdFromRut(
  rut: string,
) {
  const compact =
    String(rut || "")
      .toUpperCase()
      .replace(/[^0-9K]/g, "");

  return compact
    ? `CL-${compact}`
    : "";
}

export function rememberActiveClientId(
  clientId: string,
) {
  if (
    typeof window === "undefined"
  ) {
    return;
  }

  const value =
    String(clientId || "").trim();

  if (!value) {
    return;
  }

  window.localStorage.setItem(
    ACTIVE_CLIENT_KEY,
    value,
  );
}

export function getRequestedClientId() {
  if (
    typeof window === "undefined"
  ) {
    return "";
  }

  const fromUrl =
    new URLSearchParams(
      window.location.search,
    ).get("clientId")?.trim() || "";

  if (fromUrl) {
    rememberActiveClientId(
      fromUrl,
    );
    return fromUrl;
  }

  return (
    window.localStorage.getItem(
      ACTIVE_CLIENT_KEY,
    )?.trim() || ""
  );
}

export function getActiveClientId() {
  const requestedClientId =
    getRequestedClientId();

  if (requestedClientId) {
    return requestedClientId;
  }

  return clientIdFromRut(
    clientConfig.company.rut,
  );
}
