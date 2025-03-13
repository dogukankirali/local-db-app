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
import { AnimeService } from "@/services/AnimeServices";
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
        // Jikan API'nin veri yapısını kontrol et
        let animeData = [];

        // API yanıt yapısını kontrol et
        if (Array.isArray(response.data)) {
          animeData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          animeData = response.data.data;
        } else if (typeof response.data === "object") {
          // Diğer olası yapılar
          console.log("Farklı veri yapısı:", response.data);
          if (response.data.results && Array.isArray(response.data.results)) {
            animeData = response.data.results;
          }
        }

        console.log("İşlenen anime verileri:", animeData);

        // Veri yapısını kontrol et ve düzelt
        if (animeData.length > 0) {
          // İlk öğeyi kontrol ederek veri yapısını anla
          const firstItem = animeData[0];
          console.log("İlk öğe örneği:", firstItem);

          // Gerekirse veri yapısını dönüştür
          if (!firstItem.title && firstItem.node && firstItem.node.title) {
            animeData = animeData.map((item: any) => item.node);
          }

          // Anime verilerini doğru formata dönüştür
          animeData = animeData.map((item: any) => {
            // Gerekli alanları kontrol et ve düzelt
            const processedItem: MALAnime = {
              ...item,
              mal_id: item.mal_id || 0,
              title:
                item.title ||
                item.title_english ||
                item.name ||
                "İsimsiz Anime",
              score: item.score || 0,
              url: item.url || "",
              images: item.images || {
                jpg: { image_url: item.image_url || "" },
              },
            };

            // Genre bilgisini kontrol et
            if (item.genres && Array.isArray(item.genres)) {
              console.log(
                `${processedItem.title} için genre bilgisi:`,
                item.genres
              );
            } else {
              console.log(
                `${processedItem.title} için genre bilgisi bulunamadı`
              );
            }

            return processedItem;
          });
        }

        // Daha fazla sonuç olup olmadığını kontrol et
        setHasMoreResults(animeData.length > 0);

        // Sayfa 1'den büyükse, önceki sonuçlara ekle
        if (page > 1) {
          setSearchResults((prev) => [...prev, ...animeData]);
        } else {
          setSearchResults(animeData);
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
      console.log("Seçilen anime:", anime);

      // Resim URL'sini al
      let imageUrl = "";
      if (anime.images && anime.images.jpg && anime.images.jpg.image_url) {
        imageUrl = anime.images.jpg.image_url;
      } else if (anime.image_url) {
        imageUrl = anime.image_url;
      } else if (anime.images && anime.images.image_url) {
        imageUrl = anime.images.image_url;
      }
      console.log("Resim URL:", imageUrl);

      // Başlık - title alanından al
      const title =
        anime.title || anime.title_english || anime.name || "İsimsiz Anime";
      console.log("Başlık:", title);

      // Anime durumu - airing değerine göre belirle
      // airing false ise "Finished", true ise "OnAir"
      console.log("Anime airing değeri:", anime.airing);
      console.log("Anime status değeri:", anime.status);
      const animeStatus = anime.airing === true ? "OnAir" : "Finished";
      console.log("Belirlenen anime durumu:", animeStatus);

      // Toplam bölüm sayısı - episodes alanından al
      const totalEpisodes = anime.episodes || 0;
      console.log("Toplam bölüm sayısı:", totalEpisodes);

      // TV/Movie durumu - type alanına göre belirle
      // "Movie" ise true, diğer durumlarda (TV, OVA, vb.) false
      console.log("Anime type değeri:", anime.type);
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
        console.log("Temalar eklendi:", themeNames);
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
        console.log("Demografik bilgiler eklendi:", demoNames);
      }
      console.log("Tüm kategoriler:", genres);

      // İngilizce türleri Türkçe'ye çevir
      const translatedGenres = translateGenres(genres);
      console.log("Çevrilen türler:", translatedGenres);

      // MAL puanı - score alanından al
      const score = anime.score || 0;
      console.log("MAL puanı:", score);

      // MAL sayfası - url alanından al
      const malLink = anime.url || "";
      console.log("MAL sayfası:", malLink);

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
        Genre: translatedGenres, // Çevrilen türleri kullan
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
                  return "İsimsiz Anime";
                }}
                loading={loading}
                onInputChange={(_, newValue) => setSearchTerm(newValue)}
                onChange={(_, newValue) => handleAnimeSelect(newValue)}
                ListboxComponent={(props) => {
                  const { children, ...other } = props;
                  const itemCount = React.Children.count(children);

                  // Listbox içeriğini referans olarak al
                  const listboxRef = React.useRef<HTMLUListElement>(null);

                  // Scroll olayını dinle
                  React.useEffect(() => {
                    const listboxNode = listboxRef.current;
                    if (!listboxNode) return;

                    const handleScroll = () => {
                      const { scrollTop, scrollHeight, clientHeight } =
                        listboxNode;

                      // Kullanıcı listenin sonuna yaklaştığında daha fazla sonuç yükle
                      if (
                        scrollHeight - scrollTop - clientHeight < 100 &&
                        !loading &&
                        hasMoreResults
                      ) {
                        loadMoreResults();
                      }
                    };

                    listboxNode.addEventListener("scroll", handleScroll);
                    return () => {
                      listboxNode.removeEventListener("scroll", handleScroll);
                    };
                  }, [loading, hasMoreResults]);

                  return (
                    <ul
                      ref={listboxRef}
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
                            Başka sonuç yok
                          </Typography>
                        </Box>
                      )}
                    </ul>
                  );
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Anime Ara (MyAnimeList)"
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
                  // Resim URL'sini al
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

                  // Başlık
                  const title =
                    option.title ||
                    option.name ||
                    option.title_english ||
                    "İsimsiz Anime";

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
