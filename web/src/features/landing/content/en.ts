import type { LandingContent } from "./types";

export const landingContentEn = {
  accessibility: {
    skipToContent: "Skip to main content",
  },
  auth: {
    accountCardDescription:
      "Sign in with your Google account in one click, or continue with your existing Factory Runway credentials.",
    accountCardEyebrow: "PLAYER ACCESS",
    accountCardTitle: "Your factory control room is ready.",
    description:
      "Create your player account, set up your starting factory, and begin evaluating your first order offers.",
    emailLabel: "Email",
    emailPlaceholder: "player@factoryrunway.com",
    emailDivider: "or continue with email",
    eyebrow: "START BUILDING YOUR FACTORY",
    googleButton: "Continue with Google",
    loginButton: "Sign In",
    loginTab: "Sign In",
    messages: {
      ACCOUNT_CREATED: "Your player account has been created.",
      EMAIL_ALREADY_EXISTS: "This email address is already in use.",
      INVALID_CREDENTIALS: "The email or password is incorrect.",
      INVALID_EMAIL: "Enter a valid email address.",
      INVALID_ROLE: "The admin role is invalid.",
      NAME_TOO_SHORT: "Your player name must be at least 2 characters.",
      PASSWORD_REQUIRED: "A password is required.",
      PASSWORD_TOO_SHORT: "Your password must be at least 8 characters.",
      UNAUTHORIZED: "You are not authorized to perform this action.",
      UNKNOWN_ERROR: "Something went wrong. Please try again.",
      VALIDATION_ERROR: "Check the highlighted fields and try again.",
    },
    nameLabel: "Player name",
    namePlaceholder: "Your player name",
    passwordLabel: "Password",
    passwordPlaceholder: "At least 8 characters",
    playerOnlyNotice:
      "Public registration creates a PLAYER account only. You will name your factory during the secure onboarding flow.",
    registerButton: "Create Player Account",
    registerTab: "Create Player Account",
    tabsAriaLabel: "Account actions",
    title: "Your first production line is waiting.",
  },
  footer: {
    copyright: "Factory Runway. All rights reserved.",
    description:
      "Manage your own garment factory from order selection to shipment.",
    languageLabel: "Language",
  },
  gameLoop: {
    description:
      "Choose the right orders, set each department’s priorities, run the shift, and use the results to plan your factory’s next move.",
    eyebrow: "YOU CONTROL THE FACTORY",
    steps: [
      {
        description:
          "Compare quantity, delivery time, revenue, and the required production route.",
        key: "orders",
        number: "01",
        title: "Evaluate the order",
      },
      {
        description:
          "Organize department queues and decide which orders receive today’s capacity.",
        key: "planning",
        number: "02",
        title: "Plan production",
      },
      {
        description:
          "Watch how staffing, capacity, and unexpected events affect production.",
        key: "shift",
        number: "03",
        title: "Run the shift",
      },
      {
        description:
          "Resolve bottlenecks, invest in new lines, and expand your factory.",
        key: "results",
        number: "04",
        title: "Improve the result",
      },
    ],
    title: "Every decision changes the production flow.",
  },
  hero: {
    description:
      "Factory Runway is a detailed business simulation where you manage your own garment factory, from selecting orders and organizing production queues to shift results and factory investments.",
    eyebrow: "FACTORY MANAGEMENT SIMULATION",
    primaryCta: "Build Your Factory",
    secondaryCta: "Explore Gameplay",
    title: "Manage orders. Plan production. Grow your factory.",
  },
  locale: "en",
  metadata: {
    description:
      "Evaluate orders, plan production queues, manage shifts, and grow your own garment factory.",
    openGraphLocale: "en_US",
    title: "Factory Runway | Factory Management Simulation",
  },
  mobile: {
    heroTitle: "Build your factory. Start producing.",
    loginTab: "Sign In",
    registerTab: "Create Player",
  },
  navigation: {
    ariaLabel: "Primary navigation",
    gameplay: "Gameplay",
    howItWorks: "How It Works",
    languageLabel: "Türkçe",
    login: "Sign In",
    register: "Build Your Factory",
  },
  numberLocale: "en-US",
  showcase: {
    orderAcceptance: {
      acceptButton: "Accept Order",
      acceptedButton: "Added to Production Plan",
      acceptedNotificationDescription:
        "The CLAVIER order was added to the production plan.",
      acceptedNotificationTitle: "Order accepted",
      calloutRailLabel: "Order review steps",
      callouts: [
        {
          description:
            "Evaluate incoming offers by customer, product, quantity, and delivery time.",
          id: "callout-offer-list",
          number: "01",
          target: "order-offer-list",
          title: "Compare incoming offers",
        },
        {
          description:
            "Order quantity determines the total workload across your factory’s departments.",
          id: "callout-quantity",
          number: "02",
          target: "order-quantity",
          title: "Check the production volume",
        },
        {
          description:
            "The remaining working days show whether the order can be completed on time with current capacity.",
          id: "callout-delivery",
          number: "03",
          target: "order-delivery",
          title: "Evaluate delivery risk",
        },
        {
          description:
            "The total order quantity is divided into production quantities across the selected colors.",
          id: "callout-colors",
          number: "04",
          target: "order-colors",
          title: "Review color allocation",
        },
        {
          description:
            "Each product carries its own department route and workload from cutting through shipment.",
          id: "callout-route",
          number: "05",
          target: "order-route",
          title: "Understand the production route",
        },
        {
          description:
            "An accepted order is transferred to the department queues and production plan.",
          id: "callout-accept",
          number: "06",
          target: "order-accept",
          title: "Add the order to the production plan",
        },
      ],
      categoryLabel: "Category",
      colorsLabel: "Color Allocation",
      dayUnitLabel: "days",
      deliveryLabel: "Delivery Time",
      listDescription:
        "Review the offer and its operational load before adding it to production.",
      listTitle: "Open Order Offers",
      orderListAriaLabel: "Open order offers",
      outsourceLabel: "Outsource",
      pieceUnitLabel: "units",
      productTypeLabel: "Product Type",
      quantityLabel: "Order Quantity",
      replayLabel: "Replay",
      revenueLabel: "Total Revenue",
      routeLabel: "Production Route",
      sectionDescription:
        "Review quantity, delivery time, color allocation, and the required production route. Accept the orders that match your factory’s current capacity.",
      sectionEyebrow: "ORDER MANAGEMENT",
      sectionTitle: "Evaluate every order before adding it to production.",
      selectedOfferLabel: "Selected offer",
      unitPriceLabel: "Unit Price",
      workloadUnitLabel: "work points/unit",
    },
    productionQueue: {
      calloutRailLabel: "Production queue walkthrough steps",
      callouts: [
        {
          description:
            "Orders are processed from top to bottom according to the department’s daily production plan.",
          id: "queue-callout-list",
          number: "01",
          target: "production-queue-list",
          title: "Review the department queue",
        },
        {
          description:
            "See how many units of each order still need to be completed in this department.",
          id: "queue-callout-remaining",
          number: "02",
          target: "queue-remaining",
          title: "Compare remaining quantities",
        },
        {
          description:
            "See which order receives the department’s available capacity today.",
          id: "queue-callout-planned",
          number: "03",
          target: "queue-planned",
          title: "Review today’s production plan",
        },
        {
          description:
            "Move orders with less delivery time upward to reduce the risk of delay.",
          id: "queue-callout-delivery",
          number: "04",
          target: "queue-delivery-risk",
          title: "Prioritize delivery risk",
        },
        {
          description:
            "Use drag and drop to decide which order the department works on first.",
          id: "queue-callout-drag",
          number: "05",
          target: "queue-drag-handle",
          title: "Move the order to the top",
        },
        {
          description:
            "The new priority order updates the planned production quantities for the day.",
          id: "queue-callout-updated",
          number: "06",
          target: "queue-updated-plan",
          title: "Recalculate the plan",
        },
      ],
      categoryLabel: "Category",
      colorsLabel: "Active Colors",
      completedLabel: "Completed",
      dayUnitLabel: "days",
      departmentLabel: "Department",
      inputReadyLabel: "Ready Input",
      liveReorderMessage:
        "The SPORTISE order was moved to the first position.",
      notificationDescription:
        "The SPORTISE order was moved to the first position in the Sewing queue.",
      notificationTitle: "Production priority updated",
      outsourceBadgeLabel: "Printing can be outsourced",
      pieceUnitLabel: "units",
      plannedLabel: "Planned",
      plannedSummaryLabel: "Planned daily production",
      priorityLabel: "Priority",
      productTypeLabel: "Product Type",
      queueDescription: "Today’s controlled production order",
      queueLabel: "Production Queue",
      queueListAriaLabel: "Sewing department production queue",
      remainingLabel: "Remaining",
      replayLabel: "Replay Scene",
      routeLabel: "Production Route",
      sectionDescription:
        "Compare delivery time, remaining quantity, and department workload. Reorder the queue to update the day’s production plan.",
      sectionEyebrow: "PRODUCTION PLANNING",
      sectionTitle:
        "Change the production order and direct capacity to the right job.",
      statuses: {
        material_waiting: "Waiting for Material",
        outsourcing_available: "Outsourcing Available",
        ready: "Ready",
        urgent: "Urgent",
      },
      warningLabels: {
        DELIVERY_RISK: "Delivery Risk",
      },
      workloadLabel: "Total Workload",
      workloadUnitLabel: "points / unit",
    },
    shiftSimulation: {
      acceleratedLabel: "Accelerated shift playback",
      activeLineLabel: "1 line",
      actualLabel: "Actual",
      bottleneckSummary:
        "The Sewing department finished 30 units below the production plan.",
      calloutRailLabel: "Shift simulation walkthrough steps",
      callouts: [
        {
          description:
            "Each department starts the shift with its planned work orders and available capacity.",
          id: "shift-callout-start",
          number: "01",
          target: "shift-start",
          title: "Run the shift plan",
        },
        {
          description:
            "Follow production progress and department results live from 08:00 to 17:00.",
          id: "shift-callout-progress",
          number: "02",
          target: "shift-progress",
          title: "Track the shift in real time",
        },
        {
          description:
            "See how many units each department is expected to complete today based on capacity and workload.",
          id: "shift-callout-planned",
          number: "03",
          target: "shift-planned",
          title: "Compare planned quantities",
        },
        {
          description:
            "Machine breakdowns and staffing shortages can change shift capacity and actual production.",
          id: "shift-callout-event",
          number: "04",
          target: "shift-event",
          title: "Manage unexpected events",
        },
        {
          description:
            "The capacity loss in Sewing reduced actual production from the planned 120 units to 90.",
          id: "shift-callout-bottleneck",
          number: "05",
          target: "shift-bottleneck",
          title: "Identify the bottleneck",
        },
        {
          description:
            "Compare planned and actual production to set priorities for the next shift.",
          id: "shift-callout-summary",
          number: "06",
          target: "shift-summary",
          title: "Evaluate the results",
        },
      ],
      categoryLabel: "Category",
      colorsLabel: "Active Colors",
      completedButtonLabel: "Shift Completed",
      completionLiveMessage:
        "The shift is complete. 96 BACKHAM units were transferred to finished goods.",
      dayUnitLabel: "days",
      differenceLabel: "Difference",
      eventCopies: {
        SEWING_MACHINE_BREAKDOWN: {
          categoryLabel: "Machine",
          description:
            "The breakdown reduced the Sewing department’s shift capacity by 25%.",
          liveMessage:
            "A machine breakdown occurred on the Sewing line. Capacity fell by 25 percent.",
          title: "Machine breakdown on the Sewing line",
        },
      },
      eventPanelTitle: "Today’s Events",
      eventWaitingLabel: "Shift events will appear here as they occur.",
      finishedGoodsLabel: "Transferred to Finished Goods",
      inputLabel: "Input",
      notificationDescription:
        "96 BACKHAM units were transferred to finished goods. Sewing finished 30 units below plan.",
      notificationTitle: "Shift completed",
      pieceUnitLabel: "units",
      plannedLabel: "Planned",
      processedProductsLabel: "Department Output",
      productTypeLabel: "Product Type",
      progressAriaLabel: "Shift progress",
      progressLabel: "Shift Progress",
      replayLabel: "Replay",
      routeLabel: "Production Route",
      runningButtonLabel: "Shift Running",
      sectionDescription:
        "Each department starts the shift with its existing work orders and available capacity. Staffing issues, machine breakdowns, and bottlenecks can change the final result.",
      sectionEyebrow: "SHIFT SIMULATION",
      sectionTitle: "Run the plan and see the factory’s actual result.",
      startButtonLabel: "Start Shift",
      statuses: {
        bottleneck: "Bottleneck",
        on_plan: "On Plan",
        under_plan: "Below Plan",
      },
      summaryDescription:
        "Compare planned and actual production, review bottlenecks, and adjust the next shift accordingly.",
      summaryPendingLabel:
        "The result summary opens when the shift is complete.",
      summaryTitle: "End-of-Shift Production Report",
      utilizationLabel: "Capacity Utilization",
      wipNotice:
        "Departments begin the shift with their existing work-in-progress inventory. Work completed today moves to the next department on the following working day.",
      workloadLabel: "Total Workload",
      workloadUnitLabel: "points / unit",
    },
  },
} as const satisfies LandingContent;
