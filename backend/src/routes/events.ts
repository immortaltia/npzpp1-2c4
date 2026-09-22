import { Router } from "express";
import { z } from "zod";
import { prisma } from "../db";
import { optionalAuth, requireAuth } from "../middleware/auth";

const router = Router();

const eventInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().min(1),
  coverImage: z.string().optional(),
  startDate: z.string(),
  location: z.string().optional(),
  isOnline: z.boolean().optional(),
  onlineUrl: z.string().optional(),
  category: z.string().min(1),
  tags: z.array(z.string()).optional(),
});

router.get("/", async (req, res) => {
  const { search, category, from, to, mode } = req.query as Record<
    string,
    string | undefined
  >;

  const where: any = {};

  if (search) {
    where.OR = [
      { title: { contains: search } },
      { description: { contains: search } },
      { tags: { contains: search } },
    ];
  }
  if (category) {
    where.category = category;
  }
  if (mode === "online") {
    where.isOnline = true;
  } else if (mode === "offline") {
    where.isOnline = false;
  }
  if (from || to) {
    where.startDate = {};
    if (from) where.startDate.gte = new Date(from);
    if (to) where.startDate.lte = new Date(to);
  }

  const events = await prisma.event.findMany({
    where,
    orderBy: { startDate: "asc" },
    include: {
      organizer: { select: { id: true, name: true } },
      _count: { select: { rsvps: true, reviews: true } },
    },
  });

  res.json(events);
});

router.get("/:id", async (req, res) => {
  const event = await prisma.event.findUnique({
    where: { id: req.params.id },
    include: {
      organizer: { select: { id: true, name: true } },
      _count: { select: { rsvps: true } },
    },
  });
  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }
  res.json(event);
});

router.post("/", requireAuth, async (req, res) => {
  const parsed = eventInputSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const data = parsed.data;

  const event = await prisma.event.create({
    data: {
      title: data.title,
      description: data.description,
      coverImage: data.coverImage,
      startDate: new Date(data.startDate),
      location: data.location ?? "",
      isOnline: data.isOnline ?? false,
      onlineUrl: data.onlineUrl,
      category: data.category,
      tags: (data.tags ?? []).join(","),
      organizerId: req.auth!.userId,
    },
  });

  res.status(201).json(event);
});

router.put("/:id", requireAuth, async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }
  if (event.organizerId !== req.auth!.userId) {
    return res.status(403).json({ error: "Only the organizer can edit this event" });
  }

  const parsed = eventInputSchema.partial().safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const data = parsed.data;

  const updated = await prisma.event.update({
    where: { id: event.id },
    data: {
      ...(data.title !== undefined && { title: data.title }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.coverImage !== undefined && { coverImage: data.coverImage }),
      ...(data.startDate !== undefined && { startDate: new Date(data.startDate) }),
      ...(data.location !== undefined && { location: data.location }),
      ...(data.isOnline !== undefined && { isOnline: data.isOnline }),
      ...(data.onlineUrl !== undefined && { onlineUrl: data.onlineUrl }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.tags !== undefined && { tags: data.tags.join(",") }),
    },
  });

  res.json(updated);
});

router.delete("/:id", requireAuth, async (req, res) => {
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }
  if (event.organizerId !== req.auth!.userId) {
    return res.status(403).json({ error: "Only the organizer can delete this event" });
  }

  await prisma.review.deleteMany({ where: { eventId: event.id } });
  await prisma.rsvp.deleteMany({ where: { eventId: event.id } });
  await prisma.event.delete({ where: { id: event.id } });

  res.status(204).send();
});

const rsvpSchema = z.object({
  status: z.enum(["GOING", "INTERESTED", "NOT_GOING"]),
});

router.post("/:id/rsvp", requireAuth, async (req, res) => {
  const parsed = rsvpSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  const rsvp = await prisma.rsvp.upsert({
    where: {
      userId_eventId: { userId: req.auth!.userId, eventId: event.id },
    },
    update: { status: parsed.data.status },
    create: {
      userId: req.auth!.userId,
      eventId: event.id,
      status: parsed.data.status,
    },
  });

  res.json(rsvp);
});

router.get("/:id/rsvp/me", requireAuth, async (req, res) => {
  const rsvp = await prisma.rsvp.findUnique({
    where: {
      userId_eventId: { userId: req.auth!.userId, eventId: req.params.id },
    },
  });
  res.json(rsvp);
});

router.get("/:id/attendees", async (req, res) => {
  const attendees = await prisma.rsvp.findMany({
    where: { eventId: req.params.id, status: "GOING" },
    include: { user: { select: { id: true, name: true } } },
  });
  res.json(attendees);
});

const reviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().min(1),
});

router.get("/:id/reviews", async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { eventId: req.params.id },
    orderBy: { createdAt: "desc" },
    include: { user: { select: { id: true, name: true } } },
  });
  res.json(reviews);
});

router.post("/:id/reviews", requireAuth, async (req, res) => {
  const parsed = reviewSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.issues[0].message });
  }
  const event = await prisma.event.findUnique({ where: { id: req.params.id } });
  if (!event) {
    return res.status(404).json({ error: "Event not found" });
  }

  const review = await prisma.review.create({
    data: {
      rating: parsed.data.rating,
      comment: parsed.data.comment,
      userId: req.auth!.userId,
      eventId: event.id,
    },
    include: { user: { select: { id: true, name: true } } },
  });

  res.status(201).json(review);
});

export default router;