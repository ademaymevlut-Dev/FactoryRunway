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
  type LucideIcon,
} from "lucide-react";
import { gsap } from "gsap";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";

import BlurText from "@/components/ui/blurtext";
import SplitText from "@/components/ui/SplitText";
import { ProductionLineCard } from "@/components/onboarding/production-line-card";

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

    setNotice(`${sector.shortTitle} şu anda yakında durumunda. Bu sektör sonraki paketlerde açılacak.`);
  }

  if (setup) {
    return (
      <FactorySetupWizard
        setup={setup}
        onBackToSectors={() => {
          setSetup(null);
          setNotice(`${setup.sector.title} seçimi hazır. İstersen sektörleri yeniden inceleyebilirsin.`);
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
        İlk akışta sektörünü seçer, başlangıç atölyeni hazırlar ve Day 1 için
        üretim planlamasına geçersin.
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
    setup.draft.factoryName ?? "Runway Atelier",
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

    if (nextInstalledCount < setup.starterLines.length) {
      setTimeout(() => setActiveLineIndex(nextInstalledCount), 260);
    }
  }

  function completeOnboarding() {
    setMessage("Fabrika hazırlanıyor...");
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

      setMessage("Kurulum tamamlandı. Day 1 başlıyor.");
      window.setTimeout(() => {
        window.location.assign(result.redirectTo);
      }, 650);
    });
  }

  return (
    <main className="onboarding-shell min-h-screen overflow-hidden bg-background text-foreground">
      <div className="factory-backdrop" />
      <div className="onboarding-setup-bg" />
      <section className="onboarding-setup-page">
        <div className="onboarding-setup-card game-card">
          <header className="onboarding-setup-header">
            <button
              aria-label="Sektörlere dön"
              className="onboarding-back-button"
              onClick={onBackToSectors}
              title="Sektörlere dön"
              type="button"
            >
              <ArrowLeft size={17} />
            </button>
            <div>
              <p className="onboarding-selection-kicker">FACTORY LAUNCH</p>
              <h1>Tekstil Atölyesi Kurulumu</h1>
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
              onContinue={() => setStep("costs")}
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
  const [titleReady, setTitleReady] = useState(false);

  return (
    <div className="onboarding-setup-grid">
      <section className="onboarding-setup-panel">
        <p className="game-pill w-fit">
          <Wallet size={16} />
          Başlangıç kasası
        </p>
        <SetupBlurTitle
          onReady={() => setTitleReady(true)}
          text={formatMoney(setup.simulation.startingCapitalCents, currencyCode)}
        />
        {titleReady ? (
          <>
            <RevealText text="İlk üretim gününe güçlü bir kasa ile başlıyorsun. Bu sermaye; hat kurulumu, personel giderleri ve ilk operasyon riskleri için ayrıldı." />
            <div className="onboarding-metric-row">
              <SetupMetric icon={BadgeEuro} label="Para birimi" value={currencyCode} />
              <SetupMetric icon={Landmark} label="İlk finans dönemi" value={`${setup.simulation.financePeriodDays} gün`} />
              <SetupMetric icon={Factory} label="Başlangıç seviyesi" value={`Level ${setup.simulation.startingLevel}`} />
            </div>
          </>
        ) : null}
      </section>
      <section className="onboarding-setup-aside">
        {titleReady ? (
          <>
            <RevealSideTitle text="Başlangıç paketi hazır" />
            <RevealText text="İlk fabrikan üç temel hatla açılır: Kesim, Dikim ve Ütü/Paket. Bu paket küçük atölye ölçeğinde üretime başlamak için dengelendi." />
            <button className="game-button-primary onboarding-cta-motion" onClick={onNext} type="button">
              Fabrika kimliğini oluştur
              <ArrowRight size={17} />
            </button>
          </>
        ) : null}
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
  const [titleReady, setTitleReady] = useState(false);

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
        <SetupBlurTitle onReady={() => setTitleReady(true)} text="Atölyenin tabelasını as" />
        {titleReady ? (
          <>
            <RevealText text="Fabrika adı raporlarda, sipariş ekranlarında ve üretim özetlerinde görünecek. Son onaya kadar değiştirilebilir." />
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
            <div className="onboarding-currency-toggle" role="radiogroup" aria-label="Para birimi">
              <CurrencyOption
                active={currencyCode === "EUR"}
                code="EUR"
                label="€"
                onSelect={onCurrencyChange}
              />
              <CurrencyOption
                active={currencyCode === "USD"}
                code="USD"
                label="$"
                onSelect={onCurrencyChange}
              />
            </div>
            {message ? <p className="onboarding-error">{message}</p> : null}
          </>
        ) : null}
      </section>
      <section className="onboarding-setup-aside">
        {titleReady ? (
          <>
            <RevealSideTitle text="Kimlik kilidi" />
            <RevealText text="Fabrika adı raporlarda, sipariş ekranlarında ve üretim özetlerinde görünecek. Son onaya kadar değiştirilebilir." />
            <div className="onboarding-action-row">
              <button
                aria-label="Geri"
                className="game-button-ghost onboarding-step-back-button"
                onClick={onBack}
                title="Geri"
                type="button"
              >
                <ArrowLeft size={17} />
              </button>
              <button className="game-button-primary onboarding-cta-motion" disabled={isPending} type="submit">
                {isPending ? "Kaydediliyor" : "Hat kurulumuna geç"}
                <ArrowRight size={17} />
              </button>
            </div>
          </>
        ) : null}
      </section>
    </form>
  );
}

function StarterLinesStep({
  activeLine,
  currencyCode,
  installedLineCount,
  onContinue,
  onInstallLine,
  setup,
}: {
  activeLine: StarterLineSetup | undefined;
  currencyCode: "EUR" | "USD";
  installedLineCount: number;
  onContinue: () => void;
  onInstallLine: () => void;
  setup: FactorySetupPayload;
}) {
  const installedLines = setup.starterLines.slice(0, installedLineCount);
  const activeLineCopy = activeLine ? getStarterLineCopy(activeLine.key) : null;
  const allLinesInstalled = installedLineCount >= setup.starterLines.length;

  return (
    <section className="onboarding-lines-stage">
      <div className="onboarding-floor-card">
        <div className="grid grid-cols-3  items-stretch gap-0">
          {setup.starterLines.map((line, index) => {
            const installed = index < installedLineCount;

            return (
              <ProductionLineCard
                installed={installed}
                line={line}
                key={line.id}
                position={index + 1}
              />
            );
          })}
        </div>
        <div className="onboarding-floor-summary">
          <span>{installedLines.length} / {setup.starterLines.length} hat kuruldu</span>
          <strong>{setup.costs.totalStaff} kişilik başlangıç kadrosu hazırlanıyor</strong>
        </div>
        {allLinesInstalled ? (
          <div className="onboarding-lines-complete">
            <div>
              <strong>Üç üretim hattı zemine yerleşti.</strong>
              <span>Kesim, Dikim ve Ütü/Paket hattı Day 1 için hazır.</span>
            </div>
            <button className="game-button-primary onboarding-cta-motion" onClick={onContinue} type="button">
              Aylık gider brifingine geç
              <ArrowRight size={17} />
            </button>
          </div>
        ) : null}
      </div>

      {!allLinesInstalled && activeLine && activeLineCopy ? (
        <StarterLineModal
          key={activeLine.id}
          activeLine={activeLine}
          activeLineCopy={activeLineCopy}
          currencyCode={currencyCode}
          onInstallLine={onInstallLine}
        />
      ) : null}
    </section>
  );
}

function StarterLineModal({
  activeLine,
  activeLineCopy,
  currencyCode,
  onInstallLine,
}: {
  activeLine: StarterLineSetup;
  activeLineCopy: ReturnType<typeof getStarterLineCopy>;
  currencyCode: "EUR" | "USD";
  onInstallLine: () => void;
}) {
  const [titleReady, setTitleReady] = useState(false);

  return (
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
          <p className="onboarding-selection-kicker">Workshop segment</p>
          <SetupBlurTitle
            onReady={() => setTitleReady(true)}
            text={activeLineCopy.title}
          />
          {titleReady ? (
            <>
              <RevealText className="onboarding-line-subtitle" text={activeLineCopy.subtitle} />
              <RevealText text={activeLineCopy.description} />
              <div className="onboarding-line-metrics">
                <SetupMetric icon={Coins} label="Kurulum maliyeti" value={formatMoney(activeLine.purchaseCostCents, currencyCode)} />
                <SetupMetric icon={Users} label="Personel" value={`${activeLine.staffTotal} kişi`} />
                <SetupMetric icon={PackageCheck} label="Günlük kapasite" value={`${formatNumber(activeLine.dailyPointCapacity)} puan`} />
                <SetupMetric icon={Factory} label="Alan ihtiyacı" value={`${activeLine.areaM2} m²`} />
              </div>
              <div className="onboarding-staff-strip">
                {activeLine.staffRequirements.map((requirement) => (
                  <span key={requirement.id}>
                    {formatRoleName(activeLine.key, requirement.roleKey, requirement.roleName)}
                    <strong>{requirement.quantity}</strong>
                  </span>
                ))}
              </div>
              <button className="game-button-primary onboarding-cta-motion" onClick={onInstallLine} type="button">
                Hattı zemine yerleştir
                <ArrowRight size={17} />
              </button>
            </>
          ) : null}
        </div>
      </article>
    </div>
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
  const [titleReady, setTitleReady] = useState(false);

  return (
    <div className="onboarding-setup-grid">
      <section className="onboarding-setup-panel">
        <p className="game-pill w-fit">
          <Landmark size={16} />
          Aylık gider brifingi
        </p>
        <SetupBlurTitle
          onReady={() => setTitleReady(true)}
          text={formatMoney(setup.costs.monthlyTotalExpenseCents, currencyCode)}
        />
        {titleReady ? (
          <>
            <RevealText text={`İlk ${setup.simulation.financePeriodDays} günlük finans döneminde fabrikanın tahmini sabit gideri. Bu özet, üretim başlamadan önce nakit akışı riskini gösterir.`} />
            <div className="grid gap-1">
              <CostRow label="Personel maaşları" value={setup.costs.monthlyPayrollCents} currencyCode={currencyCode} />
              <CostRow label="Alan / kira gideri" value={setup.costs.monthlyRentCents} currencyCode={currencyCode} />
              <CostRow label="Enerji gideri" value={setup.costs.monthlyElectricityCents} currencyCode={currencyCode} />
              <CostRow label="Yemek ve vardiya desteği" value={setup.costs.monthlyMealCents} currencyCode={currencyCode} />
              <CostRow label="Sabit operasyon giderleri" value={setup.costs.monthlyOverheadCents} currencyCode={currencyCode} />
            </div>
          </>
        ) : null}
      </section>
      <section className="onboarding-setup-aside">
        {titleReady ? (
          <>
            <RevealSideTitle text="Operasyon ölçeği" />
            <div className="onboarding-metric-column">
              <SetupMetric icon={Users} label="Üretim kadrosu" value={`${setup.costs.directStaffTotal} kişi`} />
              <SetupMetric icon={Users} label="Yönetim ve destek" value={`${setup.costs.supportStaffTotal} kişi`} />
              <SetupMetric icon={Factory} label="Kurulu alan" value={`${setup.costs.totalAreaM2} m²`} />
            </div>
            <div className="onboarding-action-row">
              <button
                aria-label="Geri"
                className="game-button-ghost onboarding-step-back-button"
                onClick={onBack}
                title="Geri"
                type="button"
              >
                <ArrowLeft size={17} />
              </button>
              <button className="game-button-primary onboarding-cta-motion" onClick={onNext} type="button">
                Final özetine geç
                <ArrowRight size={17} />
              </button>
            </div>
          </>
        ) : null}
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
  const [titleReady, setTitleReady] = useState(false);

  return (
    <div className="onboarding-setup-grid">
      <section className="onboarding-setup-panel">
        <p className="game-pill w-fit">
          <CheckCircle2 size={16} />
          Kurulum özeti
        </p>
        <SetupBlurTitle
          onReady={() => setTitleReady(true)}
          text={`${factoryName} üretime hazır`}
        />
        {titleReady ? (
          <>
            <RevealText text="Başlangıç sermayesi, üretim hatları, personel kadrosu ve ilk finans dönemi hazırlandı. Onay verdiğinde fabrika kurulumu tamamlanır ve Day 1 planlama ekranına geçersin." />
            <div className="grid gap-1">
              <ReviewRow label="Sektör" value={setup.sector.title} />
              <ReviewRow label="Başlangıç kasası" value={formatMoney(setup.simulation.startingCapitalCents, currencyCode)} />
              <ReviewRow label="Para birimi" value={currencyCode} />
              <ReviewRow label="Kurulan üretim hatları" value="Kesim, Dikim, Ütü / Paket" />
              <ReviewRow label="Dış proses destekleri" value="Nakış, Baskı, Yıkama, Boyama" />
              <ReviewRow label="Toplam çalışan" value={`${setup.costs.totalStaff} kişi`} />
              <ReviewRow label="Başlangıç günü" value={`Day ${setup.simulation.startingDay}`} />
            </div>
            {message ? <p className="onboarding-error">{message}</p> : null}
          </>
        ) : null}
      </section>
      <section className="onboarding-setup-aside">
        {titleReady ? (
          <>
            <RevealSideTitle text="Son onay" />
            <RevealText text="Fabrika kurulduktan sonra başlangıç hatları, personel kadrosu ve ilk finans dönemi aktif hale gelir. Sonraki ekran Day 1 üretim planlamasıdır." />
            <div className="onboarding-action-row">
              <button
                aria-label="Geri"
                className="game-button-ghost onboarding-step-back-button"
                onClick={onBack}
                title="Geri"
                type="button"
              >
                <ArrowLeft size={17} />
              </button>
              <button className="game-button-primary onboarding-cta-motion" disabled={isPending} onClick={onComplete} type="button">
                {isPending ? "Fabrika hazırlanıyor..." : "Fabrikayı kur"}
                <ArrowRight size={17} />
              </button>
            </div>
          </>
        ) : null}
      </section>
    </div>
  );
}

function CurrencyOption({
  active,
  code,
  label,
  onSelect,
}: {
  active: boolean;
  code: "EUR" | "USD";
  label: string;
  onSelect: (currencyCode: "EUR" | "USD") => void;
}) {
  return (
    <button
      aria-checked={active}
      className={active ? "onboarding-currency-card is-active" : "onboarding-currency-card"}
      onClick={() => onSelect(code)}
      role="radio"
      type="button"
    >
      <strong className="onboarding-currency-symbol">{label}</strong>
      <span>{code}</span>
    </button>
  );
}

function SetupBlurTitle({
  onReady,
  text,
}: {
  onReady?: () => void;
  text: string;
}) {
  return (
    <BlurText
      as="h2"
      animateBy="words"
      className="onboarding-setup-title"
      delay={64}
      direction="top"
      onAnimationComplete={onReady}
      stepDuration={0.28}
      text={text}
    />
  );
}

function RevealSideTitle({ text }: { text: string }) {
  return (
    <BlurText
      as="h2"
      animateBy="words"
      className="onboarding-side-title"
      delay={42}
      direction="top"
      stepDuration={0.22}
      text={text}
    />
  );
}

function RevealText({
  className = "",
  text,
}: {
  className?: string;
  text: string;
}) {
  return (
    <SplitText
      className={`onboarding-split-copy ${className}`.trim()}
      delay={18}
      duration={0.58}
      ease="power3.out"
      from={{ opacity: 0, y: 18 }}
      rootMargin="0px"
      splitType="words"
      tag="p"
      text={text}
      textAlign="left"
      threshold={0}
      to={{ opacity: 1, y: 0 }}
      triggerOnMount
    />
  );
}

function SetupMetric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="onboarding-setup-metric">
      <Icon size={17} />
      <span>{label}</span>
      <strong>
        <AnimatedValue value={value} />
      </strong>
    </div>
  );
}

function AnimatedValue({ value }: { value: string }) {
  return (
    <SplitText
      className="onboarding-animated-value"
      delay={16}
      duration={0.5}
      ease="power3.out"
      from={{ opacity: 0, y: 12 }}
      rootMargin="0px"
      splitType="words"
      tag="span"
      text={value}
      textAlign="left"
      threshold={0}
      to={{ opacity: 1, y: 0 }}
      triggerOnMount
    />
  );
}

function getStarterLineCopy(lineKey: string) {
  const copies: Record<
    string,
    {
      title: string;
      shortTitle: string;
      subtitle: string;
      description: string;
    }
  > = {
    cutting_workshop: {
      title: "Kesim Hattı",
      shortTitle: "Kesim",
      subtitle: "Kumaş üretime burada girer",
      description:
        "Kesim hattı, kumaşı üretime hazır parçalar haline getirir. Bu hat yavaşlarsa dikim hattı kısa sürede beklemeye düşer.",
    },
    sewing_workshop: {
      title: "Dikim Hattı",
      shortTitle: "Dikim",
      subtitle: "Üretimin ana temposu burada belirlenir",
      description:
        "Dikim hattı fabrikanın ana darboğaz noktasıdır. Operatör dengesi bozulursa kesim kuyruğu büyür ve teslimat riski artar.",
    },
    ironing_packing_workshop: {
      title: "Ütü / Paket Hattı",
      shortTitle: "Ütü / Paket",
      subtitle: "Teslimat kalitesi burada netleşir",
      description:
        "Ürün burada son kontrol, ütü, katlama ve koli akışından geçer. Bu hattın disiplini teslimat kalitesini doğrudan etkiler.",
    },
  };

  return (
    copies[lineKey] ?? {
      title: "Üretim Hattı",
      shortTitle: "Hat",
      subtitle: "Başlangıç üretim modülü",
      description: "Bu üretim hattı başlangıç atölyesinin operasyon akışına eklenir.",
    }
  );
}

function formatRoleName(lineKey: string, roleKey: string, fallback: string) {
  const labels: Record<string, Record<string, string>> = {
    cutting_workshop: {
      bundling_staff: "Bundle / Numaralama",
      cutting_operator: "Kesim Operatörü",
      cutting_qc_staff: "Hat Destek",
      fabric_spreading_staff: "Kumaş Serim",
      marker_staff: "Marker / Şablon",
    },
    sewing_workshop: {
      inline_qc_staff: "Hat İçi Kalite",
      sewing_helper: "Yardımcı Personel",
      sewing_line_leader: "Hat Sorumlusu",
      sewing_operator: "Dikim Operatörü",
    },
    ironing_packing_workshop: {
      carton_flow_staff: "Koli / Akış",
      final_qc_staff: "Son Kontrol",
      ironing_operator: "Ütü / Pres",
      packing_staff: "Katlama / Paket",
    },
  };

  return labels[lineKey]?.[roleKey] ?? fallback;
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
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary px-3 py-2">
      <span className="text-[0.8rem] font-bold text-muted-foreground">{label}</span>
      <strong className="text-right text-[0.86rem] font-extrabold text-card-foreground">
        <AnimatedValue value={formatMoney(value, currencyCode)} />
      </strong>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-secondary px-3 py-2">
      <span className="text-[0.8rem] font-bold text-muted-foreground">{label}</span>
      <strong className="text-right text-[0.86rem] font-extrabold text-card-foreground">
        <AnimatedValue value={value} />
      </strong>
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
