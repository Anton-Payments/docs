import Link from 'next/link';
import { routeFor } from '@/lib/guide-route';

/** The product's route in place of a breadcrumb: where this guide sits, and its neighbours there. */
export function RouteBar({ url }: { url: string }) {
  const found = routeFor(url);
  if (!found) return null;
  const { route, at } = found;
  return (
    <nav className="rbar" aria-label={`${route.product} route`}>
      <span className="rb-prod">{route.product}</span>
      <ol className="rb-stages" style={{ ['--at' as string]: at }}>
        {route.stages.map((s, i) => {
          const cls = i < at ? 'done' : i === at ? 'cur' : '';
          const label = (<><span className="rb-n">{String(i + 1).padStart(2, '0')}</span>{s.n}</>);
          return (
            <li key={s.n} className={cls}>
              {s.pages[0] && i !== at ? <Link href={s.pages[0]}>{label}</Link> : <span aria-current={i === at ? 'step' : undefined}>{label}</span>}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
