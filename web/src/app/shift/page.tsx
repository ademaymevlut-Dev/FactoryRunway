"use client";

import Image from "next/image";
import Link from "next/link";
import {
  AlertTriangle,
  Bell,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  Factory,
  Hammer,
  Hash,
  Droplets,
  Layers,
  LockKeyhole,
  MessageSquare,
  PackageCheck,
  Palette,
  Plus,
  Scissors,
  Shirt,
  Sparkles,
  Star,
  Tag,
  TrendingUp,
  Truck,
  Users,
  Wallet,
  Warehouse,
  X,
  Zap,
  type LucideIcon,
} from "lucide-react";
import { type CSSProperties, useCallback, useEffect, useMemo, useRef, useState } from "react";

type DockPanel = "orders" | "tasks" | "warnings" | "actions" | "bottom" | null;

type SlotStatus = "active" | "busy" | "idle" | "risk" | "locked";

type ProductionGrade = "WORKSHOP" | "INDUSTRIAL" | "PRECISION" | "SMART";

type MachineKey =
  | "fabric"
  | "warehouse"
  | "cutting"
  | "embroidery"
  | "print"
  | "sewing"
  | "dyeing"
  | "washing"
  | "iron"
  | "shipping";

type FactorySlot = {
  id: string;
  name: string;
  code: string;
  status: SlotStatus;
  level: number;
  machineKey: MachineKey;
  staff: string;
  dailyOutput: string;
  progress: number;
};

type DepartmentBlock = {
  id: string;
  step: string;
  title: string;
  icon: LucideIcon;
  tone: "blue" | "cyan" | "amber" | "red" | "violet" | "green";
  machineOptions: MachineKey[];
  defaultMachineKey: MachineKey;
  slotPrefix: string;
  slotLabel: string;
  queue: string;
  capacity: string;
  slots: FactorySlot[];
};

type AddSlotDraft = {
  departmentId: string;
  machineKey: MachineKey;
  level: number;
};

type FloorProp = {
  id: string;
  kind: "crates" | "forklift" | "loading-bay" | "pallet" | "rail";
  x: number;
  y: number;
  width: number;
  height: number;
  rotate?: number;
};

type CameraOffset = {
  x: number;
  y: number;
};

type SelectedSlotRef = {
  departmentId: string;
  slotId: string;
};

type IncomingOrder = {
  id: string;
  productName: string;
  productImage: string;
  code: string;
  collection: string;
  theme: string;
  qty: string;
  due: string;
  requestedDate: string;
  price: string;
  unitPrice: string;
  level: string;
  customer: string;
  route: string;
  status: string;
  initial: string;
  cardCopy: string[];
  colors: {
    primary: string;
    secondary: string;
    gradientFrom: string;
    gradientTo: string;
    foreground: string;
  };
};

const SLOT_ROWS = 3;
const SLOT_WIDTH = 147;
const SLOT_GAP = 7;
const DEPARTMENT_PADDING_X = 14;
const DEPARTMENT_MIN_WIDTH = 328;
const DEPARTMENT_GAP = 56;
const CANVAS_PADDING_X = 96;
const MAP_HEIGHT = 1120;
const MAP_SCALE = 0.82;
const DRAG_THRESHOLD = 6;

const kpis = [
  { label: "Nakit", value: "₺ 12.458.750", sub: "+125.430 / gün", icon: Wallet, tone: "green" },
  { label: "Gün / Saat", value: "23. Gün", sub: "10:42", icon: Clock3, tone: "amber" },
  { label: "Aktif Sipariş", value: "18", sub: "Devam ediyor", icon: ClipboardList, tone: "cyan" },
  { label: "Geciken", value: "2", sub: "Risk altında", icon: AlertTriangle, tone: "red" },
  { label: "Günlük Üretim", value: "24.680", sub: "Hedef: 30.000", icon: Boxes, tone: "violet" },
  { label: "Verimlilik", value: "%87", sub: "+%6", icon: TrendingUp, tone: "green" },
  { label: "Reputasyon", value: "4.6", sub: "Mükemmel", icon: Star, tone: "amber" },
  { label: "Uyarılar", value: "7", sub: "Dikkat gerekiyor", icon: Bell, tone: "red" },
];

const statusCycle: SlotStatus[] = ["active", "busy", "active", "idle", "busy", "risk"];

const productionGradeOrder: ProductionGrade[] = ["WORKSHOP", "INDUSTRIAL", "PRECISION", "SMART"];

const productionGradeByLevel: Record<number, ProductionGrade> = {
  1: "WORKSHOP",
  2: "INDUSTRIAL",
  3: "PRECISION",
  4: "SMART",
};

const productionGradeMeta: Record<
  ProductionGrade,
  {
    label: string;
    shortLabel: string;
    trLabel: string;
    readyLabel: string;
    description: string;
    glyph: string;
  }
> = {
  WORKSHOP: {
    label: "Workshop Grade",
    shortLabel: "Workshop",
    trLabel: "Atölye",
    readyLabel: "Basic Uygun",
    description: "Temel üretim hattı",
    glyph: "W",
  },
  INDUSTRIAL: {
    label: "Industrial Grade",
    shortLabel: "Industrial",
    trLabel: "Endüstriyel",
    readyLabel: "Premium Uygun",
    description: "Endüstriyel üretime geçiş",
    glyph: "I",
  },
  PRECISION: {
    label: "Precision Grade",
    shortLabel: "Precision",
    trLabel: "Hassas",
    readyLabel: "Luxury Uygun",
    description: "Luxury üretime uygun",
    glyph: "P",
  },
  SMART: {
    label: "Smart Grade",
    shortLabel: "Smart",
    trLabel: "Akıllı",
    readyLabel: "Verimlilik Bonusu",
    description: "Maksimum operasyon standardı",
    glyph: "S",
  },
};

const slotStatusMeta: Record<SlotStatus, { label: string }> = {
  active: { label: "Aktif" },
  busy: { label: "Dolu" },
  idle: { label: "Boş" },
  risk: { label: "Riskli" },
  locked: { label: "Kilitli" },
};

