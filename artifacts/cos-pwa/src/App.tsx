import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ClerkProvider, SignIn, SignUp, Show } from "@clerk/react";
import { publishableKeyFromHost } from "@clerk/react/internal";
import { shadcn } from "@clerk/themes";
import { Toaster } from "sonner";
import AppShell from "@/components/AppShell";
import TalkPage from "@/pages/talk";
import TodayPage from "@/pages/today";
import ApprovalsPage from "@/pages/approvals";
import InboxPage from "@/pages/inbox";
import TeamPage from "@/pages/team";
import ProjectsPage from "@/pages/projects";
import InsightsPage from "@/pages/insights";
import LandingPage from "@/pages/landing";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
    },
  },
});

const clerkPubKey = publishableKeyFromHost(
  window.location.hostname,
  import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
);

if (!clerkPubKey) {
  throw new Error("Missing VITE_CLERK_PUBLISHABLE_KEY");
}

const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

const clerkAppearance = {
  theme: shadcn,
  cssLayerName: "clerk",
  options: {
    logoPlacement: "inside" as const,
    logoLinkUrl: basePath || "/",
    logoImageUrl: `${window.location.origin}${basePath}/logo.svg`,
  },
  variables: {
    colorPrimary: "#DC2A2A",
    colorForeground: "#F4F1EA",
    colorMutedForeground: "#8A8680",
    colorDanger: "#DC2A2A",
    colorBackground: "#161616",
    colorInput: "#232323",
    colorInputForeground: "#F4F1EA",
    colorNeutral: "#3A3A3A",
    fontFamily: "'Inter Tight', sans-serif",
    borderRadius: "0.5rem",
  },
  elements: {
    rootBox: "w-full flex justify-center",
    cardBox: "bg-[#161616] border border-[#2A2A2A] rounded-xl w-[440px] max-w-full overflow-hidden",
    card: "!shadow-none !border-0 !bg-transparent !rounded-none",
    footer: "!shadow-none !border-0 !bg-transparent !rounded-none",
    headerTitle: "text-[#F4F1EA] font-['Fraunces'] font-semibold",
    headerSubtitle: "text-[#8A8680]",
    socialButtonsBlockButtonText: "text-[#C9C5BD]",
    formFieldLabel: "text-[#C9C5BD] font-medium",
    footerActionLink: "text-[#DC2A2A] hover:text-[#A8201F]",
    footerActionText: "text-[#8A8680]",
    dividerText: "text-[#8A8680]",
    identityPreviewEditButton: "text-[#DC2A2A]",
    formFieldSuccessText: "text-[#4ADE80]",
    alertText: "text-[#F4F1EA]",
    logoBox: "flex justify-center mb-2",
    logoImage: "h-12 w-12",
    socialButtonsBlockButton: "border-[#2A2A2A] bg-[#1C1C1C] hover:bg-[#232323]",
    formButtonPrimary: "bg-[#DC2A2A] hover:bg-[#A8201F] text-white font-semibold",
    formFieldInput: "bg-[#232323] border-[#3A3A3A] text-[#F4F1EA]",
    footerAction: "border-t border-[#2A2A2A]",
    dividerLine: "bg-[#2A2A2A]",
    alert: "border-[#2A2A2A]",
  },
};

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Show when="signed-in">{children}</Show>
      <Show when="signed-out">
        <Navigate to="/" replace />
      </Show>
    </>
  );
}

function HomeRoute() {
  return (
    <>
      <Show when="signed-in">
        <Navigate to="/talk" replace />
      </Show>
      <Show when="signed-out">
        <LandingPage />
      </Show>
    </>
  );
}

function SignInPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <SignIn
        routing="path"
        path={`${basePath}/sign-in`}
        appearance={clerkAppearance}
        signUpUrl={`${basePath}/sign-up`}
      />
    </div>
  );
}

function SignUpPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-12">
      <SignUp
        routing="path"
        path={`${basePath}/sign-up`}
        appearance={clerkAppearance}
        signInUrl={`${basePath}/sign-in`}
      />
    </div>
  );
}

function Router() {
  return (
    <Routes>
      <Route path="/" element={<HomeRoute />} />
      <Route path="/sign-in/*" element={<SignInPage />} />
      <Route path="/sign-up/*" element={<SignUpPage />} />
      <Route
        path="/talk"
        element={
          <ProtectedRoute>
            <AppShell activeTab="talk"><TalkPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/today"
        element={
          <ProtectedRoute>
            <AppShell activeTab="today"><TodayPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/approvals"
        element={
          <ProtectedRoute>
            <AppShell activeTab="approvals"><ApprovalsPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/inbox"
        element={
          <ProtectedRoute>
            <AppShell activeTab="inbox"><InboxPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/team"
        element={
          <ProtectedRoute>
            <AppShell activeTab="team"><TeamPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/projects"
        element={
          <ProtectedRoute>
            <AppShell activeTab="projects"><ProjectsPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route
        path="/insights"
        element={
          <ProtectedRoute>
            <AppShell activeTab="insights"><InsightsPage /></AppShell>
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  useEffect(() => {
    const applyTheme = () => {
      if (window.innerWidth >= 640) {
        document.documentElement.classList.add("dark");
      } else {
        document.documentElement.classList.remove("dark");
      }
    };
    applyTheme();
    window.addEventListener("resize", applyTheme);
    return () => window.removeEventListener("resize", applyTheme);
  }, []);

  return (
    <BrowserRouter basename={basePath}>
      <ClerkProvider publishableKey={clerkPubKey}>
        <QueryClientProvider client={queryClient}>
          <Router />
          <Toaster
            theme="dark"
            position="top-right"
            toastOptions={{
              style: {
                background: "#1C1C1C",
                border: "1px solid #2A2A2A",
                color: "#F4F1EA",
              },
            }}
          />
        </QueryClientProvider>
      </ClerkProvider>
    </BrowserRouter>
  );
}

export default App;
