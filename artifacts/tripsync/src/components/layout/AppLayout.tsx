import { Link, useLocation } from "wouter";
import { Plane, Map, CreditCard, CheckSquare, Users, Plus, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useState } from "react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = [
    { href: "/trips", label: "My Trips", icon: Plane },
  ];

  const NavLinks = () => (
    <div className="flex flex-col gap-2 p-4">
      {navItems.map((item) => {
        const isActive = location === item.href || location.startsWith(`${item.href}/`);
        return (
          <Link href={item.href} key={item.href}>
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={`w-full justify-start ${isActive ? "bg-primary/10 text-primary" : ""}`}
              onClick={() => setMobileOpen(false)}
            >
              <item.icon className="mr-2 h-5 w-5" />
              {item.label}
            </Button>
          </Link>
        );
      })}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card/50">
        <div className="flex items-center h-16 px-6 border-b">
          <Plane className="h-6 w-6 text-primary mr-2" />
          <span className="text-xl font-bold tracking-tight text-primary">TripSync</span>
        </div>
        <div className="flex-1 overflow-auto">
          <NavLinks />
        </div>
        <div className="p-4 border-t flex justify-between items-center">
          <ThemeToggle />
        </div>
      </aside>

      {/* Mobile Header & Content */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between h-16 px-4 border-b bg-background">
          <div className="flex items-center">
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="-ml-2 mr-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-64 p-0">
                <div className="flex items-center h-16 px-6 border-b">
                  <Plane className="h-6 w-6 text-primary mr-2" />
                  <span className="text-xl font-bold tracking-tight text-primary">TripSync</span>
                </div>
                <NavLinks />
              </SheetContent>
            </Sheet>
            <span className="font-semibold text-lg">TripSync</span>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1 overflow-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}