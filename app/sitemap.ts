import type { MetadataRoute } from "next";

const siteUrl = "https://fitnesspass.vercel.app";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Add your real dynamic URLs here (fetch from Sanity, DB, etc.)
  // Example:
  // const classes = await fetchClasses();
  // const classUrls = classes.map(c => ({
  //   url: `${siteUrl}/classes/${c.slug}`,
  //   lastModified: now,
  //   changeFrequency: "weekly" as const,
  //   priority: 0.8,
  // }));

  return [
    { url: siteUrl, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteUrl}/classes`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${siteUrl}/venues`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${siteUrl}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    // ...classUrls,
  ];
}
