import { CSSProperties } from "react";
import { ShopItem } from "./shop-types";
import { buildEffectTitleStyle, buildMiniPreviewStyle, getRarityClass, getRarityLabel, getScopeLabel } from "./shop-utils";

type Props = {
  item: ShopItem;
  owned: boolean;
  equipped: boolean;
  unique: boolean;
  buying: boolean;
  previewName: string;
  onBuy: () => void;
  onOpenInventory: () => void;
};

export default function ShopCard({
  item,
  owned,
  equipped,
  unique,
  buying,
  previewName,
  onBuy,
  onOpenInventory,
}: Props) {
  const rarity = item.metadata?.rarity || "common";
  const rarityClass = getRarityClass(rarity);

  return (
    <article className={`ec-card shop-card ${item.category} ${rarityClass}`}>
      <div className="ec-card-shine" />

      <div className="shop-cardHead">
        <div className="shop-cardHeadLeft">
          <div className="ec-card-kicker">{item.badge || item.category}</div>
          <span className="shop-scopePill">{getScopeLabel(item.metadata?.scope)}</span>
          <span className={`shop-rarityPill ${rarityClass}`}>{getRarityLabel(rarity)}</span>
        </div>

        <div className="shop-statusRow">
          {owned ? <span className="ec-badge ec-badge-soft">Possédé</span> : null}
          {equipped ? <span className="ec-badge ec-badge-gold">Équipé</span> : null}
          {unique ? <span className="ec-badge ec-badge-danger">Unique</span> : null}
        </div>
      </div>

      <div className="shop-cardBody">
        <div className="shop-cardMain">
          <div className="shop-effectName" style={buildEffectTitleStyle(item) as CSSProperties}>
            {item.title}
          </div>

          <div className="shop-miniPreview" style={buildMiniPreviewStyle(item) as CSSProperties}>
            {previewName}
          </div>

          <p className="ec-card-text">{item.description}</p>

          <div className="shop-metaGrid">
            <div className="shop-metaBox">
              <span>Impact</span>
              <strong>{getScopeLabel(item.metadata?.scope)}</strong>
            </div>

            <div className="shop-metaBox">
              <span>Type</span>
              <strong>
                {item.category === "vip"
                  ? "VIP"
                  : item.category === "effect"
                  ? "Effet"
                  : item.category === "theme"
                  ? "Thème"
                  : "Bundle"}
              </strong>
            </div>

            <div className="shop-metaBox">
              <span>Vise</span>
              <strong>{item.metadata?.target || "global"}</strong>
            </div>
          </div>

          <div className="shop-affectsRow">
            {(item.metadata?.affects || []).map((value) => (
              <span key={`${item.id}-${value}`} className="shop-affectChip">
                {value}
              </span>
            ))}
          </div>

          <div className="shop-cardExplain">
            {item.metadata?.scope === "profile" &&
              "Visible surtout sur ton profil, ton dashboard et le rendu général de ton identité."}
            {item.metadata?.scope === "desir" &&
              "Conçu pour amplifier ton identité dans DésirIntense, notamment sur le nom et la présence."}
            {item.metadata?.scope === "salons" &&
              "Pensé pour les salons webcam avec un rendu plus premium et plus distinctif."}
            {item.metadata?.scope === "rooms" &&
              "Spécifique aux salles webcam et à l’ambiance visuelle en room."}
            {item.metadata?.scope === "global" &&
              "Affecte l’ensemble de ton compte, de ton image et de tes avantages premium."}
          </div>
        </div>

        <div className="shop-cardAside">
          <div className="shop-priceBox">
            {item.price_ether ? (
              <strong>{item.price_ether} Ξ</strong>
            ) : (
              <strong>{Number(item.price_usd || 0).toFixed(2)} $</strong>
            )}
            <span>{item.price_ether ? "Paiement Éther" : "Paiement Stripe"}</span>
          </div>

          <button
            className="ec-btn ec-btn-gold shop-buyBtn"
            onClick={onBuy}
            disabled={buying || (owned && unique)}
            type="button"
          >
            {buying ? "Traitement..." : owned && unique ? "Déjà possédé" : "Acheter"}
          </button>

          {(owned || equipped) && (
            <button
              className="ec-btn ec-btn-ghost shop-sideBtn"
              onClick={onOpenInventory}
              type="button"
            >
              Voir inventaire
            </button>
          )}
        </div>
      </div>
    </article>
  );
}
