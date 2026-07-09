import { TutorialKey, TutorialStatus } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/db";

export async function getPlayerGameRedirect(userId: string) {
  const playerProfile = await getPrisma().playerProfile.findUnique({
    where: { userId },
    select: {
      factories: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          customerOrders: {
            take: 1,
            select: { id: true },
          },
          tutorialProgress: {
            where: { tutorialKey: TutorialKey.FIRST_ORDER },
            take: 1,
            select: {
              customerOrderId: true,
              productionOrderId: true,
              status: true,
            },
          },
        },
      },
    },
  });

  const factory = playerProfile?.factories[0];

  if (!playerProfile || !factory) {
    return "/onboarding";
  }

  if (factory.customerOrders.length === 0) {
    return "/player/first-order";
  }

  const firstOrderTutorial = factory.tutorialProgress[0];
  if (
    firstOrderTutorial &&
    firstOrderTutorial.status !== TutorialStatus.COMPLETED &&
    (firstOrderTutorial.customerOrderId || firstOrderTutorial.productionOrderId)
  ) {
    return "/player/first-order/simulation";
  }

  return null;
}
