import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-black text-dark dark:text-white">
      <h1 className="text-6xl font-bold mb-2">404</h1>
      <p className="text-lg text-muted mb-6">Page not found</p>
      <Link
        href="/"
        className="px-6 py-2.5 rounded-lg bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
