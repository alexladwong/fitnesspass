// Note: AI SDK 6 beta has evolving types - disabling TS checking for tool definitions
import { tool } from "ai";
import { z } from "zod";
import { client } from "@/sanity/lib/client";
import {
  AI_CATEGORIES_QUERY,
  AI_SEARCH_VENUES_QUERY,
  AI_USER_UPCOMING_BOOKINGS_QUERY,
  AI_USER_ALL_BOOKINGS_QUERY,
  AI_USER_PAST_BOOKINGS_QUERY,
} from "@/sanity/lib/queries/ai";
import { defineQuery } from "next-sanity";

/** -----------------------------
 * Helpers
 * ------------------------------*/
type Nullable<T> = T | null;

function asStringOrNull(v: unknown): string | null {
  return typeof v === "string" && v.trim().length > 0 ? v : null;
}

function asNumberOrNull(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

/** -----------------------------
 * Tool: Search for classes
 * ------------------------------*/
export const searchClasses = tool({
  description:
    "Search for fitness classes by name, category, instructor, or tier level. Only returns classes with upcoming sessions available. Use this to help users find classes they're interested in.",
  inputSchema: z.object({
    query: z
      .string()
      .optional()
      .describe("Text to search for in class names or descriptions"),
    category: z
      .string()
      .optional()
      .describe("Category name like 'Yoga', 'HIIT', 'Pilates', etc."),
    instructor: z.string().optional().describe("Instructor name to search for"),
    tierLevel: z
      .enum(["basic", "performance", "champion"])
      .optional()
      .describe("Tier level filter"),
  }),
  execute: async ({ query, category, instructor, tierLevel }) => {
    let filter = `_type == "activity" && count(*[_type == "classSession" && activity._ref == ^._id && startTime > now() && status == "scheduled"]) > 0`;

    if (query) {
      filter += ` && (name match "*${query}*" || instructor match "*${query}*")`;
    }
    if (instructor) {
      filter += ` && instructor match "*${instructor}*"`;
    }
    if (tierLevel) {
      filter += ` && tierLevel == "${tierLevel}"`;
    }

    const groqQuery = defineQuery(`*[${filter}] | order(name asc) [0...10] {
      _id,
      name,
      instructor,
      duration,
      tierLevel,
      category->{name}
    }`);

    const activities = await client.fetch(groqQuery);

    let filtered = activities;
    if (category) {
      filtered = activities.filter((a: { category?: { name: string } }) =>
        a.category?.name?.toLowerCase().includes(category.toLowerCase())
      );
    }

    return {
      count: filtered.length,
      classes: filtered,
    };
  },
});

/** -----------------------------
 * Tool: Get upcoming sessions for a specific class
 * ------------------------------*/
type SessionFromQuery = {
  _id: string;
  startTime: string | null;
  maxCapacity: number | null;
  currentBookings: number | null;
  activity: {
    name: string | null;
    instructor: string | null;
    duration: number | null;
    tierLevel: string | null;
  } | null;
  venue: { name: string | null; city: string | null } | null;
};

export const getClassSessions = tool({
  description:
    "Get upcoming scheduled sessions for a specific class or activity. Shows dates, times, venues, and availability.",
  inputSchema: z.object({
    className: z
      .string()
      .describe("The name of the class to find sessions for"),
  }),
  execute: async ({ className }) => {
    const sessionsQuery = defineQuery(`*[
      _type == "classSession" 
      && activity->name match $classNamePattern 
      && startTime > now() 
      && status == "scheduled"
    ] | order(startTime asc) [0...10] {
      _id,
      startTime,
      maxCapacity,
      "currentBookings": count(*[_type == "booking" && classSession._ref == ^._id && status == "confirmed"]),
      activity->{name, instructor, duration, tierLevel},
      venue->{name, "city": address.city}
    }`);

    const sessions = (await client.fetch(sessionsQuery, {
      classNamePattern: `*${className}*`,
    })) as SessionFromQuery[];

    return {
      count: sessions.length,
      sessions: sessions.map((s) => {
        const maxCapacity = s.maxCapacity ?? 0;
        const currentBookings = s.currentBookings ?? 0;

        return {
          id: s._id,
          startTime: asStringOrNull(s.startTime),
          spotsAvailable: Math.max(0, maxCapacity - currentBookings),
          activity: s.activity
            ? {
                name: asStringOrNull(s.activity.name),
                instructor: asStringOrNull(s.activity.instructor),
                duration: asNumberOrNull(s.activity.duration),
                tierLevel: asStringOrNull(s.activity.tierLevel),
              }
            : null,
          venue: s.venue
            ? {
                name: asStringOrNull(s.venue.name),
                city: asStringOrNull(s.venue.city),
              }
            : null,
        };
      }),
    };
  },
});

/** -----------------------------
 * Tool: Search venues
 * ------------------------------*/
export const searchVenues = tool({
  description:
    "Search for fitness venues/studios by name or city. Returns venue details including address and amenities.",
  inputSchema: z.object({
    name: z.string().optional().describe("Venue name to search for"),
    city: z.string().optional().describe("City to search in"),
  }),
  execute: async ({ name, city }) => {
    if (!name && !city) {
      const venues = await client.fetch(AI_SEARCH_VENUES_QUERY);
      return {
        count: venues.length,
        venues,
      };
    }

    let filter = `_type == "venue"`;
    if (name) filter += ` && name match "*${name}*"`;
    if (city) filter += ` && address.city match "*${city}*"`;

    const venuesQuery = defineQuery(`*[${filter}] | order(name asc) [0...10] {
      _id,
      name,
      description,
      address,
      amenities
    }`);

    const venues = await client.fetch(venuesQuery);

    return {
      count: venues.length,
      venues,
    };
  },
});

/** -----------------------------
 * Tool: Get categories
 * ------------------------------*/
export const getCategories = tool({
  description:
    "Get all available fitness class categories. Useful when users want to know what types of classes are offered.",
  inputSchema: z.object({}),
  execute: async () => {
    const categories = await client.fetch(AI_CATEGORIES_QUERY);
    return { count: categories.length, categories };
  },
});

/** -----------------------------
 * Tool: Subscription info
 * ------------------------------*/
export const getSubscriptionInfo = tool({
  description:
    "Get information about subscription tiers, pricing, and what classes each tier can access.",
  inputSchema: z.object({}),
  execute: async () => {
    return {
      tiers: [
        {
          name: "Basic",
          monthlyPrice: 29,
          annualPrice: 290,
          classesPerMonth: 5,
          classAccess: "Basic-tier classes only",
          perClassCost: "$5.80",
        },
        {
          name: "Performance",
          monthlyPrice: 59,
          annualPrice: 590,
          classesPerMonth: 12,
          classAccess: "Basic + Performance classes",
          perClassCost: "$4.92",
        },
        {
          name: "Champion",
          monthlyPrice: 99,
          annualPrice: 990,
          classesPerMonth: "Unlimited",
          classAccess: "All classes",
          perClassCost: "Best value for 8+ classes/month",
        },
      ],
      freeTrialDays: 3,
      annualDiscount: "17%",
    };
  },
});

/** -----------------------------
 * Tool: Recommendations
 * ------------------------------*/
export const getRecommendations = tool({
  description:
    "Get personalized class recommendations based on user preferences like fitness goals, preferred time of day, or difficulty level. Only returns classes with upcoming sessions available.",
  inputSchema: z.object({
    fitnessGoal: z
      .enum(["strength", "flexibility", "cardio", "relaxation", "weight-loss"])
      .optional()
      .describe("User's fitness goal"),
    preferredDuration: z
      .number()
      .optional()
      .describe("Preferred class duration in minutes"),
    tierLevel: z
      .enum(["basic", "performance", "champion"])
      .optional()
      .describe("User's subscription tier"),
  }),
  execute: async ({ fitnessGoal, preferredDuration, tierLevel }) => {
    const goalCategories: Record<string, string[]> = {
      strength: ["HIIT", "Strength", "CrossFit"],
      flexibility: ["Yoga", "Pilates", "Stretching"],
      cardio: ["Cycling", "Running", "Dance", "HIIT"],
      relaxation: ["Yoga", "Meditation", "Pilates"],
      "weight-loss": ["HIIT", "Cycling", "Boot Camp"],
    };

    let filter = `_type == "activity" && count(*[_type == "classSession" && activity._ref == ^._id && startTime > now() && status == "scheduled"]) > 0`;

    if (tierLevel) {
      const tierLevels =
        tierLevel === "champion"
          ? ["basic", "performance", "champion"]
          : tierLevel === "performance"
          ? ["basic", "performance"]
          : ["basic"];
      filter += ` && tierLevel in ${JSON.stringify(tierLevels)}`;
    }

    if (preferredDuration) {
      filter += ` && duration <= ${preferredDuration + 15} && duration >= ${
        preferredDuration - 15
      }`;
    }

    const recommendationsQuery = defineQuery(`*[${filter}] | order(name asc) [0...20] {
      _id,
      name,
      instructor,
      duration,
      tierLevel,
      category->{name}
    }`);

    const activities = await client.fetch(recommendationsQuery);

    let recommended = activities;
    if (fitnessGoal && goalCategories[fitnessGoal]) {
      const targetCategories = goalCategories[fitnessGoal];
      recommended = activities.filter(
        (a: { category?: { name: string } }) =>
          a.category &&
          targetCategories.some((c) =>
            a.category?.name.toLowerCase().includes(c.toLowerCase())
          )
      );
      if (recommended.length === 0) recommended = activities;
    }

    return {
      count: Math.min(recommended.length, 5),
      recommendations: recommended.slice(0, 5),
      basedOn: { fitnessGoal, preferredDuration, tierLevel },
    };
  },
});

/** -----------------------------
 * Tool: Get user's bookings
 * ------------------------------*/
type BookingFromQuery = {
  _id: string;
  status: "cancelled" | "confirmed" | "attended" | "noShow" | null;
  createdAt: string | null;
  attendedAt?: string | null;
  classSession: Nullable<{
    _id: string;
    startTime: string | null;
    activity: Nullable<{
      name: string | null;
      instructor: string | null;
      duration: number | null;
    }>;
    venue: Nullable<{
      name: string | null;
      city: string | null;
    }>;
  }>;
};

export const getUserBookings = tool({
  description:
    "Get the current user's bookings. Can filter by upcoming or past bookings. Use this when users ask about their scheduled classes, booking history, or want to know what classes they have coming up. The clerkId is provided in the system context.",
  inputSchema: z.object({
    type: z
      .enum(["upcoming", "past", "all"])
      .optional()
      .describe(
        "Filter bookings: 'upcoming' for future classes, 'past' for completed, 'all' for everything. Defaults to 'upcoming'."
      ),
    clerkId: z
      .string()
      .describe(
        "The user's Clerk ID from the system context. Extract this from the system message."
      ),
  }),
  execute: async ({ type = "upcoming", clerkId }) => {
    if (!clerkId) {
      return {
        error: "User not authenticated",
        count: 0,
        bookings: [],
      };
    }

    const query =
      type === "past"
        ? AI_USER_PAST_BOOKINGS_QUERY
        : type === "all"
        ? AI_USER_ALL_BOOKINGS_QUERY
        : AI_USER_UPCOMING_BOOKINGS_QUERY;

    const bookings = (await client.fetch(query, { clerkId })) as BookingFromQuery[];

    return {
      count: bookings.length,
      type,
      bookings: bookings.map((b) => ({
        id: b._id,
        sessionId: b.classSession?._id ?? null,
        status: b.status ?? null,
        bookedAt: b.createdAt ?? null,
        attendedAt: b.attendedAt ?? null,
        class: b.classSession?.activity?.name ?? null,
        instructor: b.classSession?.activity?.instructor ?? null,
        duration: b.classSession?.activity?.duration ?? null,
        dateTime: b.classSession?.startTime ?? null,
        venue: b.classSession?.venue?.name ?? null,
        city: b.classSession?.venue?.city ?? null,
      })),
    };
  },
});

/** -----------------------------
 * Export all tools
 * ------------------------------*/
export const aiTools = {
  searchClasses,
  getClassSessions,
  searchVenues,
  getCategories,
  getSubscriptionInfo,
  getRecommendations,
  getUserBookings,
};
