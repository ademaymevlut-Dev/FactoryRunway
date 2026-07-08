"use client";

import {
  ArrowLeft,
  ArrowRight,
  BadgeEuro,
  CheckCircle2,
  ChevronRight,
  Coins,
  Factory,
  Landmark,
  PackageCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { gsap } from "gsap";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";

import BlurText from "@/components/ui/blurtext";

import {
  beginOnboardingSectorAction,
  completeFactoryOnboardingAction,
  saveOnboardingIdentityAction,
  type FactorySetupPayload,
  type StarterLineSetup,
} from "./onboarding-actions";

export type OnboardingSector = {
  id?: string;
  key: string;
  title: string;
  shortTitle: string;
  eyebrow: string;
  description: string;
  bullets: string[];
  photoUrl: string;
  slimPhotoUrl: string;
  status: string;
  playable: boolean;
};

type OnboardingExperienceProps = {
  sectors: OnboardingSector[];
};

type OnboardingPage =
  | { key: "welcome"; kind: "welcome" }
  | { key: "intro"; kind: "intro" }
  | { key: string; kind: "spotlight"; sector: OnboardingSector }
  | { key: "selection"; kind: "selection" };

const DEFAULT_PAGE_HOLD_SECONDS = 2.4;
const FIRST_PAGE_HOLD_SECONDS = 3.2;

export function OnboardingExperience({ sectors }: OnboardingExperienceProps) {
  const [headlineReady, setHeadlineReady] = useState(false);
  const [selectedSectorKey, setSelectedSectorKey] = useState<string | null>(null);
  const [notice, setNotice] = useState("Tekstil sektörü seçildiğinde kurulum akışı başlatılacak.");
  const [setup, setSetup] = useState<FactorySetupPayload | null>(null);
  const [isChoosingSector, startChoosingSector] = useTransition();
  const shellRef = useRef<HTMLDivElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const spotlightSectors = useMemo(() => sectors.slice(0, 4), [sectors]);
  const onboardingPages = useMemo<OnboardingPage[]>(
    () => [
      { key: "welcome", kind: "welcome" },
      { key: "intro", kind: "intro" },
      ...spotlightSectors.map((sector) => ({
        key: `sector-${sector.key}`,
        kind: "spotlight" as const,
        sector,
      })),
      { key: "selection", kind: "selection" },
    ],
    [spotlightSectors],
  );
  const textileSector = sectors.find((sector) => sector.key === "textile") ?? sectors[0];

  useEffect(() => {
    const shell = shellRef.current;
    const stack = stackRef.current;
    const scenePages = stack
      ? Array.from(stack.querySelectorAll<HTMLDivElement>("[data-onboarding-page]"))
      : [];

    if (!shell || !stack || scenePages.length < 2) {
      return;
    }

    timelineRef.current?.kill();

    if (prefersReducedMotion) {
      const finalPage = scenePages[scenePages.length - 1];

      if (!finalPage) {
        return;
      }

      gsap.set(shell, { autoAlpha: 1 });
      gsap.set(scenePages, { autoAlpha: 0, xPercent: 0, yPercent: 0, zIndex: 1 });
      gsap.set(finalPage, { autoAlpha: 1, zIndex: scenePages.length });
      return;
    }

    gsap.set(shell, { autoAlpha: 1 });
    gsap.set(scenePages, { autoAlpha: 1, xPercent: 0, yPercent: 0 });

    scenePages.forEach((page, index) => {
      const motion = getPageMotion(index, scenePages.length);
      gsap.set(page, {
        autoAlpha: 1,
        xPercent: index === 0 ? 0 : motion.fromX,
        yPercent: index === 0 ? 0 : motion.fromY,
        zIndex: index + 1,
      });
    });

    const timeline = gsap.timeline({ defaults: { ease: "power4.inOut" } });
    timelineRef.current = timeline;

    timeline.to({}, { duration: FIRST_PAGE_HOLD_SECONDS });

    for (let index = 1; index < scenePages.length; index += 1) {
      const previousPage = scenePages[index - 1];
      const currentPage = scenePages[index];
      const motion = getPageMotion(index, scenePages.length);
      const label = `scene-${index}`;

      timeline.to(
        currentPage,
        {
          duration: motion.duration,
          xPercent: 0,
          yPercent: 0,
        },
        label,
      );
      timeline.to(
        previousPage,
        {
          duration: motion.duration,
          xPercent: motion.outX,
          yPercent: motion.outY,
        },
        label,
      );
      timeline.set(previousPage, { autoAlpha: 0 });

      if (index < scenePages.length - 1) {
        timeline.to({}, { duration: DEFAULT_PAGE_HOLD_SECONDS });
      }
    }

    return () => {
      timeline.kill();
      if (timelineRef.current === timeline) {
        timelineRef.current = null;
      }
    };
  }, [onboardingPages.length, prefersReducedMotion]);

  function chooseSector(sector: OnboardingSector) {
    setSelectedSectorKey(sector.key);

    if (isAvailableSector(sector)) {
      setNotice(`${sector.shortTitle} seçildi. Kurulum verileri hazırlanıyor.`);
      startChoosingSector(async () => {
        const result = await beginOnboardingSectorAction(sector.id ?? sector.key);

        if (result.ok) {
          setSetup(result.setup);
          return;
        }

        setNotice(result.message);
      });
      return;
    }

    setNotice(`${sector.shortTitle} şu anda yakında durumunda. Veritabanına kayıt yapılmadı.`);
  }

  if (setup) {
    return (
      <FactorySetupWizard
        setup={setup}
        onBackToSectors={() => {
          setSetup(null);
          setNotice(`${setup.sector.title} seçimi draft olarak kaydedildi.`);
        }}
      />
    );
  }

  return (
    <main className="onboarding-shell min-h-screen overflow-hidden bg-background text-foreground">
      <div className="factory-backdrop" />
      <div
        className="onboarding-stage-bg"
        style={backgroundStyle(textileSector?.photoUrl)}
      />

      <div
        ref={shellRef}
        className="relative flex min-h-screen w-full flex-col"
      >
        <section className="onboarding-viewport">
          <div className="onboarding-scene-stack" ref={stackRef}>
            {onboardingPages.map((page) => (
              <div className="onboarding-scene-page" data-onboarding-page key={page.key}>
                {page.kind === "welcome" ? (
                  <div className="onboarding-page-surface is-welcome">
                    <WelcomeScene
                      onHeadlineComplete={() => setHeadlineReady(true)}
                      showCopy={headlineReady}
                    />
                  </div>
                ) : null}

                {page.kind === "intro" ? (
                  <div className="onboarding-page-surface is-intro">
                    <IntroScene />
                  </div>
                ) : null}

                {page.kind === "spotlight" ? (
                  <div className="onboarding-page-surface is-spotlight">
                    <SpotlightScene sector={page.sector} />
                  </div>
                ) : null}

                {page.kind === "selection" ? (
                  <div className="onboarding-page-surface is-selection">
                    <SectorSelectionScene
                      isChoosingSector={isChoosingSector}
                      notice={notice}
                      onChooseSector={chooseSector}
                      sectors={sectors}
                      selectedSectorKey={selectedSectorKey}
                    />
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

function WelcomeScene({
  onHeadlineComplete,
  showCopy,
}: {
  onHeadlineComplete: () => void;
  showCopy: boolean;
}) {
  return (
    <div className="onboarding-welcome game-card">
      <div className="game-pill w-fit">
        <Sparkles size={16} />
        Controlled timeline onboarding
      </div>
      <BlurText
        as="h2"
        animateBy="words"
        className="onboarding-hero-title"
        delay={155}
        direction="top"
        onAnimationComplete={onHeadlineComplete}
        text="Kendi fabrikanı kur. Üretimi yönet. Büyümeyi planla."
      />
      <p className={showCopy ? "onboarding-copy is-visible" : "onboarding-copy"}>
        İlk akışta yalnızca sektör seçimine kadar ilerliyoruz. Seçim hissi oluşacak,
        fakat veritabanında fabrika veya sektör kaydı oluşturulmayacak.
      </p>
    </div>
  );
}

function IntroScene() {
  const [titleReady, setTitleReady] = useState(false);

  return (
    <div className="onboarding-intro game-card">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Multi-sector simulation</p>
      <BlurText
        as="h2"
        animateBy="words"
        className="onboarding-intro-title"
        delay={62}
        direction="top"
        onAnimationComplete={() => setTitleReady(true)}
        stepDuration={0.28}
        text="FACTORY RUNWAY size farklı sektörlerde farklı üretim deneyimleri sunar."
      />
      <div className={titleReady ? "onboarding-intro-list is-visible" : "onboarding-intro-list"}>
        <IntroPoint text="Her sektörün kendine özgü üretim hatları vardır." />
        <IntroPoint text="Her sektör farklı kararlar ve büyüme dinamikleri sunar." />
        <IntroPoint text="Oyuncu ileride farklı üretim dünyalarına geçebilir." />
      </div>
    </div>
  );
}

function IntroPoint({ text }: { text: string }) {
  return (
    <div className="onboarding-intro-point">
      <CheckCircle2 size={17} />
      <span>{text}</span>
    </div>
  );
}

function SpotlightScene({ sector }: { sector: OnboardingSector }) {
  return (
    <article className="onboarding-spotlight-card game-card" style={backgroundStyle(sector.photoUrl)}>
      <div className="onboarding-spotlight-copy">
        <p>{sector.eyebrow}</p>
        <h2>{sector.title} Sektörü</h2>
        <span>{sector.description}</span>
        <ul>
          {sector.bullets.slice(0, 3).map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </div>
    </article>
  );
}

function SectorSelectionScene({
  isChoosingSector,
  notice,
  onChooseSector,
  sectors,
  selectedSectorKey,
}: {
  isChoosingSector: boolean;
  notice: string;
  onChooseSector: (sector: OnboardingSector) => void;
  sectors: OnboardingSector[];
  selectedSectorKey: string | null;
}) {
  const [titleReady, setTitleReady] = useState(false);
  const orderedSectors = [...sectors].sort(
    (a, b) => Number(isAvailableSector(b)) - Number(isAvailableSector(a)),
  );
  const featuredSector = orderedSectors[0];
  const secondarySectors = orderedSectors.slice(1);

  if (!featuredSector) {
    return (
      <div className="game-card p-5">
        <p className="text-muted-foreground">Onboarding için sektör verisi bulunamadı.</p>
      </div>
    );
  }

  return (
    <div className="onboarding-selection game-card">
      <div className="onboarding-selection-heading">
        <p className="onboarding-selection-kicker">Wizard - Step 1</p>
        <BlurText
          as="h2"
          animateBy="words"
          className="onboarding-selection-title"
          delay={78}
          direction="top"
          onAnimationComplete={() => setTitleReady(true)}
          stepDuration={0.3}
          text="Sektörünü Seç"
        />
        <p className={titleReady ? "onboarding-after-title is-visible" : "onboarding-after-title"}>
          Yeni şirketin için üretim sektörünü belirle. Aktif sektörler şimdi oynanabilir,
          pasif sektörler sonraki paketlerde açılacak.
        </p>
        <div
          className={titleReady ? "onboarding-step-dots is-visible" : "onboarding-step-dots"}
          aria-hidden="true"
        >
          {[1, 2, 3, 4].map((step) => (
            <span className={step === 1 ? "is-active" : ""} key={step}>
              {step}
            </span>
          ))}
        </div>
      </div>

      <div className="onboarding-sector-list">
          <SectorCard
          featured
          disabled={isChoosingSector}
          onChooseSector={onChooseSector}
          sector={featuredSector}
          selected={selectedSectorKey === featuredSector.key}
        />

        {secondarySectors.map((sector) => (
          <SectorCard
            key={sector.key}
            disabled={isChoosingSector}
            onChooseSector={onChooseSector}
            sector={sector}
            selected={selectedSectorKey === sector.key}
          />
        ))}
      </div>

      <div className="onboarding-selection-note">
        <span className="status-dot bg-primary" />
        <p>{notice}</p>
      </div>
    </div>
  );
}

function SectorCard({
  disabled = false,
  featured = false,
  onChooseSector,
  sector,
  selected,
}: {
  disabled?: boolean;
  featured?: boolean;
  onChooseSector: (sector: OnboardingSector) => void;
  sector: OnboardingSector;
  selected: boolean;
}) {
  const available = isAvailableSector(sector);
  const cardClassName = [
    "onboarding-sector-card",
    featured ? "is-featured" : "is-compact",
    available ? "is-active-sector" : "is-passive-sector",
    selected ? "is-selected" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={cardClassName}
      disabled={disabled}
      onClick={() => onChooseSector(sector)}
      type="button"
    >
      <span
        className="onboarding-sector-image"
        style={imageBackgroundStyle(
          featured ? sector.photoUrl : sector.slimPhotoUrl || sector.photoUrl,
        )}
      />
      <span className="onboarding-sector-body">
        <span
          className={
            available
              ? "onboarding-status-label is-available"
              : "onboarding-status-label is-coming-soon"
          }
        >
          {available ? "AVAILABLE" : "COMING SOON"}
        </span>
        <strong>{sector.title}</strong>
        <span>{sector.description}</span>
        {featured && available ? (
          <span className="onboarding-sector-action is-button">
            {sector.shortTitle} ile başla
            <ArrowRight size={17} />
          </span>
        ) : null}
      </span>
      {!featured ? (
        <span className="onboarding-sector-arrow">
          <ChevronRight size={22} />
        </span>
      ) : null}
    </button>
  );
}

type FactorySetupStep = "capital" | "identity" | "lines" | "costs" | "review";

function FactorySetupWizard({
  onBackToSectors,
  setup,
}: {
  onBackToSectors: () => void;
  setup: FactorySetupPayload;
}) {
  const [step, setStep] = useState<FactorySetupStep>("capital");
  const [factoryName, setFactoryName] = useState(
    setup.draft.factoryName ?? `${setup.sector.title} Atelier`,
  );
  const [currencyCode, setCurrencyCode] = useState<"EUR" | "USD">(setup.draft.currencyCode);
  const [installedLineCount, setInstalledLineCount] = useState(0);
  const [activeLineIndex, setActiveLineIndex] = useState(0);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  const activeLine = setup.starterLines[activeLineIndex];
  const stepIndex = setupStepOrder.indexOf(step);

  function saveIdentity() {
    setMessage("");
    startTransition(async () => {
      const result = await saveOnboardingIdentityAction({
        sectorId: setup.sector.id,
        factoryName,
        currencyCode,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      setFactoryName(result.factoryName);
      setCurrencyCode(result.currencyCode);
      setStep("lines");
    });
  }

  function installCurrentLine() {
    const nextInstalledCount = Math.min(
      installedLineCount + 1,
      setup.starterLines.length,
    );

    setInstalledLineCount(nextInstalledCount);

    if (nextInstalledCount >= setup.starterLines.length) {
      setTimeout(() => setStep("costs"), 360);
      return;
    }

    setTimeout(() => setActiveLineIndex(nextInstalledCount), 260);
  }

  function completeOnboarding() {
    setMessage("");
    startTransition(async () => {
      const result = await completeFactoryOnboardingAction({
        sectorId: setup.sector.id,
        factoryName,
        currencyCode,
      });

      if (!result.ok) {
        setMessage(result.message);
        return;
      }

      window.location.assign(result.redirectTo);
    });
  }

  return (
    <main className="onboarding-shell min-h-screen overflow-hidden bg-background text-foreground">
      <div className="factory-backdrop" />
      <div className="onboarding-setup-bg" />
      <section className="onboarding-setup-page">
        <div className="onboarding-setup-card game-card">
          <header className="onboarding-setup-header">
            <button className="onboarding-back-button" onClick={onBackToSectors} type="button">
              <ArrowLeft size={17} />
              Sektörlere dön
            </button>
            <div>
              <p className="onboarding-selection-kicker">Factory Setup</p>
              <h1>{setup.sector.title} başlangıç kurulumu</h1>
            </div>
            <div className="onboarding-setup-steps" aria-label="Kurulum adımları">
              {setupStepOrder.map((item, index) => (
                <span
                  className={index <= stepIndex ? "is-active" : ""}
                  key={item}
                >
                  {index + 1}
                </span>
              ))}
            </div>
          </header>

          {step === "capital" ? (
            <CapitalStep
              currencyCode={currencyCode}
              onNext={() => setStep("identity")}
              setup={setup}
            />
          ) : null}

          {step === "identity" ? (
            <IdentityStep
              currencyCode={currencyCode}
              factoryName={factoryName}
              isPending={isPending}
              message={message}
              onBack={() => setStep("capital")}
              onCurrencyChange={setCurrencyCode}
              onFactoryNameChange={setFactoryName}
              onSubmit={saveIdentity}
            />
          ) : null}

          {step === "lines" ? (
            <StarterLinesStep
              activeLine={activeLine}
              currencyCode={currencyCode}
              installedLineCount={installedLineCount}
              onInstallLine={installCurrentLine}
              setup={setup}
            />
          ) : null}

          {step === "costs" ? (
            <CostsStep
              currencyCode={currencyCode}
              onBack={() => setStep("lines")}
              onNext={() => setStep("review")}
              setup={setup}
            />
          ) : null}

          {step === "review" ? (
            <ReviewStep
              currencyCode={currencyCode}
              factoryName={factoryName}
              isPending={isPending}
              message={message}
              onBack={() => setStep("costs")}
              onComplete={completeOnboarding}
              setup={setup}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}

const setupStepOrder: FactorySetupStep[] = [
  "capital",
  "identity",
  "lines",
  "costs",
  "review",
];

function CapitalStep({
  currencyCode,
  onNext,
  setup,
}: {
  currencyCode: "EUR" | "USD";
  onNext: () => void;
  setup: FactorySetupPayload;
}) {
  return (
    <div className="onboarding-setup-grid">
      <section className="onboarding-setup-panel">
        <p className="game-pill w-fit">
          <Wallet size={16} />
          Başlangıç sermayesi
        </p>
        <h2>{formatMoney(setup.simulation.startingCapitalCents, currencyCode)}</h2>
        <p>
          Day {setup.simulation.startingDay} başlangıcı için sermaye hazır. Bu tutar
          fabrika kurulduğunda canlı fabrika kasasına yazılacak.
        </p>
        <div className="onboarding-metric-row">
          <SetupMetric icon={BadgeEuro} label="Para etiketi" value={currencyCode} />
          <SetupMetric icon={Landmark} label="Finans dönemi" value={`${setup.simulation.financePeriodDays} gün`} />
          <SetupMetric icon={Factory} label="Başlangıç seviye" value={`Level ${setup.simulation.startingLevel}`} />
        </div>
      </section>
      <section className="onboarding-setup-aside">
        <h3>Kurulum paketi</h3>
        <p>Kesim, Dikim ve Ütü/Paket hatları starter paket olarak hazırlanacak.</p>
        <button className="game-button-primary" onClick={onNext} type="button">
          Fabrika kimliğine geç
          <ArrowRight size={17} />
        </button>
      </section>
    </div>
  );
}

function IdentityStep({
  currencyCode,
  factoryName,
  isPending,
  message,
  onBack,
  onCurrencyChange,
  onFactoryNameChange,
  onSubmit,
}: {
  currencyCode: "EUR" | "USD";
  factoryName: string;
  isPending: boolean;
  message: string;
  onBack: () => void;
  onCurrencyChange: (currencyCode: "EUR" | "USD") => void;
  onFactoryNameChange: (factoryName: string) => void;
  onSubmit: () => void;
}) {
  return (
    <form
      className="onboarding-setup-grid"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <section className="onboarding-setup-panel">
        <p className="game-pill w-fit">
          <Factory size={16} />
          Fabrika kimliği
        </p>
        <h2>Yeni fabrikanın adı</h2>
        <label className="onboarding-field">
          <span>Fabrika adı</span>
          <input
            maxLength={80}
            minLength={3}
            onChange={(event) => onFactoryNameChange(event.target.value)}
            required
            value={factoryName}
          />
        </label>
        <div className="onboarding-currency-toggle" role="group" aria-label="Para etiketi">
          {(["EUR", "USD"] as const).map((code) => (
            <button
              className={currencyCode === code ? "is-active" : ""}
              key={code}
              onClick={() => onCurrencyChange(code)}
              type="button"
            >
              {code}
            </button>
          ))}
        </div>
        {message ? <p className="onboarding-error">{message}</p> : null}
      </section>
      <section className="onboarding-setup-aside">
        <h3>Kayıt mantığı</h3>
        <p>
          Bu adım draft kaydını günceller. Canlı fabrika kayıtları final onayında
          tek transaction içinde oluşturulacak.
        </p>
        <div className="onboarding-action-row">
          <button className="game-button-ghost" onClick={onBack} type="button">
            Geri
          </button>
          <button className="game-button-primary" disabled={isPending} type="submit">
            {isPending ? "Kaydediliyor" : "Hat kurulumuna geç"}
            <ArrowRight size={17} />
          </button>
        </div>
      </section>
    </form>
  );
}

function StarterLinesStep({
  activeLine,
  currencyCode,
  installedLineCount,
  onInstallLine,
  setup,
}: {
  activeLine: StarterLineSetup | undefined;
  currencyCode: "EUR" | "USD";
  installedLineCount: number;
  onInstallLine: () => void;
  setup: FactorySetupPayload;
}) {
  const installedLines = setup.starterLines.slice(0, installedLineCount);

  return (
    <section className="onboarding-lines-stage">
      <div className="onboarding-floor-card">
        <div className="onboarding-floor-grid">
          {setup.starterLines.map((line, index) => {
            const installed = index < installedLineCount;

            return (
              <div
                className={installed ? "onboarding-floor-slot is-installed" : "onboarding-floor-slot"}
                key={line.id}
              >
                {installed ? (
                  <>
                    <span
                      aria-hidden="true"
                      className="onboarding-floor-slot-visual"
                      style={imageBackgroundStyle(line.visual.mapUrl ?? line.visual.cardUrl ?? undefined)}
                    />
                    <strong>{line.departmentName}</strong>
                    <span>{line.staffTotal} personel</span>
                  </>
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>
            );
          })}
        </div>
        <div className="onboarding-floor-summary">
          <span>{installedLines.length} / {setup.starterLines.length} hat yerleşti</span>
          <strong>{setup.costs.totalStaff} kişilik başlangıç kadrosu hazırlanıyor</strong>
        </div>
      </div>

      {activeLine ? (
        <div className="onboarding-line-modal-layer">
          <article className="onboarding-line-modal game-card">
            <div className="onboarding-line-visual">
              {activeLine.visual.detailUrl ? (
                <span
                  aria-label={`${activeLine.departmentName} üretim hattı`}
                  className="onboarding-line-visual-asset"
                  role="img"
                  style={imageBackgroundStyle(activeLine.visual.detailUrl)}
                />
              ) : null}
            </div>
            <div className="onboarding-line-copy">
              <p className="onboarding-selection-kicker">Workshop Segment</p>
              <h2>{activeLine.departmentName}</h2>
              <span>{activeLine.key}</span>
              <div className="onboarding-line-metrics">
                <SetupMetric icon={Coins} label="Yatırım değeri" value={formatMoney(activeLine.purchaseCostCents, currencyCode)} />
                <SetupMetric icon={Users} label="Personel" value={`${activeLine.staffTotal} kişi`} />
                <SetupMetric icon={PackageCheck} label="Günlük kapasite" value={`${formatNumber(activeLine.dailyPointCapacity)} puan`} />
                <SetupMetric icon={Factory} label="Alan" value={`${activeLine.areaM2} m2`} />
              </div>
              <div className="onboarding-staff-strip">
                {activeLine.staffRequirements.map((requirement) => (
                  <span key={requirement.id}>
                    {requirement.roleName} <strong>{requirement.quantity}</strong>
                  </span>
                ))}
              </div>
              <button className="game-button-primary" onClick={onInstallLine} type="button">
                Hattı zemine yerleştir
                <ArrowRight size={17} />
              </button>
            </div>
          </article>
        </div>
      ) : null}
    </section>
  );
}

function CostsStep({
  currencyCode,
  onBack,
  onNext,
  setup,
}: {
  currencyCode: "EUR" | "USD";
  onBack: () => void;
  onNext: () => void;
  setup: FactorySetupPayload;
}) {
  return (
    <div className="onboarding-setup-grid">
      <section className="onboarding-setup-panel">
        <p className="game-pill w-fit">
          <Landmark size={16} />
          Aylık gider bilgisi
        </p>
        <h2>{formatMoney(setup.costs.monthlyTotalExpenseCents, currencyCode)}</h2>
        <p>
          İlk finans dönemi {setup.simulation.financePeriodDays} gün üzerinden hesaplanır.
          Bu ekran oyuncuya nakit akışını başlamadan önce gösterir.
        </p>
        <div className="onboarding-cost-list">
          <CostRow label="Toplam maaş gideri" value={setup.costs.monthlyPayrollCents} currencyCode={currencyCode} />
          <CostRow label="Kira / alan gideri" value={setup.costs.monthlyRentCents} currencyCode={currencyCode} />
          <CostRow label="Elektrik" value={setup.costs.monthlyElectricityCents} currencyCode={currencyCode} />
          <CostRow label="Yemek ve destek" value={setup.costs.monthlyMealCents} currencyCode={currencyCode} />
          <CostRow label="Sabit işletme giderleri" value={setup.costs.monthlyOverheadCents} currencyCode={currencyCode} />
        </div>
      </section>
      <section className="onboarding-setup-aside">
        <h3>Kadro özeti</h3>
        <div className="onboarding-metric-column">
          <SetupMetric icon={Users} label="Doğrudan üretim" value={`${setup.costs.directStaffTotal} kişi`} />
          <SetupMetric icon={Users} label="Yönetim ve destek" value={`${setup.costs.supportStaffTotal} kişi`} />
          <SetupMetric icon={Factory} label="Toplam alan" value={`${setup.costs.totalAreaM2} m2`} />
        </div>
        <div className="onboarding-action-row">
          <button className="game-button-ghost" onClick={onBack} type="button">
            Geri
          </button>
          <button className="game-button-primary" onClick={onNext} type="button">
            Özete geç
            <ArrowRight size={17} />
          </button>
        </div>
      </section>
    </div>
  );
}

function ReviewStep({
  currencyCode,
  factoryName,
  isPending,
  message,
  onBack,
  onComplete,
  setup,
}: {
  currencyCode: "EUR" | "USD";
  factoryName: string;
  isPending: boolean;
  message: string;
  onBack: () => void;
  onComplete: () => void;
  setup: FactorySetupPayload;
}) {
  return (
    <div className="onboarding-setup-grid">
      <section className="onboarding-setup-panel">
        <p className="game-pill w-fit">
          <CheckCircle2 size={16} />
          Kurulum özeti
        </p>
        <h2>{factoryName}</h2>
        <div className="onboarding-review-list">
          <ReviewRow label="Sektör" value={setup.sector.title} />
          <ReviewRow label="Başlangıç sermayesi" value={formatMoney(setup.simulation.startingCapitalCents, currencyCode)} />
          <ReviewRow label="Para etiketi" value={currencyCode} />
          <ReviewRow label="Kurulacak hatlar" value="Kesim, Dikim, Ütü / Paket" />
          <ReviewRow label="Fason destekler" value="Nakış, Baskı, Yıkama, Boyama" />
          <ReviewRow label="Çalışan sayısı" value={`${setup.costs.totalStaff} kişi`} />
          <ReviewRow label="Başlangıç günü" value={`Day ${setup.simulation.startingDay}`} />
        </div>
        {message ? <p className="onboarding-error">{message}</p> : null}
      </section>
      <section className="onboarding-setup-aside">
        <h3>Canlı kayıt oluşturulacak</h3>
        <p>
          Final onayında fabrika, üretim hatları, personel atamaları ve small_workshop
          stage bilgisi veritabanına yazılır.
        </p>
        <div className="onboarding-action-row">
          <button className="game-button-ghost" onClick={onBack} type="button">
            Geri
          </button>
          <button className="game-button-primary" disabled={isPending} onClick={onComplete} type="button">
            {isPending ? "Kuruluyor" : "Fabrikayı kur"}
            <ArrowRight size={17} />
          </button>
        </div>
      </section>
    </div>
  );
}

function SetupMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
}) {
  return (
    <div className="onboarding-setup-metric">
      <Icon size={17} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function CostRow({
  currencyCode,
  label,
  value,
}: {
  currencyCode: "EUR" | "USD";
  label: string;
  value: string;
}) {
  return (
    <div>
      <span>{label}</span>
      <strong>{formatMoney(value, currencyCode)}</strong>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function formatMoney(cents: string, currencyCode: "EUR" | "USD") {
  return new Intl.NumberFormat("tr-TR", {
    currency: currencyCode,
    maximumFractionDigits: 0,
    style: "currency",
  }).format(Number(cents) / 100);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("tr-TR").format(value);
}

function isAvailableSector(sector: OnboardingSector) {
  return sector.playable || sector.status === "ACTIVE";
}

function getPageMotion(pageIndex: number, pageCount: number) {
  if (pageIndex === 1) {
    return { duration: 1.08, fromX: 100, fromY: 16, outX: -24, outY: -12 };
  }

  if (pageIndex === pageCount - 1) {
    return { duration: 1.02, fromX: 0, fromY: -100, outX: 0, outY: 26 };
  }

  if (pageIndex === 2) {
    return { duration: 1.02, fromX: 0, fromY: 100, outX: 0, outY: -26 };
  }

  const entersFromRight = pageIndex % 2 === 1;

  return {
    duration: 0.98,
    fromX: entersFromRight ? 100 : -100,
    fromY: 0,
    outX: entersFromRight ? -100 : 100,
    outY: 0,
  };
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(subscribeToReducedMotion, getReducedMotionSnapshot, getServerReducedMotionSnapshot);
}

function subscribeToReducedMotion(onStoreChange: () => void) {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", onStoreChange);

  return () => mediaQuery.removeEventListener("change", onStoreChange);
}

function getReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function getServerReducedMotionSnapshot() {
  return false;
}

function backgroundStyle(imageUrl: string | undefined): CSSProperties {
  return imageUrl
    ? {
        backgroundImage: `linear-gradient(90deg, rgba(26, 27, 30, 0.12), rgba(26, 27, 30, 0.18) 42%, rgba(26, 27, 30, 0.82) 68%, rgba(26, 27, 30, 0.96)), url("${imageUrl}")`,
      }
    : {};
}

function imageBackgroundStyle(imageUrl: string | undefined): CSSProperties {
  return imageUrl
    ? {
        backgroundImage: `url("${imageUrl}")`,
      }
    : {};
}
