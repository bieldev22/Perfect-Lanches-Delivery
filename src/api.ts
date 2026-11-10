let csrf = "";
export function setCsrf(value: string) {
  csrf = value;
}
export async function api<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch(`/api${path}`, {
    method,
    credentials: "same-origin",
    headers: {
      ...(method !== "GET"
        ? { "X-CSRF-Token": csrf, "Content-Type": "application/json" }
        : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
  const data = await response
    .json()
    .catch(() => ({ error: "O servidor não respondeu. Tente novamente." }));
  if (!response.ok)
    throw new Error(
      data.error || "Não foi possível concluir. Tente novamente.",
    );
  if (data.csrf) csrf = data.csrf;
  return data as T;
}
export async function uploadMedia(file: File) {
  const response = await fetch("/api/admin/media", {
    method: "POST",
    credentials: "same-origin",
    headers: { "X-CSRF-Token": csrf, "Content-Type": file.type },
    body: file,
  });
  const data = await response.json();
  if (!response.ok)
    throw new Error(data.error || "Não foi possível enviar o arquivo.");
  return data.path as string;
}
export const money = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
    cents / 100,
  );
export const dateTime = (value: number) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Fortaleza",
    dateStyle: "short",
    timeStyle: "short",
  }).format(value);
export const statusLabels = {
  awaiting_payment: "Aguardando pagamento",
  confirmed: "Pedido confirmado",
  preparing: "Em preparo",
  out_for_delivery: "Saiu para entrega",
  delivered: "Entregue",
  cancelled: "Cancelado",
};
