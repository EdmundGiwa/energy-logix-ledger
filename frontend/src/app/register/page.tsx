import { redirect } from "next/navigation";

/**
 * Self-serve sign-up is closed: prospects book a tailored demo, and accounts are set up
 * by the Offshora team with only the modules each customer needs.
 */
export default function RegisterPage() {
  redirect("/book-demo");
}
