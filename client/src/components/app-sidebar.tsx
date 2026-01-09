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
  Settings,
  LogOut,
  Users,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

const menuItems = [
  {
    title: "لوحة التحكم",
    url: "/",
    icon: LayoutDashboard,
    permission: "view_dashboard",
  },
  {
    title: "الشكاوى",
    url: "/complaints",
    icon: FileText,
    permission: "view_complaints",
  },
  {
    title: "إضافة شكوى",
    url: "/complaints/new",
    icon: Plus,
    permission: "create_complaint",
  },
  {
    title: "التقارير",
    url: "/reports",
    icon: BarChart3,
    permission: "view_reports",
  },
  {
    title: "تقييمات الفنيين",
    url: "/evaluations",
    icon: Star,
    permission: "view_evaluations_page",
  },

  {
    title: "الإعدادات",
    url: "/settings",
    icon: Settings,
    permission: "view_settings",
  },
];

export function AppSidebar() {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  const isActive = (url: string) => {
    if (url === "/") {
      return location === "/";
    }
    return location.startsWith(url);
  };

  const hasPermission = (permission: string) => {
    if (!user) return false;
    if (user.role === "Admin") return true;
    return user.permissions?.includes(permission) || false;
  };

  const filteredMenuItems = menuItems.filter(item => {
    if (item.url === "/evaluations") {
      // Allow if explicit page view permission OR legacy data view permissions are present
      // Checked: 'Technician List' (view_technicians) permission grants access
      return hasPermission("view_evaluations_page") ||
        hasPermission("view_evaluations") ||
        hasPermission("view_technicians");
    }
    return hasPermission(item.permission);
  });

  return (
    <Sidebar className="border-r-0" side="right">
      <div className="absolute inset-0 bg-gradient-to-b from-[#0066CC] to-[#0055AA]" />
      <SidebarHeader className="relative z-10 h-16 flex items-center justify-center border-b border-white/10">
        <Link href="/" className="flex items-center gap-2">
          <img src="/logo.png" alt="Fazaa Pro Logo" className="w-10 h-10 object-contain" />
          <div className="flex flex-col">
            <span className="text-white font-bold text-lg leading-tight">فزاع برو</span>
            <span className="text-white/60 text-xs leading-tight">نظام إدارة الشكاوى</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent className="relative z-10 py-4">
        <SidebarMenu>
          {filteredMenuItems.map((item) => (
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
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-white/80 hover:bg-white/10 hover:text-white"
          onClick={() => logoutMutation.mutate()}
          data-testid="button-logout"
        >
          <LogOut className="w-5 h-5" />
          <span>تسجيل الخروج</span>
        </Button>
        <div className="text-white/50 text-xs text-center mt-4">
          نظام إدارة الشكاوى
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
