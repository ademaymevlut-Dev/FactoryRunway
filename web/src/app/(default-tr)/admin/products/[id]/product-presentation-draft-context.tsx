"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

type ProductPresentationDraftContextValue = {
  clearLocalImagePreview: () => void;
  hasLocalImagePreview: boolean;
  imageUrl: string | null;
  setLocalImagePreview: (file: File | null) => void;
};

const ProductPresentationDraftContext =
  createContext<ProductPresentationDraftContextValue | null>(null);

export function ProductPresentationDraftProvider({
  children,
  initialImageUrl,
}: {
  children: ReactNode;
  initialImageUrl: string | null;
}) {
  const objectUrlRef = useRef<string | null>(null);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
  const clearLocalImagePreview = useCallback(() => {
    const previousUrl = objectUrlRef.current;

    objectUrlRef.current = null;
    setLocalImageUrl(null);
    if (previousUrl) URL.revokeObjectURL(previousUrl);
  }, []);
  const setLocalImagePreview = useCallback((file: File | null) => {
    const previousUrl = objectUrlRef.current;
    const nextUrl = file ? URL.createObjectURL(file) : null;

    objectUrlRef.current = nextUrl;
    setLocalImageUrl(nextUrl);
    if (previousUrl) URL.revokeObjectURL(previousUrl);
  }, []);

  useEffect(
    () => () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    },
    [],
  );

  const value = useMemo<ProductPresentationDraftContextValue>(
    () => ({
      clearLocalImagePreview,
      hasLocalImagePreview: localImageUrl !== null,
      imageUrl: localImageUrl ?? initialImageUrl,
      setLocalImagePreview,
    }),
    [
      clearLocalImagePreview,
      initialImageUrl,
      localImageUrl,
      setLocalImagePreview,
    ],
  );

  return (
    <ProductPresentationDraftContext.Provider value={value}>
      {children}
    </ProductPresentationDraftContext.Provider>
  );
}

export function useProductPresentationDraft() {
  const value = useContext(ProductPresentationDraftContext);

  if (!value) {
    throw new Error(
      "useProductPresentationDraft must be used inside ProductPresentationDraftProvider.",
    );
  }

  return value;
}
