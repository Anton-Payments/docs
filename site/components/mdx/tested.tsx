/** Until the snippet runner is connected, say so instead of claiming a pass. */
export function TestedBadge() {
  return <span className="tested pending" title="The snippet runner isn't connected to the sandbox yet">Snippets not yet tested in sandbox</span>;
}
