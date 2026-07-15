const INSTALL_HINT_KEY = "kanjiTanken.installHintDismissed.v1";

function isAppleTabletOrPhone() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function isStandalone() {
  return window.matchMedia?.("(display-mode: standalone)").matches ||
    window.navigator.standalone === true;
}

function setupInstallHint() {
  const banner = document.getElementById("ipadInstallBanner");
  const close = document.getElementById("dismissInstallBanner");
  if (!banner || !close) return;

  const dismissed = localStorage.getItem(INSTALL_HINT_KEY) === "1";
  if (isAppleTabletOrPhone() && !isStandalone() && !dismissed) {
    banner.classList.remove("hidden");
  }
  close.addEventListener("click", () => {
    localStorage.setItem(INSTALL_HINT_KEY, "1");
    banner.classList.add("hidden");
  });
}

async function requestPersistentStorage() {
  if (!navigator.storage?.persist) return;
  try {
    await navigator.storage.persist();
  } catch (error) {
    console.info("Persistent storage request was not granted.", error);
  }
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) return;
  try {
    const registration = await navigator.serviceWorker.register("/sw.js", { scope: "/" });
    registration.update().catch(() => {});
  } catch (error) {
    console.info("Service worker registration failed.", error);
  }
}

window.addEventListener("DOMContentLoaded", () => {
  setupInstallHint();
  registerServiceWorker();

  // A user gesture improves the chance that Safari accepts persistent storage.
  const firstGesture = () => {
    requestPersistentStorage();
    window.removeEventListener("pointerdown", firstGesture);
  };
  window.addEventListener("pointerdown", firstGesture, { passive: true, once: true });
});
