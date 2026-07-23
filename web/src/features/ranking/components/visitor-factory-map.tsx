"use client";

import Image from "next/image";
import {
  Factory,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import type {
  FactoryVisitLine,
  FactoryVisitSection,
  FactoryVisitView,
} from "../types";

const SLOT_ROWS = 3;
const SLOT_WIDTH = 147;
const SLOT_GAP = 7;
const SECTION_PADDING_X = 28;
const SECTION_MIN_WIDTH = 328;
const SECTION_GAP = 56;
const CANVAS_PADDING_X = 144;
const CANVAS_HEIGHT = 920;
const MAP_SCALE = 0.72;
const DRAG_THRESHOLD = 6;

type CameraOffset = {
  x: number;
  y: number;
};

const gradeMeta = {
  INDUSTRIAL: {
    glyph: "I",
    label: "Industrial",
  },
  PRECISION: {
    glyph: "P",
    label: "Precision",
  },
  SMART: {
    glyph: "S",
    label: "Smart",
  },
  WORKSHOP: {
    glyph: "W",
    label: "Workshop",
  },
} satisfies Record<
  FactoryVisitLine["grade"],
  {
    glyph: string;
    label: string;
  }
>;

export function VisitorFactoryMap({
  factoryVisit,
}: {
  factoryVisit: FactoryVisitView;
}) {
  const [mapPan, setMapPan] = useState<CameraOffset>({ x: 0, y: 0 });
  const [mapZoom, setMapZoom] = useState(1);
  const viewportRef = useRef<HTMLElement | null>(null);
  const dragState = useRef({
    active: false,
    moved: false,
    originX: 0,
    originY: 0,
    startX: 0,
    startY: 0,
  });
  const scale = MAP_SCALE * mapZoom;
  const canvasWidth = useMemo(
    () => getCanvasWidth(factoryVisit.sections),
    [factoryVisit.sections],
  );
  const boundOffsetToViewport = useCallback(
    (nextOffset: CameraOffset, viewportRect?: DOMRect) => {
      const rect =
        viewportRect ?? viewportRef.current?.getBoundingClientRect();

      if (!rect) return nextOffset;

      return {
        x: getBoundedAxisOffset(
          canvasWidth * scale,
          rect.width,
          nextOffset.x,
        ),
        y: getBoundedAxisOffset(
          CANVAS_HEIGHT * scale,
          rect.height,
          nextOffset.y,
        ),
      };
    },
    [canvasWidth, scale],
  );

  useEffect(() => {
    const syncCameraBounds = () => {
      setMapPan((current) => boundOffsetToViewport(current));
    };

    syncCameraBounds();
    window.addEventListener("resize", syncCameraBounds);

    return () => {
      window.removeEventListener("resize", syncCameraBounds);
    };
  }, [boundOffsetToViewport]);

  const releaseMapDrag = useCallback(
    (target?: HTMLElement, pointerId?: number) => {
      dragState.current.active = false;
      dragState.current.moved = false;

      if (
        target &&
        pointerId !== undefined &&
        target.hasPointerCapture(pointerId)
      ) {
        target.releasePointerCapture(pointerId);
      }
    },
    [],
  );

  if (factoryVisit.sections.length === 0) {
    return (
      <div className="grid h-full place-items-center rounded-lg border border-dashed border-white/15 bg-background/55 p-8 text-center">
        <div>
          <Factory className="mx-auto size-10 text-muted-foreground" />
          <h3 className="mt-3 font-semibold text-white">
            Kurulu üretim hattı bulunmuyor
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Bu fabrikanın vitrininde henüz gösterilecek bir hat yok.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-full min-h-[26rem] overflow-hidden rounded-lg border border-white/10 bg-[#2a312f]">
      <section
        aria-label={`${factoryVisit.factory.name} salt okunur fabrika haritası`}
        className="factory-map-viewport"
        onPointerCancel={(event) => {
          releaseMapDrag(event.currentTarget, event.pointerId);
        }}
        onPointerDown={(event) => {
          if (
            event.button !== 0 ||
            event.target instanceof Element &&
              event.target.closest("[data-visitor-map-control]")
          ) {
            return;
          }

          const viewportRect = event.currentTarget.getBoundingClientRect();
          const boundedOffset = boundOffsetToViewport(mapPan, viewportRect);

          setMapPan(boundedOffset);
          dragState.current = {
            active: true,
            moved: false,
            originX: boundedOffset.x,
            originY: boundedOffset.y,
            startX: event.clientX,
            startY: event.clientY,
          };
        }}
        onPointerMove={(event) => {
          if (!dragState.current.active) return;

          const deltaX = event.clientX - dragState.current.startX;
          const deltaY = event.clientY - dragState.current.startY;

          if (
            !dragState.current.moved &&
            Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD
          ) {
            return;
          }

          if (!dragState.current.moved) {
            event.currentTarget.setPointerCapture(event.pointerId);
          }

          dragState.current.moved = true;
          const viewportRect = event.currentTarget.getBoundingClientRect();
          setMapPan(
            boundOffsetToViewport(
              {
                x: dragState.current.originX + deltaX,
                y: dragState.current.originY + deltaY,
              },
              viewportRect,
            ),
          );
        }}
        onPointerUp={(event) => {
          releaseMapDrag(event.currentTarget, event.pointerId);
        }}
        ref={viewportRef}
      >
        <div
          className="factory-map-canvas"
          style={{
            height: CANVAS_HEIGHT,
            transform: `translate3d(${mapPan.x}px, ${mapPan.y}px, 0) scale(${scale})`,
            width: canvasWidth,
          }}
        >
          <div className="factory-map-landscape" />
          <div
            className="factory-production-layout"
            style={{
              left: CANVAS_PADDING_X,
              minHeight: 690,
              top: 92,
            }}
          >
            {factoryVisit.sections.map((section, index) => (
              <div className="factory-production-stage" key={section.id}>
                <VisitorFactorySection section={section} />
                {index < factoryVisit.sections.length - 1 ? (
                  <div
                    className={`factory-stage-connector ${section.tone}`}
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <div
        className="pointer-events-auto absolute bottom-3 right-3 z-30 flex items-center gap-1 rounded-lg border border-white/10 bg-background/85 p-1 shadow-xl backdrop-blur"
        data-visitor-map-control="true"
      >
        <Button
          aria-label="Haritayı uzaklaştır"
          disabled={mapZoom <= 0.72}
          onClick={() =>
            setMapZoom((current) =>
              Math.max(0.72, Number((current - 0.12).toFixed(2))),
            )
          }
          onPointerDown={(event) => event.stopPropagation()}
          size="icon-sm"
          title="Uzaklaştır"
          type="button"
          variant="ghost"
        >
          <ZoomOut size={15} />
        </Button>
        <span className="min-w-12 text-center font-mono text-[11px] text-muted-foreground">
          %{Math.round(mapZoom * 100)}
        </span>
        <Button
          aria-label="Haritayı yakınlaştır"
          disabled={mapZoom >= 1.32}
          onClick={() =>
            setMapZoom((current) =>
              Math.min(1.32, Number((current + 0.12).toFixed(2))),
            )
          }
          onPointerDown={(event) => event.stopPropagation()}
          size="icon-sm"
          title="Yakınlaştır"
          type="button"
          variant="ghost"
        >
          <ZoomIn size={15} />
        </Button>
        <Button
          aria-label="Harita görünümünü sıfırla"
          onClick={() => {
            setMapPan({ x: 0, y: 0 });
            setMapZoom(1);
          }}
          onPointerDown={(event) => event.stopPropagation()}
          size="icon-sm"
          title="Görünümü sıfırla"
          type="button"
          variant="ghost"
        >
          <RotateCcw size={14} />
        </Button>
      </div>

      <div className="pointer-events-none absolute bottom-3 left-3 z-30 rounded-md border border-white/10 bg-background/75 px-2.5 py-1.5 text-[10px] font-medium text-muted-foreground backdrop-blur">
        Salt okunur fabrika vitrini · Sürükleyerek gez
      </div>
    </div>
  );
}

function VisitorFactorySection({
  section,
}: {
  section: FactoryVisitSection;
}) {
  return (
    <section
      className={cn("factory-department-block", section.tone)}
      style={{
        width: getSectionWidth(section.lines.length),
      }}
    >
      <div className="relative flex min-h-12 items-start justify-center px-3 pb-1.5 pt-3">
        <div className="relative inline-flex max-w-[calc(100%-1.25rem)] items-center gap-2 rounded-full border border-white/10 bg-[#232429]/45 px-3 py-1.5 text-white/85 shadow-lg backdrop-blur-md">
          <Factory className="size-4 shrink-0 text-sky-300/80" />
          <h3 className="min-w-0 truncate text-[12px] font-semibold uppercase leading-none tracking-[0.16em] text-white/85">
            {section.title}
          </h3>
          <span className="shrink-0 rounded-full border border-[#006d8f]/25 bg-[#006d8f]/10 px-2 py-0.5 text-[11px] font-semibold leading-none text-sky-200/90">
            {section.lines.length} hat
          </span>
        </div>
      </div>

      <div className="factory-slot-grid">
        {section.lines.map((line) => (
          <VisitorProductionLineCard key={line.id} line={line} />
        ))}
      </div>
    </section>
  );
}

function VisitorProductionLineCard({
  line,
}: {
  line: FactoryVisitLine;
}) {
  const grade = gradeMeta[line.grade];

  return (
    <article
      aria-label={`${line.title}, ${grade.label}`}
      className="factory-slot-card active cursor-default"
      title={`${line.title} · ${grade.label}`}
    >
      <div className="factory-slot-visual">
        {line.imageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className="factory-machine-image"
            draggable={false}
            fill
            sizes={`${SLOT_WIDTH}px`}
            src={line.imageUrl}
          />
        ) : (
          <Factory size={30} />
        )}
      </div>

      <div className="factory-slot-status active">
        <b />
        Kurulu
      </div>

      <div className="factory-slot-code">
        <strong>{line.code}</strong>
        <span>{line.title}</span>
      </div>

      <span
        aria-label={`${grade.label} teknoloji`}
        className={`production-grade-badge xs ${line.grade.toLowerCase()} factory-slot-grade-badge`}
        title={`${grade.label} teknoloji`}
      >
        <svg aria-hidden="true" focusable="false" viewBox="0 0 64 64">
          <path
            className="grade-badge-shadow"
            d="M32 5.5 55 18.8v26.4L32 58.5 9 45.2V18.8L32 5.5Z"
          />
          <path
            className="grade-badge-outer"
            d="M32 7.5 53.2 19.7v24.6L32 56.5 10.8 44.3V19.7L32 7.5Z"
          />
          <path
            className="grade-badge-inner"
            d="M32 13.2 47.9 22.3v19.4L32 50.8 16.1 41.7V22.3L32 13.2Z"
          />
          <path
            className="grade-badge-glint"
            d="M19.3 23.8 32 16.5l12.9 7.4"
          />
          <text
            className="grade-badge-letter"
            dominantBaseline="central"
            textAnchor="middle"
            x="32"
            y="34"
          >
            {grade.glyph}
          </text>
        </svg>
      </span>
    </article>
  );
}

function getSectionWidth(lineCount: number) {
  const columns = Math.max(1, Math.ceil(lineCount / SLOT_ROWS));

  return Math.max(
    SECTION_MIN_WIDTH,
    SECTION_PADDING_X * 2 +
      columns * SLOT_WIDTH +
      Math.max(0, columns - 1) * SLOT_GAP,
  );
}

function getCanvasWidth(sections: FactoryVisitSection[]) {
  const sectionsWidth = sections.reduce(
    (total, section) => total + getSectionWidth(section.lines.length),
    0,
  );
  const gaps = Math.max(0, sections.length - 1) * SECTION_GAP;

  return Math.max(1_800, CANVAS_PADDING_X * 2 + sectionsWidth + gaps);
}

function getBoundedAxisOffset(
  contentSize: number,
  viewportSize: number,
  proposedOffset: number,
) {
  if (contentSize <= viewportSize) {
    return Math.round((viewportSize - contentSize) / 2);
  }

  return Math.min(0, Math.max(viewportSize - contentSize, proposedOffset));
}
