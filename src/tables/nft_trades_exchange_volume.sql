CREATE MATERIALIZED VIEW ethereum.nft_trades_exchange_volume AS WITH trades AS (
    SELECT
        block_time,
        LOWER(encode(exchange_name, 'escape')) AS exchange_name,
        LOWER(encode(aggregator_name, 'escape')) AS aggregator_name,
        eth_sale_price,
        usd_sale_price
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
        trades
)
SELECT
    DATE(block_time) AS DAY,
    exchange_name,
    SUM(eth_sale_price),
    SUM(usd_sale_price) AS sum_usd,
    COUNT(eth_sale_price)
FROM
    trades_
GROUP BY
    DATE(block_time),
    exchange_name;