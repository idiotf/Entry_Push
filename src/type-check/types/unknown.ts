import type { TypeNode } from '../type-node'

export class UnknownNode implements TypeNode<unknown> {
  parse(value: unknown) {
    return value
  }
}

export function unknown() {
  return new UnknownNode
}
