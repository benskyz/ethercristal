import { FilterTab, OwnedFilter, ScopeFilter, SortMode } from "./shop-types";

type Props = {
  tab: FilterTab;
  setTab: (value: FilterTab) => void;
  scopeFilter: ScopeFilter;
  setScopeFilter: (value: ScopeFilter) => void;
  ownedFilter: OwnedFilter;
  setOwnedFilter: (value: OwnedFilter) => void;
  sortMode: SortMode;
  setSortMode: (value: SortMode) => void;
  search: string;
  setSearch: (value: string) => void;
};

export default function ShopFilters({
  tab,
  setTab,
  scopeFilter,
  setScopeFilter,
  ownedFilter,
  setOwnedFilter,
  sortMode,
  setSortMode,
  search,
  setSearch,
}: Props) {
  return (
    <section className="ec-section">
      <article className="ec-card shop-filterCard">
        <div className="ec-card-shine" />

        <div className="shop-filterTop">
          <div>
            <div className="ec-card-kicker">Filtres</div>
            <h2 className="ec-card-title">Trouver le bon effet</h2>
          </div>
        </div>

        <div className="shop-filterGrid">
          <div className="shop-tabs">
            {(["all", "vip", "effect", "theme", "bundle"] as FilterTab[]).map((value) => (
              <button
                key={value}
                className={`shop-tab ${tab === value ? "active" : ""}`}
                onClick={() => setTab(value)}
                type="button"
              >
                {value === "all"
                  ? "Tout"
                  : value === "vip"
                  ? "VIP"
                  : value === "effect"
                  ? "Effets"
                  : value === "theme"
                  ? "Thèmes"
                  : "Bundles"}
              </button>
            ))}
          </div>

          <div className="shop-controls">
            <select
              className="ec-select"
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value as ScopeFilter)}
            >
              <option value="all">Tous les scopes</option>
              <option value="profile">Profil</option>
              <option value="desir">DésirIntense</option>
              <option value="salons">Salons</option>
              <option value="rooms">Salles webcam</option>
              <option value="global">Global</option>
            </select>

            <select
              className="ec-select"
              value={ownedFilter}
              onChange={(e) => setOwnedFilter(e.target.value as OwnedFilter)}
            >
              <option value="all">Tous les états</option>
              <option value="owned">Possédés</option>
              <option value="not_owned">Non possédés</option>
              <option value="equipped">Équipés</option>
            </select>

            <select
              className="ec-select"
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
            >
              <option value="default">Tri par défaut</option>
              <option value="price_low">Prix croissant</option>
              <option value="price_high">Prix décroissant</option>
              <option value="rarity">Rareté</option>
            </select>

            <input
              className="ec-input"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Chercher un effet, un scope, un tag..."
            />
          </div>
        </div>
      </article>
    </section>
  );
}
