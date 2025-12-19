import { Bell, ChevronDown, Search, AlertCircle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useCampuses } from "@/hooks/useCampuses";
import { useNavigate } from "react-router-dom";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { format } from "date-fns";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showCampusFilter?: boolean;
  selectedCampus?: string;
  onCampusChange?: (campus: string) => void;
}

export function Header({
  title,
  subtitle,
  showCampusFilter = true,
  selectedCampus = "all",
  onCampusChange,
}: HeaderProps) {
  const { profile, signOut } = useAuth();
  const { campuses } = useCampuses();
  const navigate = useNavigate();
  const { stats } = useDashboardStats(selectedCampus === "all" ? undefined : selectedCampus);

  const allCampuses = [{ id: "all", name: "All Campuses" }, ...campuses];
  const currentCampus = allCampuses.find((c) => c.id === selectedCampus);

  const initials = profile?.full_name
    ?.split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2) || "U";

  const handleLogout = async () => {
    await signOut();
    navigate("/login");
  };

  const totalNotifications = stats.upcomingBills.length + stats.overdueBills.length;

  return (
    <header className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border">
      <div className="flex items-center justify-between h-16 px-6">
        <div className="flex items-center gap-6">
          <div>
            <h1 className="text-xl font-semibold text-foreground">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
          </div>

          {showCampusFilter && campuses.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2 bg-card border-border text-foreground hover:bg-muted">
                  <span className="text-sm">{currentCampus?.name || "All Campuses"}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 bg-popover border-border">
                {allCampuses.map((campus) => (
                  <DropdownMenuItem
                    key={campus.id}
                    onClick={() => onCampusChange?.(campus.id)}
                    className="cursor-pointer"
                  >
                    {campus.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="w-64 pl-10 bg-muted/50 border-transparent focus:border-primary focus:bg-card"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground">
                <Bell className="w-5 h-5" />
                {totalNotifications > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-medium">
                    {totalNotifications > 9 ? "9+" : totalNotifications}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 bg-popover border-border">
              <DropdownMenuLabel className="font-semibold">Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              
              {stats.overdueBills.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-xs text-destructive font-medium flex items-center gap-1">
                    <AlertCircle className="w-3 h-3" /> Overdue Bills
                  </DropdownMenuLabel>
                  {stats.overdueBills.slice(0, 3).map((bill) => (
                    <DropdownMenuItem 
                      key={bill.id} 
                      className="cursor-pointer flex flex-col items-start py-2"
                      onClick={() => navigate("/billing")}
                    >
                      <span className="font-medium text-sm">{bill.tenantName} - {bill.roomNo}</span>
                      <span className="text-xs text-destructive">
                        ₹{bill.amount.toLocaleString()} • Due: {format(new Date(bill.dueDate), "dd MMM")}
                      </span>
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                </>
              )}
              
              {stats.upcomingBills.length > 0 && (
                <>
                  <DropdownMenuLabel className="text-xs text-warning font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Upcoming Bills
                  </DropdownMenuLabel>
                  {stats.upcomingBills.slice(0, 3).map((bill) => (
                    <DropdownMenuItem 
                      key={bill.id} 
                      className="cursor-pointer flex flex-col items-start py-2"
                      onClick={() => navigate("/reminders")}
                    >
                      <span className="font-medium text-sm">{bill.tenantName} - {bill.roomNo}</span>
                      <span className="text-xs text-muted-foreground">
                        ₹{bill.amount.toLocaleString()} • Due: {format(new Date(bill.dueDate), "dd MMM")}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </>
              )}
              
              {totalNotifications === 0 && (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              )}
              
              {totalNotifications > 0 && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    className="cursor-pointer text-center justify-center text-primary font-medium"
                    onClick={() => navigate("/billing")}
                  >
                    View All Bills
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 text-foreground hover:bg-muted">
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-sm font-semibold text-primary">{initials}</span>
                </div>
                <div className="hidden lg:block text-left">
                  <p className="text-sm font-medium">{profile?.full_name || "User"}</p>
                  <p className="text-xs text-muted-foreground">Manager</p>
                </div>
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-popover border-border">
              <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/profile")}>
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-destructive" onClick={handleLogout}>
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
