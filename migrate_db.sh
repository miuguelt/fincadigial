#!/bin/bash

# Crear usuario postgres en el servidor de destino
docker exec -e PGPASSWORD=devbrain_secure_pwd -i postgres_prod_central_v18 psql -U admin -d master_db <<EOF
CREATE ROLE postgres WITH LOGIN PASSWORD 'devbrain_pass' SUPERUSER;
CREATE DATABASE devbrain OWNER postgres;
EOF

# Volcar la base de datos devbrain desde antigravity_postgres (Pg16)
# Y restaurarla en postgres_prod_central_v18 (Pg18) usando el nuevo usuario
docker exec -e PGPASSWORD=devbrain_pass -i antigravity_postgres pg_dump -U postgres devbrain | docker exec -e PGPASSWORD=devbrain_pass -i postgres_prod_central_v18 psql -U postgres -d devbrain

echo "Migración completada"
