"use client";

import Image from "next/image";
import Link from "next/link";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ClipboardCheck,
  Clock3,
  Gauge,
  GitBranch,
  Maximize2,
  PackageCheck,
  PauseCircle,
  Route,
  Scissors,
  Shirt,
  Sparkles,
  X,
  type LucideIcon,
} from "lucide-react";
import { gsap } from "gsap";
import {
  type CSSProperties,
  type ReactNode,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { GameUiProvider } from "@/features/game/store/game-ui-store";
import { TopStatusBar } from "@/features/game/components/top-status-bar";
import type { GameSnapshot } from "@/features/game/types";

import {
  BOTTLENECK_QUEUE_ITEMS,
  gameplayGuideCopy,
  type FlowStep,
  type GameplayGuideCopy,
  type GuideSectionId,
  type ProductPreview,
} from "./gameplay-guide-copy";
import styles from "./gameplay-guide.module.css";

const NORMAL_ROUTE_PATH =
  "M 170 342 C 260 342 348 342 405 342 S 575 342 720 342 S 890 342 1035 342 S 1205 342 1430 342";

const OUTSOURCE_ROUTE_PATH =
  "M 170 390 C 260 390 310 260 485 260 S 675 390 800 390 S 1045 390 1120 390 S 1320 390 1430 390";

const checklistIcons = {
  boxes: Boxes,
  gauge: Gauge,
  gitBranch: GitBranch,
  route: Route,
} satisfies Record<
  GameplayGuideCopy["checklist"]["items"][number]["iconKey"],
  LucideIcon
>;

export function GameplayGuide({ snapshot }: { snapshot: GameSnapshot }) {
  const copy = gameplayGuideCopy[snapshot.locale];
  const rootRef = useRef<HTMLElement>(null);
  const [activeSection, setActiveSection] = useState<GuideSectionId>("overview");
  const [selectedProduct, setSelectedProduct] = useState<ProductPreview | null>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  useGuideSectionObserver(rootRef, setActiveSection);
  useGuideAnimations(rootRef, prefersReducedMotion, setActiveSection);

  const activeSectionIndex = copy.sections.findIndex(
    (section) => section.id === activeSection,
  );

  return (
    <GameUiProvider initialShiftPlayback={snapshot.activeShiftPlayback}>
      <TooltipProvider>
        <main className={styles.guideShell} ref={rootRef}>
          <div aria-hidden="true" className={styles.mapBackdrop}>
            <div className="factory-map-landscape" />
            <div className={styles.mapVeil} />
          </div>

          <TopStatusBar position="fixed" snapshot={snapshot} />

          <div className={styles.utilityBar}>
            <Link className={styles.backLink} href="/game">
              <ArrowLeft size={16} />
              {copy.utility.back}
            </Link>
            <span className={styles.playerChip}>
              <span>{snapshot.player.displayName}</span>
              <span aria-hidden="true">·</span>
              {copy.utility.playerChip}
            </span>
          </div>

          <GuideSectionRail
            activeSection={activeSection}
            activeSectionIndex={activeSectionIndex}
            onSelect={(sectionId) => {
              setActiveSection(sectionId);
              scrollToGuideSection(sectionId);
            }}
            sections={copy.sections}
            sectionRailAria={copy.sectionRailAria}
          />

          <section
            className={styles.heroSection}
            data-guide-section
            id="overview"
          >
            <div className={styles.heroCopy}>
              <p className={styles.eyebrow}>{copy.hero.eyebrow}</p>
              <h1>
                {copy.hero.titlePrefix}
                <span>{copy.hero.titleEmphasis}</span>
              </h1>
              <p className={styles.heroDescription}>
                {copy.hero.description}
              </p>

              <div className={styles.heroActions}>
                <button
                  className={styles.primaryAction}
                  onClick={() => {
                    setActiveSection("normal-flow");
                    scrollToGuideSection("normal-flow");
                  }}
                  type="button"
                >
                  {copy.hero.action}
                  <ArrowDown size={17} />
                </button>
                <span>{copy.hero.motionHint}</span>
              </div>
            </div>

            <div className={styles.routeChoiceGrid}>
              {copy.routeChoices.map((choice) => (
                <RouteChoiceCard key={choice.title} {...choice} />
              ))}
            </div>
          </section>

          <GuideStorySection
            eyebrow={copy.stories.normalFlow.eyebrow}
            id="normal-flow"
            title={copy.stories.normalFlow.title}
            description={copy.stories.normalFlow.description}
          >
            <FlowBoard
              copy={copy.flowCard}
              markerId="normal-route-arrow"
              onPreviewProduct={setSelectedProduct}
              routePath={NORMAL_ROUTE_PATH}
              steps={copy.normalFlowSteps}
              travelerStart={{ x: 170, y: 342 }}
            />
          </GuideStorySection>

          <GuideStorySection
            eyebrow={copy.stories.outsourceFlow.eyebrow}
            id="outsource-flow"
            title={copy.stories.outsourceFlow.title}
            description={copy.stories.outsourceFlow.description}
            tone="amber"
          >
            <FlowBoard
              blockedPath="M 170 390 C 360 390 585 390 800 390"
              copy={copy.flowCard}
              markerId="outsource-route-arrow"
              onPreviewProduct={setSelectedProduct}
              routePath={OUTSOURCE_ROUTE_PATH}
              steps={copy.outsourceFlowSteps}
              travelerStart={{ x: 170, y: 390 }}
            >
              <div className={styles.outsourceWaitMessage} data-guide-message>
                <PauseCircle size={17} />
                <span>
                  <strong>{copy.stories.outsourceFlow.waitPrefix}</strong>{" "}
                  {copy.stories.outsourceFlow.waitBody}
                </span>
              </div>
            </FlowBoard>
          </GuideStorySection>

          <GuideStorySection
            eyebrow={copy.stories.bottleneck.eyebrow}
            id="bottleneck"
            title={copy.stories.bottleneck.title}
            description={copy.stories.bottleneck.description}
          >
            <BottleneckBoard copy={copy.bottleneck} />
          </GuideStorySection>

          <section
            className={styles.checklistSection}
            data-guide-section
            id="shift-check"
          >
            <div className={styles.checklistPanel}>
              <div className={styles.checklistIntro}>
                <p className={styles.eyebrow}>{copy.checklist.eyebrow}</p>
                <h2>{copy.checklist.title}</h2>
                <p>{copy.checklist.description}</p>
              </div>

              <div className={styles.checklistGrid}>
                {copy.checklist.items.map((item) => (
                  <ChecklistItem
                    icon={checklistIcons[item.iconKey]}
                    index={item.index}
                    key={item.index}
                    text={item.text}
                    title={item.title}
                  />
                ))}
              </div>

              <div className={styles.finalCallout}>
                <span className={styles.finalIcon}>
                  <ClipboardCheck size={22} />
                </span>
                <div>
                  <strong>{copy.checklist.finalTitle}</strong>
                  <span>{copy.checklist.finalBody}</span>
                </div>
                <Link className={styles.primaryAction} href="/game">
                  {copy.checklist.finalAction}
                  <ArrowRight size={17} />
                </Link>
              </div>
            </div>
          </section>

          <ProductPreviewDialog
            onOpenChange={(open) => {
              if (!open) {
                setSelectedProduct(null);
              }
            }}
            copy={copy.productPreview}
            preview={selectedProduct}
          />
        </main>
      </TooltipProvider>
    </GameUiProvider>
  );
}

function GuideSectionRail({
  activeSection,
  activeSectionIndex,
  onSelect,
  sections,
  sectionRailAria,
}: {
  activeSection: GuideSectionId;
  activeSectionIndex: number;
  onSelect: (sectionId: GuideSectionId) => void;
  sections: GameplayGuideCopy["sections"];
  sectionRailAria: string;
}) {
  const progress =
    sections.length > 1
      ? activeSectionIndex / (sections.length - 1)
      : 0;

  return (
    <nav aria-label={sectionRailAria} className={styles.sectionRail}>
      <div className={styles.sectionTrack}>
        <span style={{ transform: `scaleY(${progress})` }} />
      </div>
      {sections.map((section) => {
        const isActive = section.id === activeSection;

        return (
          <button
            aria-current={isActive ? "step" : undefined}
            className={isActive ? styles.activeRailItem : undefined}
            key={section.id}
            onClick={() => onSelect(section.id)}
            type="button"
          >
            <span>{section.shortLabel}</span>
            <strong>{section.label}</strong>
          </button>
        );
      })}
    </nav>
  );
}

function RouteChoiceCard({
  accent,
  description,
  image,
  imageAlt,
  route,
  title,
}: {
  accent: "amber" | "cyan";
  description: string;
  image: string;
  imageAlt: string;
  route: string;
  title: string;
}) {
  return (
    <article className={`${styles.routeChoiceCard} ${styles[accent]}`}>
      <div className={styles.routeChoiceImage}>
        <Image alt={imageAlt} fill priority sizes="180px" src={image} />
      </div>
      <div>
        <p>{title}</p>
        <strong>{route}</strong>
        <span>{description}</span>
      </div>
    </article>
  );
}

function GuideStorySection({
  children,
  description,
  eyebrow,
  id,
  title,
  tone = "cyan",
}: {
  children: ReactNode;
  description: string;
  eyebrow: string;
  id: GuideSectionId;
  title: string;
  tone?: "amber" | "cyan";
}) {
  return (
    <section
      className={`${styles.storySection} ${styles[tone]}`}
      data-animated-scene
      data-guide-section
      id={id}
    >
      <div className={styles.sceneStage} data-guide-stage>
        <div className={styles.sceneHeading}>
          <div>
            <p className={styles.eyebrow}>{eyebrow}</p>
            <h2>{title}</h2>
          </div>
          <p>{description}</p>
        </div>
        {children}
      </div>
    </section>
  );
}

function FlowBoard({
  blockedPath,
  children,
  copy,
  markerId,
  onPreviewProduct,
  routePath,
  steps,
  travelerStart,
}: {
  blockedPath?: string;
  children?: ReactNode;
  copy: GameplayGuideCopy["flowCard"];
  markerId: string;
  onPreviewProduct: (preview: ProductPreview) => void;
  routePath: string;
  steps: FlowStep[];
  travelerStart: { x: number; y: number };
}) {
  return (
    <div className={styles.flowBoard}>
      <svg
        aria-hidden="true"
        className={styles.routeSvg}
        preserveAspectRatio="none"
        viewBox="0 0 1600 680"
      >
        <defs>
          <marker
            id={markerId}
            markerHeight="10"
            markerWidth="10"
            orient="auto"
            refX="8"
            refY="5"
          >
            <path className={styles.routeArrow} d="M 0 0 L 10 5 L 0 10 z" />
          </marker>
          <filter id={`${markerId}-glow`} x="-100%" y="-100%" width="300%" height="300%">
            <feGaussianBlur result="blur" stdDeviation="7" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {blockedPath ? (
          <>
            <path className={styles.blockedRoute} d={blockedPath} />
            <g className={styles.stopMarker} transform="translate(600 390)">
              <circle r="22" />
              <path d="M -9 -9 L 9 9 M 9 -9 L -9 9" />
            </g>
          </>
        ) : null}

        <path className={styles.routeBase} d={routePath} />
        <path
          className={styles.routeActive}
          d={routePath}
          data-flow-path
          markerEnd={`url(#${markerId})`}
          pathLength="1"
        />
        <g
          data-route-traveler
          filter={`url(#${markerId}-glow)`}
          transform={`translate(${travelerStart.x} ${travelerStart.y})`}
        >
          <circle className={styles.travelerHalo} r="18" />
          <circle className={styles.travelerCore} r="7" />
        </g>
      </svg>

      {steps.map((step) => (
        <FlowDepartmentCard
          copy={copy}
          key={step.id}
          onPreviewProduct={onPreviewProduct}
          step={step}
        />
      ))}

      {children}
    </div>
  );
}

function FlowDepartmentCard({
  copy,
  onPreviewProduct,
  step,
}: {
  copy: GameplayGuideCopy["flowCard"];
  onPreviewProduct: (preview: ProductPreview) => void;
  step: FlowStep;
}) {
  const positionStyle = {
    "--flow-x": `${(step.x / 1600) * 100}%`,
    "--flow-y": `${(step.y / 680) * 100}%`,
  } as CSSProperties;

  return (
    <article
      className={`${styles.flowCard} ${step.tone ? styles[step.tone] : ""} ${step.durationNote ? styles.hasDurationNote : ""}`}
      data-flow-step
      style={positionStyle}
    >
      <div className={styles.flowCardHeader}>
        <span>{step.index}</span>
        <div>
          <p>{step.eyebrow}</p>
          <h3>{step.title}</h3>
        </div>
      </div>

      <div className={styles.departmentImage}>
        <Image
          alt={step.departmentAlt}
          fill
          loading={step.index === "01" ? "eager" : "lazy"}
          sizes="(min-width: 1440px) 220px, (min-width: 1024px) 16vw, 86vw"
          src={step.departmentImage}
        />
        <span className={styles.departmentShade} />
      </div>

      <p className={styles.flowDescription}>{step.description}</p>

      <button
        aria-label={copy.expandAria(step.outputLabel)}
        className={styles.productOutput}
        data-product-output
        onClick={() =>
          onPreviewProduct({
            alt: step.productAlt,
            eyebrow: `${step.eyebrow} · ${step.title}`,
            image: step.productImage,
            title: step.outputLabel,
          })
        }
        type="button"
      >
        <div>
          <Image
            alt={step.productAlt}
            fill
            sizes="96px"
            src={step.productImage}
          />
        </div>
        <span>
          <small>{copy.outputKicker}</small>
          <strong>{step.outputLabel}</strong>
        </span>
        <Maximize2
          aria-hidden="true"
          className={styles.productExpandIcon}
          size={14}
        />
      </button>

      {step.durationNote ? (
        <p className={styles.flowDurationNote}>{step.durationNote}</p>
      ) : null}
    </article>
  );
}

function ProductPreviewDialog({
  copy,
  onOpenChange,
  preview,
}: {
  copy: GameplayGuideCopy["productPreview"];
  onOpenChange: (open: boolean) => void;
  preview: ProductPreview | null;
}) {
  return (
    <Dialog onOpenChange={onOpenChange} open={preview !== null}>
      <DialogContent
        className={styles.productPreviewDialog}
        showCloseButton={false}
      >
        <div className={styles.productPreviewHeader}>
          <div>
            <DialogDescription>{preview?.eyebrow}</DialogDescription>
            <DialogTitle>{preview?.title}</DialogTitle>
          </div>
          <DialogClose asChild>
            <button aria-label={copy.closeAria} type="button">
              <X aria-hidden="true" size={18} />
            </button>
          </DialogClose>
        </div>

        <div className={styles.productPreviewImage}>
          {preview ? (
            <Image
              alt={preview.alt}
              fill
              priority
              sizes="(min-width: 640px) 560px, calc(100vw - 48px)"
              src={preview.image}
            />
          ) : null}
        </div>

        <p className={styles.productPreviewHint}>
          {copy.hint}
        </p>
      </DialogContent>
    </Dialog>
  );
}

function BottleneckBoard({
  copy,
}: {
  copy: GameplayGuideCopy["bottleneck"];
}) {
  return (
    <div className={styles.bottleneckBoard}>
      <svg
        aria-hidden="true"
        className={styles.bottleneckSvg}
        preserveAspectRatio="none"
        viewBox="0 0 1400 520"
      >
        <path d="M 190 250 C 390 250 450 250 595 250" />
        <path d="M 805 250 C 950 250 1010 250 1210 250" />
      </svg>

      <BottleneckStation
        icon={Scissors}
        index={copy.stations.cutting.index}
        label={copy.stations.cutting.label}
        position="left"
        stationKind={copy.stationKind}
        status={copy.stations.cutting.status}
        value={copy.stations.cutting.value}
      />

      <div className={styles.queueZone}>
        <div className={styles.queueZoneHeader}>
          <span>
            <Clock3 size={16} />
            {copy.queueTitle}
          </span>
          <strong>{copy.queueCount}</strong>
        </div>
        <div className={styles.queueStack}>
          {BOTTLENECK_QUEUE_ITEMS.map((item) => (
            <div data-queue-card key={item}>
              <Image
                alt={copy.queueImageAlt}
                fill
                sizes="70px"
                src="/game-guide/dikime_giden_basic.webp"
              />
              <span>{item}</span>
            </div>
          ))}
        </div>
        <p>{copy.queueDescription}</p>
      </div>

      <BottleneckStation
        icon={Shirt}
        index={copy.stations.sewing.index}
        label={copy.stations.sewing.label}
        position="center"
        stationKind={copy.stationKind}
        status={copy.stations.sewing.status}
        tone="danger"
        value={copy.stations.sewing.value}
      />

      <BottleneckStation
        icon={PackageCheck}
        index={copy.stations.ironPacking.index}
        label={copy.stations.ironPacking.label}
        position="right"
        stationKind={copy.stationKind}
        status={copy.stations.ironPacking.status}
        value={copy.stations.ironPacking.value}
      />

      <div className={styles.capacityPanel} data-guide-message>
        <div>
          <span>{copy.capacity.cutting}</span>
          <strong>1.200</strong>
          <i>
            <span data-capacity-fill style={{ "--capacity": 1 } as CSSProperties} />
          </i>
        </div>
        <div className={styles.dangerCapacity}>
          <span>{copy.capacity.sewing}</span>
          <strong>760</strong>
          <i>
            <span
              data-capacity-fill
              style={{ "--capacity": 0.63 } as CSSProperties}
            />
          </i>
        </div>
        <p>
          <Sparkles size={15} />
          {copy.capacity.solution}
        </p>
      </div>
    </div>
  );
}

function BottleneckStation({
  icon: Icon,
  index,
  label,
  position,
  stationKind,
  status,
  tone,
  value,
}: {
  icon: LucideIcon;
  index: string;
  label: string;
  position: "center" | "left" | "right";
  stationKind: string;
  status: string;
  tone?: "danger";
  value: string;
}) {
  return (
    <article
      className={`${styles.bottleneckStation} ${styles[position]} ${
        tone ? styles[tone] : ""
      }`}
      data-flow-step
    >
      <span className={styles.stationIcon}>
        <Icon size={22} />
      </span>
      <small>
        {index} · {stationKind}
      </small>
      <h3>{label}</h3>
      <strong>{value}</strong>
      <span className={styles.stationStatus}>{status}</span>
    </article>
  );
}

function ChecklistItem({
  icon: Icon,
  index,
  text,
  title,
}: {
  icon: LucideIcon;
  index: string;
  text: string;
  title: string;
}) {
  return (
    <article>
      <span className={styles.checkIcon}>
        <Icon size={20} />
      </span>
      <small>{index}</small>
      <h3>{title}</h3>
      <p>{text}</p>
      <CheckCircle2 size={17} />
    </article>
  );
}

function useGuideAnimations(
  rootRef: React.RefObject<HTMLElement | null>,
  prefersReducedMotion: boolean,
  setActiveSection: (section: GuideSectionId) => void,
) {
  useEffect(() => {
    const root = rootRef.current;

    if (!root || prefersReducedMotion) {
      return;
    }

    let cancelled = false;
    let context: gsap.Context | null = null;
    let media: gsap.MatchMedia | null = null;
    let refreshFrame: number | null = null;

    async function setupAnimations() {
      const { ScrollTrigger } = await import("gsap/dist/ScrollTrigger");

      if (cancelled || !root) {
        return;
      }

      gsap.registerPlugin(ScrollTrigger);

      context = gsap.context(() => {
        media = gsap.matchMedia();

        media.add("(min-width: 1024px)", () => {
          const scenes = gsap.utils.toArray<HTMLElement>(
            "[data-animated-scene]",
            root,
          );

          scenes.forEach((scene) => {
            const stage = scene.querySelector<HTMLElement>("[data-guide-stage]");
            const steps = gsap.utils.toArray<HTMLElement>("[data-flow-step]", scene);
            const productOutputs = gsap.utils.toArray<HTMLElement>(
              "[data-product-output]",
              scene,
            );
            const queueCards = gsap.utils.toArray<HTMLElement>(
              "[data-queue-card]",
              scene,
            );
            const messages = gsap.utils.toArray<HTMLElement>(
              "[data-guide-message]",
              scene,
            );
            const capacityFills = gsap.utils.toArray<HTMLElement>(
              "[data-capacity-fill]",
              scene,
            );
            const routePath = scene.querySelector<SVGPathElement>("[data-flow-path]");
            const traveler = scene.querySelector<SVGGElement>("[data-route-traveler]");
            const routeLength = routePath?.getTotalLength() ?? 0;

            if (!stage) {
              return;
            }

            gsap.set(steps, { autoAlpha: 0.38, scale: 0.965, y: 24 });
            if (productOutputs.length > 0) {
              gsap.set(productOutputs, { autoAlpha: 0, scale: 0.78, y: 12 });
            }
            if (queueCards.length > 0) {
              gsap.set(queueCards, { autoAlpha: 0, scale: 0.72, x: -34 });
            }
            if (messages.length > 0) {
              gsap.set(messages, { autoAlpha: 0, y: 16 });
            }
            if (capacityFills.length > 0) {
              gsap.set(capacityFills, {
                scaleX: 0,
                transformOrigin: "left center",
              });
            }

            if (routePath) {
              gsap.set(routePath, {
                strokeDasharray: routeLength,
                strokeDashoffset: routeLength,
              });
            }

            if (steps[0]) {
              gsap.set(steps[0], { autoAlpha: 1, scale: 1, y: 0 });
            }

            if (productOutputs[0]) {
              gsap.set(productOutputs[0], { autoAlpha: 1, scale: 1, y: 0 });
            }

            const timeline = gsap.timeline({
              defaults: { ease: "power2.out" },
              scrollTrigger: {
                anticipatePin: 1,
                end: "+=175%",
                onEnter: () => setActiveSection(scene.id as GuideSectionId),
                onEnterBack: () => setActiveSection(scene.id as GuideSectionId),
                pin: stage,
                scrub: 0.85,
                start: "top top",
                trigger: scene,
              },
            });
            const sceneDuration = Math.max(steps.length * 0.9, 3.2);

            if (routePath) {
              timeline.to(
                routePath,
                {
                  duration: sceneDuration,
                  ease: "none",
                  strokeDashoffset: 0,
                },
                0,
              );
            }

            if (routePath && traveler) {
              const routeProgress = { value: 0 };

              timeline.to(
                routeProgress,
                {
                  duration: sceneDuration,
                  ease: "none",
                  onUpdate: () => {
                    const point = routePath.getPointAtLength(
                      routeLength * routeProgress.value,
                    );
                    traveler.setAttribute(
                      "transform",
                      `translate(${point.x} ${point.y})`,
                    );
                  },
                  value: 1,
                },
                0,
              );
            }

            steps.forEach((step, index) => {
              const at = index * 0.9;
              timeline.to(
                step,
                { autoAlpha: 1, duration: 0.62, scale: 1, y: 0 },
                at,
              );

              const productOutput = productOutputs[index];

              if (productOutput) {
                timeline.to(
                  productOutput,
                  { autoAlpha: 1, duration: 0.5, scale: 1, y: 0 },
                  at + 0.18,
                );
              }
            });

            if (queueCards.length > 0) {
              timeline.to(
                queueCards,
                {
                  autoAlpha: 1,
                  duration: 0.85,
                  scale: 1,
                  stagger: 0.12,
                  x: 0,
                },
                0.8,
              );
            }

            if (capacityFills.length > 0) {
              timeline.to(
                capacityFills,
                {
                  duration: 1,
                  scaleX: (_index, element) =>
                    Number(
                      getComputedStyle(element).getPropertyValue("--capacity"),
                    ) || 1,
                  stagger: 0.15,
                },
                1.6,
              );
            }

            if (messages.length > 0) {
              timeline.to(
                messages,
                { autoAlpha: 1, duration: 0.6, stagger: 0.14, y: 0 },
                sceneDuration - 0.85,
              );
            }
          });
        });

        media.add("(max-width: 1023px)", () => {
          const steps = gsap.utils.toArray<HTMLElement>("[data-flow-step]", root);

          steps.forEach((step) => {
            gsap.fromTo(
              step,
              { autoAlpha: 0, y: 26 },
              {
                autoAlpha: 1,
                duration: 0.55,
                ease: "power2.out",
                scrollTrigger: {
                  start: "top 88%",
                  toggleActions: "play none none reverse",
                  trigger: step,
                },
                y: 0,
              },
            );
          });
        });
      }, root);

      refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh());
    }

    void setupAnimations();

    return () => {
      cancelled = true;
      if (refreshFrame !== null) {
        window.cancelAnimationFrame(refreshFrame);
      }
      media?.revert();
      context?.revert();
    };
  }, [prefersReducedMotion, rootRef, setActiveSection]);
}

function useGuideSectionObserver(
  rootRef: React.RefObject<HTMLElement | null>,
  setActiveSection: (section: GuideSectionId) => void,
) {
  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return;
    }

    const sections = Array.from(
      root.querySelectorAll<HTMLElement>("[data-guide-section]"),
    );
    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntry = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

        if (visibleEntry?.target.id) {
          setActiveSection(visibleEntry.target.id as GuideSectionId);
        }
      },
      {
        rootMargin: "-34% 0px -48% 0px",
        threshold: [0, 0.01, 0.15, 0.35],
      },
    );

    sections.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [rootRef, setActiveSection]);
}

function scrollToGuideSection(sectionId: GuideSectionId) {
  document.getElementById(sectionId)?.scrollIntoView({
    behavior: prefersReducedMotionSnapshot() ? "auto" : "smooth",
    block: "start",
  });
}

function subscribeToReducedMotion(callback: () => void) {
  const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  mediaQuery.addEventListener("change", callback);
  return () => mediaQuery.removeEventListener("change", callback);
}

function prefersReducedMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function usePrefersReducedMotion() {
  return useSyncExternalStore(
    subscribeToReducedMotion,
    prefersReducedMotionSnapshot,
    () => false,
  );
}
