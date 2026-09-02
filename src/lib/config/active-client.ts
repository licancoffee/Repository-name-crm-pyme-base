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

export function getActiveClientId() {
  if (
    typeof window !== "undefined"
  ) {
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

    const saved =
      window.localStorage.getItem(
        ACTIVE_CLIENT_KEY,
      )?.trim() || "";

    if (saved) {
      return saved;
    }
  }

  return clientIdFromRut(
    clientConfig.company.rut,
  );
}
