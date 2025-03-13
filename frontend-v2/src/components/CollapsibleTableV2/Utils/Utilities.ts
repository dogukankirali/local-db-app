import moment from "moment";
import Axios from "axios";

export module Utils {

  export const getConvertedTime = (
    localTime: moment.Moment,
    timeZone: string
  ): moment.Moment => {
    let result: moment.Moment;

    result = moment.tz(localTime.format("YYYY-MM-DD HH:mm"), timeZone);

    return result;
  };

  export const errorHandler = async (
    error: any,
    showAlert: boolean = false,
    alertOptions: Partial<any> = {}
  ) => {
    if (!error) return;

    if (error.isAxiosError) {
      if (error.response.status === 403) {
        // Unauthorized, refresh token
        try {
          await Axios.post("/api/renewtoken");
        } catch (e: any) {
          // TODO: TOAST EKSİK
          if (e.response.status === 403) window.location.href = "/login";
        }

        return;
      }

      if (error.response.data && error.response.data.message) {
        if (showAlert) {

        }
          /* sweetAlert.toast({
            text: error.response.data.message,
            type: "error",
            toast: true,
            ...alertOptions,
          }); */
      } else {
        console.log(error);
      }

      return;
    }

    if (process.env.NODE_ENV === "development") console.log(error);
  };

  export const formatMAC = (macStr: string) => {
    var r = /([a-f0-9]{2})([a-f0-9]{2})/i,
      str = macStr.replace(/[^a-f0-9]/gi, "");

    while (r.test(str)) {
      str = str.replace(r, "$1:$2");
    }

    return str.slice(0, 17);
  };

  export const MergeRecursive = <T>(
    obj1: Partial<T>,
    obj2: Partial<T>
  ): Partial<T> => {
    let newObj: Partial<T> = { ...obj1 };
    for (var p in obj2) {
      try {
        // Property in destination object set; update its value.
        // @ts-ignore
        if (obj2[p as keyof T].constructor === Object) {
          // @ts-ignore
          newObj[p] = MergeRecursive(newObj[p], obj2[p]);
        } else {
          newObj[p] = obj2[p];
        }
      } catch (e) {
        // Property in destination object not set; create it and set its value.
        newObj[p] = obj2[p];
      }
    }

    return newObj;
  };

  export const ChangeColorAlpha = (color: string, opacity: number): string => {
    if (color.length > 7) color = color.substring(0, color.length - 2);
    const _opacity = Math.round(Math.min(Math.max(opacity, 0), 1) * 255);
    let opacityHex = _opacity.toString(16).toUpperCase();
    if (opacityHex.length === 1) opacityHex = "0" + opacityHex;
    return color + opacityHex;
  };

  export type RGB = {
    r: number;
    g: number;
    b: number;
  };

  export const ComponentToHex = (c: number | string): string => {
    const hex = c.toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };

  export const RgbToHex = (c: RGB): string =>
    "#" + ComponentToHex(c.r) + ComponentToHex(c.g) + ComponentToHex(c.b);

  export const HexToRgb = (hex: string): RGB | null => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : null;
  };

  export const ShadesOfColor = (hex: string, count: number): string[] => {
    const rgb = HexToRgb(hex);
    if (!rgb) return [];
    const shades: string[] = [];
    for (let i = 0; i < count; i++) {
      const shade = RgbToHex({
        r: Math.round((rgb.r * (count - i)) / count),
        g: Math.round((rgb.g * (count - i)) / count),
        b: Math.round((rgb.b * (count - i)) / count),
      });
      shades.push(shade);
    }
    return shades;
  };

  export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

  export const DeepCopyArrOfObj = <T extends Record<string, any>>(
    arr: T[]
  ): T[] => {
    return arr.map((item) => ({ ...item }));
  };

  export const RandomBetween = (min: number, max: number) => {
    return Math.floor(Math.random() * (max - min + 1) + min);
  };

  export const RandomBool = () => {
    return Math.random() >= 0.5;
  };

  export const RandomMember = <T>(arr: T[]) => {
    return arr[Math.floor(Math.random() * arr.length)];
  };

  export const DeepCopyyJson = <T>(obj: T): T => {
    return JSON.parse(JSON.stringify(obj));
  };

  export const FilterArrOfObjUnique = <
    T extends Record<keyof Object, unknown>,
    K extends (keyof T)[]
  >(
    arr: T[],
    keys: K
  ) => {
    return arr.filter(
      (thing, index, self) =>
        index ===
        self.findIndex((t) => {
          let isEqual = true;
          for (const key of keys) {
            if (t[key] !== thing[key]) {
              isEqual = false;
              break;
            }
          }
          return isEqual;
        })
    );
  };

  export const sortArrByOldArr = <T>(arr: T[], oldArr: T[], key: keyof T) => {
    const newArrIds = arr.map((item) => item[key]);
    const sortedArrIds = oldArr
      .filter((item) => newArrIds.includes(item[key]))
      .map((item) => item[key]);
    const temp = sortedArrIds
      .map((id) => arr.find((item) => item[key] === id))
      .filter((item) => item) as T[];
    const rest = arr.filter((item) => !sortedArrIds.includes(item[key]));
    return [...temp, ...rest];
  };

  export const loadImage = (url: string, width: number, height: number) => {
    return new Promise<HTMLImageElement>((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = (err) => reject(err);
      image.src = url;
      image.width = width;
      image.height = width;
    });
  };



  export const filterUndefinedValueKeys = <
    T extends Partial<Record<string, unknown>>
  >(
    obj: T
  ): T => {
    const newObj: T = {} as T;
    for (const key in obj) {
      if (obj[key] !== undefined) newObj[key as keyof T] = obj[key];
    }
    return newObj as T;
  };

  export const keysLength = <T extends Record<string, unknown>>(
    obj: T
  ): number => {
    return Object.keys(obj).length;
  };

  export const definedValueKeysLength = <T extends Record<string, unknown>>(
    obj: T
  ): number => {
    return Object.keys(filterUndefinedValueKeys(obj)).length;
  };

  const UNIT_MAP = [
    "B",
    "KB",
    "MB",
    "GB",
    "TB",
    "PB",
    "EB",
    "ZB",
    "YB",
  ] as const;

  export const ConvertUnits = (
    value: number,
    type: (typeof UNIT_MAP)[number]
  ) => {
    while (value >= 1024 && UNIT_MAP.indexOf(type) < UNIT_MAP.length - 1) {
      value /= 1024;
      type = UNIT_MAP[UNIT_MAP.indexOf(type) + 1];
    }
    return `${parseFloat(value.toFixed(2))} ${type}`;
  };
}

// eslint-disable-next-line no-extend-native

