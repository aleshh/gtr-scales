export function formatMusicText(value) {
  return String(value)
    .replace(/([A-G])#/g, '$1♯')
    .replace(/([A-G])b/g, '$1♭')
    .replace(/#(?=[0-9IVXivx])/g, '♯')
    .replace(/b(?=[0-9IVXivx])/g, '♭')
}
