"use server";

import { auth, clerkClient } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { client } from "@/sanity/lib/client";
import { writeClient } from "@/sanity/lib/writeClient";
import { sanityFetch } from "@/sanity/lib/live";
import { USER_PROFILE_WITH_PREFERENCES_QUERY } from "@/sanity/lib/queries/bookings";
import { getOrCreateUserProfile } from "@/lib/utils/user-profile";

export type ProfileResult = {
  success: boolean;
  message?: string;
  error?: string;
};

/**
 * DB can return partial location (lat/lng/address missing).
 * Keep this type aligned with what can actually exist.
 */
export type LocationData = {
  lat?: number;
  lng?: number;
  address?: string;
};

export type ProfilePreferences = {
  location?: LocationData;
  searchRadius?: number;
};

// --- Helpers ---
function isValidLocation(location?: LocationData): location is Required<LocationData> {
  return Boolean(
    location &&
      typeof location.lat === "number" &&
      typeof location.lng === "number" &&
      typeof location.address === "string" &&
      location.address.trim().length > 0
  );
}

function isValidRadius(radius?: number): radius is number {
  return typeof radius === "number" && Number.isFinite(radius) && radius >= 1;
}

// Complete onboarding - save preferences and set Clerk metadata
export async function completeOnboarding(
  preferences: ProfilePreferences
): Promise<ProfileResult> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const { location, searchRadius } = preferences;

    if (!isValidLocation(location)) {
      return { success: false, error: "Location is required" };
    }

    if (!isValidRadius(searchRadius)) {
      return { success: false, error: "Search radius is required" };
    }

    // Get or create user profile
    const userProfileId = await getOrCreateUserProfile(userId);

    // Update Sanity profile with location preferences
    await writeClient
      .patch(userProfileId)
      .set({
        location: {
          lat: location.lat,
          lng: location.lng,
          address: location.address,
        },
        searchRadius,
      })
      .commit();

    // Update Clerk metadata to mark onboarding as complete
    const clerk = await clerkClient();
    await clerk.users.updateUserMetadata(userId, {
      publicMetadata: {
        hasOnboarded: true,
      },
    });

    revalidatePath("/");
    revalidatePath("/classes");
    revalidatePath("/profile");

    return { success: true, message: "Onboarding completed!" };
  } catch (error) {
    console.error("Onboarding error:", error);
    return { success: false, error: "Failed to complete onboarding" };
  }
}

// Update location preferences (from profile page)
export async function updateLocationPreferences(
  preferences: ProfilePreferences
): Promise<ProfileResult> {
  try {
    const { userId } = await auth();

    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    const { location, searchRadius } = preferences;

    if (!isValidLocation(location)) {
      return { success: false, error: "Location is required" };
    }

    if (!isValidRadius(searchRadius)) {
      return { success: false, error: "Search radius is required" };
    }

    // Get user profile
    const userProfile = await client.fetch(USER_PROFILE_WITH_PREFERENCES_QUERY, {
      clerkId: userId,
    });

    if (!userProfile?._id) {
      return { success: false, error: "User profile not found" };
    }

    // Update Sanity profile
    await writeClient
      .patch(userProfile._id)
      .set({
        location: {
          lat: location.lat,
          lng: location.lng,
          address: location.address,
        },
        searchRadius,
      })
      .commit();

    revalidatePath("/");
    revalidatePath("/classes");
    revalidatePath("/profile");

    return { success: true, message: "Preferences updated!" };
  } catch (error) {
    console.error("Update preferences error:", error);
    return { success: false, error: "Failed to update preferences" };
  }
}

// Get user's location preferences
export async function getUserPreferences(): Promise<{
  location: Required<LocationData>;
  searchRadius: number;
} | null> {
  try {
    const { userId } = await auth();

    if (!userId) return null;

    const userProfile = await sanityFetch({
      query: USER_PROFILE_WITH_PREFERENCES_QUERY,
      params: { clerkId: userId },
    });

    const location = userProfile.data?.location as LocationData | undefined;
    const searchRadius = userProfile.data?.searchRadius as number | undefined;

    // Return null until user completes onboarding/preferences
    if (!isValidLocation(location) || !isValidRadius(searchRadius)) {
      return null;
    }

    return {
      location: {
        lat: location.lat,
        lng: location.lng,
        address: location.address,
      },
      searchRadius,
    };
  } catch (error) {
    console.error("Get preferences error:", error);
    return null;
  }
}

// Redirect after onboarding completion
export async function redirectAfterOnboarding() {
  redirect("/");
}
