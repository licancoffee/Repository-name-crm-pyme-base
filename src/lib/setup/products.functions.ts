import {
  createServerFn,
} from "@tanstack/react-start";

export const getInstalledProducts =
  createServerFn({
    method: "GET",
  })
    .validator(
      (data: {
        clientId?: string;
      } = {}) => data,
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
