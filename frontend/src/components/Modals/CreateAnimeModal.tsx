"use client";

import React, { memo, Suspense, lazy, useEffect, useState } from "react";
import {
  Box,
  Modal,
  Tab,
  Tabs,
  Typography,
  CircularProgress,
  TextField,
  Autocomplete,
} from "@mui/material";
import { theme } from "@/theme/customTheme";
import { StyledTeaButton } from "../CollapsibleTableV2/Components/StyledComponents";
import Constants from "@/constants/Constants";
import FileUpload from "../Common/FileUpload";
import axios from "axios";
import { AnimeService } from "@/Services/AnimeServices";
import { genreColors } from "@/constants/Constants";
import { translateGenres } from "@/utils/genreTranslations";

const LazyScrollbars = lazy(() => import("react-custom-scrollbars-2"));
const LazyNewInnerList = lazy(
  () => import("../CollapsibleTableV2/Components/Collapse/NewInnerList")
);

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "80%",
  maxHeight: "90vh",
  bgcolor: theme.background,
  boxShadow: 24,
  p: 4,
  borderRadius: 2,
  outline: "none",
  overflow: "hidden",
};

const LoadingFallback = () => (
  <Box sx={{ display: "flex", justifyContent: "center", p: 4 }}>
    <CircularProgress sx={{ color: theme.primary }} />
  </Box>
);

// MAL'dan gelen anime tipi
interface MALAnime {
  mal_id: number;
  title: string;
  title_english?: string;
  title_japanese?: string;
  title_synonyms?: string[];
  name?: string;
  images: {
    jpg: {
      image_url: string;
      small_image_url?: string;
      large_image_url?: string;
    };
    webp?: {
      image_url: string;
      small_image_url?: string;
      large_image_url?: string;
    };
    image_url?: string;
  };
  image_url?: string;
  type?: string;
  source?: string;
  episodes?: number;
  status?: string;
  airing?: boolean;
  airing_status?: string;
  aired?: {
    from?: string;
    to?: string;
    prop?: any;
  };
  duration?: string;
  rating?: string | number;
  score: number;
  scored_by?: number;
  rank?: number;
  popularity?: number;
  members?: number;
  favorites?: number;
  synopsis?: string;
  background?: string;
  season?: string;
  year?: number;
  broadcast?: {
    day?: string;
    time?: string;
    timezone?: string;
    string?: string;
  };
  producers?: Array<{
    mal_id: number;
    type: string;
    name: string;
    url: string;
  }>;
  licensors?: Array<{
    mal_id: number;
    type: string;
    name: string;
    url: string;
  }>;
  studios?: Array<{
    mal_id: number;
    type: string;
    name: string;
    url: string;
  }>;
  genres?: Array<{
    mal_id: number;
    type: string;
    name: string;
    url: string;
  }>;
  themes?: Array<{
    mal_id: number;
    type: string;
    name: string;
    url: string;
  }>;
  demographics?: Array<{
    mal_id: number;
    type: string;
    name: string;
    url: string;
  }>;
  url: string;
  [key: string]: any; // Diğer olası alanlar için
}

