import "@testing-library/jest-dom";

if (!("matchMedia" in window)) {
  // Minimal matchMedia mock for components that rely on it.
  (window as any).matchMedia = () => ({
    matches: false,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
    onchange: null,
    media: "",
  });
}
