self.addEventListener("install", () => {
  console.log("SW installed");
});

self.addEventListener("activate", () => {
  console.log("SW activated");
});

self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = {};
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "Notification", {
      body: data.body || "Push reçu.",
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
});
