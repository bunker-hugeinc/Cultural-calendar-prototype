import Link from "next/link";

export default function NotFound() {
  return (
    <div className="px-6 py-24 max-w-xl mx-auto text-center">
      <p className="text-lg font-medium mb-2">Page not found</p>
      <p className="text-sm text-apple-gray-400 mb-6">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        href="/"
        className="btn-primary-apple no-underline"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}
