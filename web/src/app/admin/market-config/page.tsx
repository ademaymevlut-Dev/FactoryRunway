import { SlidersHorizontal } from "lucide-react";

export default function MarketConfigPage() {
  return (
    <div className="grid gap-4">
      <header className="game-topbar">
        <div>
          <p className="text-xs uppercase text-primary">Admin Config</p>
          <h1 className="text-2xl font-semibold">Market Ayarları</h1>
        </div>
      </header>

      <section className="game-card p-5">
        <div className="flex items-start gap-4">
          <span className="game-icon-button">
            <SlidersHorizontal size={18} />
          </span>
          <div className="grid gap-2">
            <p className="text-sm font-semibold text-card-foreground">
              Market kuralları sonraki paket için ayrıldı.
            </p>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              Bu sayfanın önceki sürümü artık schema'da bulunmayan taslak
              market config tablolarına bağlıydı. Menüdeki durumla uyumlu
              olacak şekilde şimdilik veritabanı işlemi yapmayan hazırlık
              ekranı olarak tutuluyor.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
