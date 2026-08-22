import type { Money } from "./types.ts";

export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function money(amount: number, currency = "USD"): Money {
  return { amount: roundMoney(amount), currency };
}

export function calculateOfferTotals(input: {
  itemPrice: Money;
  shipping?: Money;
  estimatedTax?: Money;
  couponDiscount?: Money;
  cashback?: Money;
}): { totalBeforeCashback: Money; effectiveCost: Money } {
  const currency = input.itemPrice.currency;
  const amounts = [
    input.shipping,
    input.estimatedTax,
    input.couponDiscount,
    input.cashback
  ].filter(Boolean) as Money[];

  if (amounts.some((value) => value.currency !== currency)) {
    throw new Error("Cannot calculate totals across mixed currencies");
  }

  const totalBeforeCashback = roundMoney(
    input.itemPrice.amount +
      (input.shipping?.amount ?? 0) +
      (input.estimatedTax?.amount ?? 0) -
      (input.couponDiscount?.amount ?? 0)
  );

  return {
    totalBeforeCashback: money(totalBeforeCashback, currency),
    effectiveCost: money(
      totalBeforeCashback - (input.cashback?.amount ?? 0),
      currency
    )
  };
}