const machineCatalog: Record<MachineKey, { label: string; shortLabel: string; files: Record<number, string> }> = {
  fabric: {
    label: "Fabric Production",
    shortLabel: "Fabric",
    files: {
      1: "/factory-machines/fabric_Level1.png",
      2: "/factory-machines/fabric_Level2.png",
      3: "/factory-machines/fabric_Level3.png",
      4: "/factory-machines/fabric_Level4.png",
    },
  },
  warehouse: {
    label: "Warehouse",
    shortLabel: "Warehouse",
    files: {
      1: "/factory-machines/warehouse_level1.png",
      2: "/factory-machines/warehouse_level2.png",
      3: "/factory-machines/warehouse_level3.png",
      4: "/factory-machines/warehouse_level4.png",
    },
  },
  cutting: {
    label: "Cutting",
    shortLabel: "Cutting",
    files: {
      1: "/factory-machines/cutting_level1.png",
      2: "/factory-machines/cutting_level2.png",
      3: "/factory-machines/cutting_level3.png",
      4: "/factory-machines/cutting_level4.png",
    },
  },
  embroidery: {
    label: "Embroidery",
    shortLabel: "Embroidery",
    files: {
      1: "/factory-machines/Embrodery_Level1.png",
    },
  },
  print: {
    label: "Printing",
    shortLabel: "Print",
    files: {
      1: "/factory-machines/Print_level1.png",
    },
  },
  sewing: {
    label: "Sewing",
    shortLabel: "Sewing",
    files: {
      1: "/factory-machines/Sewing_workshop.png",
      2: "/factory-machines/Sewing_Industrial.png",
      3: "/factory-machines/Sewing_precision.png",
      4: "/factory-machines/Sewing_smart.png",
    },
  },
  dyeing: {
    label: "Dyeing",
    shortLabel: "Dye",
    files: {
      1: "/factory-machines/dying_level1.png",
    },
  },
  washing: {
    label: "Washing",
    shortLabel: "Wash",
    files: {
      1: "/factory-machines/Washing_level1.png",
    },
  },
  iron: {
    label: "Iron & Packing",
    shortLabel: "Iron",
    files: {
      1: "/factory-machines/Iron_level1.png",
      2: "/factory-machines/Iron_level2.png",
      3: "/factory-machines/Iron_level3.png",
      4: "/factory-machines/Iron_level4.png",
    },
  },
  shipping: {
    label: "Shipping",
    shortLabel: "Shipping",
    files: {
      1: "/factory-machines/Shipment_level1.png",
      2: "/factory-machines/Shipment_level2.png",
      3: "/factory-machines/Shipment_level3.png",
      4: "/factory-machines/Shipment_level4.png",
    },
  },
};

const initialDepartments: DepartmentBlock[] = [
  {
    id: "fabric",
    step: "01",
    title: "Fabric Production",
    icon: Layers,
    tone: "cyan",
    machineOptions: ["fabric"],
    defaultMachineKey: "fabric",
    slotPrefix: "FAB",
    slotLabel: "Fabric Line",
    queue: "24 top kumaş planlandı",
    capacity: "2 hat kurulu",
    slots: createSlots("FAB", "Fabric Line", 2, ["fabric"]),
  },
  {
    id: "warehouse",
    step: "02",
    title: "Warehouse",
    icon: Warehouse,
    tone: "blue",
    machineOptions: ["warehouse"],
    defaultMachineKey: "warehouse",
    slotPrefix: "WH",
    slotLabel: "Warehouse Line",
    queue: "32 rulo hazır",
    capacity: "2 hat kurulu",
    slots: createSlots("WH", "Warehouse Line", 2, ["warehouse"]),
  },
  {
    id: "cutting",
    step: "03",
    title: "Cutting",
    icon: Scissors,
    tone: "amber",
    machineOptions: ["cutting"],
    defaultMachineKey: "cutting",
    slotPrefix: "CUT",
    slotLabel: "Cutting Line",
    queue: "4.2 gün kuyruk",
    capacity: "2 hat kurulu",
    slots: createSlots("CUT", "Cutting Line", 2, ["cutting"]),
  },
  {
    id: "pre-sewing",
    step: "04",
    title: "Pre-Sewing",
    icon: Sparkles,
    tone: "violet",
    machineOptions: ["embroidery", "print"],
    defaultMachineKey: "embroidery",
    slotPrefix: "PRS",
    slotLabel: "Pre-Sewing Line",
    queue: "Nakış / baskı bekleyen işler",
    capacity: "2 hat kurulu",
    slots: createSlots("PRS", "Pre-Sewing Line", 2, ["embroidery", "print"]),
  },
  {
    id: "sewing",
    step: "05",
    title: "Sewing",
    icon: Shirt,
    tone: "red",
    machineOptions: ["sewing"],
    defaultMachineKey: "sewing",
    slotPrefix: "SEW",
    slotLabel: "Sewing Line",
    queue: "1.1 gün kuyruk",
    capacity: "2 hat kurulu",
    slots: createSlots("SEW", "Sewing Line", 2, ["sewing"]),
  },
  {
    id: "post-sewing",
    step: "06",
    title: "Post-Sewing",
    icon: Droplets,
    tone: "green",
    machineOptions: ["dyeing", "washing"],
    defaultMachineKey: "dyeing",
    slotPrefix: "PST",
    slotLabel: "Post-Sewing Line",
    queue: "Boya / yıkama reçeteleri",
    capacity: "2 hat kurulu",
    slots: createSlots("PST", "Post-Sewing Line", 2, ["dyeing", "washing"]),
  },
  {
    id: "packing",
    step: "07",
    title: "Iron & Packing",
    icon: PackageCheck,
    tone: "violet",
    machineOptions: ["iron"],
    defaultMachineKey: "iron",
    slotPrefix: "IRN",
    slotLabel: "Iron Line",
    queue: "8.0 gün kuyruk",
    capacity: "2 hat kurulu",
    slots: createSlots("IRN", "Iron Line", 2, ["iron"]),
  },
  {
    id: "shipping",
    step: "08",
    title: "Shipping",
    icon: Truck,
    tone: "green",
    machineOptions: ["shipping"],
    defaultMachineKey: "shipping",
    slotPrefix: "SHP",
    slotLabel: "Shipping Line",
    queue: "12.640 hazır",
    capacity: "2 hat kurulu",
    slots: createSlots("SHP", "Shipping Line", 2, ["shipping"]),
  },
];

const floorProps: FloorProp[] = [
  { id: "crates-a", kind: "crates", x: 120, y: 950, width: 250, height: 72, rotate: -4 },
  { id: "forklift-a", kind: "forklift", x: 760, y: 176, width: 190, height: 94, rotate: -7 },
  { id: "pallet-a", kind: "pallet", x: 1220, y: 982, width: 220, height: 82, rotate: 3 },
  { id: "rail-a", kind: "rail", x: 1880, y: 1000, width: 520, height: 58, rotate: -1 },
  { id: "crates-b", kind: "crates", x: 2920, y: 176, width: 260, height: 78, rotate: 5 },
  { id: "loading-bay-a", kind: "loading-bay", x: 3450, y: 600, width: 220, height: 360, rotate: 0 },
];

