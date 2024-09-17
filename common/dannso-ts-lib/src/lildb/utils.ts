// valid selectors:
// id: $id
// transaction counter: $tx
// key in doc.value: foo

import { stringq } from "../utils/predicates";
import { unimpl } from "../utils/unimpl";
import { AssertableValue, Doc, ValueAssertion } from "./common";

// nested keys: foo.bar
export function buildPathAccessor<ValueType>(
  sel: string
): (doc: Doc<ValueType>) => AssertableValue {
  if (sel === "$id") {
    return ({ id }) => id;
  } else if (sel === "$tx") {
    return ({ tx }) => tx;
  } else if (sel === "$rev") {
    return ({ revision }) => revision;
  }

  let a: (v: any) => AssertableValue = (v: any) => v.value;

  const path = sel.split(".");
  while (path.length > 0) {
    const fnGet = ((pathPart) => {
      return (v: any) => {
        return v ? v[pathPart] : undefined;
      };
    })(path.shift()!);

    if (a) {
      a = ((prevA: any) => {
        return (v: any) => fnGet(prevA(v));
      })(a);
    } else {
      a = fnGet;
    }
  }

  return a;
}

export function buildAssertionTester(
  a: ValueAssertion
): (v: AssertableValue) => boolean {
  if (stringq(a)) {
    return (v) => v === a;
  } else {
    let fn: (v: AssertableValue) => boolean = () => true;
    for (let [k, checkV] of Object.entries(a)) {
      ((prevFn: (v: AssertableValue) => boolean) => {
        switch (k) {
          case "$eq":
            fn = (v) => prevFn(v) && v === checkV;
            break;
          case "$gt":
            fn = (v) => prevFn(v) && v! > checkV;
            break;
          case "$gte":
            fn = (v) => prevFn(v) && v! >= checkV;
            break;
          case "$lt":
            fn = (v) => prevFn(v) && v! < checkV;
            break;
          case "$lte":
            fn = (v) => prevFn(v) && v! <= checkV;
            break;
          case "$starts":
            fn = (v) =>
              prevFn(v) &&
              stringq(v) &&
              (v as any as string).startsWith(checkV.toString());
            break;
          default:
            throw unimpl();
        }
      })(fn);
    }
    return fn;
  }
}
