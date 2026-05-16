import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

export async function blockExpiredTenantSubscriptions(now = new Date()) {
  const result = await prisma.tenantSubscription.updateMany({
    where: {
      status: "ACTIVE",
      currentPeriodEnd: {
        lt: now,
      },
    },
    data: {
      status: "BLOCKED",
      blockedAt: now,
      cancelAtPeriodEnd: false,
    },
  });

  logger.info("billing.subscriptions.expired_blocked", {
    status: "BLOCKED",
    checkedAt: now,
    blockedCount: result.count,
  });

  return {
    checkedAt: now,
    blockedCount: result.count,
  };
}
