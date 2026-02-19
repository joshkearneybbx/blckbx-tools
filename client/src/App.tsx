import { Switch, Route, useLocation, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/pages/Home";
import Dashboard from "@/pages/Dashboard";
import CreateItinerary from "@/pages/CreateItinerary";
import ViewItinerary from "@/pages/ViewItinerary";
import SectionBuilder from "@/pages/SectionBuilder";
import PreviewArrange from "@/pages/PreviewArrange";
import ListEditor from "@/pages/ListEditor";
import MealsComingSoon from "@/pages/MealsComingSoon";
import BigPurchases from "@/pages/BigPurchases";
import Login from "@/pages/Login";
import OAuthCallback from "@/pages/OAuthCallback";
import NotFound from "@/pages/not-found";
import ProtectedRoute from "@/components/ProtectedRoute";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";

// Create a new QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { isAuthenticated } = useAuth();
  const showSidebar = isAuthenticated && location !== "/";

  return (
    <div className="flex">
      {showSidebar && <Sidebar />}
      <main className={`flex-1 ${showSidebar ? "ml-0 md:ml-16" : ""}`}>
        {children}
      </main>
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        {/* Home */}
        <Route path="/">
          {() => (
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          )}
        </Route>

        {/* Public routes */}
        <Route path="/login" component={Login} />
        <Route path="/oauth/callback" component={OAuthCallback} />

        {/* Itinerary Tool - protected routes (before :slug wildcard) */}
        <Route path="/itinerary/create">
          {() => (
            <ProtectedRoute>
              <CreateItinerary />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/itinerary/section-builder">
          {() => (
            <ProtectedRoute>
              <SectionBuilder />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/itinerary/preview/:id">
          {() => (
            <ProtectedRoute>
              <PreviewArrange />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/itinerary/edit/:id">
          {() => (
            <ProtectedRoute>
              <CreateItinerary />
            </ProtectedRoute>
          )}
        </Route>
        <Route path="/itinerary/list/:id">
          {(params) => (
            <ProtectedRoute>
              <ListEditor projectId={params.id} />
            </ProtectedRoute>
          )}
        </Route>

        {/* Public itinerary view (must come after specific /itinerary/* routes) */}
        <Route path="/itinerary/:slug" component={ViewItinerary} />

        {/* Itinerary dashboard */}
        <Route path="/itinerary">
          {() => (
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          )}
        </Route>

        {/* Meals Tool - Coming Soon */}
        <Route path="/meals">
          {() => (
            <ProtectedRoute>
              <MealsComingSoon />
            </ProtectedRoute>
          )}
        </Route>

        {/* Big Purchases Tool */}
        <Route path="/big-purchases">
          {() => (
            <ProtectedRoute>
              <BigPurchases />
            </ProtectedRoute>
          )}
        </Route>

        {/* Catch-all redirect to home */}
        <Route>
          {() => <Redirect to="/" replace />}
        </Route>
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
