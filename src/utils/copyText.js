// Copies text to the clipboard. navigator.clipboard only exists on HTTPS
// (and localhost), so on a plain-HTTP site fall back to a hidden textarea
// and execCommand("copy"). Resolves to true when the copy worked.
export async function copyText(text) {
  const value = String(text ?? "");

  if (window.isSecureContext && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(value);
      return true;
    } catch {
      // Permission denied or not focused: try the fallback below.
    }
  }

  const input = document.createElement("textarea");
  input.value = value;
  input.setAttribute("readonly", "");
  input.style.position = "fixed";
  input.style.top = "0";
  input.style.left = "0";
  input.style.opacity = "0";
  document.body.appendChild(input);
  input.select();
  input.setSelectionRange(0, value.length);

  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    input.remove();
  }
}
