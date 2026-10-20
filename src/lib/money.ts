// lib/money.ts
export const money = (millimes: number) =>
  new Intl.NumberFormat("fr-TN", {
    style: "currency",
    currency: "TND",
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  }).format(millimes / 1000);

export const toMillimes = (value: string): number =>
  Math.round(Number(value) * 1000);