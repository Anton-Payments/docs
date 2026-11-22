import { defineConfig, defineDocs } from 'fumadocs-mdx/config';
import { pageSchema } from 'fumadocs-core/source/schema';
import { z } from 'zod';

export const docs = defineDocs({
  dir: 'content/docs',
  docs: {
    schema: pageSchema.extend({
      /** which console default applies, and how the page is framed */
      kind: z.enum(['home', 'quickstart', 'guide', 'concept', 'webhooks', 'changelog']).default('concept'),
      /** short label used in breadcrumbs */
      section: z.string().optional(),
      /** "Core path · 1 of 3" style kicker for guides */
      kicker: z.string().optional(),
      sidebarTitle: z.string().optional(),
    }),
  },
});

const LABELS: Record<string, string> = { bash: 'Shell', sh: 'Shell', shell: 'Shell', json: 'JSON', javascript: 'JavaScript', js: 'JavaScript', typescript: 'TypeScript', ts: 'TypeScript', php: 'PHP', go: 'Go', python: 'Python', http: 'HTTP', yaml: 'YAML', csv: 'CSV' };

/** Mintlify-style fences put a bare title after the language (```bash cURL). Turn it into title="cURL". */
function remarkBareCodeTitle() {
  return (tree: unknown) => {
    const walk = (n: { type?: string; meta?: string | null; children?: unknown[] }) => {
      if (n.type === 'code' && n.meta && !n.meta.includes('=')) n.meta = `title="${n.meta.trim()}"`;
      else if (n.type === 'code' && !n.meta && (n as { lang?: string }).lang) {
        const l = (n as { lang?: string }).lang!;
        const label = LABELS[l];
        if (label) n.meta = `title="${label}"`;
      }
      (n.children as typeof n[] | undefined)?.forEach(walk);
    };
    walk(tree as never);
  };
}

export default defineConfig({
  mdxOptions: {
    remarkPlugins: [remarkBareCodeTitle],
    rehypeCodeOptions: {
      themes: { light: 'github-light', dark: 'github-dark' },
      defaultColor: false,
    },
  },
});
