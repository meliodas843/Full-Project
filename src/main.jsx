
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

import "./index.css";
import "@fortawesome/fontawesome-free/css/all.min.css";

import { GoogleOAuthProvider } from "@react-oauth/google";
import { ThemeProvider } from "./theme/ThemeProvider";

import "./theme/theme.css";

const CLIENT_ID =
  "152036236977-p18kan1qinpmielm4h7475hcdp3vafo8.apps.googleusercontent.com";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={CLIENT_ID}>
      <ThemeProvider>
        <App />
      </ThemeProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>
);
