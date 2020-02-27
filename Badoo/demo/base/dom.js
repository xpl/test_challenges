const { assign, entries } = Object

// Our teeny-tiny helper for outputting DOM elements!
export function render (selector, { style = {}, xmlns, ...attrs } = {}, children = []) {

  const [tagName, className] = selector.split ('.') // only tag.class is supoorted
  const el = xmlns ? document.createElementNS (xmlns, tagName || 'div') // for SVG nodes
                   : document.createElement (tagName || 'div')

  if (className) el.setAttribute ('class', className) // NB: cannot use .className because SVG elements don't have that prop

  assign (el.style, style)
  for (const [k, v] of entries (attrs)) el.setAttribute (k, String (v))
  for (const c of children) el.appendChild (typeof c === 'string' ? document.createTextNode (c) : c)

  return el
}