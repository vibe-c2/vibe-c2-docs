// @ts-check
import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';
import tailwindcss from '@tailwindcss/vite';

// Deployed to GitHub Pages at https://vibe-c2.github.io/vibe-c2-docs/
export default defineConfig({
  site: 'https://vibe-c2.github.io',
  base: '/vibe-c2-docs/',
  vite: {
    plugins: [tailwindcss()],
  },
  integrations: [
    // astro-mermaid must run before Starlight so it can transform ```mermaid fences.
    mermaid({
      theme: 'default',
      autoTheme: true,
    }),
    starlight({
      title: 'Vibe C2 Docs',
      description:
        'Product and technical documentation for the Vibe C2 project',
      social: [
        {
          icon: 'github',
          label: 'GitHub',
          href: 'https://github.com/vibe-c2/vibe-c2-docs',
        },
      ],
      editLink: {
        baseUrl: 'https://github.com/vibe-c2/vibe-c2-docs/edit/main/',
      },
      // English at the root (/), Ukrainian under /uk/ — matches the previous site.
      defaultLocale: 'root',
      locales: {
        root: { label: 'English', lang: 'en' },
        uk: { label: 'Українська', lang: 'uk' },
      },
      customCss: ['./src/styles/global.css'],
      components: {
        // Full-width content + floating "On this page" overlay instead of a TOC column.
        TwoColumnContent: './src/overrides/TwoColumnContent.astro',
      },
      sidebar: [
        {
          label: 'Home',
          translations: { uk: 'Головна' },
          link: '/',
        },
        {
          label: 'Foundations',
          translations: { uk: 'Основи' },
          items: [
            { slug: 'project-scope' },
            { slug: 'tech-requirements' },
            { slug: 'architecture' },
            { slug: 'core-infrastructure' },
            { slug: 'core-responsibilities' },
            { slug: 'module-types' },
            { slug: 'message-flow-full' },
            { slug: 'future-steps' },
          ],
        },
        {
          label: 'Channels',
          translations: { uk: 'Канали' },
          items: [
            { slug: 'message-flow' },
            { slug: 'message-contracts' },
            { slug: 'channel-obfuscation-profiles' },
            { slug: 'channel-obfuscation-yaml-reference' },
            { slug: 'channel-obfuscation-examples' },
            { slug: 'golang-package-http-channel' },
            { slug: 'golang-package-telegram-channel' },
            { slug: 'channel-authoring-15min' },
          ],
        },
        {
          label: 'Go Packages Ecosystem',
          translations: { uk: 'Екосистема Go-пакетів' },
          items: [
            { slug: 'golang-packages' },
            { slug: 'golang-package-protocol' },
            { slug: 'golang-package-channel-core' },
          ],
        },
        {
          label: 'ADR',
          translations: { uk: 'ADR' },
          items: [
            { slug: 'adr' },
            { slug: 'adr/0001-golang-channel-core-foundation' },
          ],
        },
      ],
    }),
  ],
});
