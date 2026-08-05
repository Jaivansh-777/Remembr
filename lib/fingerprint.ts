/**
 * Client-side device fingerprint used for free-trial abuse protection.
 *
 * A SHA-256 digest of stable, hard-to-spoof browser signals. The same browser
 * on the same machine produces the same fingerprint, which lets the server
 * detect when the free trial has already been used on this device.
 */

function sha256Hex(input: string): Promise<string> {
  const cryptoApi = globalThis.crypto as Crypto | undefined;
  if (cryptoApi?.subtle) {
    return cryptoApi.subtle
      .digest("SHA-256", new TextEncoder().encode(input))
      .then((buffer) =>
        Array.from(new Uint8Array(buffer))
          .map((byte) => byte.toString(16).padStart(2, "0"))
          .join("")
      );
  }
  let hash1 = 5381;
  let hash2 = 52711;
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    hash1 = (hash1 ^ code) * 33;
    hash2 = (hash2 ^ code) * 31;
  }
  return Promise.resolve(`${(hash1 >>> 0).toString(16)}${(hash2 >>> 0).toString(16)}`);
}

function canvasHash(): string {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 220;
    canvas.height = 30;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "";
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillStyle = "#f60";
    ctx.fillRect(0, 0, 220, 30);
    ctx.fillStyle = "#069";
    ctx.fillText("Remembr-fingerprint", 2, 15);
    ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
    ctx.fillText("remembr.dev", 4, 17);
    return canvas.toDataURL().slice(0, 256);
  } catch {
    return "";
  }
}

function webglHash(): string {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      (canvas.getContext("webgl") as WebGLRenderingContext | null) ??
      (canvas.getContext(
        "experimental-webgl"
      ) as WebGLRenderingContext | null);
    if (!gl) return "";
    const debugInfo = gl.getExtension("WEBGL_debug_renderer_info");
    const renderer = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) ?? "")
      : "";
    const vendor = debugInfo
      ? String(gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) ?? "")
      : "";
    return `${vendor}|${renderer}`;
  } catch {
    return "";
  }
}

/**
 * Computes the SHA-256 device fingerprint. Returns an empty string when no
 * stable signals are available (e.g. server-side rendering).
 */
export async function generateFingerprint(): Promise<string> {
  if (typeof window === "undefined") return "";
  const signals = [
    navigator.userAgent ?? "",
    `${window.screen?.width ?? 0}x${window.screen?.height ?? 0}`,
    navigator.language ?? "",
    String(new Date().getTimezoneOffset()),
    navigator.platform ?? "",
    canvasHash(),
    webglHash(),
  ];
  const digest = await sha256Hex(signals.join("||"));
  if (!digest || digest.length < 16) return "";
  return digest;
}
