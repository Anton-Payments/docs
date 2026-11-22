import { PRODUCTS } from '@/lib/nav';

/*
  Where each guide sits on its product's route: the stages the home page walks and the route strip
  shows. Read from the sidebar config (lib/nav.ts), so a page is filed in one place: its section
  names the stage, or the item says it with `stage`. Core path pages come first in their stage.
*/

export type RouteStage = { n: string; pages: string[] };
export type GuideRoute = { product: string; stages: RouteStage[] };

export const GUIDE_ROUTES: GuideRoute[] = PRODUCTS.map((p) => {
  const items = p.sections.flatMap((s) => s.items.map((i) => ({ href: i.href, stage: i.stage ?? (p.stages.includes(s.title) ? s.title : undefined) })));
  return {
    product: p.label,
    stages: p.stages.map((n) => ({ n, pages: [...new Set(items.filter((i) => i.stage === n).map((i) => i.href))] })),
  };
});

export function routeFor(url: string) {
  for (const r of GUIDE_ROUTES) {
    const at = r.stages.findIndex((s) => s.pages.includes(url));
    if (at >= 0) return { route: r, at };
  }
  return null;
}
