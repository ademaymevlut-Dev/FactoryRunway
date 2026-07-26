import type { FinanceCategory } from "@/generated/prisma/enums";
import type { SupportedLocale } from "@/lib/i18n/locales";

type PlaybackCategory =
  | "FINANCE"
  | "MACHINE"
  | "OUTSOURCING"
  | "PAYMENT"
  | "PRODUCTION"
  | "SHIPPING"
  | "STAFF"
  | "SYSTEM";

type ShiftPlaybackLocaleCopy = {
  actions: {
    errors: {
      SHIFT_RESULT_NOT_FOUND_AFTER_START: string;
      SHIFT_RESULT_NOT_FOUND_AFTER_COMPLETION: string;
      SHIFT_START_FAILED: string;
    };
    warnings: {
      NEXT_MARKET_OFFER_DELAYED: string;
    };
  };
  dailyEvents: {
    panelAria: string;
    title: string;
    dayLabel: (day: number) => string;
    countLabel: (visible: number, total: number) => string;
    closeAria: string;
    closeTooltip: string;
    levelUpBadge: string;
    categories: Record<PlaybackCategory, string>;
    financeCategories: Record<
      | "DEFAULT"
      | "ELECTRICITY"
      | "LEASING_DOWN_PAYMENT"
      | "LEASING_PAYMENT"
      | "MEAL"
      | "OUTSOURCE_COST"
      | "OVERHEAD"
      | "PAYROLL"
      | "RENT",
      string
    >;
    fallbacks: {
      factoryWide: string;
      order: string;
    };
    titles: {
      capacityUsed: (departmentName: string) => string;
      chaosBadWeather: string;
      chaosDefault: string;
      chaosFluWave: string;
      chaosMachine: string;
      chaosMaterialDelay: string;
      chaosPowerIssue: string;
      chaosStaffAbsence: string;
      chaosStaffAbsenceDepartment: string;
      completedEarly: (departmentName: string) => string;
      customerRelationshipGained: string;
      customerRelationshipLost: string;
      departmentNoWip: (departmentName: string) => string;
      departmentProductionCompleted: (departmentName: string) => string;
      financeExpensePaid: (categoryName: string) => string;
      leasingContractCompleted: string;
      leasingDownPaymentPaid: string;
      leasingPaymentOverdue: string;
      leasingPaymentPaid: string;
      leasingPaymentPartial: string;
      levelUp: (level: string) => string;
      outsourceCompleted: string;
      outsourcePaymentPaid: string;
      payrollPaid: string;
      penaltyOverdue: string;
      penaltyPaid: string;
      penaltyPartial: string;
      paymentReceived: string;
      premiumBonus: (xp: string) => string;
      luxuryBonus: (xp: string) => string;
      orderCompletedXp: (xp: string) => string;
      onTimeDeliveryXp: (xp: string) => string;
      orderShipped: string;
      shiftCompleted: string;
      shiftCompletedXp: (xp: string) => string;
      shiftStarted: string;
    };
    descriptions: {
      activeLinesCalculated: (count: string) => string;
      amountRecorded: (amount: string) => string;
      chaosMachine: (target: string, capacityLoss: string) => string;
      chaosStaff: (
        target: string,
        affectedStaffPart: string,
        capacityLoss: string,
      ) => string;
      chaosStaffAffected: (count: string) => string;
      chaosSystem: (target: string, capacityLoss: string) => string;
      customerRelationshipGained: (orderCode: string) => string;
      customerRelationshipLost: (orderCode: string) => string;
      financeExpensePaid: (categoryName: string, amount: string) => string;
      levelUp: (xp: string, balanceAfterXp: string) => string;
      orderCompletedXp: (orderNo: string, balanceAfterXp: string) => string;
      orderQuantity: (orderCode: string, quantity: string) => string;
      onTimeDeliveryXp: (orderNo: string, balanceAfterXp: string) => string;
      penaltyOverdue: (orderNo: string, amount: string) => string;
      penaltyPaid: (orderNo: string, amount: string) => string;
      penaltyPartial: (orderNo: string, amount: string) => string;
      premiumBonus: (orderNo: string, balanceAfterXp: string) => string;
      luxuryBonus: (orderNo: string, balanceAfterXp: string) => string;
      processedQuantity: (quantity: string) => string;
      remainingQuantity: (quantity: string) => string;
      shippedQuantity: (orderCode: string, quantity: string) => string;
      shiftCompleted: (day: string) => string;
      shiftCompletedXp: (balanceAfterXp: string) => string;
      shiftStarted: (activeLineCount: string) => string;
      timelineDefault: string;
    };
  };
  hud: {
    activeLineLabel: (count: number) => string;
    activeProductAria: (productName: string) => string;
    closeAria: string;
    lockAria: string;
    metrics: {
      produced: string;
      queueEntered: string;
    };
    orderLabel: (orderCode: string | null) => string;
    processedProductsLabel: string;
    progressAria: (progressPercent: number) => string;
    progressDayLabel: (day: number, isFinal: boolean) => string;
    productQuantity: (quantity: string) => string;
    utilizationAria: (utilizationPercent: number) => string;
  };
  service: {
    lineLabel: (lineNumber: number) => string;
  };
};

