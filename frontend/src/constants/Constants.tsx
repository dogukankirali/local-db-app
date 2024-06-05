import { FilterStateProp } from "../components/CollapsibleTableV2/Components/TableFilters/TableFilters";

export default function Constants({
  type,
  additionalData,
}: {
  type: string;
  additionalData?: any | ((id: string, i: number, data?: any) => JSX.Element);
}): FilterStateProp[] | TEATable.IColumnItems[] | any {
  if (type === "tableFilters") {
    return [
      {
        label: "Name",
        key: "Name",
        type: "input",
      },
      {
        label: "AnimeStatus",
        key: "AnimeStatus",
        type: "multi-select",
        options: [
          {
            value: "OnAir",
            label: "On Air",
          },
          {
            value: "Finished",
            label: "Finished",
          },
        ],
      },
      {
        label: "WatchStatus",
        key: "WatchStatus",
        type: "string",
      },
      {
        label: "TotalNumberOfEpisodes",
        key: "TotalNumberOfEpisodes",
        type: "number",
        options: {
          min: 0,
          max: 10000,
        },
      },
      {
        label: "IsMovie",
        key: "IsMovie",
        type: "multi-select",
        options: [
          {
            value: "true",
            label: "Movie",
          },
          {
            value: "false",
            label: "TV Series",
          },
        ],
      },
      {
        label: "Genre",
        key: "Genre",
        type: "multi-select",
        options: additionalData.genres!,
      },
      {
        label: "Score",
        key: "Score",
        type: "number",
        options: {
          min: 0,
          max: 100,
        },
      },
    ];
  } else if (type === "headers") {
    return [
      { key: "Cover", value: "Cover", width: "50px", type: "base64" },
      { key: "Name", value: "Name", width: "100%", type: "string" },
      {
        key: "AnimeStatus",
        value: "Anime Status",
        width: "100%",
        type: "string",
      },
      {
        key: "WatchStatus",
        value: "Watch Status",
        width: "100%",
        type: "number",
      },
      {
        key: "TotalNumberOfEpisodes",
        value: "Total Number Of Episodes",
        width: "100%",
        type: "number",
      },
      { key: "Score", value: "Score", width: "100%", type: "number" },
      {
        key: "IsMovie",
        value: "TV Series/Movie",
        width: "100%",
        type: "boolean",
      },
      { key: "Genre", value: "Genre", width: "100%", type: "string" },
    ];
  } else if (type === "outerColumns") {
    return [
      { key: "Cover", value: "Cover", width: "2%", type: "base64" },
      { key: "Name", value: "Name", width: "40%", type: "string" },
      {
        key: "AnimeStatus",
        value: "Anime Status",
        width: "10%",
        type: "status",
      },
      {
        key: "WatchStatus",
        value: "Watch Status",
        width: "10%",
        type: "episode",
      },
      {
        key: "TotalNumberOfEpisodes",
        value: "Total Number Of Episodes",
        width: "10%",
        type: "number",
      },
      { key: "Score", value: "Score", width: "5%", type: "score" },
      {
        key: "IsMovie",
        value: "TV Series/Movie",
        width: "5%",
        type: "tv-movie",
      },
      { key: "Genre", value: "Genre", width: "15%", type: "pill" },
    ];
  } else if (type === "innerColumns") {
    return [
      { key: "MALScore", value: "MAL Score", icon: <></>, type: "string" },
      { key: "Notes", value: "Notes", icon: <></>, type: "string" },
      { key: "AnimeLink", value: "Watch Link", icon: <></>, type: "link" },
      { key: "MALAnimeLink", value: "MAL Page", icon: <></>, type: "link" },
    ];
  } else if (type === "modalList") {
    return [
      { key: "Cover", value: "Cover", type: "base64" },
      { key: "Notes", value: "Notes", icon: <></>, type: "textarea" },
      { key: "Name", value: "Name", icon: <></>, type: "input" },
      {
        key: "AnimeStatus",
        value: "Anime Status",
        icon: <></>,
        type: "select",
        options: [
          { key: "OnAir", label: "On Air" },
          { key: "Finished", label: "Finished" },
        ],
      },
      {
        key: "WatchStatus",
        value: "Watch Status",
        icon: <></>,
        type: "number",
      },
      {
        key: "TotalNumberOfEpisodes",
        value: "Total Number Of Episodes",
        icon: <></>,
        type: "number",
      },
      { key: "Score", value: "Score", icon: <></>, type: "score" },
      {
        key: "IsMovie",
        value: "TV Series/Movie",
        icon: <></>,
        type: "boolean",
      },
      { key: "MALScore", value: "MAL Score", icon: <></>, type: "float" },
      { key: "AnimeLink", value: "Watch Link", icon: <></>, type: "input" },
      { key: "MALAnimeLink", value: "MAL Page", icon: <></>, type: "input" },
    ];
  }
}

export const path = "https://localhost:3007";
//export const path = "https://192.168.1.33:3007";
//export const path = process.env.REACT_APP_PATH;
