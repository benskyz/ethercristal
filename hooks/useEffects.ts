import { useEffect, useState } from "react";
import { subscribeEffect } from "../lib/effectsEngine";

export function useEffects() {
  const [effect, setEffect] = useState<any>(null);

  useEffect(() => {
    const unsub = subscribeEffect((e: any) => {
      setEffect(e);

      setTimeout(() => setEffect(null), 2500);
    });

    return unsub;
  }, []);

  return effect;
}
