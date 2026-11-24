type TermsRequiredListener = () => void;
const termsListeners = new Set<TermsRequiredListener>();

export function onTermsRequired(listener: TermsRequiredListener) {
  termsListeners.add(listener);
  return () => {
    termsListeners.delete(listener);
  };
}

export function notifyTermsRequired() {
  for (const listener of termsListeners) {
    try {
      listener();
    } catch {}
  }
}
