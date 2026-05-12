import type { MetadataRoute } from "next";
import { env } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        disallow: ["/sign-in", "/dashboard", "/squads/", "/players/"],
        allow: ["/public/"],
      },
    ],
    ...(env.NEXT_PUBLIC_APP_URL && {
      sitemap: `${env.NEXT_PUBLIC_APP_URL}/sitemap.xml`,
    }),
  };
}
