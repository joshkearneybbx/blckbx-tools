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
import BigPurchases from "@/pages/BigPurchases";
import TaskGuidePage from "@/pages/task-guide/TaskGuidePage";
import Login from "@/pages/Login";
import OAuthCallback from "@/pages/OAuthCallback";
import ProtectedRoute from "@/components/ProtectedRoute";
import ToolGuard from "@/components/ToolGuard";
import { ComingSoon } from "@/components/ComingSoon";
import { Sidebar } from "@/components/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import MealCraftPage from "@/pages/meals/MealCraftPage";
import { ResearchLayout } from "@/features/research/ResearchLayout";
import ResearchAddItem from "@/features/research/pages/ResearchAddItem";
import ResearchSearch from "@/features/research/pages/ResearchSearch";
import ResearchTaskMatcher from "@/features/research/pages/ResearchTaskMatcher";
import ClientInterests from "@/features/research/pages/ClientInterests";
import ResearchLists from "@/features/research/pages/ResearchLists";
import ResearchListDetail from "@/features/research/pages/ResearchListDetail";
import ApprovalPage from "@/features/approval/ApprovalPage";
import TravelHubPage from "@/features/travel-hub/TravelHubPage";

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
            <ToolGuard slug="itinerary">
              <CreateItinerary />
            </ToolGuard>
          )}
        </Route>
        <Route path="/itinerary/section-builder">
          {() => (
            <ToolGuard slug="itinerary">
              <SectionBuilder />
            </ToolGuard>
          )}
        </Route>
        <Route path="/itinerary/preview/:id">
          {() => (
            <ToolGuard slug="itinerary">
              <PreviewArrange />
            </ToolGuard>
          )}
        </Route>
        <Route path="/itinerary/edit/:id">
          {() => (
            <ToolGuard slug="itinerary">
              <CreateItinerary />
            </ToolGuard>
          )}
        </Route>
        <Route path="/itinerary/list/:id">
          {(params) => (
            <ToolGuard slug="itinerary">
              <ListEditor projectId={params.id} />
            </ToolGuard>
          )}
        </Route>

        {/* Public itinerary view (must come after specific /itinerary/* routes) */}
        <Route path="/itinerary/:slug" component={ViewItinerary} />

        {/* Itinerary dashboard */}
        <Route path="/itinerary">
          {() => (
            <ToolGuard slug="itinerary">
              <Dashboard />
            </ToolGuard>
          )}
        </Route>

        {/* Meals Tool */}
        <Route path="/meals">
          {() => (
            <ToolGuard slug="meals">
              <MealCraftPage />
            </ToolGuard>
          )}
        </Route>

        {/* Big Purchases Tool */}
        <Route path="/big-purchases">
          {() => (
            <ToolGuard slug="big-purchases">
              <BigPurchases />
            </ToolGuard>
          )}
        </Route>

        {/* Task Guide Tool */}
        <Route path="/task-guide">
          {() => (
            <ToolGuard slug="task-guide">
              <TaskGuidePage />
            </ToolGuard>
          )}
        </Route>

        {/* Placeholder hubs */}
        <Route path="/foh">
          {() => (
            <ToolGuard slug="foh">
              <ComingSoon
                title="FOH Dashboard"
                description="Front of House dashboard tools will be available here."
              />
            </ToolGuard>
          )}
        </Route>
        <Route path="/approval">
          {() => (
            <ToolGuard slug="approval">
              <ApprovalPage />
            </ToolGuard>
          )}
        </Route>
        <Route path="/approval/:rest*">
          {() => (
            <ToolGuard slug="approval">
              <Redirect to="/approval" replace />
            </ToolGuard>
          )}
        </Route>
        <Route path="/research/lists/:key">
          {() => (
            <ToolGuard slug="research">
              <ResearchLayout>
                <ResearchListDetail />
              </ResearchLayout>
            </ToolGuard>
          )}
        </Route>
        <Route path="/research/lists">
          {() => (
            <ToolGuard slug="research">
              <ResearchLayout>
                <ResearchLists />
              </ResearchLayout>
            </ToolGuard>
          )}
        </Route>
        <Route path="/research/search">
          {() => (
            <ToolGuard slug="research">
              <ResearchLayout>
                <ResearchSearch />
              </ResearchLayout>
            </ToolGuard>
          )}
        </Route>
        <Route path="/research/task-matcher">
          {() => (
            <ToolGuard slug="research">
              <ResearchLayout>
                <ResearchTaskMatcher />
              </ResearchLayout>
            </ToolGuard>
          )}
        </Route>
        <Route path="/research/client-interests">
          {() => (
            <ToolGuard slug="research">
              <ResearchLayout>
                <ClientInterests />
              </ResearchLayout>
            </ToolGuard>
          )}
        </Route>
        <Route path="/research/add-link">
          {() => (
            <ToolGuard slug="research">
              <Redirect to="/research" replace />
            </ToolGuard>
          )}
        </Route>
        <Route path="/research">
          {() => (
            <ToolGuard slug="research">
              <ResearchLayout>
                <ResearchAddItem />
              </ResearchLayout>
            </ToolGuard>
          )}
        </Route>
        <Route path="/travel-hub">
          {() => (
            <ToolGuard slug="travel-hub">
              <TravelHubPage />
            </ToolGuard>
          )}
        </Route>
        <Route path="/travel-hub/:rest*">
          {() => (
            <ToolGuard slug="travel-hub">
              <Redirect to="/travel-hub" replace />
            </ToolGuard>
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
