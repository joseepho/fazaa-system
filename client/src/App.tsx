import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import RequestsDashboard from "@/pages/requests/RequestsDashboard";
import { Loader2 } from "lucide-react";
import Dashboard from "@/pages/dashboard";
import ComplaintsList from "@/pages/complaints-list";
import ComplaintForm from "@/pages/complaint-form";
import ComplaintDetails from "@/pages/complaint-details";
import Reports from "@/pages/reports";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Settings from "@/pages/settings";

import EvaluationsDashboard from "@/pages/evaluations/EvaluationsDashboard";
import RequestDetails from "@/pages/requests/RequestDetails";

function ProtectedRoute({ component: Component, ...rest }: any) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/auth" />;
  }

  return <Component {...rest} />;
}

import { NotificationProvider } from "@/hooks/use-notifications";
import { NotificationsBell } from "@/components/notifications-bell";
import { ErrorBoundary } from "@/components/error-boundary";

import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";

function AuthenticatedLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const style = {
    "--sidebar-width": "16rem",
    "--sidebar-width-icon": "3rem",
  };

  return (
    <SidebarProvider style={style as React.CSSProperties}>
      <div className="flex min-h-screen w-full">
        <AppSidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <header className="sticky top-0 z-40 flex items-center h-16 px-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <SidebarTrigger data-testid="button-sidebar-toggle" className="ml-4" />
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <ModeToggle />
              {user?.role === "Admin" && <NotificationsBell />}
            </div>
          </header>
          <main className="flex-1 p-4 lg:p-8 overflow-auto">
            {children}
          </main>
          <footer className="py-4 text-center text-sm text-muted-foreground border-t bg-background">
            <p>تم تطوير هذا النظام بواسطة <span className="font-bold text-primary">ENG Youssef EL captain</span></p>
          </footer>
        </div>
      </div>
    </SidebarProvider>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/">
        <AuthenticatedLayout>
          <ProtectedRoute component={Dashboard} />
        </AuthenticatedLayout>
      </Route>
      <Route path="/complaints">
        <AuthenticatedLayout>
          <ProtectedRoute component={ComplaintsList} />
        </AuthenticatedLayout>
      </Route>
      <Route path="/complaints/new">
        <AuthenticatedLayout>
          <ProtectedRoute component={ComplaintForm} />
        </AuthenticatedLayout>
      </Route>
      <Route path="/complaints/:id/edit">
        <AuthenticatedLayout>
          <ProtectedRoute component={ComplaintForm} />
        </AuthenticatedLayout>
      </Route>
      <Route path="/complaints/:id">
        <AuthenticatedLayout>
          <ProtectedRoute component={ComplaintDetails} />
        </AuthenticatedLayout>
      </Route>
      <Route path="/reports">
        <AuthenticatedLayout>
          <ProtectedRoute component={Reports} />
        </AuthenticatedLayout>
      </Route>
      <Route path="/settings">
        <AuthenticatedLayout>
          <ProtectedRoute component={Settings} />
        </AuthenticatedLayout>
      </Route>
      <Route path="/evaluations">
        <AuthenticatedLayout>
          <ProtectedRoute component={EvaluationsDashboard} />
        </AuthenticatedLayout>
      </Route>
      <Route path="/requests/:id">
        <AuthenticatedLayout>
          <ProtectedRoute component={RequestDetails} />
        </AuthenticatedLayout>
      </Route>
      <Route path="/requests">
        <AuthenticatedLayout>
          <ProtectedRoute component={RequestsDashboard} />
        </AuthenticatedLayout>
      </Route>

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="vite-ui-theme">
        <AuthProvider>
          <NotificationProvider>
            <TooltipProvider>
              <ErrorBoundary>
                <Router />
                <Toaster />
              </ErrorBoundary>
            </TooltipProvider>
          </NotificationProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
