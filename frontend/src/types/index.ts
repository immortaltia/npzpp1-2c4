export type RsvpStatus = "GOING" | "INTERESTED" | "NOT_GOING";

export interface User {
  id: string;
  email: string;
  name: string;
  bio?: string | null;
  avatar?: string | null;
}

export interface Organizer {
  id: string;
  name: string;
  bio?: string | null;
}

export interface EventCounts {
  rsvps: number;
  reviews: number;
}

export interface EventItem {
  id: string;
  title: string;
  description: string;
  coverImage?: string | null;
  startDate: string;
  location: string;
  isOnline: boolean;
  onlineUrl?: string | null;
  category: string;
  tags: string;
  createdAt: string;
  organizerId: string;
  organizer: Organizer;
  _count: EventCounts;
}

export interface Rsvp {
  id: string;
  status: RsvpStatus;
  createdAt: string;
  userId: string;
  eventId: string;
}

export interface RsvpWithEvent extends Rsvp {
  event: EventItem;
}

export interface Attendee {
  id: string;
  status: RsvpStatus;
  user: {
    id: string;
    name: string;
    avatar?: string | null;
  };
}

export interface Review {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string | null;
  };
}
