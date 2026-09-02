import {
  createServerFn,
} from "@tanstack/react-start";

export const getInstalledCustomers =
  createServerFn({
    method: "GET",
  }).handler(
    async () => {
      const {
        readInstalledCustomers,
      } =
        await import(
          "./customers-read.server"
        );

      return readInstalledCustomers();
    },
  );
