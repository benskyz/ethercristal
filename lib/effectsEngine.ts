let listeners: any[] = [];

export function subscribeEffect(cb: any) {
  listeners.push(cb);
  return () => {
    listeners = listeners.filter((l) => l !== cb);
  };
}

export function emitEffect(effect: any) {
  listeners.forEach((cb) => cb(effect));
}
