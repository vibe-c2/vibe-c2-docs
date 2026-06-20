// @ts-check
import { defineConfig } from "astro/config";
import starlight from "@astrojs/starlight";
import mermaid from "astro-mermaid";
import tailwindcss from "@tailwindcss/vite";

// Deployed to GitHub Pages at https://vibe-c2.github.io/vibe-c2-docs/
export default defineConfig({
  site: "https://vibe-c2.github.io",
  base: "/vibe-c2-docs/",
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    // astro-mermaid must run before Starlight so it can transform ```mermaid fences.
    mermaid({
      theme: "default",
      autoTheme: true,
    }),
    starlight({
      title: "Vibe C2 Docs",
      description:
        "Product and technical documentation for the Vibe C2 project",
      social: [
        {
          icon: "github",
          label: "GitHub",
          href: "https://github.com/vibe-c2/vibe-c2-docs",
        },
      ],
      editLink: {
        baseUrl: "https://github.com/vibe-c2/vibe-c2-docs/edit/main/",
      },
      // English only.
      defaultLocale: "root",
      locales: {
        root: { label: "English", lang: "en" },
      },
      customCss: ["./src/styles/global.css"],
      components: {
        // Full-width content + floating "On this page" overlay instead of a TOC column.
        TwoColumnContent: "./src/overrides/TwoColumnContent.astro",
      },
      sidebar: [
        {
          label: "Home",
          link: "/",
        },
        {
          label: "Foundations",
          items: [
            { slug: "project-scope" },
            { slug: "tech-requirements" },
            { slug: "architecture" },
            { slug: "core-infrastructure" },
            { slug: "core-responsibilities" },
            { slug: "module-types" },
            { slug: "message-flow-full" },
            { slug: "future-steps" },
          ],
        },
        {
          label: "Channels",
          items: [
            { slug: "message-flow" },
            { slug: "channel-transposition-profiles" },
            { slug: "channel-transposition-yaml-reference" },
            { slug: "channel-transposition-examples" },
            { slug: "channel-authoring-15min" },
          ],
        },
        {
          label: "Contracts",
          items: [
            { slug: "contracts/overview" },
            { slug: "contracts/amqp-envelope" },
            { slug: "contracts/amqp-conventions" },
            { slug: "contracts/module-lifecycle" },
            { slug: "contracts/channel-core-sync" },
            { slug: "contracts/channel-core-rpc" },
          ],
        },
        {
          label: "ADR",
          items: [
            { slug: "adr" },
            { slug: "adr/0001-golang-channel-core-foundation" },
            { slug: "adr/0002-amqp-contract-conventions" },
            { slug: "adr/0003-module-registration-lifecycle" },
          ],
        },
      ],
    }),
  ],
});
