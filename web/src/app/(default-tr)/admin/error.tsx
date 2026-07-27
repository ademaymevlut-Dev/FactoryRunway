"use client";

import { useEffect } from "react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[admin-ui] route error", error);
  }, [error]);

  return (
    <main className="grid min-h-[60vh] place-items-center px-4 py-12">
      <section className="w-full max-w-xl rounded-2xl border border-destructive/40 bg-card p-6 text-card-foreground shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-[.2em] text-destructive">
          Admin işlemi tamamlanamadı
        </p>
        <h1 className="mt-2 text-2xl font-semibold">Sunucu hatası oluştu</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          İşlem kaydı Vercel runtime loguna gönderildi. Tekrar deneyebilir veya
          aşağıdaki hata koduyla loglarda arama yapabilirsiniz.
        </p>
        {error.digest ? (
          <p className="mt-4 rounded-lg bg-secondary px-3 py-2 font-mono text-xs text-secondary-foreground">
            Next hata kodu: {error.digest}
          </p>
        ) : null}
        <div className="mt-5 flex flex-wrap gap-3">
          <button className="game-button-primary" onClick={reset} type="button">
            Tekrar Dene
          </button>
          <a className="game-button-ghost" href="/admin">
            Admin Ana Sayfası
          </a>
        </div>
      </section>
    </main>
  );
}
