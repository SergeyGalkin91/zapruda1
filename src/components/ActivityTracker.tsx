import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

const FIVE_MINUTES = 5 * 60 * 1000;

// No idle-time farming: credits only when the tab is visible and recent
// real keyboard, pointer, touch or scrolling interaction was observed.
export function ActivityTracker() {
  useEffect(() => {
    let activeId: string | null = null;
    let lastActionAt = 0;
    let lastSubmittedAt = 0;
    let submitting = false;
    const touched = () => { if (document.visibilityState === "visible") lastActionAt = Date.now(); };

    void supabase.auth.getUser().then(({ data }) => { activeId = data.user?.id ?? null; }).catch(() => {});
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      activeId = session?.user?.id ?? null;
    });

    const pulse = async () => {
      if (!activeId || submitting || document.visibilityState !== "visible") return;
      if (Date.now() - lastActionAt > 75_000 || Date.now() - lastSubmittedAt < FIVE_MINUTES) return;
      submitting = true;
      // The DB provides the 5-minute server-time window, user may only insert their own id.
      const { error } = await (supabase as any).from("user_activity_windows").insert({ user_id: activeId });
      if (!error || error.code === "23505") lastSubmittedAt = Date.now();
      submitting = false;
    };

    window.addEventListener("pointerdown", touched, { passive: true });
    window.addEventListener("keydown", touched);
    window.addEventListener("scroll", touched, { passive: true });
    window.addEventListener("touchstart", touched, { passive: true });
    const timer = window.setInterval(() => { void pulse(); }, 20_000);
    return () => {
      window.clearInterval(timer);
      subscription.unsubscribe();
      window.removeEventListener("pointerdown", touched);
      window.removeEventListener("keydown", touched);
      window.removeEventListener("scroll", touched);
      window.removeEventListener("touchstart", touched);
    };
  }, []);
  return null;
}
