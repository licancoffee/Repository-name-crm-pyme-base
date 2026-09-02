import {
  getCookie,
} from "@tanstack/react-start/server";

export const ACTIVE_CLIENT_COOKIE =
  "crm_pyme_active_client";

export function getServerActiveClientId(
  override?: string,
) {
  const explicit =
    String(override || "").trim();

  if (explicit) {
    return explicit;
  }

  const fromCookie =
    String(
      getCookie(
        ACTIVE_CLIENT_COOKIE,
      ) || "",
    ).trim();

  if (fromCookie) {
    return fromCookie;
  }

  return String(
    process.env.CLIENT_ID || "",
  ).trim();
}