const incomingOrders: IncomingOrder[] = [
  {
    id: "ord-mois-urban",
    productName: "Kapüşonlu Sweatshirt",
    productImage: "/product_photos/mois_prd1.png",
    code: "A6.KDS.MGL.03",
    collection: "Kids",
    theme: "Urban Edge",
    qty: "2.000 adet",
    due: "5 gün",
    requestedDate: "Day 28",
    price: "₺ 385.000",
    unitPrice: "₺ 192,50",
    level: "Orta",
    customer: "MOIS",
    route: "Fabric -> Warehouse -> Cutting -> Printing -> Sewing -> Iron/Packing",
    status: "Teklif açık",
    initial: "M",
    cardCopy: ["Soft shapes.", "Clean tones.", "Factory ready."],
    colors: {
      primary: "#D29D00",
      secondary: "#ED719E",
      gradientFrom: "#535353",
      gradientTo: "#929292",
      foreground: "Dark",
    },
  },
  {
    id: "ord-arte-spring",
    productName: "Nakışlı Premium Hoodie",
    productImage: "/product_photos/arte_prd1.png",
    code: "A6.KDS.MGL.05",
    collection: "Kids",
    theme: "Spring Breeze",
    qty: "1.200 adet",
    due: "8 gün",
    requestedDate: "Day 31",
    price: "₺ 612.000",
    unitPrice: "₺ 510,00",
    level: "Zor",
    customer: "Arte",
    route: "Fabric -> Cutting -> Embroidery -> Sewing -> Washing -> Iron/Packing",
    status: "Risk kontrolü",
    initial: "A",
    cardCopy: ["Playful tones.", "Bright energy.", "Everyday fun."],
    colors: {
      primary: "#8FDB5D",
      secondary: "#A7A328",
      gradientFrom: "#4B8428",
      gradientTo: "#93D04A",
      foreground: "Light",
    },
  },
  {
    id: "ord-filo-winter",
    productName: "Kargo Pantolon",
    productImage: "/product_photos/filo_prd1.png",
    code: "A6.KDS.MGL.08",
    collection: "Kids",
    theme: "Winter Chic",
    qty: "1.500 adet",
    due: "6 gün",
    requestedDate: "Day 29",
    price: "₺ 310.000",
    unitPrice: "₺ 206,66",
    level: "Orta",
    customer: "Filo",
    route: "Fabric -> Cutting -> Sewing -> Dyeing -> Iron/Packing",
    status: "Plan bekliyor",
    initial: "F",
    cardCopy: ["Warm color.", "Core season.", "Fast repeat."],
    colors: {
      primary: "#F2A000",
      secondary: "#7A5128",
      gradientFrom: "#D22A00",
      gradientTo: "#D99A00",
      foreground: "Light",
    },
  },
  {
    id: "ord-rico-minimal",
    productName: "Basic T-Shirt",
    productImage: "/product_photos/rico_prd1.png",
    code: "A6.KDS.MGL.02",
    collection: "Kids",
    theme: "Soft Minimal",
    qty: "5.000 adet",
    due: "7 gün",
    requestedDate: "Day 30",
    price: "₺ 450.000",
    unitPrice: "₺ 90,00",
    level: "Kolay",
    customer: "Rico",
    route: "Fabric -> Cutting -> Sewing -> Iron/Packing",
    status: "Uygun",
    initial: "R",
    cardCopy: ["Quiet base.", "Clean offer.", "Easy flow."],
    colors: {
      primary: "#BDBDBD",
      secondary: "#967600",
      gradientFrom: "#B9B6AF",
      gradientTo: "#8F8F8B",
      foreground: "Dark",
    },
  },
];

const warnings = [
  { title: "Makine Arızası", body: "Dikiş Hattı 12", time: "10 dk önce", tone: "red" },
  { title: "Personel Devamsızlığı", body: "12 personel yok", time: "20 dk önce", tone: "amber" },
  { title: "Kalite Sorunu", body: "Kontrolde 3 bekleyen", time: "30 dk önce", tone: "amber" },
  { title: "Teslimat Riski", body: "2 sipariş yetişmeyebilir", time: "1 saat önce", tone: "red" },
  { title: "Sipariş Tamamlandı", body: "Basic T-Shirt sevk edildi", time: "3 saat önce", tone: "green" },
];

const bottomItems = [
  { label: "Fabrika", icon: Factory },
  { label: "Depo", icon: Warehouse },
  { label: "Personel", icon: Users },
  { label: "Finans", icon: Wallet },
  { label: "Upgrade", icon: Hammer },
  { label: "Rapor", icon: ClipboardList },
  { label: "Müşteriler", icon: MessageSquare },
];

function getMachineLevels(machineKey: MachineKey) {
  return Object.keys(machineCatalog[machineKey].files)
    .map(Number)
    .sort((first, second) => first - second);
}

function getMachineImage(machineKey: MachineKey, level: number) {
  const levels = getMachineLevels(machineKey);
  const fallbackLevel = levels
    .filter((candidate) => candidate <= level)
    .at(-1) ?? levels[0] ?? 1;

  return machineCatalog[machineKey].files[level] ?? machineCatalog[machineKey].files[fallbackLevel];
}

function getProductionGrade(level: number): ProductionGrade {
  return productionGradeByLevel[clamp(level, 1, 4)] ?? "WORKSHOP";
}

function getProductionGradeMeta(level: number) {
  const grade = getProductionGrade(level);

  return productionGradeMeta[grade];
}

function clampMachineLevel(machineKey: MachineKey, level: number) {
  const levels = getMachineLevels(machineKey);
  const exactLevel = levels.find((candidate) => candidate === level);

  if (exactLevel) return exactLevel;

  return levels.filter((candidate) => candidate <= level).at(-1) ?? levels[0] ?? 1;
}

function getNextMachineLevel(machineKey: MachineKey, currentLevel: number) {
  return getMachineLevels(machineKey).find((level) => level > currentLevel) ?? null;
}

function createSlot(
  prefix: string,
  label: string,
  index: number,
  status: SlotStatus,
  machineKey: MachineKey,
  level = 1,
): FactorySlot {
  const padded = String(index).padStart(2, "0");
  const progress = status === "idle" ? 24 : status === "risk" ? 62 : 74 + ((index * 7) % 22);
  const machineLevel = clampMachineLevel(machineKey, level);

  return {
    id: `${prefix.toLowerCase()}-${padded}`,
    name: `${label} ${padded}`,
    code: `${prefix}-${padded}`,
    status,
    level: machineLevel,
    machineKey,
    staff: `${Math.min(14, 6 + (index % 9))} / 14`,
    dailyOutput: `${840 + index * 42} adet`,
    progress,
  };
}

