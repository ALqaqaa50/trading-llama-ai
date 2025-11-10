import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import MyTrades from "./pages/MyTrades";
import BotControl from "./pages/BotControl";
import ApiKeySetup from "./pages/ApiKeySetup";
import TradingDashboard from "./pages/TradingDashboard";

function Router() {
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/setup"} component={ApiKeySetup} />
      <Route path={"/dashboard"} component={TradingDashboard} />
      <Route path={"/trades"} component={MyTrades} />
      <Route path={"/bot"} component={BotControl} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
