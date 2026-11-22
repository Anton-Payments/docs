import { reportUrl } from '@/lib/site';

/** The end of every page: a way to tell us when it's wrong, with the page already named. */
export function ReportLink({ path, title }: { path: string; title: string }) {
  return (
    <p className="report">
      Something wrong or missing here?{' '}
      <a href={reportUrl(path, title)} target="_blank" rel="noreferrer">Open an issue<span className="sr-only"> (opens GitHub in a new tab)</span> ↗</a>
    </p>
  );
}
