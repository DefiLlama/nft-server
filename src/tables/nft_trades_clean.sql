CREATE MATERIALIZED VIEW ethereum.nft_trades_clean AS WITH counted_trades AS (
    SELECT
        *,
        COUNT(*) OVER (PARTITION BY seller, collection, token_id) AS seller_count,
        COUNT(*) OVER (PARTITION BY buyer, collection, token_id) AS buyer_count
    FROM
        ethereum.nft_trades
)
SELECT
    *
FROM
    counted_trades
WHERE
    NOT EXISTS (
        SELECT
            1
        FROM
            ethereum.nft_trades t
        WHERE
            t.seller = counted_trades.buyer
            AND t.buyer = counted_trades.seller
            AND t.collection = counted_trades.collection
            AND t.token_id = counted_trades.token_id
            AND t.transaction_hash <> counted_trades.transaction_hash
    )
    AND buyer != seller
    AND seller_count < 3
    AND buyer_count < 3
    AND transaction_hash NOT IN (
        '\xc3af5b478d1580272e4881eafd2495ec4a3367a570370013a9d44c3e7ef50845'
    );

CREATE INDEX IF NOT EXISTS ethereum_nft_trades_clean_block_number_idx ON ethereum.nft_trades_clean (block_number);

CREATE INDEX IF NOT EXISTS ethereum_nft_trades_clean_collection_idx ON ethereum.nft_trades_clean (collection);