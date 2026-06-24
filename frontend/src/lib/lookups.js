import { useMemo } from "react";
import { useCustomers, useProducts } from "../api/hooks";

// Builds id->entity maps so we can render real product/customer names anywhere
// an order only carries IDs. Backed by the same React Query caches (no extra fetch).
export function useLookups() {
  const products = useProducts();
  const customers = useCustomers();
  const productById = useMemo(
    () => Object.fromEntries((products.data || []).map((p) => [p.id, p])),
    [products.data]
  );
  const customerById = useMemo(
    () => Object.fromEntries((customers.data || []).map((c) => [c.id, c])),
    [customers.data]
  );
  return { productById, customerById, products, customers };
}
