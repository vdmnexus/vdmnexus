/**
 * MDX component map. Extends Fumadocs' defaults with VDM Nexus
 * custom components so any .mdx file under content/docs can write
 * `<LastVerified ... />` or `<OpenInStackBlitz ... />` without an
 * import statement.
 */

import defaultMdxComponents from "fumadocs-ui/mdx";
import type { MDXComponents } from "mdx/types";

import { LastVerified } from "./last-verified";
import { OpenInStackBlitz } from "./open-in-stackblitz";

export function getMDXComponents(
  override?: MDXComponents
): MDXComponents {
  return {
    ...defaultMdxComponents,
    LastVerified,
    OpenInStackBlitz,
    ...override,
  };
}
