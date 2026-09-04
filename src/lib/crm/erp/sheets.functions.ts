import { createServerFn } from "@tanstack/react-start";

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

const getErpSnapshotServer = createServerFn({
  method: "GET",
})
  .validator(
    (data: {
      clientId: string;
    }) => data,
  )
  .handler(async ({ data }) => {
    const {
      readOperationalSnapshot,
    } = await import(
      "./operational.server"
    );

    return readOperationalSnapshot(
      data.clientId,
    );
  });

export async function getErpSnapshot() {
  return getErpSnapshotServer({
    data: {
      clientId:
        requireActiveClientId(),
    },
  });
}
