CREATE MATERIALIZED VIEW ethereum.nft_trades_collections_volume AS WITH volumes AS (
    SELECT
        CONCAT('0x', encode(collection, 'hex')) AS collection,
        SUM(
            CASE
                WHEN block_time >= (NOW() - INTERVAL '1 DAY') THEN eth_sale_price
            END
        ) AS "1day_volume",
        SUM(
            CASE
                WHEN block_time >= (NOW() - INTERVAL '7 DAY') THEN eth_sale_price
            END
        ) AS "7day_volume",
        COUNT(
            CASE
                WHEN block_time >= (NOW() - INTERVAL '1 DAY') THEN eth_sale_price
            END
        ) AS "1day_sales"
    FROM
        ethereum.nft_trades AS t
    WHERE
        NOT EXISTS (
            SELECT
                1
            FROM
                ethereum.nft_wash_trades AS wt
            WHERE
                wt.transaction_hash = t.transaction_hash
                AND wt.log_index = t.log_index
        )
        AND NOT EXISTS (
            SELECT
                1
            FROM
                ethereum.nft_trades_blacklist AS b
            WHERE
                t.transaction_hash = b.transaction_hash
        )
    GROUP BY
        collection
)
SELECT
    *
FROM
    volumes
WHERE
    "7day_volume" > 0