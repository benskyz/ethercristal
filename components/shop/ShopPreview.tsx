import { ProfileRow } from "./shop-types";
import { getPreviewName, getPreviewNameStyle } from "./shop-utils";

type Props = {
  etherBalance: number;
  profile: ProfileRow | null;
};

export default function ShopPreview({ etherBalance, profile }: Props) {
  return (
    <section className="shop-preview ec-section">
      <article className="ec-card shop-previewCard">
        <div className="ec-card-shine" />

        <div className="shop-previewTop">
          <div>
            <div className="ec-card-kicker">Aperçu connecté</div>
            <h2 className="ec-card-title">Rendu actuel du profil</h2>
            <p className="ec-card-text">
              Les effets que tu achètes ici alimentent ensuite ton profil, le dashboard,
              DésirIntense et l’écosystème salons.
            </p>
          </div>

          <div className="shop-previewRight">
            <span className="ec-badge ec-badge-gold">{etherBalance} Ξ</span>
            <span className="ec-badge ec-badge-soft">{profile?.vip_level || "Standard"}</span>
            {profile?.is_verified ? (
              <span className="ec-badge ec-badge-blue">Vérifié</span>
            ) : null}
          </div>
        </div>

        <div className="shop-previewName" style={getPreviewNameStyle(profile)}>
          {getPreviewName(profile)}
        </div>
      </article>
    </section>
  );
}