export const shiftPlaybackCopy = {
  tr: {
    actions: {
      errors: {
        SHIFT_RESULT_NOT_FOUND_AFTER_START:
          "Vardiya daha önce başlatıldı ancak sonucu okunamadı.",
        SHIFT_RESULT_NOT_FOUND_AFTER_COMPLETION:
          "Vardiya tamamlandı ancak sonucu okunamadı.",
        SHIFT_START_FAILED: "Vardiya başlatılamadı. Lütfen tekrar deneyin.",
      },
      warnings: {
        NEXT_MARKET_OFFER_DELAYED:
          "Vardiya tamamlandı; yeni sipariş teklifi daha sonra yenilenecek.",
      },
    },
    dailyEvents: {
      panelAria: "Günlük olay paneli",
      title: "Günlük Olaylar",
      dayLabel: (day) => `${day}. Gün`,
      countLabel: (visible, total) => `${visible} / ${total} olay`,
      closeAria: "Günlük olayları kapat",
      closeTooltip: "Kapat",
      levelUpBadge: "Seviye Atlama",
      categories: {
        FINANCE: "Finans",
        MACHINE: "Makine",
        OUTSOURCING: "Fason",
        PAYMENT: "Ödeme",
        PRODUCTION: "Üretim",
        SHIPPING: "Sevkiyat",
        STAFF: "Personel",
        SYSTEM: "Sistem",
      },
      financeCategories: {
        DEFAULT: "İşletme gideri",
        ELECTRICITY: "Elektrik",
        LEASING_DOWN_PAYMENT: "Leasing peşinatı",
        LEASING_PAYMENT: "Leasing taksiti",
        MEAL: "Yemek gideri",
        OUTSOURCE_COST: "Fason gideri",
        OVERHEAD: "Genel gider",
        PAYROLL: "Maaş",
        RENT: "Kira",
      },
      fallbacks: {
        factoryWide: "Fabrika genelinde",
        order: "Sipariş",
      },
      titles: {
        capacityUsed: (departmentName) => `${departmentName} kapasitesi kullanıldı`,
        chaosBadWeather: "Hava koşulları akışı etkiledi",
        chaosDefault: "Operasyon ritmi etkilendi",
        chaosFluWave: "Grip dalgası üretimi yavaşlattı",
        chaosMachine: "Makine ritmi düştü",
        chaosMaterialDelay: "Malzeme akışı yavaşladı",
        chaosPowerIssue: "Kısa elektrik dalgalanması",
        chaosStaffAbsence: "Personel eksikliği",
        chaosStaffAbsenceDepartment: "Departmanda personel eksikliği",
        completedEarly: (departmentName) => `${departmentName} erken tamamladı`,
        customerRelationshipGained: "Müşteri güveni güçlendi",
        customerRelationshipLost: "Müşteri güveni zayıfladı",
        departmentNoWip: (departmentName) =>
          `${departmentName} için hazır WIP yok`,
        departmentProductionCompleted: (departmentName) =>
          `${departmentName} üretimi tamamladı`,
        financeExpensePaid: (categoryName) => `${categoryName} ödendi`,
        leasingContractCompleted: "Leasing sözleşmesi tamamlandı",
        leasingDownPaymentPaid: "Leasing peşinatı ödendi",
        leasingPaymentOverdue: "Leasing taksiti gecikti",
        leasingPaymentPaid: "Leasing taksiti ödendi",
        leasingPaymentPartial: "Leasing taksiti kısmi ödendi",
        levelUp: (level) => `Seviye ${level} oldu`,
        luxuryBonus: (xp) => `+${xp} Luxury bonus`,
        onTimeDeliveryXp: (xp) => `+${xp} termin bonusu`,
        orderCompletedXp: (xp) => `+${xp} sipariş XP`,
        orderShipped: "Sipariş sevk edildi",
        outsourceCompleted: "Fason işlem tamamlandı",
        outsourcePaymentPaid: "Fason ödeme yapıldı",
        payrollPaid: "Maaş ödemesi yapıldı",
        paymentReceived: "Müşteri ödemesi alındı",
        penaltyOverdue: "Gecikme cezası bekliyor",
        penaltyPaid: "Gecikme cezası ödendi",
        penaltyPartial: "Gecikme cezası kısmi ödendi",
        premiumBonus: (xp) => `+${xp} Premium bonus`,
        shiftCompleted: "Gün tamamlandı",
        shiftCompletedXp: (xp) => `+${xp} günlük vardiya XP`,
        shiftStarted: "Vardiya başladı",
      },
      descriptions: {
        activeLinesCalculated: (count) =>
          `${count} aktif hat ile üretim hesaplandı.`,
        amountRecorded: (amount) => `${amount} tutarında kayıt oluştu.`,
        chaosMachine: (target, capacityLoss) =>
          `${target} kısa makine ayarı nedeniyle yavaşladı. Kapasite etkisi: -${capacityLoss}.`,
        chaosStaff: (target, affectedStaffPart, capacityLoss) =>
          `${target} personel akışı zayıfladı.${affectedStaffPart} Kapasite etkisi: -${capacityLoss}.`,
        chaosStaffAffected: (count) => ` ${count} personel etkilendi.`,
        chaosSystem: (target, capacityLoss) =>
          `${target} operasyon akışı yavaşladı. Kapasite etkisi: -${capacityLoss}.`,
        customerRelationshipGained: (orderCode) =>
          `${orderCode} teslim performansı müşterinin tekrar sipariş ihtimalini artırdı.`,
        customerRelationshipLost: (orderCode) =>
          `${orderCode} gecikmesi müşterinin tekrar sipariş ihtimalini düşürdü.`,
        financeExpensePaid: (categoryName, amount) =>
          `${categoryName} için ${amount} ödeme yapıldı.`,
        levelUp: (xp, balanceAfterXp) =>
          `+${xp} XP ile yeni seviye açıldı. Güncel XP: ${balanceAfterXp}.`,
        luxuryBonus: (orderNo, balanceAfterXp) =>
          `${orderNo} Luxury zorluk bonusu verdi. Güncel XP: ${balanceAfterXp}.`,
        onTimeDeliveryXp: (orderNo, balanceAfterXp) =>
          `${orderNo} zamanında sevk edildi. Güncel XP: ${balanceAfterXp}.`,
        orderCompletedXp: (orderNo, balanceAfterXp) =>
          `${orderNo} sevk edildiği için workload bazlı XP eklendi. Güncel XP: ${balanceAfterXp}.`,
        orderQuantity: (orderCode, quantity) =>
          `${orderCode} için ${quantity} adet.`,
        penaltyOverdue: (orderNo, amount) =>
          `${orderNo} gecikme cezası ödenemedi. Bekleyen tutar: ${amount}.`,
        penaltyPaid: (orderNo, amount) =>
          `${orderNo} için ${amount} gecikme cezası kasadan çıktı.`,
        penaltyPartial: (orderNo, amount) =>
          `${orderNo} gecikme cezasının ${amount} kısmı bekliyor.`,
        premiumBonus: (orderNo, balanceAfterXp) =>
          `${orderNo} Premium zorluk bonusu verdi. Güncel XP: ${balanceAfterXp}.`,
        processedQuantity: (quantity) => `${quantity} adet işlendi.`,
        remainingQuantity: (quantity) => `${quantity} adet yarına kaldı.`,
        shippedQuantity: (orderCode, quantity) =>
          `${orderCode} için ${quantity} adet sevk edildi.`,
        shiftCompleted: (day) => `${day}. gün kapanışı tamamlandı.`,
        shiftCompletedXp: (balanceAfterXp) =>
          `Günlük vardiya XP puanı eklendi. Güncel XP: ${balanceAfterXp}.`,
        shiftStarted: (activeLineCount) =>
          `${activeLineCount} aktif hat ile vardiya başladı.`,
        timelineDefault: "Günlük vardiya zaman çizelgesine işlendi.",
      },
    },
    hud: {
      activeLineLabel: (count) => `${count} hat`,
      activeProductAria: (productName) => `Aktif ürün: ${productName}`,
      closeAria: "Kapat",
      lockAria: "Vardiya sonucu kapatılana kadar planlama işlemleri kilitli",
      metrics: {
        produced: "Çıkan",
        queueEntered: "Kuyruğa giren",
      },
      orderLabel: (orderCode) => `Sipariş: ${orderCode ?? "-"}`,
      processedProductsLabel: "İşlenen ürünler",
      productQuantity: (quantity) => quantity,
      progressAria: (progressPercent) =>
        `Vardiya yüzde ${progressPercent} tamamlandı`,
      progressDayLabel: (day, isFinal) =>
        isFinal ? `${day}. gün vardiyası tamamlandı` : `${day}. gün vardiyası`,
      utilizationAria: (utilizationPercent) =>
        `Departman randımanı yüzde ${utilizationPercent}`,
    },
    service: {
      lineLabel: (lineNumber) => `Hat ${lineNumber}`,
    },
  },
  en: {
    actions: {
      errors: {
        SHIFT_RESULT_NOT_FOUND_AFTER_START:
          "The shift had already started, but the result could not be read.",
        SHIFT_RESULT_NOT_FOUND_AFTER_COMPLETION:
          "The shift completed, but the result could not be read.",
        SHIFT_START_FAILED: "The shift could not be started. Please try again.",
      },
      warnings: {
        NEXT_MARKET_OFFER_DELAYED:
          "The shift is complete; the next market offer will refresh later.",
      },
    },
    dailyEvents: {
      panelAria: "Daily event panel",
      title: "Daily Events",
      dayLabel: (day) => `Day ${day}`,
      countLabel: (visible, total) => `${visible} / ${total} events`,
      closeAria: "Close daily events",
      closeTooltip: "Close",
      levelUpBadge: "Level Up",
      categories: {
        FINANCE: "Finance",
        MACHINE: "Machine",
        OUTSOURCING: "Outsource",
        PAYMENT: "Payment",
        PRODUCTION: "Production",
        SHIPPING: "Shipping",
        STAFF: "Staff",
        SYSTEM: "System",
      },
      financeCategories: {
        DEFAULT: "Operating expense",
        ELECTRICITY: "Electricity",
        LEASING_DOWN_PAYMENT: "Leasing down payment",
        LEASING_PAYMENT: "Leasing installment",
        MEAL: "Meals",
        OUTSOURCE_COST: "Outsource cost",
        OVERHEAD: "Overhead",
        PAYROLL: "Payroll",
        RENT: "Rent",
      },
      fallbacks: {
        factoryWide: "Across the factory",
        order: "Order",
      },
      titles: {
        capacityUsed: (departmentName) => `${departmentName} used its capacity`,
        chaosBadWeather: "Weather conditions affected the flow",
        chaosDefault: "Operations rhythm was affected",
        chaosFluWave: "A flu wave slowed production",
        chaosMachine: "Machine rhythm dropped",
        chaosMaterialDelay: "Material flow slowed",
        chaosPowerIssue: "Brief power fluctuation",
        chaosStaffAbsence: "Staff shortage",
        chaosStaffAbsenceDepartment: "Department staff shortage",
        completedEarly: (departmentName) => `${departmentName} finished early`,
        customerRelationshipGained: "Customer trust improved",
        customerRelationshipLost: "Customer trust weakened",
        departmentNoWip: (departmentName) => `${departmentName} had no ready WIP`,
        departmentProductionCompleted: (departmentName) =>
          `${departmentName} completed production`,
        financeExpensePaid: (categoryName) => `${categoryName} paid`,
        leasingContractCompleted: "Leasing contract completed",
        leasingDownPaymentPaid: "Leasing down payment paid",
        leasingPaymentOverdue: "Leasing installment overdue",
        leasingPaymentPaid: "Leasing installment paid",
        leasingPaymentPartial: "Leasing installment partially paid",
        levelUp: (level) => `Reached level ${level}`,
        luxuryBonus: (xp) => `+${xp} Luxury bonus`,
        onTimeDeliveryXp: (xp) => `+${xp} on-time bonus`,
        orderCompletedXp: (xp) => `+${xp} order XP`,
        orderShipped: "Order shipped",
        outsourceCompleted: "Outsource job completed",
        outsourcePaymentPaid: "Outsource payment made",
        payrollPaid: "Payroll paid",
        paymentReceived: "Customer payment received",
        penaltyOverdue: "Late penalty pending",
        penaltyPaid: "Late penalty paid",
        penaltyPartial: "Late penalty partially paid",
        premiumBonus: (xp) => `+${xp} Premium bonus`,
        shiftCompleted: "Day completed",
        shiftCompletedXp: (xp) => `+${xp} daily shift XP`,
        shiftStarted: "Shift started",
      },
      descriptions: {
        activeLinesCalculated: (count) =>
          `Production was calculated with ${count} active lines.`,
        amountRecorded: (amount) => `A ${amount} record was created.`,
        chaosMachine: (target, capacityLoss) =>
          `${target} slowed down after a short machine adjustment. Capacity impact: -${capacityLoss}.`,
        chaosStaff: (target, affectedStaffPart, capacityLoss) =>
          `${target} staff flow weakened.${affectedStaffPart} Capacity impact: -${capacityLoss}.`,
        chaosStaffAffected: (count) => ` ${count} staff affected.`,
        chaosSystem: (target, capacityLoss) =>
          `${target} operations flow slowed down. Capacity impact: -${capacityLoss}.`,
        customerRelationshipGained: (orderCode) =>
          `${orderCode} delivery performance increased the chance of repeat orders.`,
        customerRelationshipLost: (orderCode) =>
          `${orderCode} delay reduced the chance of repeat orders.`,
        financeExpensePaid: (categoryName, amount) =>
          `${amount} was paid for ${categoryName}.`,
        levelUp: (xp, balanceAfterXp) =>
          `+${xp} XP unlocked a new level. Current XP: ${balanceAfterXp}.`,
        luxuryBonus: (orderNo, balanceAfterXp) =>
          `${orderNo} granted a Luxury difficulty bonus. Current XP: ${balanceAfterXp}.`,
        onTimeDeliveryXp: (orderNo, balanceAfterXp) =>
          `${orderNo} shipped on time. Current XP: ${balanceAfterXp}.`,
        orderCompletedXp: (orderNo, balanceAfterXp) =>
          `${orderNo} shipped and earned workload-based XP. Current XP: ${balanceAfterXp}.`,
        orderQuantity: (orderCode, quantity) =>
          `${quantity} units for ${orderCode}.`,
        penaltyOverdue: (orderNo, amount) =>
          `${orderNo} late penalty could not be paid. Pending amount: ${amount}.`,
        penaltyPaid: (orderNo, amount) =>
          `${amount} late penalty was paid for ${orderNo}.`,
        penaltyPartial: (orderNo, amount) =>
          `${amount} of ${orderNo}'s late penalty is still pending.`,
        premiumBonus: (orderNo, balanceAfterXp) =>
          `${orderNo} granted a Premium difficulty bonus. Current XP: ${balanceAfterXp}.`,
        processedQuantity: (quantity) => `${quantity} units processed.`,
        remainingQuantity: (quantity) => `${quantity} units moved to tomorrow.`,
        shippedQuantity: (orderCode, quantity) =>
          `${quantity} units shipped for ${orderCode}.`,
        shiftCompleted: (day) => `Day ${day} closing completed.`,
        shiftCompletedXp: (balanceAfterXp) =>
          `Daily shift XP was added. Current XP: ${balanceAfterXp}.`,
        shiftStarted: (activeLineCount) =>
          `Shift started with ${activeLineCount} active lines.`,
        timelineDefault: "Added to the daily shift timeline.",
      },
    },
    hud: {
      activeLineLabel: (count) => `${count} lines`,
      activeProductAria: (productName) => `Active product: ${productName}`,
      closeAria: "Close",
      lockAria: "Planning is locked until the shift result is closed",
      metrics: {
        produced: "Output",
        queueEntered: "Queued",
      },
      orderLabel: (orderCode) => `Order: ${orderCode ?? "-"}`,
      processedProductsLabel: "Processed products",
      productQuantity: (quantity) => quantity,
      progressAria: (progressPercent) =>
        `Shift ${progressPercent} percent complete`,
      progressDayLabel: (day, isFinal) =>
        isFinal ? `Day ${day} shift completed` : `Day ${day} shift`,
      utilizationAria: (utilizationPercent) =>
        `Department throughput ${utilizationPercent} percent`,
    },
    service: {
      lineLabel: (lineNumber) => `Line ${lineNumber}`,
    },
  },
} as const satisfies Record<SupportedLocale, ShiftPlaybackLocaleCopy>;

export type ShiftPlaybackCopy = (typeof shiftPlaybackCopy)[SupportedLocale];

export function getFinanceCategoryLabel(
  copy: ShiftPlaybackLocaleCopy["dailyEvents"],
  value: unknown,
) {
  switch (value as FinanceCategory | undefined) {
    case "RENT":
      return copy.financeCategories.RENT;
    case "ELECTRICITY":
      return copy.financeCategories.ELECTRICITY;
    case "MEAL":
      return copy.financeCategories.MEAL;
    case "OVERHEAD":
      return copy.financeCategories.OVERHEAD;
    case "PAYROLL":
      return copy.financeCategories.PAYROLL;
    case "LEASING_PAYMENT":
      return copy.financeCategories.LEASING_PAYMENT;
    case "LEASING_DOWN_PAYMENT":
      return copy.financeCategories.LEASING_DOWN_PAYMENT;
    case "OUTSOURCE_COST":
      return copy.financeCategories.OUTSOURCE_COST;
    default:
      return copy.financeCategories.DEFAULT;
  }
}
