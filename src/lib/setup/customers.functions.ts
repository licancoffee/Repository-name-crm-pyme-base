import {
  createServerFn,
} from "@tanstack/react-start";

import {
  getActiveClientId,
} from "@/lib/config/active-client";

function requireActiveClientId() {
  const clientId =
    String(
      getActiveClientId() || "",
    ).trim();

  if (!clientId) {
    throw new Error(
      "No se pudo determinar el CLIENT_ID activo.",
    );
  }

  return clientId;
}

const getInstalledCustomersServer =
  createServerFn({
    method: "GET",
  })
    .validator(
      (data: {
        clientId: string;
      }) => data,
    )
    .handler(
      async ({ data }) => {
        const {
          readInstalledCustomers,
        } =
          await import(
            "./customers-read.server"
          );

        return readInstalledCustomers(
          data.clientId,
        );
      },
    );

export async function getInstalledCustomers() {
  return getInstalledCustomersServer({
    data: {
      clientId:
        requireActiveClientId(),
    },
  });
}
