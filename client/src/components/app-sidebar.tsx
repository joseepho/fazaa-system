import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  FileText,
  Plus,
  BarChart3,
} from "lucide-react";

const menuItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
  },
  {
    title: "Complaints",
    url: "/complaints",
    icon: FileText,
  },
  {
    title: "Add Complaint",
    url: "/complaints/new",
    icon: Plus,
  },
  {
    title: "Reports",
    url: "/reports",
    icon: BarChart3,
  },
];

export function AppSidebar() {
  const [location] = useLocation();

  const isActive = (url: string) => {
    if (url === "/") {
      return location === "/";
    }
    return location.startsWith(url);
  };

  return (
    <Sidebar className="border-r-0">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0066CC] to-[#0055AA]" />
      <SidebarHeader className="relative z-10 h-16 flex items-center justify-center border-b border-white/10">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
            <span className="text-white font-bold text-lg">F</span>
          </div>
          <div className="flex flex-col">
            <span className="text-white font-bold text-lg leading-tight">Fazzaa Pro</span>
            <span className="text-white/60 text-xs leading-tight">فزّاع برو</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="relative z-10 py-4">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.title} className="px-3">
              <SidebarMenuButton
                asChild
                className={`
                  w-full justify-start gap-3 rounded-lg py-3 px-4 text-white/80 
                  transition-all duration-200
                  hover:bg-white/10 hover:text-white
                  ${isActive(item.url) ? "bg-white/20 text-white font-medium" : ""}
                `}
                data-testid={`nav-${item.title.toLowerCase().replace(/\s+/g, "-")}`}
              >
                <Link href={item.url}>
                  <item.icon className="w-5 h-5" />
                  <span>{item.title}</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="relative z-10 p-4 border-t border-white/10">
        <div className="text-white/50 text-xs text-center">
          Complaint Management System
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
