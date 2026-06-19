import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "./client";

// ---- Products ----
export const useProducts = () =>
  useQuery({ queryKey: ["products"], queryFn: async () => (await api.get("/products")).data });

export const useProduct = (id) =>
  useQuery({
    queryKey: ["products", id],
    queryFn: async () => (await api.get(`/products/${id}`)).data,
    enabled: !!id,
  });

export const useCreateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body) => (await api.post("/products", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
};

export const useUpdateProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }) => (await api.put(`/products/${id}`, body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/products/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
};

// ---- Customers ----
export const useCustomers = () =>
  useQuery({ queryKey: ["customers"], queryFn: async () => (await api.get("/customers")).data });

export const useCreateCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body) => (await api.post("/customers", body)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
};

export const useDeleteCustomer = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/customers/${id}`)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["customers"] }),
  });
};

// ---- Orders ----
export const useOrders = () =>
  useQuery({ queryKey: ["orders"], queryFn: async () => (await api.get("/orders")).data });

export const useOrder = (id) =>
  useQuery({
    queryKey: ["orders", id],
    queryFn: async () => (await api.get(`/orders/${id}`)).data,
    enabled: !!id,
  });

export const useCreateOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body) => (await api.post("/orders", body)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["products"] }); // stock changed
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
};

export const useDeleteOrder = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id) => (await api.delete(`/orders/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["stats"] });
    },
  });
};

// ---- Stats ----
export const useStats = () =>
  useQuery({ queryKey: ["stats"], queryFn: async () => (await api.get("/stats/summary")).data });
