/** Where the docs live. A preview build still describes itself by its permanent address. */
export const SITE_URL = 'https://docs.antonpayments.com';
export const ISSUES_URL = 'https://github.com/Anton-Payments/docs/issues/new';

/** A new GitHub issue about one page, with the page already named in it. */
export function reportUrl(path: string, title: string) {
  const q = new URLSearchParams({ title: `Docs: ${title}`, body: `Page: ${SITE_URL}${path}\n\nWhat's wrong or missing:\n` });
  return `${ISSUES_URL}?${q}`;
}
