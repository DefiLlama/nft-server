/* eslint-disable camelcase */

import axios from "axios";
import { Block } from "web3-eth";
import { Log } from "web3-core";

import {
  convertByDecimals,
  getSlug,
  getTimestampsInBlockSpread,
  roundUSD,
} from "../utils";
import { COINGECKO_IDS, DEFAULT_TOKEN_ADDRESSES } from "../constants";
import {
  Blockchain,
  CollectionAndStatisticData,
  Marketplace,
  SaleData,
} from "../types";
import { HistoricalStatistics } from "../models";

export interface PaintSwapCollectionData {
  id: string;
  createdAt: string;
  updatedAt: string;
  address: string;
  owner: string;
  name: string;
  description: string;
  nsfw: boolean;
  mintPriceLow: number;
  mintPriceHigh: number;
  verified: boolean;
  startBlock?: number;
  website: string;
  twitter: string;
  discord: string;
  medium: string;
  telegram: string;
  reddit: string;
  poster: string;
  banner: string;
  thumbnail: string;
  standard: string;
  featured: boolean;
  displayed: boolean;
  imageStyle?: string;
  customMetadata?: string;
  stats: PaintSwapCollectionStats;
}

interface PaintSwapCollectionStats {
  averagePrice: string;
  floor: string;
  floorFTM: string;
  id: string;
  lastSellPrice: string;
  lastSellPriceFTM: string;
  totalNFTs: string;
  totalVolumeTraded: string;
  totalVolumeTradedFTM: string;
  floorCap: string;
  sale: Object;
}

export class PaintSwap {
  public static async getAllCollections(): Promise<PaintSwapCollectionData[]> {

    const collections: PaintSwapCollectionData[] = []
    const numToFetch = 1000
    let numToSkip = 0
    let end = false
    while (!end) {
      const res = await axios.get(`https://api.paintswap.finance/v2/collections?simplified=false&numToFetch=${numToFetch}&numToSkip=${numToSkip}&orderBy=id`)
      collections.push(...res.data.collections)
      end = res.data.end
      numToSkip += numToFetch
    }

    // Filter by verified (non-community) collections
    return collections.filter((item) => item.verified === true)
  }

  public static async getCollection(
    collection: PaintSwapCollectionData,
    ftmInUSD: number
  ): Promise<CollectionAndStatisticData> {
    const {
      name,
      address,
      description,
      website,
      twitter: twitter_username,
      discord: discord_url,
      telegram: telegram_url,
      thumbnail: logo,
      stats,
    } = collection;

    const { floorFTM, floorCap } = stats;
    const floor = convertByDecimals(parseInt(floorFTM), 18) || 0;
    const marketCap = convertByDecimals(parseInt(floorCap), 18) || 0;
    const slug = getSlug(name);

    const { totalVolume, totalVolumeUSD } =
      await HistoricalStatistics.getCollectionTotalVolume({
        slug,
        marketplace: Marketplace.PaintSwap,
      });

    const { dailyVolume, dailyVolumeUSD } =
      await HistoricalStatistics.getCollectionDailyVolume({
        slug,
        marketplace: Marketplace.PaintSwap,
      });

    return {
      metadata: {
        address,
        name,
        slug,
        description,
        logo,
        symbol: null,
        website,
        discord_url,
        telegram_url,
        twitter_username,
        medium_username: null,
        chains: [Blockchain.Fantom],
        marketplaces: [Marketplace.PaintSwap],
      },
      statistics: {
        dailyVolume,
        dailyVolumeUSD,
        owners: 0,
        floor,
        floorUSD: roundUSD(floor * ftmInUSD),
        totalVolume,
        totalVolumeUSD,
        marketCap,
        marketCapUSD: roundUSD(marketCap * ftmInUSD),
      },
    };
  }

  public static async parseSalesFromLogs({
    logs,
    oldestBlock,
    newestBlock,
    chain,
    marketplace,
  }: {
    logs: Log[];
    oldestBlock: Block;
    newestBlock: Block;
    chain: Blockchain;
    marketplace: Marketplace;
  }): Promise<SaleData[]> {
    if (!logs.length) {
      return [] as SaleData[];
    }

    const timestamps = await getTimestampsInBlockSpread(
      oldestBlock,
      newestBlock,
      COINGECKO_IDS[chain].llamaId
    );

    const parsedLogs = [];
    for (const log of logs) {
      try {
        const { data, blockNumber, transactionHash } = log;
        const sellerAddress = "0x" + data.slice(410, 450);
        const buyerAddress = "0x" + data.slice(346, 386);
        const contractAddress = "0x" + data.slice(602, 642);
        const priceWei = Number("0x" + data.slice(258, 322));
        const price = priceWei / Math.pow(10, 18);

        // Get the closest block number in timestamps object
        const dayBlockNumber = Object.keys(timestamps).reduce(
          (a: string, b: string) =>
            Math.abs(parseInt(b) - blockNumber) <
            Math.abs(parseInt(a) - blockNumber)
              ? b
              : a
        );
        const timestamp = timestamps[dayBlockNumber].toString();

        parsedLogs.push({
          txnHash: transactionHash.toLowerCase(),
          paymentTokenAddress: DEFAULT_TOKEN_ADDRESSES[chain],
          timestamp,
          sellerAddress,
          buyerAddress,
          contractAddress,
          price,
          priceBase: 0,
          priceUSD: 0,
          chain,
          marketplace,
        });
      } catch (e) {
        console.log(e);
        continue;
      }
    }

    return parsedLogs as SaleData[];
  }
}
