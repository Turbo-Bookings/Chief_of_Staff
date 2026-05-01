import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import { API_ORIGIN } from "@/lib/api-config";
import App from "./App";
import "./index.css";

setBaseUrl(API_ORIGIN);

createRoot(document.getElementById("root")!).render(<App />);
