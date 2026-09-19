import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  const siteUrl = (loadEnv(mode, process.cwd(), "").VITE_SITE_URL || "https://duimagetools.vercel.app").replace(/\/$/, "");
  return { plugins: [react(), { name: "site-url", transformIndexHtml: html => html.replaceAll("%SITE_URL%", siteUrl) }] };
});
