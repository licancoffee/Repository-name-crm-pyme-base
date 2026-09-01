import {
    createServerFn,
  } from "@tanstack/react-start";
  
  export const getInstalledProducts =
    createServerFn({
      method: "GET",
    }).handler(
      async () => {
        const {
          readInstalledProducts,
        } =
          await import(
            "./products-read.server"
          );
  
        return readInstalledProducts();
      },
    );
  