const CreateAnimeModal = memo(function CreateAnimeModal(props: {
  createModalData: any;
  setCreateModalData: any;
  handleCreate: any;
  genres: any;
}) {
  const [value, setValue] = useState(0);
  const [file, setFile] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<MALAnime[]>([]);
  const [selectedAnime, setSelectedAnime] = useState<MALAnime | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMoreResults, setHasMoreResults] = useState(true);

  // Form verilerindeki değişiklikleri izle
  useEffect(() => {
    if (props.createModalData && props.createModalData.data) {
      console.log("Form verileri değişti:", props.createModalData.data);
    }
  }, [props.createModalData]);

  // Anime arama fonksiyonu
  const searchAnime = async (query: string, page: number = 1) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      setHasMoreResults(false);
      return;
    }

    setLoading(true);
    try {
      const response = await AnimeService.searchAnime(query, page);
      console.log("API yanıtı:", response);

      if (response && response.success && response.data) {
        // Check MAL API response
        if (response.data.pagination && response.data.data) {
          // If this is the first page, set the results
          // Otherwise, append to existing results
          if (page === 1) {
            setSearchResults(response.data.data);
          } else {
            setSearchResults((prev) => [...prev, ...response.data.data]);
          }

          // Check if there are more results
          const { items, per_page, current_page, last_visible_page } =
            response.data.pagination;
          console.log(
            `Page: ${current_page}/${last_visible_page}, Items: ${items.count}`
          );
          // If not on the last page and there are items on this page
          setHasMoreResults(
            current_page < last_visible_page && items.count > 0
          );
          // Keep track of the current page for pagination
          setCurrentPage(current_page);
        } else {
          console.log("API response failed or no data:", response);
          if (page === 1) {
            setSearchResults([]);
          }
          setHasMoreResults(false);
        }
      } else {
        console.log("API yanıtı başarısız veya veri yok:", response);
        if (page === 1) {
          setSearchResults([]);
        }
        setHasMoreResults(false);
      }
    } catch (error) {
      console.log("Anime arama hatası:", error);
      if (page === 1) {
        setSearchResults([]);
      }
      setHasMoreResults(false);
    } finally {
      setLoading(false);
    }
  };

  // Daha fazla sonuç yükle
  const loadMoreResults = () => {
    if (loading || !hasMoreResults) return;

    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    searchAnime(searchTerm, nextPage);
  };

  // Anime seçildiğinde form verilerini güncelle
  const handleAnimeSelect = (anime: MALAnime | null) => {
    setSelectedAnime(anime);
    if (anime) {
      console.log("Selected anime:", anime);

      // Get image URL
      let imageUrl = "";
      if (anime.images && anime.images.jpg && anime.images.jpg.image_url) {
        imageUrl = anime.images.jpg.image_url;
      } else if (anime.image_url) {
        imageUrl = anime.image_url;
      } else if (anime.images && anime.images.image_url) {
        imageUrl = anime.images.image_url;
      }
      console.log("Image URL:", imageUrl);

      // Title - get from title field
      const title =
        anime.title || anime.title_english || anime.name || "Unnamed Anime";
      console.log("Title:", title);

      // Anime status - determine based on airing value
      // if airing is false then "Finished", if true then "OnAir"
      console.log("Anime airing value:", anime.airing);
      console.log("Anime status value:", anime.status);
      const animeStatus = anime.airing === true ? "OnAir" : "Finished";
      console.log("Determined anime status:", animeStatus);

      // Total number of episodes - get from episodes field
      const totalEpisodes = anime.episodes || 0;
      console.log("Total number of episodes:", totalEpisodes);

      // TV/Movie status - determine based on type field
      // If "Movie" then true, for others (TV, OVA, etc.) false
      console.log("Anime type value:", anime.type);
      const isMovie = anime.type === "Movie";
      console.log("IsMovie değeri:", isMovie);

      // Türler - genres listesindeki name değerlerini birleştir
      let genres = "";
      if (
        anime.genres &&
        Array.isArray(anime.genres) &&
        anime.genres.length > 0
      ) {
        genres = anime.genres.map((genre: any) => genre.name).join(", ");
      }
      console.log("Türler:", genres);

      // Temalar ve demografik bilgileri de ekle (varsa)
      if (
        anime.themes &&
        Array.isArray(anime.themes) &&
        anime.themes.length > 0
      ) {
        const themeNames = anime.themes
          .map((theme: any) => theme.name)
          .join(", ");
        genres = genres ? `${genres}, ${themeNames}` : themeNames;
        console.log("Themes added:", themeNames);
      }

      if (
        anime.demographics &&
        Array.isArray(anime.demographics) &&
        anime.demographics.length > 0
      ) {
        const demoNames = anime.demographics
          .map((demo: any) => demo.name)
          .join(", ");
        genres = genres ? `${genres}, ${demoNames}` : demoNames;
        console.log("Demographic information added:", demoNames);
      }
      console.log("All categories:", genres);

      // Translate English genres to English
      const translatedGenres = translateGenres(genres);
      console.log("Translated genres:", translatedGenres);

      // MAL score - from score field
      const score = anime.score || 0;
      console.log("MAL score:", score);

      // MAL page - from url field
      const malLink = anime.url || "";
      console.log("MAL page:", malLink);

      // Özet - synopsis alanından al
      //const synopsis = anime.synopsis || "";
      //console.log("Özet uzunluğu:", synopsis.length);

      // Form verilerini güncelle
      const updatedData = {
        ...props.createModalData.data,
        Name: title,
        Cover: imageUrl,
        AnimeStatus: animeStatus,
        TotalNumberOfEpisodes: totalEpisodes,
        IsMovie: isMovie,
        Genre: translatedGenres, // Use translated genres
        MALScore: score,
        MALAnimeLink: malLink,
        //Notes: synopsis,
      };

      console.log("Form verileri güncellendi:", updatedData);
      console.log("Önceki form verileri:", props.createModalData.data);

      props.setCreateModalData({
        ...props.createModalData,
        data: updatedData,
      });
    }
  };

  // Arama terimi değiştiğinde
  useEffect(() => {
    setCurrentPage(1); // Yeni arama için sayfa numarasını sıfırla
    const delayDebounceFn = setTimeout(() => {
      searchAnime(searchTerm, 1);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  /* useEffect(() => {
    searchAnime("a");
  }, [searchResults]); */

  // Erken return ifadesi Hook'lardan sonra olmalı
  if (!props.createModalData.status || !props.genres) return null;

  const list = Constants({ type: "modalList" }).toSpliced(8, 0, {
    key: "Genre",
    value: "Genre",
    icon: <></>,
    type: "multi-select",
    options: props.genres,
  });

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Modal
      open={true}
      onClose={() => props.setCreateModalData({ status: false })}
      aria-labelledby="modal-title"
      aria-describedby="modal-description"
      keepMounted={false}
    >
      <Box sx={modalStyle}>
        <Typography variant="h5" sx={{ color: theme.primary_text, mb: 2 }}>
          Create Anime
        </Typography>

        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="basic tabs example"
          centered
          textColor="inherit"
          variant="fullWidth"
          sx={{
            backgroundColor: theme.background,
            mb: 4,
            "& .MuiTabs-indicator": {
              backgroundColor: theme.primary,
            },
            "& .MuiTab-root": {
              color: theme.primary_text,
              "&.Mui-selected": {
                color: theme.primary,
              },
            },
          }}
        >
          <Tab label="Create Anime with Form" />
          <Tab label="Create Anime with CSV" />
        </Tabs>

        {value === 0 && (
          <>
            <Box sx={{ mb: 3 }}>
              <Autocomplete
                options={searchResults}
                getOptionLabel={(option) => {
                  // Farklı veri yapılarını destekle
                  if (option.title) return option.title;
                  if (option.name) return option.name;
                  if (option.title_english) return option.title_english;
                  return "Unnamed Anime";
                }}
                loading={loading}
                onInputChange={(_, newValue) => setSearchTerm(newValue)}
                onChange={(_, newValue) => handleAnimeSelect(newValue)}
                ListboxComponent={(props) => {
                  const { children, ...other } = props;
                  const itemCount = React.Children.count(children);

                  // Listbox içeriğini referans olarak al
                  const ref = React.useRef<HTMLUListElement>(null);

                  React.useEffect(() => {
                    // Load more results when user scrolls near the end of the list
                    const handleScroll = () => {
                      if (!ref.current || loading || !hasMoreResults) return;

                      const scrollBottom =
                        ref.current.scrollTop + ref.current.clientHeight;
                      const threshold = ref.current.scrollHeight - 200; // 200px from bottom

                      if (scrollBottom >= threshold) {
                        loadMoreResults();
                      }
                    };

                    const currentRef = ref.current;
                    if (currentRef) {
                      currentRef.addEventListener("scroll", handleScroll);
                    }

                    return () => {
                      if (currentRef) {
                        currentRef.removeEventListener("scroll", handleScroll);
                      }
                    };
                  }, [loading, hasMoreResults]);

                  return (
                    <ul
                      ref={ref}
                      {...other}
                      style={{
                        maxHeight: "300px",
                        overflow: "auto",
                        padding: 0,
                        margin: 0,
                        listStyle: "none",
                        backgroundColor: theme.background,
                      }}
                    >
                      {children}
                      {loading && (
                        <Box
                          sx={{
                            display: "flex",
                            justifyContent: "center",
                            p: 1,
                          }}
                        >
                          <CircularProgress size={24} />
                        </Box>
                      )}
                      {!loading && !hasMoreResults && itemCount > 0 && (
                        <Box
                          sx={{
                            textAlign: "center",
                            p: 1,
                            color: theme.secondary_text,
                          }}
                        >
                          <Typography variant="caption">
                            No more results
                          </Typography>
                        </Box>
                      )}
                    </ul>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Anime Search (MyAnimeList)"
                    variant="outlined"
                    fullWidth
                    InputLabelProps={{
                      style: { color: theme.primary_text },
                    }}
                    InputProps={{
                      ...params.InputProps,
                      style: { color: theme.primary_text },
                      endAdornment: (
                        <>
                          {loading ? (
                            <CircularProgress color="inherit" size={20} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                    sx={{
                      "& .MuiOutlinedInput-root": {
                        "& fieldset": {
                          borderColor: theme.input_border,
                        },
                        "&:hover fieldset": {
                          borderColor: theme.primary,
                        },
                        "&.Mui-focused fieldset": {
                          borderColor: theme.primary,
                        },
                      },
                    }}
                  />
                )}
                renderOption={(props, option) => {
                  // Get image URL
                  let imageUrl = "";
                  if (
                    option.images &&
                    option.images.jpg &&
                    option.images.jpg.image_url
                  ) {
                    imageUrl = option.images.jpg.image_url;
                  } else if (option.image_url) {
                    imageUrl = option.image_url;
                  } else if (option.images && option.images.image_url) {
                    imageUrl = option.images.image_url;
                  }

                  // Title
                  const title =
                    option.title ||
                    option.title_english ||
                    option.name ||
                    "Unnamed Anime";

                  // Puan ve durum
                  const score = option.score || option.rating || "?";
                  const status = option.status || option.airing_status || "?";

                  return (
                    <Box
                      component="li"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 2,
                        p: 1,
                        backgroundColor: theme.background,
                        color: theme.primary_text,
                        "&:hover": {
                          backgroundColor: theme.table_row_light,
                        },
                      }}
                      {...props}
                    >
                      {imageUrl && (
                        <img
                          src={imageUrl}
                          alt={title}
                          style={{
                            width: 40,
                            height: 40,
                            objectFit: "cover",
                            borderRadius: 4,
                          }}
                        />
                      )}
                      <Box>
                        <Typography variant="body1">{title}</Typography>
                        <Typography
                          variant="caption"
                          sx={{ color: theme.secondary_text }}
                        >
                          Puan: {score} | Durum: {status}
                        </Typography>
                      </Box>
                    </Box>
                  );
                }}
                sx={{
                  backgroundColor: theme.background,
                  color: theme.primary_text,
                  "& .MuiAutocomplete-listbox": {
                    backgroundColor: theme.background,
                  },
                }}
              />
            </Box>

            <Suspense fallback={<LoadingFallback />}>
              <LazyScrollbars
                style={{
                  height: "calc(90vh - 350px)",
                  width: "100%",
                }}
                autoHide
              >
                <LazyNewInnerList
                  data={props.createModalData.data}
                  list={list}
                  setData={props.setCreateModalData}
                  type="create"
                />
              </LazyScrollbars>
            </Suspense>
          </>
        )}
        {value === 1 && (
          <Box sx={{ p: 2 }}>{<FileUpload setFile={setFile} />}</Box>
        )}

        <Box
          sx={{
            display: "flex",
            gap: 1,
            alignItems: "center",
            justifyContent: "flex-end",
            mt: 2,
          }}
        >
          {value === 0 && (
            <>
              <StyledTeaButton
                sx={{ backgroundColor: theme.primary }}
                onClick={props.handleCreate}
              >
                <Typography variant="button">Create</Typography>
              </StyledTeaButton>
              <StyledTeaButton
                sx={{ backgroundColor: theme.danger }}
                onClick={() => {
                  props.setCreateModalData({ status: false });
                }}
              >
                <Typography variant="button">Cancel</Typography>
              </StyledTeaButton>
            </>
          )}
          {value === 1 && (
            <>
              <StyledTeaButton
                type="submit"
                disabled={file === null}
                key={file}
                sx={{ backgroundColor: theme.primary }}
              >
                <Typography variant="button">Dosya Yükle</Typography>
              </StyledTeaButton>
              <StyledTeaButton
                sx={{ backgroundColor: theme.danger }}
                onClick={() => {
                  props.setCreateModalData({ status: false });
                  setValue(0);
                  setFile(null);
                }}
              >
                <Typography variant="button">Cancel</Typography>
              </StyledTeaButton>
            </>
          )}
        </Box>
      </Box>
    </Modal>
  );
});

export default CreateAnimeModal;
