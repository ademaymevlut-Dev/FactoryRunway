"use client";

import Image from "next/image";
import {
  Droplets,
  Factory,
  Layers,
  PackageCheck,
  Palette,
  Plus,
  Scissors,
  Shirt,
  Sparkles,
  Truck,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef } from "react";

import { useGameUiStore } from "../store/game-ui-store";
import type { FactoryMapItem, FactoryMapSection, GameSnapshot } from "../types";

const SLOT_ROWS = 3;
const SLOT_WIDTH = 147;
const SLOT_GAP = 7;
const DEPARTMENT_PADDING_X = 14;
const DEPARTMENT_MIN_WIDTH = 328;
const DEPARTMENT_GAP = 56;
const CANVAS_PADDING_X = 96;
const CANVAS_HEIGHT = 1120;
const MAP_SCALE = 0.82;
const DRAG_THRESHOLD = 6;

type CameraOffset = {
  x: number;
  y: number;
};

type VisualSlotStatus = "active" | "busy" | "idle" | "risk" | "locked";

type FloorProp = {
  id: string;
  kind: "crates" | "forklift" | "loading-bay" | "pallet" | "rail";
  x: number;
  y: number;
  width: number;
  height: number;
  rotate?: number;
};

const slotStatusMeta: Record<VisualSlotStatus, { label: string }> = {
  active: { label: "Aktif" },
  busy: { label: "Dolu" },
  idle: { label: "Boş" },
  locked: { label: "Kilitli" },
  risk: { label: "Riskli" },
};

const productionGradeMeta = {
  INDUSTRIAL: {
    glyph: "I",
    label: "Industrial Grade",
    readyLabel: "Premium Uygun",
    trLabel: "Endüstriyel",
  },
  PRECISION: {
    glyph: "P",
    label: "Precision Grade",
    readyLabel: "Luxury Uygun",
    trLabel: "Hassas",
  },
  SMART: {
    glyph: "S",
    label: "Smart Grade",
    readyLabel: "Verimlilik Bonusu",
    trLabel: "Akıllı",
  },
  WORKSHOP: {
    glyph: "W",
    label: "Workshop Grade",
    readyLabel: "Basic Uygun",
    trLabel: "Atölye",
  },
} satisfies Record<
  Extract<FactoryMapItem, { kind: "productionLine" }>["grade"],
  {
    glyph: string;
    label: string;
    readyLabel: string;
    trLabel: string;
  }
>;

const floorProps: FloorProp[] = [
  { id: "crates-a", kind: "crates", x: 120, y: 950, width: 250, height: 72, rotate: -4 },
  { id: "forklift-a", kind: "forklift", x: 760, y: 176, width: 190, height: 94, rotate: -7 },
  { id: "pallet-a", kind: "pallet", x: 1220, y: 982, width: 220, height: 82, rotate: 3 },
  { id: "rail-a", kind: "rail", x: 1880, y: 1000, width: 520, height: 58, rotate: -1 },
  { id: "crates-b", kind: "crates", x: 2920, y: 176, width: 260, height: 78, rotate: 5 },
  { id: "loading-bay-a", kind: "loading-bay", x: 3450, y: 600, width: 220, height: 360 },
];

