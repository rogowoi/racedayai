"use client";

export function CookiePreferencesButton() {
  return (
    <button
      onClick={() => {
        localStorage.removeItem("cookie-consent");
        window.dispatchEvent(new CustomEvent("cookie-consent-show"));
      }}
      className="text-sm text-muted-foreground hover:text-foreground transition-colors inline-block py-2"
    >
      Cookie Preferences
    </button>
  );
}
