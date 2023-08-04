import { useEffect, useMemo, useState } from "react";

export const getHeadersFromData = (data: unknown[] | undefined) => {
  if (!data || data.length < 0) return [];
  const singleData = data[0];
  if (!singleData || typeof singleData !== "object") return [];
  const keys = Object.keys(singleData);
  const items: TEATable.IColumnItem[] = keys.map((k) => {
    const key = k;
    const value = `${key[0].toUpperCase()}${key.slice(1)}`
      .replace(/([A-Z]+)/g, " $1")
      .replace(/([A-Z][a-z])/g, " $1");
    let type: TEATable.ColumnTypes = "blank";
    const element: unknown = singleData[key as keyof typeof singleData];
    if (!element) return { key, value, type: "blank" };
    if (typeof element === "number") type = "number";
    if (typeof element === "boolean") type = "boolean";
    if (typeof element === "object") type = "string";
    if (typeof element === "string") {
      const date = new Date(element);
      if (date.toString() !== "Invalid Date") type = "timestamp";
      else type = "string";
    }
    return {
      key,
      value,
      type,
    };
  });
  return items;
};

const useGetTableHeaders = (data: unknown[] | undefined) => {
  const defaultHeaders = useMemo<TEATable.IColumnItem[]>(
    () => getHeadersFromData(data),
    [data]
  );

  const [headers, setHeaders] =
    useState<TEATable.IColumnItem[]>(defaultHeaders);

  useEffect(() => {
    setHeaders(defaultHeaders);
  }, [defaultHeaders]);

  return { headers, setHeaders, defaultHeaders };
};

export default useGetTableHeaders;
