import { NavLink } from "react-router-dom";

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  return (
    <aside className="h-full w-64 bg-background border-r flex flex-col">
      {/* Mobile close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="lg:hidden p-4 text-right text-xl border-b"
        >
          ✕
        </button>
      )}

      <nav className="flex-1 p-4 space-y-2">
        <NavLink to="/dashboard" className="block p-2 rounded hover:bg-muted">
          Dashboard
        </NavLink>

        <NavLink to="/campuses" className="block p-2 rounded hover:bg-muted">
          Campuses
        </NavLink>

        <NavLink to="/rooms" className="block p-2 rounded hover:bg-muted">
          Rooms
        </NavLink>

        <NavLink to="/tenants" className="block p-2 rounded hover:bg-muted">
          Tenants
        </NavLink>

        <NavLink to="/billing" className="block p-2 rounded hover:bg-muted">
          Billing
        </NavLink>

        <NavLink to="/expenses" className="block p-2 rounded hover:bg-muted">
          Expenses
        </NavLink>
      </nav>
    </aside>
  );
}
