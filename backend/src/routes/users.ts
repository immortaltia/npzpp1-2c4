import { Router } from "express";
import { prisma } from "../db";
import { requireAuth } from "../middleware/auth";

const router = Router();

router.get("/me/events", requireAuth, async (req, res) => {
  const events = await prisma.event.findMany({
    where: { organizerId: req.auth!.userId },
    orderBy: { startDate: "asc" },
    include: { _count: { select: { rsvps: true, reviews: true } } },
  });
  res.json(events);
});

router.get("/me/rsvps", requireAuth, async (req, res) => {
  const rsvps = await prisma.rsvp.findMany({
    where: { userId: req.auth!.userId },
    orderBy: { createdAt: "desc" },
    include: {
      event: {
        include: { organizer: { select: { id: true, name: true } } },
      },
    },
  });
  res.json(rsvps);
});

export default router;
