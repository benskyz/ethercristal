import ShopCard from "./ShopCard";
import { ShopItem } from "./shop-types";

type Props = {
  kicker: string;
  title: string;
  emptyText: string;
  items: ShopItem[];
  previewName: string;
  isOwned: (item: ShopItem) => boolean;
  isEquipped: (item: ShopItem) => boolean;
  isUniqueItem: (item: ShopItem) => boolean;
  buyingSlug: string;
  onBuy: (item: ShopItem) => void;
  onOpenInventory: () => void;
};

export default function ShopSection({
  kicker,
  title,
  emptyText,
  items,
  previewName,
  isOwned,
  isEquipped,
  isUniqueItem,
  buyingSlug,
  onBuy,
  onOpenInventory,
}: Props) {
  return (
    <section className="ec-section">
      <div className="shop-sectionHeader">
        <div>
          <div className="ec-kicker">{kicker}</div>
          <h2 className="shop-sectionTitle">{title}</h2>
        </div>
      </div>

      <div className="shop-stack">
        {items.length > 0 ? (
          items.map((item) => (
            <ShopCard
              key={item.id}
              item={item}
              owned={isOwned(item)}
              equipped={isEquipped(item)}
              unique={isUniqueItem(item)}
              buying={buyingSlug === item.slug}
              previewName={previewName}
              onBuy={() => onBuy(item)}
              onOpenInventory={onOpenInventory}
            />
          ))
        ) : (
          <div className="shop-empty">{emptyText}</div>
        )}
      </div>
    </section>
  );
}
