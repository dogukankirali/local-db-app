package main

import (
	"fmt"
	anime_functions "local-db-app/functions"
	"log"
	"net/http"
	"os"
	"path/filepath"

	_ "github.com/lib/pq"
	"github.com/rs/cors"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"

	"github.com/gorilla/mux"
)

type spaHandler struct {
	staticPath string
	indexPath  string
}

const (
	host     = "192.168.1.33"
	portDb   = 5433
	user     = "postgres"
	password = "sp.132132"
	dbname   = "postgres"
)

func (h spaHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	path, err := filepath.Abs(".")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	path = filepath.Join(path, h.staticPath, r.URL.Path)
	_, err = os.Stat(path)
	if os.IsNotExist(err) {
		http.ServeFile(w, r, filepath.Join(h.staticPath, h.indexPath))
		return
	} else if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}
	http.FileServer(http.Dir(h.staticPath)).ServeHTTP(w, r)
}

func main() {
	certFile := "/etc/ssl/certs/server.crt"
	keyFile := "/etc/ssl/certs/server.key"
	/* certFile := "./server.crt"
	keyFile := "./server.key"
	*/
	router := mux.NewRouter()

	dsn := fmt.Sprintf("host=%s port=%d user=%s password=%s dbname=%s sslmode=disable", host, portDb, user, password, dbname)
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		panic("Veritabanına bağlanılamadı: " + err.Error())
	}
	defer func() {
		dbInstance, _ := db.DB()
		_ = dbInstance.Close()
	}()

	//port := utils.GetConfig().GetPort()
	port := "3007"

	router.HandleFunc("/getAnimeTable", anime_functions.GetAnimeTableData(db))
	router.HandleFunc("/getGenres", anime_functions.GetGenres(db))
	router.HandleFunc("/updateAnimeTable", anime_functions.UpdateAnimeTableData(db))
	router.HandleFunc("/createAnime", anime_functions.CreateAnimeTableData(db))
	router.HandleFunc("/deleteAnime", anime_functions.DeleteAnimeTableData(db))
	router.HandleFunc("/createAnimeWithFile", anime_functions.CreateAnimeTableDataWithFile(db))

	/* router.HandleFunc("/getUserList", common.ForwardRequest("/auth/userlist"))
	   router.HandleFunc("/logout", auth.Logout())
	   router.HandleFunc("/checkLoginStatus", auth.IsLoggedIn()) */

	router.HandleFunc("/healthcheck",
		func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte("It's dangerous to go alone, take some tea with you..."))
		})

	spa := spaHandler{staticPath: "frontend/build", indexPath: "index.html"}
	router.PathPrefix("/").Handler(spa)

	// CORS middleware'ini ekle
	corsHandler := cors.New(cors.Options{
		AllowedOrigins:   []string{"*", "http://localhost:3000/"}, // React uygulamanızın çalıştığı adres
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE"},
		AllowedHeaders:   []string{"Content-Type", "Authorization"},
		AllowCredentials: true,
	}).Handler(router)

	srv := &http.Server{
		Handler: corsHandler,
		Addr:    ":" + port,
	}

	log.Println("Server starting at port " + port)

	//devMode := utils.GetConfig().GetDevMode()
	log.Fatal(srv.ListenAndServeTLS(certFile, keyFile))
	/* if devMode {
	        log.Fatal(srv.ListenAndServeTLS("localhost.pem", "localhost-key.pem"))
	    } else {
	        log.Fatal(srv.ListenAndServe())
	} */
}
