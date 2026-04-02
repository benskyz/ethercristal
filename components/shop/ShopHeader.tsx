import { ProfileRow } from "./shop-types";
import { getThemeLabel } from "./shop-utils";

type Props = {
  etherBalance: number;
  ownedCount: number;
  equippedCount: number;
  profile: ProfileRow | null;
};

export default function ShopHeader({
  etherBalance,
  ownedCount,
  equippedCount,
  profile,
}: Props) {
  return (
    <header className="ec-header">
      <div>
        <div className="ec-kicker">Boutique finale</div>
        <h1 className="ec-title">EtherCristal Shop</h1>
        <p className="ec-subtitle">
          Achète, équipe et connecte tes effets premium à ton profil, à DésirIntense,
          aux salons et aux salles webcam.
        </p>
      </div>

      <div className="ec-sidecards">
        <div className="ec-sidecard">
          <span className="ec-sidecard-label">Éther</span>
          <strong>{etherBalance} Ξ</strong>
        </div>

        <div className="ec-sidecard">
          <span className="ec-sidecard-label">Possédés</span>
          <strong>{ownedCount}</strong>
        </div>

        <div className="ec-sidecard">
          <span className="ec-sidecard-label">Équipés</span>
          <strong>{equippedCount}</strong>
        </div>

        <div className="ec-sidecard">
          <span className="ec-sidecard-label">Thème</span>
          <strong>{getThemeLabel(profile?.theme_mode)}</strong>
        </div>
      </div>
    </header>
  );
}
