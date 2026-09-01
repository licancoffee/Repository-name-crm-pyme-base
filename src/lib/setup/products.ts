import type {
    Product,
    ProductFormat,
  } from "@/lib/crm/types";
  
  export type ProductDraft = {
    id: string;
    name: string;
    category: string;
    stockUnitLabel: string;
    kgPerUnit: string;
    netCost: string;
    stock: string;
    min: string;
    formatLabel: string;
    formatUnits: string;
    price: string;
    prefPrice: string;
  };
  
  export type ProductValidationResult =
    | {
        ok: true;
        product: Product;
      }
    | {
        ok: false;
        errors: string[];
      };
  
  export function createEmptyProductDraft():
  ProductDraft {
    return {
      id:
        crypto.randomUUID(),
      name: "",
      category: "",
      stockUnitLabel:
        "unidad",
      kgPerUnit: "",
      netCost: "",
      stock: "0",
      min: "0",
      formatLabel:
        "Unidad",
      formatUnits: "1",
      price: "",
      prefPrice: "",
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
  
  function parseNumber(
    value: string,
  ) {
    const normalized =
      value
        .replace(
          /\./g,
          "",
        )
        .replace(
          ",",
          ".",
        )
        .trim();
  
    if (!normalized) {
      return NaN;
    }
  
    return Number(
      normalized,
    );
  }
  
  function parseOptionalNonNegative(
    value: string,
    fallback = 0,
  ) {
    const trimmed =
      value.trim();
  
    if (!trimmed) {
      return fallback;
    }
  
    return parseNumber(
      value,
    );
  }
  
  export function validateProductDraft(
    draft: ProductDraft,
  ): ProductValidationResult {
    const errors:
      string[] = [];
  
    const name =
      draft.name.trim();
  
    const category =
      draft.category.trim();
  
    const stockUnitLabel =
      draft
        .stockUnitLabel
        .trim();
  
    const formatLabel =
      draft
        .formatLabel
        .trim();
  
    const netCost =
      parseNumber(
        draft.netCost,
      );
  
    const stock =
      parseOptionalNonNegative(
        draft.stock,
        0,
      );
  
    const min =
      parseOptionalNonNegative(
        draft.min,
        0,
      );
  
    const formatUnits =
      parseNumber(
        draft.formatUnits,
      );
  
    const price =
      parseNumber(
        draft.price,
      );
  
    const prefPrice =
      draft.prefPrice.trim()
        ? parseNumber(
            draft.prefPrice,
          )
        : price;
  
    const kgPerUnit =
      draft.kgPerUnit.trim()
        ? parseNumber(
            draft.kgPerUnit,
          )
        : undefined;
  
    if (!name) {
      errors.push(
        "El nombre del producto es obligatorio.",
      );
    }
  
    if (!category) {
      errors.push(
        "La categoría es obligatoria.",
      );
    }
  
    if (
      !stockUnitLabel
    ) {
      errors.push(
        "La unidad de stock es obligatoria.",
      );
    }
  
    if (
      Number.isNaN(
        netCost,
      ) ||
      netCost < 0
    ) {
      errors.push(
        "El costo neto debe ser un número igual o mayor que 0.",
      );
    }
  
    if (
      Number.isNaN(
        stock,
      ) ||
      stock < 0
    ) {
      errors.push(
        "El stock inicial debe ser 0 o mayor.",
      );
    }
  
    if (
      Number.isNaN(
        min,
      ) ||
      min < 0
    ) {
      errors.push(
        "El stock mínimo debe ser 0 o mayor.",
      );
    }
  
    if (!formatLabel) {
      errors.push(
        "El formato de venta es obligatorio.",
      );
    }
  
    if (
      Number.isNaN(
        formatUnits,
      ) ||
      formatUnits <= 0
    ) {
      errors.push(
        "Las unidades descontadas por formato deben ser mayores que 0.",
      );
    }
  
    if (
      Number.isNaN(
        price,
      ) ||
      price < 0
    ) {
      errors.push(
        "El precio lista debe ser un número igual o mayor que 0.",
      );
    }
  
    if (
      Number.isNaN(
        prefPrice,
      ) ||
      prefPrice < 0
    ) {
      errors.push(
        "El precio preferente debe ser un número igual o mayor que 0.",
      );
    }
  
    if (
      kgPerUnit !==
        undefined &&
      (
        Number.isNaN(
          kgPerUnit,
        ) ||
        kgPerUnit <= 0
      )
    ) {
      errors.push(
        "La equivalencia en kg debe ser mayor que 0.",
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
  
    const format:
      ProductFormat = {
      label:
        formatLabel,
      units:
        formatUnits,
      price,
      prefPrice,
    };
  
    const product:
      Product = {
      id:
        normalizeId(
          name,
        ) ||
        draft.id,
  
      name,
      category,
      stockUnitLabel,
      kgPerUnit,
      netCost,
      stock,
      min,
  
      formats: [
        format,
      ],
  
      format:
        format.label,
  
      price:
        format.price,
    };
  
    return {
      ok: true,
      product,
    };
  }
  
  export function validateProductDrafts(
    drafts:
      ProductDraft[],
  ) {
    const products:
      Product[] = [];
  
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
          validateProductDraft(
            draft,
          );
  
        if (!result.ok) {
          for (
            const error
            of result.errors
          ) {
            errors.push(
              `Producto ${index + 1}: ${error}`,
            );
          }
  
          return;
        }
  
        if (
          ids.has(
            result.product.id,
          )
        ) {
          errors.push(
            `Producto ${index + 1}: el nombre genera un ID duplicado.`,
          );
  
          return;
        }
  
        ids.add(
          result.product.id,
        );
  
        products.push(
          result.product,
        );
      },
    );
  
    if (
      drafts.length ===
      0
    ) {
      errors.push(
        "Agrega al menos un producto.",
      );
    }
  
    return {
      ok:
        errors.length === 0,
  
      products,
      errors,
    };
  }
  