/**
 * mergeRefs — reparte un mismo nodo entre varias refs.
 *
 * Hace falta cuando un componente ya expone `ref` al exterior (`forwardRef`) y
 * además necesita el nodo para sí mismo, como los títulos que se ajustan con
 * `useFitText`.
 */
import type { MutableRefObject, Ref } from 'react';

export type AnyRef<T> = Ref<T> | MutableRefObject<T | null> | null | undefined;

export function mergeRefs<T>(...refs: AnyRef<T>[]): (node: T | null) => void {
  return (node: T | null) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === 'function') ref(node);
      else (ref as MutableRefObject<T | null>).current = node;
    }
  };
}

export default mergeRefs;
