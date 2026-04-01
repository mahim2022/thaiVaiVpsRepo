#!/bin/sh
set -e

CONTAINER=thaivaiecom20-postgres-1
DB=medusa-store
USER=postgres

echo "Checking stress products and image linkage..."
docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -c "SELECT COUNT(*) AS stress_products FROM product WHERE title LIKE 'Stress Test%';"
docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -c "SELECT COUNT(*) AS linked_images FROM image i JOIN product p ON p.id = i.product_id WHERE p.title LIKE 'Stress Test%';"

echo "Sample per-product image counts..."
docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -c "SELECT p.title, COUNT(i.id) AS image_count FROM product p LEFT JOIN image i ON i.product_id = p.id WHERE p.title LIKE 'Stress Test%' GROUP BY p.id, p.title ORDER BY p.title LIMIT 10;"

echo "Sample stored URLs..."
docker exec "$CONTAINER" psql -U "$USER" -d "$DB" -c "SELECT p.title, i.url FROM product p JOIN image i ON i.product_id = p.id WHERE p.title LIKE 'Stress Test%' ORDER BY p.title, i.rank LIMIT 12;"
