"use client";

import { ArrowRight, CheckCircle2, ChevronRight, Sparkles } from "lucide-react";
import { gsap } from "gsap";
import type { CSSProperties } from "react";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";

import BlurText from "@/components/ui/blurtext";

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

const DEFAULT_PAGE_HOLD_SECONDS = 3.6;
const FIRST_PAGE_HOLD_SECONDS = 4.6;

export function OnboardingExperience({ sectors }: OnboardingExperienceProps) {
  const [headlineReady, setHeadlineReady] = useState(false);
  const [selectedSectorKey, setSelectedSectorKey] = useState<string | null>(null);
  const [notice, setNotice] = useState("Textile seçimi bu deneme akışında veritabanına yazılmayacak.");
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
      setNotice(`${sector.shortTitle} seçildi. Bu deneme akışında kayıt oluşturulmadı.`);
      return;
    }

    setNotice(`${sector.shortTitle} şu anda yakında durumunda. Veritabanına kayıt yapılmadı.`);
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
  return (
    <div className="onboarding-intro game-card">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary">Multi-sector simulation</p>
      <h2>
        <span>FACTORY RUNWAY</span> size farklı sektörlerde farklı üretim deneyimleri sunar.
      </h2>
      <div className="onboarding-intro-list">
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
  notice,
  onChooseSector,
  sectors,
  selectedSectorKey,
}: {
  notice: string;
  onChooseSector: (sector: OnboardingSector) => void;
  sectors: OnboardingSector[];
  selectedSectorKey: string | null;
}) {
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
        <h2>Sektörünü Seç</h2>
        <p>
          Yeni şirketin için üretim sektörünü belirle. Aktif sektörler şimdi oynanabilir,
          pasif sektörler sonraki paketlerde açılacak.
        </p>
        <div className="onboarding-step-dots" aria-hidden="true">
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
          onChooseSector={onChooseSector}
          sector={featuredSector}
          selected={selectedSectorKey === featuredSector.key}
        />

        {secondarySectors.map((sector) => (
          <SectorCard
            key={sector.key}
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
  featured = false,
  onChooseSector,
  sector,
  selected,
}: {
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
    <button className={cardClassName} onClick={() => onChooseSector(sector)} type="button">
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
