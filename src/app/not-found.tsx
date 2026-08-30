import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <p className="eyebrow">Page not found</p>
      <h1>This path is not part of the workspace.</h1>
      <p>Your browser data has not been changed.</p>
      <Link className="button primary" href="/">Return to How I Choose</Link>
    </main>
  );
}
