import { useMemo } from "react";

export default function useStoreProducts({
  products = [],
  filters = { name: "", brand: "", barcode: "", type: "" },
  isDiscountValid,
  getProductCategoryTypeName,
}) {
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesName = String(product.name || "")
        .toLowerCase()
        .includes(String(filters.name || "").toLowerCase());
      const matchesBrand =
        !filters.brand ||
        (product.brandId &&
          product.brandId.name &&
          product.brandId.name
            .toLowerCase()
            .includes(String(filters.brand || "").toLowerCase()));
      const matchesBarcode =
        !filters.barcode ||
        (product.barcode &&
          String(product.barcode)
            .toLowerCase()
            .includes(String(filters.barcode || "").toLowerCase()));
      const typeName = getProductCategoryTypeName(product);
      const matchesType =
        !filters.type ||
        String(typeName).toLowerCase().includes(String(filters.type).toLowerCase());

      return matchesName && matchesBrand && matchesBarcode && matchesType;
    });
  }, [products, filters, getProductCategoryTypeName]);

  const discountedProducts = useMemo(
    () => filteredProducts.filter((p) => isDiscountValid(p)),
    [filteredProducts, isDiscountValid],
  );

  const nonDiscountedProducts = useMemo(
    () => filteredProducts.filter((p) => !p.isDiscount),
    [filteredProducts],
  );

  const groupProductsByType = useMemo(
    () => (productList) => {
      const grouped = {};
      productList.forEach((product) => {
        const typeName = getProductCategoryTypeName(product);
        if (!grouped[typeName]) grouped[typeName] = [];
        grouped[typeName].push(product);
      });
      return grouped;
    },
    [getProductCategoryTypeName],
  );

  return {
    filteredProducts,
    discountedProducts,
    nonDiscountedProducts,
    groupProductsByType,
  };
}

