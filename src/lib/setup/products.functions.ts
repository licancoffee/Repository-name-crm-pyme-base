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

const getInstalledProductsServer =
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
          readInstalledProducts,
        } = await import(
          "./products-read.server"
        );

        return readInstalledProducts(
          data.clientId,
        );
      },
    );

export async function getInstalledProducts() {
  return getInstalledProductsServer({
    data: {
      clientId:
        requireActiveClientId(),
    },
  });
}
