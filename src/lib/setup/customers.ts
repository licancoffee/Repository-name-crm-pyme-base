import type {
    Customer,
    PriceType,
  } from "@/lib/crm/types";
  
  export type CustomerDraft = {
    id: string;
    name: string;
    phone: string;
    address: string;
    note: string;
    priceType: PriceType;
  };
  
  export type CustomerValidationResult =
    | {
        ok: true;
        customer: Customer;
      }
    | {
        ok: false;
        errors: string[];
      };
  
  export function createEmptyCustomerDraft():
  CustomerDraft {
    return {
      id:
        crypto.randomUUID(),
      name: "",
      phone: "",
      address: "",
      note: "",
      priceType:
        "LISTA",
    };
  }
  
  function normalizeId(
    value: string,
  ) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(
        /[\u0300-\u036f]/g,
        "",
      )
      .replace(
        /[^a-z0-9]+/g,
        "-",
      )
      .replace(
        /^-+|-+$/g,
        "",
      );
  }
  
  export function validateCustomerDraft(
    draft: CustomerDraft,
  ): CustomerValidationResult {
    const errors:
      string[] = [];
  
    const name =
      draft.name.trim();
  
    const phone =
      draft.phone.trim();
  
    const address =
      draft.address.trim();
  
    const note =
      draft.note.trim();
  
    if (!name) {
      errors.push(
        "El nombre del cliente es obligatorio.",
      );
    }
  
    if (
      phone &&
      phone.length < 6
    ) {
      errors.push(
        "El teléfono parece incompleto.",
      );
    }
  
    if (
      ![
        "LISTA",
        "PREFERENTE",
        "PERSONALIZADO",
      ].includes(
        draft.priceType,
      )
    ) {
      errors.push(
        "El tipo de precio no es válido.",
      );
    }
  
    if (
      errors.length >
      0
    ) {
      return {
        ok: false,
        errors,
      };
    }
  
    const customer:
      Customer = {
      id:
        normalizeId(
          name,
        ) ||
        draft.id,
  
      name,
      phone,
      address,
      note,
      priceType:
        draft.priceType,
    };
  
    return {
      ok: true,
      customer,
    };
  }
  
  export function validateCustomerDrafts(
    drafts:
      CustomerDraft[],
  ) {
    const customers:
      Customer[] = [];
  
    const errors:
      string[] = [];
  
    const ids =
      new Set<
        string
      >();
  
    drafts.forEach(
      (
        draft,
        index,
      ) => {
        const result =
          validateCustomerDraft(
            draft,
          );
  
        if (!result.ok) {
          for (
            const error
            of result.errors
          ) {
            errors.push(
              `Cliente ${index + 1}: ${error}`,
            );
          }
  
          return;
        }
  
        if (
          ids.has(
            result.customer.id,
          )
        ) {
          errors.push(
            `Cliente ${index + 1}: el nombre genera un ID duplicado.`,
          );
  
          return;
        }
  
        ids.add(
          result.customer.id,
        );
  
        customers.push(
          result.customer,
        );
      },
    );
  
    return {
      ok:
        errors.length === 0,
  
      customers,
      errors,
    };
  }
  