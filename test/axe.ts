import axe from "axe-core";

/**
 * WCAG 2.2 A/AA violations in a rendered tree. Colour contrast is checked in the browser
 * end-to-end tests instead, because jsdom does not compute styles.
 */
export async function axeViolations(root: Element = document.body, { page = false } = {}) {
  const { violations } = await axe.run(root, {
    runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
    rules: {
      "color-contrast": { enabled: false },
      // A component rendered on its own has no page landmarks around it.
      region: { enabled: page },
      "landmark-one-main": { enabled: page },
      "page-has-heading-one": { enabled: page },
    },
  });
  return violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
}
