import type { TypeNode } from '../type-node'

export type TupleShape<T extends unknown[]> = {
  [K in keyof T]: TypeNode<T[K]>
}

export class TupleNode<T extends unknown[]> implements TypeNode<T> {
  constructor(protected shapes: TupleShape<T>) {}

  parse(value: unknown) {
    if (!Array.isArray(value)) throw TypeError()
    this.shapes.forEach((shape, i) => shape.parse(value[i]))
    return value as T
  }
}

export function tuple<T extends unknown[]>(shapes: TupleShape<T>) {
  return new TupleNode(shapes)
}
