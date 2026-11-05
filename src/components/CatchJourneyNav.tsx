/** Transitions, never a claim of verification or a client-side title award. */
export function CatchJourneyNav() {
  return (
    <nav aria-label="Путь подтверждённого улова" className="z-catch-journey">
      <a href="/reports/new">01 · Улов и отчёт</a>
      <a href="/big-fish">02 · BIG FISH</a>
      <a href="/big-fish#my-catches">03 · Статус проверки</a>
      <a href="/profile#verified-titles">04 · Титулы в профиле</a>
    </nav>
  );
}
