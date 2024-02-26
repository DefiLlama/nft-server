CREATE MATERIALIZED VIEW ethereum.nft_trades_royalties AS WITH royalty_stats AS (
    SELECT
        encode(collection, 'hex') AS collection,
        SUM(
            CASE
                WHEN block_time >= (NOW() - INTERVAL '1 DAY') THEN royalty_fee_usd
            END
        ) AS "usd_1d",
        SUM(
            CASE
                WHEN block_time >= (NOW() - INTERVAL '7 DAY') THEN royalty_fee_usd
            END
        ) AS "usd_7d",
        SUM(
            CASE
                WHEN block_time >= (NOW() - INTERVAL '30 DAY') THEN royalty_fee_usd
            END
        ) AS "usd_30d",
        SUM(royalty_fee_usd) AS usd_lifetime
    FROM
        ethereum.nft_trades
    WHERE
        eth_sale_price > royalty_fee_eth
    GROUP BY
        collection
)
SELECT
    *
FROM
    royalty_stats
WHERE
    usd_lifetime > 0
ORDER BY
    usd_lifetime DESC