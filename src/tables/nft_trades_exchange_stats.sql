CREATE MATERIALIZED VIEW ethereum.nft_trades_exchange_stats AS WITH nft_trades_processed AS (
    SELECT
        LOWER(encode(exchange_name, 'escape')) AS exchange_name,
        LOWER(encode(aggregator_name, 'escape')) AS aggregator_name,
        block_time,
        eth_sale_price,
        usd_sale_price
    FROM
        ethereum.nft_trades AS t
    WHERE
        block_time >= NOW() - INTERVAL '14 DAY'
        AND NOT EXISTS (
            SELECT
                1
            FROM
                ethereum.nft_trades_blacklist AS b
            WHERE
                t.transaction_hash = b.transaction_hash
        )
        AND NOT EXISTS (
            SELECT
                1
            FROM
                ethereum.nft_wash_trades AS wt
            WHERE
                wt.transaction_hash = t.transaction_hash
                AND wt.log_index = t.log_index
        )
),
trades_ AS (
    SELECT
        CASE
            WHEN exchange_name = aggregator_name THEN exchange_name || '-aggregator'
            WHEN aggregator_name IS NULL THEN exchange_name
            ELSE aggregator_name
        END AS exchange_name,
        block_time,
        eth_sale_price,
        usd_sale_price
    FROM
        nft_trades_processed
),
grouped AS (
    SELECT
        exchange_name,
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
        SUM(
            CASE
                WHEN block_time >= (NOW() - INTERVAL '1 DAY') THEN usd_sale_price
            END
        ) AS "1day_volume_usd",
        SUM(
            CASE
                WHEN block_time >= (NOW() - INTERVAL '7 DAY') THEN usd_sale_price
            END
        ) AS "7day_volume_usd",
        SUM(
            CASE
                WHEN block_time >= (NOW() - INTERVAL '14 DAY')
                AND block_time < (NOW() - INTERVAL '7 DAY') THEN eth_sale_price
            END
        ) AS "7day_volume_prior",
        COUNT(
            CASE
                WHEN block_time >= (NOW() - INTERVAL '1 DAY') THEN eth_sale_price
            END
        ) AS "1day_nb_trades",
        COUNT(
            CASE
                WHEN block_time >= (NOW() - INTERVAL '7 DAY') THEN eth_sale_price
            END
        ) AS "7day_nb_trades"
    FROM
        trades_
    GROUP BY
        exchange_name
),
total_daily_volume AS (
    SELECT
        SUM("1day_volume") AS total_1day_volume
    FROM
        grouped
)
SELECT
    g.exchange_name,
    g."1day_volume",
    g."7day_volume",
    g."1day_volume_usd",
    g."7day_volume_usd",
    g."1day_nb_trades",
    g."7day_nb_trades",
    (g."1day_volume" / tdv.total_1day_volume) * 100 AS pct_of_total,
    g."7day_volume_prior",
    (g."7day_volume" - g."7day_volume_prior") / g."7day_volume_prior" * 100 AS weekly_change
FROM
    grouped g,
    total_daily_volume tdv;