import type { MetadataRoute } from "next";

/** Lets patients add ShifaIn to their phone's home screen with the proper icon. */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShifaIn — Global health journeys to India",
    short_name: "ShifaIn",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#3570b5",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
