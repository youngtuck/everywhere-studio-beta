/**
 * OutputLibrary.tsx — Library landing
 *
 * CO_038A: /studio/outputs now lands on the all-categories Library view
 * (every output type, sectioned by category). The previous Catalog list
 * of completed outputs from Supabase is removed for this CO; if a saved
 * sessions list returns, it lands in a follow-up.
 */
import OutputLibraryPage from "./OutputLibraryPage";

export default function OutputLibrary() {
  return <OutputLibraryPage />;
}
