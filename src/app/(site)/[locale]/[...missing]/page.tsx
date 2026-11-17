import { notFound } from "next/navigation";

/** Any address the site does not have: the branded "not found" page, in the visitor's language. */
export default function Missing() {
  notFound();
}
