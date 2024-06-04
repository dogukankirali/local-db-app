#!/bin/sh
set -e

# İlk olarak, herhangi bir başlangıç komutunu çalıştırın
# Örneğin, bir servisi başlatın veya başka bir işlemi yapın
echo "Starting application..."

# Ardından, Docker'ın CMD komutunu çalıştırın
# Bu, Dockerfile'da belirtilen komutu çalıştıracaktır
exec "$@"
