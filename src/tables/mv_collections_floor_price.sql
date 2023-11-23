CREATE MATERIALIZED VIEW mv_collections_floor_price AS WITH latest AS (
    SELECT
        DISTINCT ON (collection_id) *
    FROM
        floor
    WHERE
        timestamp >= CURRENT_DATE - INTERVAL '1 day'
        AND floor_price IS NOT NULL
    ORDER BY
        collection_id,
        timestamp DESC
),
yesterday AS (
    SELECT
        DISTINCT ON (collection_id) *
    FROM
        floor
    WHERE
        timestamp >= NOW() - INTERVAL '1 day'
        AND timestamp < CURRENT_DATE
    ORDER BY
        collection_id,
        timestamp ASC
),
week AS (
    SELECT
        DISTINCT ON (collection_id) *
    FROM
        floor
    WHERE
        timestamp >= NOW() - INTERVAL '7 day'
        AND timestamp < DATE_TRUNC('day', NOW() - INTERVAL '6 day')
    ORDER BY
        collection_id,
        timestamp ASC
)
SELECT
    latest.collection_id,
    c.name,
    c.symbol,
    c.image,
    c.total_supply,
    latest.on_sale_count,
    latest.floor_price,
    calculate_percent_change(latest.floor_price, yesterday.floor_price) AS floor_price_pct_change_1_day,
    calculate_percent_change(latest.floor_price, week.floor_price) AS floor_price_pct_change_7_day
FROM
    latest
    LEFT JOIN yesterday ON latest.collection_id = yesterday.collection_id
    LEFT JOIN week ON latest.collection_id = week.collection_id
    LEFT JOIN collection AS c ON c.collection_id = latest.collection_id
WHERE
    latest.rank > 0
    OR latest.rank IS NULL
ORDER BY
    COALESCE(latest.rank, CAST('Infinity' AS NUMERIC));