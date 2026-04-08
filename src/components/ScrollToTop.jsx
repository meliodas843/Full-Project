import { useEffect } from "react";
import { useLocation } from "react-router-dom";

export default function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
    window.scrollTo(0, 0);

    const appScroller = document.querySelector(
      ".app, .app-root, .main-content, .page-content, .layout, main",
    );

    if (appScroller) {
      appScroller.scrollTop = 0;
    }
  }, [pathname]);

  return null;
}