function createSlots(prefix: string, label: string, count: number, machineKeys: MachineKey[]) {
  return Array.from({ length: count }, (_, index) => {
    const next = index + 1;
    const machineKey = machineKeys[index % machineKeys.length] ?? machineKeys[0] ?? "warehouse";

    return createSlot(prefix, label, next, statusCycle[index % statusCycle.length], machineKey);
  });
}

function getSlotColumns(slotCount: number) {
  return Math.max(1, Math.ceil((slotCount + 1) / SLOT_ROWS));
}

function getDepartmentWidth(slotCount: number) {
  const columns = getSlotColumns(slotCount);
  return Math.max(
    DEPARTMENT_MIN_WIDTH,
    DEPARTMENT_PADDING_X * 2 + columns * SLOT_WIDTH + Math.max(0, columns - 1) * SLOT_GAP,
  );
}

function getCanvasWidth(departments: DepartmentBlock[]) {
  const departmentWidth = departments.reduce((sum, department) => sum + getDepartmentWidth(department.slots.length), 0);
  const gaps = Math.max(0, departments.length - 1) * DEPARTMENT_GAP;
  return Math.max(2400, CANVAS_PADDING_X * 2 + departmentWidth + gaps);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getBoundedAxisOffset(contentSize: number, viewportSize: number, proposedOffset: number) {
  if (contentSize <= viewportSize) {
    return Math.round((viewportSize - contentSize) / 2);
  }

  return clamp(proposedOffset, viewportSize - contentSize, 0);
}

function getBoundedMapOffset(
  proposedOffset: CameraOffset,
  canvasWidth: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  return {
    x: getBoundedAxisOffset(canvasWidth * MAP_SCALE, viewportWidth, proposedOffset.x),
    y: getBoundedAxisOffset(MAP_HEIGHT * MAP_SCALE, viewportHeight, proposedOffset.y),
  };
}

export default function ShiftPage() {
  const [activePanel, setActivePanel] = useState<DockPanel>(null);
  const [departments, setDepartments] = useState<DepartmentBlock[]>(initialDepartments);
  const [offset, setOffset] = useState<CameraOffset>({ x: 0, y: 0 });
  const [selectedSlotRef, setSelectedSlotRef] = useState<SelectedSlotRef | null>(null);
  const [selectedOrderId, setSelectedOrderId] = useState(incomingOrders[0]?.id ?? "");
  const [addSlotDraft, setAddSlotDraft] = useState<AddSlotDraft | null>(null);
  const viewportRef = useRef<HTMLElement | null>(null);
  const suppressSlotClickRef = useRef(false);
  const dragState = useRef({ active: false, moved: false, startX: 0, startY: 0, originX: 0, originY: 0 });

  const canvasWidth = useMemo(() => getCanvasWidth(departments), [departments]);
  const selectedSlotDetails = useMemo(() => {
    if (!selectedSlotRef) return null;

    const department = departments.find((candidate) => candidate.id === selectedSlotRef.departmentId);
    if (!department) return null;

    const slot = department.slots.find((candidate) => candidate.id === selectedSlotRef.slotId);
    if (!slot) return null;

    return { department, slot };
  }, [departments, selectedSlotRef]);
  const selectedOrder = useMemo(
    () => incomingOrders.find((order) => order.id === selectedOrderId) ?? null,
    [selectedOrderId],
  );
  const addSlotDepartment = useMemo(() => {
    if (!addSlotDraft) return null;

    return departments.find((department) => department.id === addSlotDraft.departmentId) ?? null;
  }, [addSlotDraft, departments]);

  const boundOffsetToViewport = useCallback(
    (nextOffset: CameraOffset, viewportRect?: DOMRect) => {
      const rect = viewportRect ?? viewportRef.current?.getBoundingClientRect();
      if (!rect) return nextOffset;
      return getBoundedMapOffset(nextOffset, canvasWidth, rect.width, rect.height);
    },
    [canvasWidth],
  );

  useEffect(() => {
    const syncCameraBounds = () => {
      setOffset((current) => boundOffsetToViewport(current));
    };

    syncCameraBounds();
    window.addEventListener("resize", syncCameraBounds);

    return () => {
      window.removeEventListener("resize", syncCameraBounds);
    };
  }, [boundOffsetToViewport]);

  const openPanel = (panel: DockPanel) => {
    setSelectedSlotRef(null);
    if (panel === "orders" && !selectedOrderId) {
      setSelectedOrderId(incomingOrders[0]?.id ?? "");
    }
    setActivePanel((current) => (current === panel ? null : panel));
  };

  const selectSlot = (departmentId: string, slotId: string) => {
    if (suppressSlotClickRef.current) return;

    setActivePanel(null);
    setSelectedSlotRef({ departmentId, slotId });
  };

  const selectOrder = (orderId: string) => {
    setSelectedSlotRef(null);
    setSelectedOrderId(orderId);
  };

  const releaseMapDrag = useCallback((target?: HTMLElement, pointerId?: number) => {
    const hadMoved = dragState.current.moved;

    dragState.current.active = false;
    dragState.current.moved = false;

    if (target && pointerId !== undefined && target.hasPointerCapture(pointerId)) {
      target.releasePointerCapture(pointerId);
    }

    if (hadMoved) {
      window.setTimeout(() => {
        suppressSlotClickRef.current = false;
      }, 0);
    }
  }, []);

  const openAddSlotModal = (departmentId: string) => {
    const department = departments.find((candidate) => candidate.id === departmentId);
    if (!department) return;

    setSelectedSlotRef(null);
    setActivePanel(null);
    setAddSlotDraft({
      departmentId,
      machineKey: department.defaultMachineKey,
      level: clampMachineLevel(department.defaultMachineKey, 1),
    });
  };

  const confirmAddSlot = () => {
    if (!addSlotDraft) return;

    setDepartments((current) =>
      current.map((department) => {
        if (department.id !== addSlotDraft.departmentId) return department;

        const nextIndex = department.slots.length + 1;
        const nextSlot = createSlot(
          department.slotPrefix,
          department.slotLabel,
          nextIndex,
          statusCycle[(nextIndex - 1) % statusCycle.length],
          addSlotDraft.machineKey,
          addSlotDraft.level,
        );

        return {
          ...department,
          capacity: `${nextIndex} hat kurulu`,
          slots: [...department.slots, nextSlot],
        };
      }),
    );

    setAddSlotDraft(null);
  };

  const upgradeSlot = (departmentId: string, slotId: string) => {
    setDepartments((current) =>
      current.map((department) => {
        if (department.id !== departmentId) return department;

        return {
          ...department,
          slots: department.slots.map((slot) => {
            if (slot.id !== slotId) return slot;
            const nextLevel = getNextMachineLevel(slot.machineKey, slot.level);

            if (!nextLevel) return slot;

            return {
              ...slot,
              level: nextLevel,
              progress: Math.min(100, slot.progress + 7),
              status: slot.status === "locked" ? "idle" : slot.status,
            };
          }),
        };
      }),
    );
  };

  const changeSlotMachine = (departmentId: string, slotId: string, machineKey: MachineKey) => {
    setDepartments((current) =>
      current.map((department) => {
        if (department.id !== departmentId) return department;

        return {
          ...department,
          slots: department.slots.map((slot) => {
            if (slot.id !== slotId) return slot;

            return {
              ...slot,
              machineKey,
              level: clampMachineLevel(machineKey, slot.level),
            };
          }),
        };
      }),
    );
  };

  return (
    <main className="shift-game">
      <header className="shift-hud">
        <div className="shift-brand compact">
          <Factory size={30} />
          <div>
            <h1>Factory Runway</h1>
            <p>TEXTILE OPS</p>
          </div>
        </div>
        <div className="shift-kpis compact">
          {kpis.map((kpi) => (
            <div className={`shift-kpi ${kpi.tone}`} key={kpi.label}>
              <kpi.icon size={21} />
              <div>
                <span>{kpi.label}</span>
                <strong>{kpi.value}</strong>
                <small>{kpi.sub}</small>
              </div>
            </div>
          ))}
        </div>
        <Link className="shift-lab-link" href="/">
          UI Lab
        </Link>
      </header>

      <section
        ref={viewportRef}
        className="factory-map-viewport"
        onPointerDown={(event) => {
          if (event.button !== 0) return;

          const viewportRect = event.currentTarget.getBoundingClientRect();
          const boundedOffset = boundOffsetToViewport(offset, viewportRect);

          setOffset(boundedOffset);
          dragState.current = {
            active: true,
            moved: false,
            startX: event.clientX,
            startY: event.clientY,
            originX: boundedOffset.x,
            originY: boundedOffset.y,
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
          suppressSlotClickRef.current = true;

          const viewportRect = event.currentTarget.getBoundingClientRect();
          const nextOffset = {
            x: dragState.current.originX + deltaX,
            y: dragState.current.originY + deltaY,
          };

          setOffset(boundOffsetToViewport(nextOffset, viewportRect));
        }}
        onPointerUp={(event) => {
          releaseMapDrag(event.currentTarget, event.pointerId);
        }}
        onPointerCancel={(event) => {
          releaseMapDrag(event.currentTarget, event.pointerId);
        }}
      >
        <div
          className="factory-map-canvas"
          style={{
            width: canvasWidth,
            height: MAP_HEIGHT,
            transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${MAP_SCALE})`,
          }}
        >
          <div className="factory-map-landscape" />
          <FactoryFloorDetails />
          <div className="factory-production-layout">
            {departments.map((department, index) => (
              <div className="factory-production-stage" key={department.id}>
                <DepartmentBlockView
                  department={department}
                  onAddSlot={openAddSlotModal}
                  onSelectSlot={selectSlot}
                  selectedSlotId={selectedSlotRef?.departmentId === department.id ? selectedSlotRef.slotId : null}
                />
                {index < departments.length - 1 ? <div className={`factory-stage-connector ${department.tone}`} /> : null}
              </div>
            ))}
          </div>
        </div>
        <ProductionGradeGuide />
      </section>

      <SideDock side="left" activePanel={activePanel} onOpen={openPanel} />
      <SideDock side="right" activePanel={activePanel} onOpen={openPanel} />
      <BottomDock activePanel={activePanel} onOpen={openPanel} />
      <DrawerPanel
        activePanel={activePanel}
        onClose={() => setActivePanel(null)}
        onSelectOrder={selectOrder}
        selectedOrderId={selectedOrderId}
      />
      <OrderDetailPanel
        key={activePanel === "orders" ? selectedOrder?.id ?? "no-order" : "no-order"}
        onClose={() => setSelectedOrderId("")}
        order={activePanel === "orders" ? selectedOrder : null}
      />
      <SlotDetailPanel
        details={selectedSlotDetails}
        onChangeMachine={changeSlotMachine}
        onClose={() => setSelectedSlotRef(null)}
        onUpgrade={upgradeSlot}
      />
      <AddSlotModal
        department={addSlotDepartment}
        draft={addSlotDraft}
        onClose={() => setAddSlotDraft(null)}
        onConfirm={confirmAddSlot}
        onLevelChange={(level) => {
          setAddSlotDraft((current) => current ? { ...current, level } : current);
        }}
        onMachineChange={(machineKey) => {
          setAddSlotDraft((current) =>
            current
              ? {
                  ...current,
                  machineKey,
                  level: clampMachineLevel(machineKey, current.level),
                }
              : current,
          );
        }}
      />
    </main>
  );
}

function FactoryFloorDetails() {
  return (
    <div className="factory-floor-details" aria-hidden="true">
      {floorProps.map((prop) => (
        <div
          className={`factory-floor-prop ${prop.kind}`}
          key={prop.id}
          style={{
            left: prop.x,
            top: prop.y,
            width: prop.width,
            height: prop.height,
            transform: `rotate(${prop.rotate ?? 0}deg)`,
          }}
        />
      ))}
    </div>
  );
}

function ProductionGradeBadge({
  className = "",
  grade,
  showLabel = false,
  size = "sm",
}: {
  className?: string;
  grade: ProductionGrade;
  showLabel?: boolean;
  size?: "xs" | "sm" | "lg" | "guide";
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
      {showLabel ? (
        <span className="production-grade-copy">
          <strong>{meta.shortLabel}</strong>
          <small>{meta.readyLabel}</small>
        </span>
      ) : null}
    </span>
  );
}

function ProductionGradeGuide() {
  return (
    <aside className="production-grade-guide" aria-label="Üretim standardı rehberi">
      <h3>Üretim Standardı Rehberi</h3>
      <div>
        {productionGradeOrder.map((grade) => {
          const meta = productionGradeMeta[grade];

          return (
            <div className="production-grade-guide-item" key={grade}>
              <ProductionGradeBadge grade={grade} size="guide" />
              <strong>{meta.shortLabel}</strong>
              <span>{meta.description}</span>
            </div>
          );
        })}
      </div>
    </aside>
  );
}

function DepartmentBlockView({
  department,
  onAddSlot,
  onSelectSlot,
  selectedSlotId,
}: {
  department: DepartmentBlock;
  onAddSlot: (departmentId: string) => void;
  onSelectSlot: (departmentId: string, slotId: string) => void;
  selectedSlotId: string | null;
}) {
  const Icon = department.icon;
  const columns = getSlotColumns(department.slots.length);

  return (
    <section
      className={`factory-department-block ${department.tone}`}
      style={{ width: getDepartmentWidth(department.slots.length) }}
    >
      <div className="factory-department-header">
        <div className="factory-department-title">
          <span>{department.step}</span>
          <Icon size={22} />
          <div>
            <h2>{department.title}</h2>
            <p>{columns} kolon / {SLOT_ROWS} sıra</p>
          </div>
        </div>
        <div className="factory-department-metrics">
          <strong>{department.slots.length}</strong>
          <span>slot</span>
        </div>
      </div>

      <div className="factory-department-meta">
        <span>{department.queue}</span>
        <span>{department.capacity}</span>
      </div>

      <div className="factory-slot-grid">
        {department.slots.map((slot) => (
          <FactorySlotCard
            isSelected={selectedSlotId === slot.id}
            key={slot.id}
            onSelect={() => onSelectSlot(department.id, slot.id)}
            slot={slot}
          />
        ))}
        <button
          className="factory-slot-card factory-slot-add"
          type="button"
          onClick={() => onAddSlot(department.id)}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Plus size={22} />
          <strong>Slot Ekle</strong>
          <span>{department.slotLabel}</span>
        </button>
      </div>
    </section>
  );
}

function FactorySlotCard({
  isSelected,
  onSelect,
  slot,
}: {
  isSelected: boolean;
  onSelect: () => void;
  slot: FactorySlot;
}) {
  const status = slotStatusMeta[slot.status];
  const machine = machineCatalog[slot.machineKey];
  const machineImage = getMachineImage(slot.machineKey, slot.level);
  const grade = getProductionGrade(slot.level);

  return (
    <article
      aria-label={`${slot.name} detaylarını aç`}
      className={`factory-slot-card ${slot.status} ${isSelected ? "is-selected" : ""}`}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;

        event.preventDefault();
        onSelect();
      }}
      role="button"
      tabIndex={0}
    >
      <div className="factory-slot-visual">
        {slot.status === "locked" ? (
          <LockKeyhole size={28} />
        ) : (
          <Image
            alt=""
            aria-hidden="true"
            className="factory-machine-image"
            draggable={false}
            fill
            sizes="147px"
            src={machineImage}
          />
        )}
      </div>

      <div className={`factory-slot-status ${slot.status}`}>
        <b />
        {status.label}
      </div>

      <div className="factory-slot-code">
        <strong>{slot.code}</strong>
        <span>{machine.shortLabel}</span>
      </div>
      <ProductionGradeBadge className="factory-slot-grade-badge" grade={grade} size="xs" />
    </article>
  );
}

function SlotDetailPanel({
  details,
  onChangeMachine,
  onClose,
  onUpgrade,
}: {
  details: { department: DepartmentBlock; slot: FactorySlot } | null;
  onChangeMachine: (departmentId: string, slotId: string, machineKey: MachineKey) => void;
  onClose: () => void;
  onUpgrade: (departmentId: string, slotId: string) => void;
}) {
  if (!details) return null;

  const { department, slot } = details;
  const status = slotStatusMeta[slot.status];
  const machine = machineCatalog[slot.machineKey];
  const machineImage = getMachineImage(slot.machineKey, slot.level);
  const nextLevel = getNextMachineLevel(slot.machineKey, slot.level);
  const grade = getProductionGrade(slot.level);
  const gradeMeta = productionGradeMeta[grade];
  const canChangeMachine = department.machineOptions.length > 1;

  return (
    <aside className={`slot-detail-panel ${slot.status}`} onPointerDown={(event) => event.stopPropagation()}>
      <div className="slot-detail-header">
        <div>
          <p>{department.title}</p>
          <h2>{slot.name}</h2>
        </div>
        <button aria-label="Paneli kapat" className="slot-detail-close" onClick={onClose} type="button">
          <X size={18} />
        </button>
      </div>

      <div className="slot-detail-hero">
        <div className="slot-detail-visual">
          {slot.status === "locked" ? (
            <LockKeyhole size={38} />
          ) : (
            <Image
              alt=""
              aria-hidden="true"
              className="factory-machine-image"
              draggable={false}
              fill
              sizes="192px"
              src={machineImage}
            />
          )}
        </div>
        <div>
          <div className={`slot-detail-status ${slot.status}`}>
            <b />
            {status.label}
          </div>
          <strong>{slot.code}</strong>
          <span>{machine.label}</span>
          <div className="slot-detail-grade-summary">
            <ProductionGradeBadge grade={grade} showLabel size="sm" />
          </div>
        </div>
      </div>

      <dl className="slot-detail-grid">
        <div>
          <dt>Hat Tipi</dt>
          <dd>{machine.label}</dd>
        </div>
        <div>
          <dt>Üretim Standardı</dt>
          <dd>{gradeMeta.trLabel}</dd>
        </div>
        <div>
          <dt>Ürün Uygunluğu</dt>
          <dd>{gradeMeta.readyLabel}</dd>
        </div>
        <div>
          <dt>Çalışan</dt>
          <dd>{slot.staff}</dd>
        </div>
        <div>
          <dt>Günlük Çıktı</dt>
          <dd>{slot.dailyOutput}</dd>
        </div>
        <div>
          <dt>Kuyruk</dt>
          <dd>{department.queue}</dd>
        </div>
        <div>
          <dt>Kapasite</dt>
          <dd>{department.capacity}</dd>
        </div>
      </dl>

      {canChangeMachine ? (
        <div className="slot-machine-choices">
          <span>Hat Görseli</span>
          <div>
            {department.machineOptions.map((machineKey) => (
              <button
                className={slot.machineKey === machineKey ? "is-selected" : ""}
                key={machineKey}
                onClick={() => onChangeMachine(department.id, slot.id, machineKey)}
                type="button"
              >
                {machineCatalog[machineKey].label}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      <div className="slot-detail-meter">
        <div>
          <span>Kapasite Kullanımı</span>
          <strong>%{slot.progress}</strong>
        </div>
        <i>
          <b style={{ width: `${slot.progress}%` }} />
        </i>
      </div>

      <div className="slot-detail-actions">
        <button
          className="slot-detail-button primary"
          disabled={!nextLevel}
          onClick={() => onUpgrade(department.id, slot.id)}
          type="button"
        >
          <Hammer size={18} />
          {nextLevel ? `Standardı Yükselt: ${getProductionGradeMeta(nextLevel).shortLabel}` : "Maks Standard"}
        </button>
        <button className="slot-detail-button" type="button">
          <ClipboardList size={18} />
          Sipariş Ata
        </button>
        <button className="slot-detail-button" type="button">
          <Zap size={18} />
          Bakım
        </button>
      </div>
    </aside>
  );
}

function AddSlotModal({
  department,
  draft,
  onClose,
  onConfirm,
  onLevelChange,
  onMachineChange,
}: {
  department: DepartmentBlock | null;
  draft: AddSlotDraft | null;
  onClose: () => void;
  onConfirm: () => void;
  onLevelChange: (level: number) => void;
  onMachineChange: (machineKey: MachineKey) => void;
}) {
  if (!department || !draft) return null;

  const machine = machineCatalog[draft.machineKey];
  const machineImage = getMachineImage(draft.machineKey, draft.level);
  const levels = getMachineLevels(draft.machineKey);
  const draftGrade = getProductionGrade(draft.level);
  const draftGradeMeta = productionGradeMeta[draftGrade];

  return (
    <div className="slot-investment-backdrop" onPointerDown={onClose}>
      <section
        aria-modal="true"
        className="slot-investment-modal"
        onPointerDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <header className="slot-investment-header">
          <div>
            <p>Yeni Hat Yatırımı</p>
            <h2>{department.title}</h2>
          </div>
          <button aria-label="Yeni hat modalını kapat" className="slot-detail-close" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </header>

        <div className="slot-investment-preview">
          <div className="slot-investment-visual">
            <Image
              alt=""
              aria-hidden="true"
              className="factory-machine-image"
              draggable={false}
              fill
              sizes="220px"
              src={machineImage}
            />
          </div>
          <div>
            <span>{machine.label}</span>
            <strong>{draftGradeMeta.trLabel} Standardı</strong>
            <small>{draftGradeMeta.readyLabel}</small>
            <small>{department.slots.length + 1}. hat kurulacak</small>
          </div>
        </div>

        {department.machineOptions.length > 1 ? (
          <div className="slot-investment-group">
            <span>Hat Tipi</span>
            <div className="slot-investment-options">
              {department.machineOptions.map((machineKey) => (
                <button
                  className={draft.machineKey === machineKey ? "is-selected" : ""}
                  key={machineKey}
                  onClick={() => onMachineChange(machineKey)}
                  type="button"
                >
                  {machineCatalog[machineKey].label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        <div className="slot-investment-group">
          <span>Üretim Standardı</span>
          <div className="slot-investment-levels">
            {levels.map((level) => (
              <button
                className={draft.level === level ? "is-selected" : ""}
                key={level}
                onClick={() => onLevelChange(level)}
                type="button"
              >
                <ProductionGradeBadge grade={getProductionGrade(level)} size="xs" />
                <span>{getProductionGradeMeta(level).shortLabel}</span>
              </button>
            ))}
          </div>
        </div>

        <footer className="slot-investment-actions">
          <button className="slot-detail-button" onClick={onClose} type="button">
            Vazgeç
          </button>
          <button className="slot-detail-button primary" onClick={onConfirm} type="button">
            <Plus size={18} />
            Hattı Kur
          </button>
        </footer>
      </section>
    </div>
  );
}

function SideDock({
  side,
  activePanel,
  onOpen,
}: {
  side: "left" | "right";
  activePanel: DockPanel;
  onOpen: (panel: DockPanel) => void;
}) {
  const items =
    side === "left"
      ? [
          { panel: "orders" as const, label: "Siparişler", icon: ClipboardList, count: String(incomingOrders.length) },
          { panel: "tasks" as const, label: "Görevler", icon: Star, count: "3" },
        ]
      : [
          { panel: "warnings" as const, label: "Uyarılar", icon: Bell, count: "7" },
          { panel: "actions" as const, label: "Aksiyon", icon: Zap, count: "4" },
        ];

  return (
    <nav className={`map-side-dock ${side}`}>
      {items.map((item) => (
        <button
          className={activePanel === item.panel ? "is-active" : ""}
          key={item.panel}
          type="button"
          onClick={() => onOpen(item.panel)}
        >
          <item.icon size={26} />
          <span>{item.label}</span>
          <b>{item.count}</b>
        </button>
      ))}
    </nav>
  );
}

function BottomDock({ activePanel, onOpen }: { activePanel: DockPanel; onOpen: (panel: DockPanel) => void }) {
  return (
    <nav className="map-bottom-dock">
      <button className={activePanel === "bottom" ? "is-active" : ""} type="button" onClick={() => onOpen("bottom")}>
        <Factory size={24} />
        <span>Menü</span>
      </button>
      {bottomItems.slice(0, 6).map((item) => (
        <button key={item.label} type="button">
          <item.icon size={22} />
          <span>{item.label}</span>
        </button>
      ))}
    </nav>
  );
}

function DrawerPanel({
  activePanel,
  onClose,
  onSelectOrder,
  selectedOrderId,
}: {
  activePanel: DockPanel;
  onClose: () => void;
  onSelectOrder: (orderId: string) => void;
  selectedOrderId: string;
}) {
  if (!activePanel) return null;

  const isRight = activePanel === "warnings" || activePanel === "actions";
  const isBottom = activePanel === "bottom";

  return (
    <div className={`map-drawer ${isRight ? "right" : ""} ${isBottom ? "bottom" : ""}`}>
      <div className="map-drawer-header">
        <div>
          <p>{drawerEyebrow(activePanel)}</p>
          <h2>{drawerTitle(activePanel)}</h2>
        </div>
        <button type="button" onClick={onClose}>Kapat</button>
      </div>
      <div className="map-drawer-content">{drawerContent(activePanel, selectedOrderId, onSelectOrder)}</div>
    </div>
  );
}

function drawerEyebrow(panel: Exclude<DockPanel, null>) {
  if (panel === "orders") return "Order Market";
  if (panel === "tasks") return "Learning Loop";
  if (panel === "warnings") return "Live Feed";
  if (panel === "actions") return "Quick Actions";
  return "Navigation";
}

function drawerTitle(panel: Exclude<DockPanel, null>) {
  if (panel === "orders") return "Siparişler";
  if (panel === "tasks") return "Görevler ve Tavsiyeler";
  if (panel === "warnings") return "Uyarılar";
  if (panel === "actions") return "Hızlı Aksiyonlar";
  return "Fabrika Menüleri";
}

function drawerContent(
  panel: Exclude<DockPanel, null>,
  selectedOrderId: string,
  onSelectOrder: (orderId: string) => void,
) {
  if (panel === "orders") {
    return (
      <div className="order-drawer-list">
        {incomingOrders.map((order, index) => (
          <button
            className={`order-list-item ${selectedOrderId === order.id ? "is-selected" : ""}`}
            key={order.id}
            onClick={() => onSelectOrder(order.id)}
            style={orderColorStyle(order)}
            type="button"
          >
            <span className="order-list-thumb">
              <Image
                alt=""
                aria-hidden="true"
                className="order-list-image"
                draggable={false}
                fill
                sizes="48px"
                src={order.productImage}
              />
            </span>
            <span className="order-list-index">{String(index + 1).padStart(2, "0")}</span>
            <span className="order-list-main">
              <strong>{order.customer}</strong>
              <span>{order.productName}</span>
              <small>{order.qty} · Teslim: {order.due}</small>
            </span>
            <span className="order-list-price">{order.price}</span>
          </button>
        ))}
      </div>
    );
  }

  if (panel === "warnings") {
    return warnings.map((warning) => (
      <div className={`drawer-card ${warning.tone}`} key={warning.title}>
        <h3>{warning.title}</h3>
        <p>{warning.body}</p>
        <small>{warning.time}</small>
      </div>
    ));
  }

  if (panel === "actions") {
    return ["Fazla Mesai", "Bakım", "Personel Kaydır", "Öncelik Değiştir"].map((action) => (
      <button className="drawer-action" key={action} type="button">
        {action}
      </button>
    ));
  }

  if (panel === "tasks") {
    return (
      <>
        <div className="drawer-card amber">
          <h3>Ütü kapasitesini incele</h3>
          <p>Ütü önünde 8 günlük iş birikti. Yeni hat yatırımı önerilir.</p>
        </div>
        <div className="drawer-card cyan">
          <h3>Baskılı ürünlere geçiş</h3>
          <p>Baskı makinesi daha karlı siparişleri açabilir.</p>
        </div>
      </>
    );
  }

  return bottomItems.map((item) => (
    <button className="drawer-action" key={item.label} type="button">
      <item.icon size={20} />
      {item.label}
    </button>
  ));
}

function orderColorStyle(order: IncomingOrder) {
  return {
    "--order-primary": order.colors.primary,
    "--order-secondary": order.colors.secondary,
    "--order-gradient-from": order.colors.gradientFrom,
    "--order-gradient-to": order.colors.gradientTo,
  } as CSSProperties;
}

function OrderDetailPanel({
  onClose,
  order,
}: {
  onClose: () => void;
  order: IncomingOrder | null;
}) {
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  if (!order) return null;

  return (
    <aside
      className={`order-detail-panel ${isImageExpanded ? "is-image-expanded" : ""}`}
      onPointerDown={(event) => event.stopPropagation()}
      style={orderColorStyle(order)}
    >
      <div className="order-detail-grip" />
      <header className="order-detail-header">
        <div>
          <p>Seçili Sipariş</p>
          <h2>{order.customer}</h2>
          <span>
            Koleksiyon: <b>{order.collection}</b>
          </span>
        </div>
        <button aria-label="Sipariş detayını kapat" className="slot-detail-close" onClick={onClose} type="button">
          <X size={18} />
        </button>
      </header>

      <div className="order-theme-row">
        <span className="order-theme-pill">
          <Tag size={16} />
          {order.theme}
        </span>
        <span className="order-level-badge">{order.level}</span>
        <span className="order-status-chip">{order.status}</span>
      </div>

      <div className="order-preview-stage">
        <div className="order-card-preview">
          <span className="order-preview-letter">{order.initial}</span>
          <div className="order-preview-copy">
            {order.cardCopy.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </div>
        </div>
        <button
          aria-label={isImageExpanded ? "Ürün görselini küçült" : "Ürün görselini büyüt"}
          aria-pressed={isImageExpanded}
          className="order-preview-product"
          onClick={() => setIsImageExpanded((current) => !current)}
          type="button"
        >
          <Image
            alt={`${order.productName} ürün görseli`}
            className="order-preview-image"
            draggable={false}
            fill
            priority
            sizes="220px"
            src={order.productImage}
          />
        </button>
      </div>

      <button
        aria-hidden={!isImageExpanded}
        aria-label="Büyük ürün görselini kapat"
        className={`order-expanded-view ${isImageExpanded ? "is-open" : ""}`}
        onClick={() => setIsImageExpanded(false)}
        tabIndex={isImageExpanded ? 0 : -1}
        type="button"
      >
        <span className="order-expanded-card">
          <span className="order-preview-letter">{order.initial}</span>
          <span className="order-expanded-copy">
            {order.cardCopy.map((line) => (
              <span key={line}>{line}</span>
            ))}
          </span>
        </span>
        <span className="order-expanded-product">
          <Image
            alt=""
            aria-hidden="true"
            className="order-preview-image"
            draggable={false}
            fill
            sizes="360px"
            src={order.productImage}
          />
        </span>
        <span className="order-expanded-close">
          <X size={18} />
        </span>
      </button>

      <dl className="order-detail-list">
        <OrderDetailRow icon={Hash} label="Kod" value={order.code} />
        <OrderDetailRow icon={CalendarDays} label="İstenen Tarih" value={order.requestedDate} />
        <OrderDetailRow icon={PackageCheck} label="Sipariş Adedi" value={order.qty} />
        <OrderDetailRow icon={CircleDollarSign} label="Teklif Fiyatı" value={order.price} />
        <OrderDetailRow icon={Tag} label="Birim Teklif" value={order.unitPrice} />
        <OrderDetailRow icon={Palette} label="Kart Tonu" value={`${order.colors.primary} / ${order.colors.secondary}`} />
        <OrderDetailRow icon={Truck} label="Rota" value={order.route} />
        <OrderDetailRow icon={ClipboardList} label="Müşteri" value={order.productName} />
      </dl>

      <div className="order-color-strip">
        <span style={{ background: order.colors.primary }} />
        <span style={{ background: order.colors.secondary }} />
        <span style={{ background: order.colors.gradientFrom }} />
        <span style={{ background: order.colors.gradientTo }} />
      </div>

      <div className="order-detail-actions">
        <button className="slot-detail-button primary" type="button">
          <ClipboardList size={18} />
          Planla
        </button>
        <button className="slot-detail-button" type="button">
          <CircleDollarSign size={18} />
          Teklifi Aç
        </button>
      </div>
    </aside>
  );
}

function OrderDetailRow({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div>
      <dt>
        <span>
          <Icon size={17} />
        </span>
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}
