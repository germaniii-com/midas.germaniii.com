import { useEffect, useState } from "react";
import { CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/solid";
import { ArrowPathIcon } from "@heroicons/react/24/outline";

const API_URL = "http://localhost:5001";

function App() {
  const [status, setStatus] = useState<"loading" | "ok" | "error">("loading");

  useEffect(() => {
    fetch(`${API_URL}/api/health`)
      .then((res) => res.json())
      .then((data) => {
        if (data.status === "ok") setStatus("ok");
        else setStatus("error");
      })
      .catch(() => setStatus("error"));
  }, []);

  if (status === "loading") {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
          fontSize: "1.5rem",
        }}
      >
        <ArrowPathIcon style={{ width: "2rem", height: "2rem", marginBottom: "1rem" }} />
        <p>Checking backend health...</p>
      </div>
    );
  }

  if (status === "ok") {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CheckCircleIcon style={{ width: "4rem", height: "4rem", color: "#16a34a" }} />
        <h1 style={{ margin: "0.5rem 0", color: "#16a34a" }}>Backend Healthy</h1>
        <p style={{ color: "#555" }}>Successfully connected to the API</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        height: "100vh",
      }}
    >
      <XCircleIcon style={{ width: "4rem", height: "4rem", color: "#dc2626" }} />
      <h1 style={{ margin: "0.5rem 0", color: "#dc2626" }}>Connection Failed</h1>
      <p style={{ color: "#555" }}>Could not reach the backend API</p>
    </div>
  );
}

export default App;
