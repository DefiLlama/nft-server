const minify = require('pg-minify');

const checkCollection = require('../../utils/checkAddress');
const customHeader = require('../../utils/customHeader');
const { convertKeysToCamelCase } = require('../../utils/keyConversion');
const { nft } = require('../../utils/dbConnection');

const getOrders = async (req, res) => {
  const collectionId = req.params.collectionId;
  if (!checkCollection(collectionId))
    return res.status(400).json('invalid collectionId!');

  const query = minify(
    `
WITH orders AS (
    SELECT
        price,
        amount,
        order_type
    FROM
        orderbook
    WHERE
        collection_id = $<collectionId>
        AND timestamp = (
            SELECT
                MAX(timestamp)
            FROM
                orderbook
            WHERE
                collection_id = $<collectionId>
                AND timestamp >= NOW() - INTERVAL '1 day'
        )
)
  SELECT
      order_type,
      price,
      SUM(price) OVER (PARTITION BY order_type ORDER BY price) AS price_total,
      round(AVG(price) OVER (PARTITION BY order_type ORDER BY price ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW), 5) AS avg_price,
      SUM(amount) OVER (PARTITION BY order_type ORDER BY price) AS amount
  FROM
      orders
    `
  );

  const response = await nft.query(query, {
    collectionId,
  });

  if (!response) {
    return new Error(`Couldn't get data`, 404);
  }

  res
    .set(customHeader())
    .status(200)
    .json(response.map((c) => convertKeysToCamelCase(c)));
};

module.exports = { getOrders };
