import { StrictMode, Component } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

const rootNode = document.getElementById("root");

function renderBootError(error) {
  if (!rootNode) return;
  const message = error?.message || String(error || "Unknown error");
  rootNode.innerHTML = `
    <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f1e9;padding:24px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;">
      <section style="max-width:420px;border-radius:28px;background:white;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,.12);">
        <div style="font-size:14px;font-weight:700;color:#b42318;text-transform:uppercase;letter-spacing:.08em;">App failed to load</div>
        <h1 style="margin:10px 0 8px;font-size:28px;line-height:1.05;letter-spacing:-.04em;">Something crashed before the app could open.</h1>
        <p style="margin:0;color:#666;line-height:1.5;">${message}</p>
      </section>
    </main>
  `;
}

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error) {
    console.error(error);
  }

  render() {
    if (this.state.error) {
      return (
        <main className="flex min-h-[100vh] items-center justify-center bg-[#f5f1e9] p-6 text-neutral-950">
          <section className="max-w-[420px] rounded-[28px] bg-white p-6 shadow-2xl">
            <div className="text-sm font-bold uppercase tracking-[0.08em] text-red-700">App crashed</div>
            <h1 className="mt-2 text-[28px] font-semibold leading-[1.05] tracking-[-0.04em]">The app hit a render error.</h1>
            <p className="mt-3 text-sm leading-6 text-neutral-500">{this.state.error.message}</p>
          </section>
        </main>
      );
    }

    return this.props.children;
  }
}

if (rootNode) {
  rootNode.innerHTML = `
    <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f5f1e9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;color:#111;">
      <div style="font-weight:700;">Loading Messages Image Cleaner...</div>
    </main>
  `;
}

window.addEventListener("error", (event) => renderBootError(event.error || event.message));
window.addEventListener("unhandledrejection", (event) => renderBootError(event.reason));

import("./App.jsx")
  .then(({ default: App }) => {
    createRoot(rootNode).render(
      <StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </StrictMode>,
    );
  })
  .catch(renderBootError);
