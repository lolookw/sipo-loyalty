/**
 * Matemática de contraste WCAG compartida entre las piezas que un dueño imprime o descarga con
 * sus propios colores de marca (cartel de mostrador, piezas para redes): si el color elegido no
 * rinde sobre el fondo, el texto se corrige solo en vez de quedar ilegible.
 */

export function colorLuminance(color: string) {
  const normalized = color.replace('#', '')
  if (!/^[0-9a-f]{6}$/i.test(normalized)) return 0
  const channels = [0, 2, 4].map(index => {
    const channel = parseInt(normalized.slice(index, index + 2), 16) / 255
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  })
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
}

export function contrastRatio(first: string, second: string) {
  const [light, dark] = [colorLuminance(first), colorLuminance(second)].sort((a, b) => b - a)
  return (light + 0.05) / (dark + 0.05)
}

export function readableText(background: string) {
  return contrastRatio(background, '#FFFFFF') >= contrastRatio(background, '#2B211C') ? '#FFFFFF' : '#2B211C'
}

export function loyaltyWord(stampEnabled: boolean, pointsEnabled: boolean) {
  if (stampEnabled && !pointsEnabled) return 'sellos'
  if (pointsEnabled && !stampEnabled) return 'puntos'
  return 'beneficios'
}

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/
