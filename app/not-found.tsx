import Link from "next/link";

export default function NotFound() {
  return (
    <div className="px-6 py-24 max-w-xl mx-auto text-center">
      <p className="text-lg font-medium mb-2">Page not found</p>
      <p className="text-sm text-muted-foreground mb-6">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        className="inline-flex items-center rounded-lg bg-foreground text-background px-4 py-2 text-sm font-medium hover:bg-foreground/80 transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
