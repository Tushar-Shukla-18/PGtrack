export function Header({ title }: { title?: string }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-4 border-b">
      <h1 className="text-xl font-semibold">
        {title || "Dashboard"}
      </h1>
    </div>
  );
}
