"use client";

import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  DEFAULT_LOCALE,
  numberLocale as resolveNumberLocale,
  type NumberLocale,
  type SupportedLocale,
} from "@/lib/i18n/locales";
import { ordersCopy, type OrdersCopy } from "../orders-copy";

export const ORDER_ANALYSIS_MODES = [
  "PROFITABILITY",
  "CAPACITY",
  "CUSTOMER",
  "PRODUCT",
] as const;

export type OrderAnalysisMode = (typeof ORDER_ANALYSIS_MODES)[number];

type OrdersUiContextValue = {
  activeAnalysisMode: OrderAnalysisMode;
  copy: OrdersCopy["ui"];
  locale: SupportedLocale;
  numberLocale: NumberLocale;
  setActiveAnalysisMode: (mode: OrderAnalysisMode) => void;
};

const OrdersUiContext = createContext<OrdersUiContextValue>({
  activeAnalysisMode: "PROFITABILITY",
  copy: ordersCopy[DEFAULT_LOCALE].ui,
  locale: DEFAULT_LOCALE,
  numberLocale: resolveNumberLocale(DEFAULT_LOCALE),
  setActiveAnalysisMode: () => undefined,
});

export function OrdersUiProvider({
  children,
  locale,
}: {
  children: ReactNode;
  locale: SupportedLocale;
}) {
  const [activeAnalysisMode, setActiveAnalysisMode] =
    useState<OrderAnalysisMode>("PROFITABILITY");
  const value = useMemo<OrdersUiContextValue>(
    () => ({
      activeAnalysisMode,
      copy: ordersCopy[locale].ui,
      locale,
      numberLocale: resolveNumberLocale(locale),
      setActiveAnalysisMode,
    }),
    [activeAnalysisMode, locale],
  );

  return (
    <OrdersUiContext.Provider value={value}>
      {children}
    </OrdersUiContext.Provider>
  );
}

export function isOrderAnalysisMode(
  value: string,
): value is OrderAnalysisMode {
  return ORDER_ANALYSIS_MODES.some((mode) => mode === value);
}

export function useOrdersUi() {
  return useContext(OrdersUiContext);
}
