import { Link } from "@tanstack/react-router";
import { ArrowUpRight, Compass, MapPin, Plus, Waves } from "lucide-react";

export function PremiumFeedHeader() {
  return (
    <header className="z-feed-intro">
      <div className="z-screen-heading">
        <div>
          <p className="z-eyebrow">ZAPRUDA COMMUNITY</p>
          <h1>На своей волне.</h1>
        </div>
        <Link to="/reports/new" className="z-round-action" aria-label="Новый отчёт">
          <Plus className="size-5" />
        </Link>
      </div>
      <p className="z-screen-description">Истории с воды. Люди, с которыми хочется ловить.</p>
      <div className="z-feed-shortcuts">
        <Link to="/street">
          <Waves className="size-4" />
          <span>
            STREET <small>Город — твоя акватория</small>
          </span>
          <ArrowUpRight className="size-4" />
        </Link>
        <Link to="/assistant">
          <MapPin className="size-4" />
          <span>
            Выйти на воду <small>Подбор места и тактики</small>
          </span>
          <ArrowUpRight className="size-4" />
        </Link>
        <Link to="/communities">
          <Compass className="size-4" />
          <span>
            Рядом с тобой <small>Люди, клубы и события</small>
          </span>
          <ArrowUpRight className="size-4" />
        </Link>
      </div>
    </header>
  );
}
