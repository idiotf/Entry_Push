import type { TypeNode } from '../type-node'

export class StringNode implements TypeNode<string> {
  parse(value: unknown) {
    if (typeof value != 'string') throw TypeError()
    return value
  }
}

export function string() {
  return new StringNode
}
