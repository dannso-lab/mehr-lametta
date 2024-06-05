export type JSONValue = null | number | string | JSONObject | JSONValue[];

export interface JSONObject {
  [key: string]: JSONValue;
}