export function FactoryMap({ snapshot }: { snapshot: GameSnapshot }) {
  const {
    mapPan,
    mapZoom,
    openPanel,
    selectLine,
    selectedLineId,
    setHoveredDepartmentId,
    setMapPan,
  } = useGameUiStore();
  const viewportRef = useRef<HTMLElement | null>(null);
  const suppressClickRef = useRef(false);
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
    () => getCanvasWidth(snapshot.map.sections),
    [snapshot.map.sections],
  );

  const boundOffsetToViewport = useCallback(
    (nextOffset: CameraOffset, viewportRect?: DOMRect) => {
      const rect = viewportRect ?? viewportRef.current?.getBoundingClientRect();
      if (!rect) return nextOffset;

      return getBoundedMapOffset(nextOffset, canvasWidth, rect.width, rect.height, scale);
    },
    [canvasWidth, scale],
  );

  useEffect(() => {
    const syncCameraBounds = () => {
      const boundedOffset = boundOffsetToViewport(mapPan);

      if (boundedOffset.x !== mapPan.x || boundedOffset.y !== mapPan.y) {
        setMapPan(boundedOffset);
      }
    };

    syncCameraBounds();
    window.addEventListener("resize", syncCameraBounds);

    return () => {
      window.removeEventListener("resize", syncCameraBounds);
    };
  }, [boundOffsetToViewport, mapPan, setMapPan]);

  const releaseMapDrag = useCallback((target?: HTMLElement, pointerId?: number) => {
    const hadMoved = dragState.current.moved;

    dragState.current.active = false;
    dragState.current.moved = false;

    if (target && pointerId !== undefined && target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }

    if (hadMoved) {
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
  }, []);

  const openLineDetail = (lineId: string) => {
    if (suppressClickRef.current) return;

    selectLine(lineId);
    openPanel("lineDetail", { lineId });
  };

  return (
    <section
      aria-label="Fabrika haritası"
      className="factory-map-viewport"
      onPointerCancel={(event) => {
        releaseMapDrag(event.currentTarget, event.pointerId);
      }}
      onPointerDown={(event) => {
        if (event.button !== 0) return;

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

        if (!dragState.current.moved && Math.hypot(deltaX, deltaY) < DRAG_THRESHOLD) {
          return;
        }

        if (!dragState.current.moved) {
          event.currentTarget.setPointerCapture(event.pointerId);
        }

        dragState.current.moved = true;
        suppressClickRef.current = true;

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
        <FactoryFloorDetails />
        <div className="factory-production-layout">
          {snapshot.map.sections.map((section, index) => (
            <div className="factory-production-stage" key={section.id}>
              <FactoryMapSectionView
                onAction={(item) => {
                  if (item.kind === "productionLine") {
                    openLineDetail(item.lineId);
                    return;
                  }

                  if (item.kind === "investmentAction") {
                    selectLine(null);
                    openPanel("investment", { sectionId: item.sectionId });
                  }
                }}
                onHoverDepartment={setHoveredDepartmentId}
                section={section}
                selectedLineId={selectedLineId}
              />
              {index < snapshot.map.sections.length - 1 ? (
                <div className={`factory-stage-connector ${section.tone}`} />
              ) : null}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FactoryFloorDetails() {
  return (
    <div aria-hidden="true" className="factory-floor-details">
      {floorProps.map((prop) => (
        <div
          className={`factory-floor-prop ${prop.kind}`}
          key={prop.id}
          style={{
            height: prop.height,
            left: prop.x,
            top: prop.y,
            transform: `rotate(${prop.rotate ?? 0}deg)`,
            width: prop.width,
          }}
        />
      ))}
    </div>
  );
}

function FactoryMapSectionView({
  onAction,
  onHoverDepartment,
  section,
  selectedLineId,
}: {
  onAction: (item: FactoryMapItem) => void;
  onHoverDepartment: (departmentId: string | null) => void;
  section: FactoryMapSection;
  selectedLineId: string | null;
}) {
  const columns = getSlotColumns(section.items.length);
  const metaLabel = section.departments
    .map((department) => department.name)
    .slice(0, 2)
    .join(" / ");

  return (
    <section
      className={`factory-department-block ${section.tone}`}
      style={{ width: getDepartmentWidth(section.items.length) }}
    >
      <div className="factory-department-header">
        <div className="factory-department-title">
          <span>{section.step}</span>
          <SectionIconView section={section} size={22} />
          <div>
            <h2>{section.title}</h2>
            <p>{columns} kolon / {SLOT_ROWS} sıra</p>
          </div>
        </div>
        <div className="factory-department-metrics">
          <strong>{section.productionLineCount}</strong>
          <span>hat</span>
        </div>
      </div>

      <div className="factory-department-meta">
        <span>{metaLabel}</span>
        <span>Kurulu üretim hattı</span>
      </div>

      <div className="factory-slot-grid">
        {section.items.map((item) => (
          <FactoryMapItemCard
            isSelected={item.kind === "productionLine" && item.lineId === selectedLineId}
            item={item}
            key={item.id}
            onAction={onAction}
            onHoverDepartment={onHoverDepartment}
            section={section}
          />
        ))}
      </div>
    </section>
  );
}

function FactoryMapItemCard({
  isSelected,
  item,
  onAction,
  onHoverDepartment,
  section,
}: {
  isSelected: boolean;
  item: FactoryMapItem;
  onAction: (item: FactoryMapItem) => void;
  onHoverDepartment: (departmentId: string | null) => void;
  section: FactoryMapSection;
}) {
  if (item.kind === "productionLine") {
    return (
      <ProductionLineCard
        isSelected={isSelected}
        item={item}
        onAction={onAction}
        onHoverDepartment={onHoverDepartment}
      />
    );
  }

  if (item.kind === "investmentAction") {
    return <InvestmentButtonCard item={item} onAction={onAction} section={section} />;
  }

  return null;
}

function ProductionLineCard({
  isSelected,
  item,
  onAction,
  onHoverDepartment,
}: {
  isSelected: boolean;
  item: Extract<FactoryMapItem, { kind: "productionLine" }>;
  onAction: (item: FactoryMapItem) => void;
  onHoverDepartment: (departmentId: string | null) => void;
}) {
  const visualStatus = getVisualSlotStatus(item.status);
  const status = slotStatusMeta[visualStatus];

  return (
    <button
      aria-label={`${item.title} detay`}
      className={`factory-slot-card ${visualStatus} ${isSelected ? "is-selected" : ""}`}
      onClick={() => onAction(item)}
      onMouseEnter={() => onHoverDepartment(item.departmentId)}
      onMouseLeave={() => onHoverDepartment(null)}
      type="button"
    >
      <div className="factory-slot-visual">
        {item.imageUrl ? (
          <Image
            alt=""
            aria-hidden="true"
            className="factory-machine-image"
            draggable={false}
            fill
            sizes={`${SLOT_WIDTH}px`}
            src={item.imageUrl}
          />
        ) : (
          <Factory size={30} />
        )}
      </div>

      <div className={`factory-slot-status ${visualStatus}`}>
        <b />
        {status.label}
      </div>

      <div className="factory-slot-code">
        <strong>{item.code}</strong>
        <span>{getMachineLabel(item.departmentKey)}</span>
      </div>
      <ProductionGradeBadge className="factory-slot-grade-badge" grade={item.grade} size="xs" />
    </button>
  );
}

function InvestmentButtonCard({
  item,
  onAction,
  section,
}: {
  item: Extract<FactoryMapItem, { kind: "investmentAction" }>;
  onAction: (item: FactoryMapItem) => void;
  section: FactoryMapSection;
}) {
  return (
    <button
      className="factory-slot-card factory-slot-add"
      onClick={() => onAction(item)}
      onPointerDown={(event) => event.stopPropagation()}
      type="button"
    >
      <Plus size={22} />
      <strong>Yatırım Yap</strong>
      <span>{getInvestmentLabel(section)}</span>
    </button>
  );
}

function ProductionGradeBadge({
  className = "",
  grade,
  size = "sm",
}: {
  className?: string;
  grade: Extract<FactoryMapItem, { kind: "productionLine" }>["grade"];
  size?: "xs" | "sm";
}) {
  const meta = productionGradeMeta[grade];

  return (
    <span
      aria-label={`${meta.label}: ${meta.readyLabel}`}
      className={`production-grade-badge ${size} ${grade.toLowerCase()} ${className}`.trim()}
      title={`${meta.trLabel} Standardı · ${meta.readyLabel}`}
    >
      <svg aria-hidden="true" focusable="false" viewBox="0 0 64 64">
        <path className="grade-badge-shadow" d="M32 5.5 55 18.8v26.4L32 58.5 9 45.2V18.8L32 5.5Z" />
        <path className="grade-badge-outer" d="M32 7.5 53.2 19.7v24.6L32 56.5 10.8 44.3V19.7L32 7.5Z" />
        <path className="grade-badge-inner" d="M32 13.2 47.9 22.3v19.4L32 50.8 16.1 41.7V22.3L32 13.2Z" />
        <path className="grade-badge-glint" d="M19.3 23.8 32 16.5l12.9 7.4" />
        <text className="grade-badge-letter" dominantBaseline="central" textAnchor="middle" x="32" y="34">
          {meta.glyph}
        </text>
      </svg>
    </span>
  );
}

function getSlotColumns(itemCount: number) {
  return Math.max(1, Math.ceil(itemCount / SLOT_ROWS));
}

function getDepartmentWidth(itemCount: number) {
  const columns = getSlotColumns(itemCount);

  return Math.max(
    DEPARTMENT_MIN_WIDTH,
    DEPARTMENT_PADDING_X * 2 + columns * SLOT_WIDTH + Math.max(0, columns - 1) * SLOT_GAP,
  );
}

function getCanvasWidth(sections: FactoryMapSection[]) {
  const departmentWidth = sections.reduce(
    (total, section) => total + getDepartmentWidth(section.items.length),
    0,
  );
  const gaps = Math.max(0, sections.length - 1) * DEPARTMENT_GAP;

  return Math.max(2400, CANVAS_PADDING_X * 2 + departmentWidth + gaps);
}

function getBoundedMapOffset(
  proposedOffset: CameraOffset,
  canvasWidth: number,
  viewportWidth: number,
  viewportHeight: number,
  scale: number,
) {
  return {
    x: getBoundedAxisOffset(canvasWidth * scale, viewportWidth, proposedOffset.x),
    y: getBoundedAxisOffset(CANVAS_HEIGHT * scale, viewportHeight, proposedOffset.y),
  };
}

function getBoundedAxisOffset(contentSize: number, viewportSize: number, proposedOffset: number) {
  if (contentSize <= viewportSize) {
    return Math.round((viewportSize - contentSize) / 2);
  }

  return clamp(proposedOffset, viewportSize - contentSize, 0);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function SectionIconView({
  section,
  size,
}: {
  section: FactoryMapSection;
  size: number;
}) {
  switch (section.key) {
    case "cutting":
      return <Scissors size={size} />;
    case "fabric":
      return <Layers size={size} />;
    case "ironing_packing":
    case "packing":
      return <PackageCheck size={size} />;
    case "post_sewing":
      return <Droplets size={size} />;
    case "pre_sewing":
      return <Sparkles size={size} />;
    case "sewing":
      return <Shirt size={size} />;
    case "shipping":
      return <Truck size={size} />;
    default:
      return <DepartmentIconView departmentKey={section.departments[0]?.key ?? ""} size={size} />;
  }
}

function DepartmentIconView({
  departmentKey,
  size,
}: {
  departmentKey: string;
  size: number;
}) {
  switch (departmentKey) {
    case "cutting":
      return <Scissors size={size} />;
    case "dyeing":
      return <Palette size={size} />;
    case "embroidery":
      return <Sparkles size={size} />;
    case "ironing_packing":
      return <PackageCheck size={size} />;
    case "printing":
      return <Palette size={size} />;
    case "sewing":
      return <Shirt size={size} />;
    case "shipping":
      return <Truck size={size} />;
    case "washing":
      return <Droplets size={size} />;
    default:
      return <Factory size={size} />;
  }
}

function getVisualSlotStatus(
  status: Extract<FactoryMapItem, { kind: "productionLine" }>["status"],
): VisualSlotStatus {
  switch (status) {
    case "BLOCKED":
    case "BROKEN":
      return "risk";
    case "DISABLED":
      return "locked";
    case "MAINTENANCE":
      return "busy";
    case "RUNNING":
      return "busy";
    case "IDLE":
    case "SOLD":
    default:
      return "active";
  }
}

function getMachineLabel(departmentKey: string) {
  const labels: Record<string, string> = {
    cutting: "Cutting",
    dyeing: "Dye",
    embroidery: "Embroidery",
    ironing_packing: "Iron",
    printing: "Print",
    sewing: "Sewing",
    shipping: "Shipping",
    washing: "Wash",
  };

  return labels[departmentKey] ?? departmentKey;
}

function getInvestmentLabel(section: FactoryMapSection) {
  const firstDepartmentKey = section.departments[0]?.key;

  return firstDepartmentKey ? getMachineLabel(firstDepartmentKey) : "Yeni Hat";
}
