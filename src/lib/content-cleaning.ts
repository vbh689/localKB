const HTML_SPACE_ENTITY_PATTERN = /&#(?:x0*20|0*32);/gi;

export function removeEncodedSpaces(value: string) {
  return value.replace(HTML_SPACE_ENTITY_PATTERN, " ");
}
