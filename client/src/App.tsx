import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import ChatRoom from "@/pages/ChatRoom";
import WebpageRoom from "@/pages/WebpageRoom";
import WidgetChat from "@/pages/WidgetChat";
import Home from "@/pages/Home";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/chat" component={ChatRoom} />
      <Route path="/chat/:roomId" component={ChatRoom} />
      <Route path="/webpage" component={WebpageRoom} />
      <Route path="/webpage/:url*" component={WebpageRoom} />
      <Route path="/widget/chat" component={WidgetChat} />
      <Route path="/widget/chat/:url*" component={WidgetChat} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
