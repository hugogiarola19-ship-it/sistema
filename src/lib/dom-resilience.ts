/**
 * Browser extensions that rewrite page content (grammar/spell checkers, translators,
 * password managers) insert or move DOM nodes outside of React's control. When React
 * later tries to remove/insert a node that one of those extensions has already
 * detached or relocated, the browser throws `NotFoundError: Failed to execute
 * 'removeChild'/'insertBefore' on 'Node'` — an uncaught DOM exception that crashes
 * the whole React tree and trips the nearest error boundary ("This page didn't load"),
 * even though the app's own state is fine.
 *
 * This patches the two DOM methods to no-op instead of throwing when the node isn't
 * actually a child of the parent anymore, which is the standard mitigation for this
 * well-known class of extension interference.
 */
export function installDomResilience() {
  if (typeof window === "undefined" || typeof Node === "undefined") return;
  const proto = Node.prototype as unknown as {
    removeChild<T extends Node>(child: T): T;
    insertBefore<T extends Node>(newNode: T, referenceNode: Node | null): T;
  };
  const w = window as unknown as { __domResiliencePatched?: boolean };
  if (w.__domResiliencePatched) return;
  w.__domResiliencePatched = true;

  const originalRemoveChild = proto.removeChild;
  proto.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) return child;
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = proto.insertBefore;
  proto.insertBefore = function <T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) return newNode;
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}
