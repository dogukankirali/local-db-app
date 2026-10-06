Bu klasöre koyduğun `.sql` dosyaları (ör. `pg_dump` çıktısı) `docker compose up`
ilk kez çalıştığında, veritabanı boşken otomatik yüklenir.

Dump'lar kişisel veri içerdiği için git'e girmez (`db/seed/*.sql` .gitignore'da).
Yeniden yüklemek için volume'ü sil: `docker compose down -v`.
