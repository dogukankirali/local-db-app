export const convertPositiveNumberString = (value: string): string => {
    const v = String(Number(value.replace(/\D/, "")));
    return v === "0" ? "" : v;
  };
  
  export const camelCaseToTitleCase = (str: string): string => {
    return str
      .replace(/([A-Z])/g, " $1")
      .replace(/^./, (str) => str.toUpperCase());
  };
  
  export const searchParamsToString = (params: URLSearchParams): string => {
    let str = "";
    for (const [key, value] of params.entries()) {
      str += `${key}=${value}&`;
    }
    return str.slice(0, -1);
  };
  
  export const upperFirst = (str: string): string => {
    return str.charAt(0).toUpperCase() + str.slice(1);
  };
  
  export const capitalizeWords = (arr: string[]) => {
    return arr.map((element) => {
      return element.charAt(0).toLowerCase() + element.substring(1).toLowerCase();
    });
  };