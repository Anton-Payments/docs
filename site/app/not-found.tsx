import { NotFound } from '@/components/shell/not-found';

export const metadata = { title: 'Page not found', robots: { index: false } };

export default function NotFoundPage() {
  return <NotFound />;
}
