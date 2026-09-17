import { clientConfig } from "./client";
import { DEMO_CLIENT_ID } from "./demo";

const ACTIVE_CLIENT_KEY =
  "crm-pyme-active-client-id";

export function isDemoHostname() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.location.hostname === "demo.kaizu.cl" ||
    new URLSearchParams(window.location.search).get("demo") === "1"
  );
}

export function isDemoClientId(clientId: string) {
  return String(clientId || "").trim().toUpperCase() === DEMO_CLIENT_ID;
}

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

  if (isDemoHostname()) {
    rememberActiveClientId(DEMO_CLIENT_ID);
    return DEMO_CLIENT_ID;
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

  const hostname =
    window.location.hostname.toLowerCase();

  if (
    hostname === "app.kaizu.cl" ||
    hostname === "kaizu.cl" ||
    hostname === "www.kaizu.cl"
  ) {
    return "";
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
