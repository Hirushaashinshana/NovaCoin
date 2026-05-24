import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { createServer as createViteServer } from 'vite';

// Fallback Mock Data in case CoinGecko API fails or rate-limits (HTTP 429)
const MOCK_COINS_BASE = [
  {
    id: 'bitcoin',
    symbol: 'btc',
    name: 'Bitcoin',
    image: 'https://assets.coingecko.com/coins/images/1/large/bitcoin.png',
    current_price: 67342.50,
    market_cap: 1324564894231,
    market_cap_rank: 1,
    fully_diluted_valuation: 1414192500000,
    total_volume: 28456123490,
    high_24h: 68120.00,
    low_24h: 66900.00,
    price_change_24h: 421.50,
    price_change_percentage_24h: 0.63,
    market_cap_change_24h: 8456123414,
    market_cap_change_percentage_24h: 0.64,
    circulating_supply: 19685000,
    total_supply: 21000000,
    max_supply: 21000000,
    ath: 73738.00,
    ath_change_percentage: -8.67,
    ath_date: '2024-03-14T07:12:15.123Z',
    atl: 67.81,
    atl_change_percentage: 99187.31,
    atl_date: '2013-07-05T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [65200, 65450, 65120, 65900, 65800, 66300, 66210, 66890, 67200, 67100, 66990, 67450, 67150, 67800, 67400, 67120, 67500, 67342.5]
    }
  },
  {
    id: 'ethereum',
    symbol: 'eth',
    name: 'Ethereum',
    image: 'https://assets.coingecko.com/coins/images/279/large/ethereum.png',
    current_price: 3452.80,
    market_cap: 414562341902,
    market_cap_rank: 2,
    fully_diluted_valuation: 414562341902,
    total_volume: 14312890561,
    high_24h: 3510.50,
    low_24h: 3390.20,
    price_change_24h: -12.40,
    price_change_percentage_24h: -0.36,
    market_cap_change_24h: -145612480,
    market_cap_change_percentage_24h: -0.04,
    circulating_supply: 120150230,
    total_supply: 120150230,
    max_supply: null,
    ath: 4878.26,
    ath_change_percentage: -29.22,
    ath_date: '2021-11-10T08:41:24.123Z',
    atl: 0.43,
    atl_change_percentage: 802760.10,
    atl_date: '2015-10-20T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [3320, 3340, 3310, 3390, 3420, 3410, 3450, 3440, 3410, 3425, 3430, 3470, 3455, 3480, 3490, 3445, 3460, 3452.80]
    }
  },
  {
    id: 'solana',
    symbol: 'sol',
    name: 'Solana',
    image: 'https://assets.coingecko.com/coins/images/4128/large/solana.png',
    current_price: 168.45,
    market_cap: 78456123490,
    market_cap_rank: 3,
    fully_diluted_valuation: 94120561240,
    total_volume: 3845612349,
    high_24h: 172.90,
    low_24h: 161.20,
    price_change_24h: 6.85,
    price_change_percentage_24h: 4.24,
    market_cap_change_24h: 3120561240,
    market_cap_change_percentage_24h: 4.14,
    circulating_supply: 461230450,
    total_supply: 578000000,
    max_supply: null,
    ath: 259.96,
    ath_change_percentage: -35.20,
    ath_date: '2021-11-06T21:54:35.123Z',
    atl: 0.50,
    atl_change_percentage: 33590.20,
    atl_date: '2020-05-11T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [150, 152, 148, 155, 153, 159, 158, 164, 162, 166, 161, 167, 164, 169, 171, 165, 167, 168.45]
    }
  },
  {
    id: 'binancecoin',
    symbol: 'bnb',
    name: 'BNB',
    image: 'https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png',
    current_price: 576.20,
    market_cap: 84120349120,
    market_cap_rank: 4,
    fully_diluted_valuation: 84120349120,
    total_volume: 1654120450,
    high_24h: 582.40,
    low_24h: 568.10,
    price_change_24h: 4.10,
    price_change_percentage_24h: 0.72,
    market_cap_change_24h: 541234190,
    market_cap_change_percentage_24h: 0.65,
    circulating_supply: 147500000,
    total_supply: 147500000,
    max_supply: 200000000,
    ath: 686.31,
    ath_change_percentage: -16.04,
    ath_date: '2021-05-10T07:24:15.123Z',
    atl: 0.039,
    atl_change_percentage: 1477333.10,
    atl_date: '2017-10-19T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [555, 558, 552, 563, 561, 568, 565, 572, 570, 575, 571, 578, 574, 580, 579, 572, 575, 576.20]
    }
  },
  {
    id: 'ripple',
    symbol: 'xrp',
    name: 'XRP',
    image: 'https://assets.coingecko.com/coins/images/44/large/xrp-symbol-white-128.png',
    current_price: 0.524,
    market_cap: 29124562140,
    market_cap_rank: 5,
    fully_diluted_valuation: 52400000000,
    total_volume: 875214030,
    high_24h: 0.531,
    low_24h: 0.518,
    price_change_24h: 0.002,
    price_change_percentage_24h: 0.38,
    market_cap_change_24h: 120349120,
    market_cap_change_percentage_24h: 0.41,
    circulating_supply: 55234561234,
    total_supply: 100000000000,
    max_supply: 100000000000,
    ath: 3.40,
    ath_change_percentage: -84.58,
    ath_date: '2018-01-07T00:00:00.000Z',
    atl: 0.00268,
    atl_change_percentage: 19451.20,
    atl_date: '2014-05-22T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [0.502, 0.505, 0.498, 0.512, 0.511, 0.518, 0.515, 0.523, 0.521, 0.526, 0.520, 0.528, 0.524, 0.531, 0.529, 0.522, 0.525, 0.524]
    }
  },
  {
    id: 'cardano',
    symbol: 'ada',
    name: 'Cardano',
    image: 'https://assets.coingecko.com/coins/images/975/large/cardano.png',
    current_price: 0.468,
    market_cap: 16412034912,
    market_cap_rank: 6,
    fully_diluted_valuation: 21060000000,
    total_volume: 312056123,
    high_24h: 0.482,
    low_24h: 0.459,
    price_change_24h: -0.012,
    price_change_percentage_24h: -2.50,
    market_cap_change_24h: -412056123,
    market_cap_change_percentage_24h: -2.45,
    circulating_supply: 35682910456,
    total_supply: 45000000000,
    max_supply: 45000000000,
    ath: 3.09,
    ath_change_percentage: -84.85,
    ath_date: '2021-09-02T14:48:11.123Z',
    atl: 0.0192,
    atl_change_percentage: 2331.42,
    atl_date: '2020-03-13T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [0.445, 0.448, 0.442, 0.455, 0.452, 0.461, 0.458, 0.468, 0.465, 0.472, 0.467, 0.478, 0.474, 0.481, 0.479, 0.471, 0.473, 0.468]
    }
  },
  {
    id: 'dogecoin',
    symbol: 'doge',
    name: 'Dogecoin',
    image: 'https://assets.coingecko.com/coins/images/5/large/dogecoin.png',
    current_price: 0.142,
    market_cap: 20561234912,
    market_cap_rank: 7,
    fully_diluted_valuation: 20561234912,
    total_volume: 1245612349,
    high_24h: 0.149,
    low_24h: 0.138,
    price_change_24h: 0.003,
    price_change_percentage_24h: 2.15,
    market_cap_change_24h: 412034912,
    market_cap_change_percentage_24h: 2.05,
    circulating_supply: 144210349120,
    total_supply: 144210349120,
    max_supply: null,
    ath: 0.731,
    ath_change_percentage: -80.57,
    ath_date: '2021-05-08T05:12:15.123Z',
    atl: 0.000086,
    atl_change_percentage: 165012.30,
    atl_date: '2015-05-06T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [0.125, 0.128, 0.124, 0.131, 0.129, 0.135, 0.132, 0.140, 0.138, 0.144, 0.139, 0.145, 0.141, 0.147, 0.146, 0.140, 0.142, 0.142]
    }
  },
  {
    id: 'polkadot',
    symbol: 'dot',
    name: 'Polkadot',
    image: 'https://assets.coingecko.com/coins/images/12171/large/polkadot.png',
    current_price: 6.45,
    market_cap: 9214056123,
    market_cap_rank: 8,
    fully_diluted_valuation: 9214056123,
    total_volume: 184561234,
    high_24h: 6.62,
    low_24h: 6.31,
    price_change_24h: 0.08,
    price_change_percentage_24h: 1.25,
    market_cap_change_24h: 114056123,
    market_cap_change_percentage_24h: 1.25,
    circulating_supply: 1431205612,
    total_supply: 1431205612,
    max_supply: null,
    ath: 54.98,
    ath_change_percentage: -88.26,
    ath_date: '2021-11-04T12:00:00.000Z',
    atl: 2.70,
    atl_change_percentage: 138.88,
    atl_date: '2020-08-20T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [6.12, 6.15, 6.08, 6.22, 6.19, 6.30, 6.25, 6.38, 6.35, 6.42, 6.37, 6.48, 6.44, 6.52, 6.50, 6.41, 6.43, 6.45]
    }
  },
  {
    id: 'avalanche-2',
    symbol: 'avax',
    name: 'Avalanche',
    image: 'https://assets.coingecko.com/coins/images/12559/large/Avalanche_Circle_Red_White_Trans.png',
    current_price: 33.85,
    market_cap: 13120561240,
    market_cap_rank: 9,
    fully_diluted_valuation: 14890234120,
    total_volume: 456120349,
    high_24h: 34.60,
    low_24h: 32.10,
    price_change_24h: 0.95,
    price_change_percentage_24h: 2.89,
    market_cap_change_24h: 341203490,
    market_cap_change_percentage_24h: 2.67,
    circulating_supply: 391204561,
    total_supply: 442103490,
    max_supply: 720000000,
    ath: 146.22,
    ath_change_percentage: -76.85,
    ath_date: '2021-11-21T13:42:15.123Z',
    atl: 2.80,
    atl_change_percentage: 1108.92,
    atl_date: '2020-12-31T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [31.2, 31.5, 30.9, 32.2, 31.9, 32.8, 32.4, 33.5, 33.2, 33.9, 33.3, 34.2, 33.8, 34.5, 34.3, 33.6, 33.9, 33.85]
    }
  },
  {
    id: 'chainlink',
    symbol: 'link',
    name: 'Chainlink',
    image: 'https://assets.coingecko.com/coins/images/877/large/chainlink-link.png',
    current_price: 15.65,
    market_cap: 9234561234,
    market_cap_rank: 10,
    fully_diluted_valuation: 15650000000,
    total_volume: 245612349,
    high_24h: 15.95,
    low_24h: 15.20,
    price_change_24h: 0.25,
    price_change_percentage_24h: 1.62,
    market_cap_change_24h: 145612341,
    market_cap_change_percentage_24h: 1.60,
    circulating_supply: 587000000,
    total_supply: 1000000000,
    max_supply: 1000000000,
    ath: 52.88,
    ath_change_percentage: -70.40,
    ath_date: '2021-05-10T02:11:15.123Z',
    atl: 0.148,
    atl_change_percentage: 10474.32,
    atl_date: '2017-11-29T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [14.5, 14.8, 14.3, 15.1, 14.9, 15.4, 15.1, 15.7, 15.5, 15.9, 15.4, 16.0, 15.6, 16.2, 16.0, 15.3, 15.5, 15.65]
    }
  },
  {
    id: 'tether',
    symbol: 'usdt',
    name: 'Tether',
    image: 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
    current_price: 1.00,
    market_cap: 111234561230,
    market_cap_rank: 11,
    fully_diluted_valuation: 111234561230,
    total_volume: 48902561234,
    high_24h: 1.002,
    low_24h: 0.998,
    price_change_24h: 0.0001,
    price_change_percentage_24h: 0.01,
    market_cap_change_24h: 120561240,
    market_cap_change_percentage_24h: 0.11,
    circulating_supply: 111234561230,
    total_supply: 111234561230,
    max_supply: null,
    ath: 1.32,
    ath_change_percentage: -24.2,
    ath_date: '2018-07-24T00:00:00.000Z',
    atl: 0.57,
    atl_change_percentage: 75.4,
    atl_date: '2015-03-02T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [1.00, 1.001, 0.999, 1.00, 1.00, 1.001, 1.00, 1.00, 0.999, 1.00, 1.00, 1.001, 1.00, 0.999, 1.00, 1.00, 1.00, 1.00]
    }
  },
  {
    id: 'usd-coin',
    symbol: 'usdc',
    name: 'USD Coin',
    image: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
    current_price: 1.00,
    market_cap: 32456123490,
    market_cap_rank: 12,
    fully_diluted_valuation: 32456123490,
    total_volume: 6412034912,
    high_24h: 1.001,
    low_24h: 0.999,
    price_change_24h: -0.0002,
    price_change_percentage_24h: -0.02,
    market_cap_change_24h: -45612340,
    market_cap_change_percentage_24h: -0.14,
    circulating_supply: 32456123490,
    total_supply: 32456123490,
    max_supply: null,
    ath: 1.17,
    ath_change_percentage: -14.5,
    ath_date: '2019-05-08T00:00:00.000Z',
    atl: 0.87,
    atl_change_percentage: 14.2,
    atl_date: '2023-03-11T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [1.00, 1.00, 0.999, 1.001, 1.00, 1.00, 1.00, 0.999, 1.00, 1.001, 1.00, 1.02, 1.00, 0.999, 1.00, 1.00, 1.00, 1.00]
    }
  },
  {
    id: 'shiba-inu',
    symbol: 'shib',
    name: 'Shiba Inu',
    image: 'https://assets.coingecko.com/coins/images/11939/large/shiba.png',
    current_price: 0.00002154,
    market_cap: 12690456120,
    market_cap_rank: 13,
    fully_diluted_valuation: 12690456120,
    total_volume: 845612341,
    high_24h: 0.00002280,
    low_24h: 0.00002010,
    price_change_24h: 0.00000085,
    price_change_percentage_24h: 4.10,
    market_cap_change_24h: 490561240,
    market_cap_change_percentage_24h: 4.02,
    circulating_supply: 589289412034901,
    total_supply: 589534120349012,
    max_supply: null,
    ath: 0.00008616,
    ath_change_percentage: -75.0,
    ath_date: '2021-10-28T00:00:00.000Z',
    atl: 0.000000000056,
    atl_change_percentage: 38456120,
    atl_date: '2020-11-28T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [0.0000195, 0.0000201, 0.0000192, 0.0000208, 0.0000205, 0.0000219, 0.0000211, 0.0000224, 0.0000215, 0.0000231, 0.0000221, 0.0000234, 0.0000225, 0.0000218, 0.0000226, 0.0000212, 0.0000214, 0.00002154]
    }
  },
  {
    id: 'the-open-network',
    symbol: 'ton',
    name: 'Toncoin',
    image: 'https://assets.coingecko.com/coins/images/17980/large/ton_symbol.png',
    current_price: 6.24,
    market_cap: 15340124560,
    market_cap_rank: 14,
    fully_diluted_valuation: 31245612340,
    total_volume: 312456120,
    high_24h: 6.48,
    low_24h: 5.92,
    price_change_24h: 0.31,
    price_change_percentage_24h: 5.23,
    market_cap_change_24h: 756123450,
    market_cap_change_percentage_24h: 5.18,
    circulating_supply: 2458210349,
    total_supply: 5105234912,
    max_supply: null,
    ath: 8.24,
    ath_change_percentage: -24.2,
    ath_date: '2024-04-15T00:00:00.000Z',
    atl: 0.51,
    atl_change_percentage: 1123.5,
    atl_date: '2021-09-20T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [5.45, 5.62, 5.40, 5.75, 5.68, 5.90, 5.82, 6.10, 5.98, 6.24, 6.12, 6.38, 6.20, 6.42, 6.31, 6.15, 6.22, 6.24]
    }
  },
  {
    id: 'tron',
    symbol: 'trx',
    name: 'TRON',
    image: 'https://assets.coingecko.com/coins/images/1094/large/tron.png',
    current_price: 0.118,
    market_cap: 10456123490,
    market_cap_rank: 15,
    fully_diluted_valuation: 10456123490,
    total_volume: 284561230,
    high_24h: 0.121,
    low_24h: 0.115,
    price_change_24h: 0.002,
    price_change_percentage_24h: 1.72,
    market_cap_change_24h: 184561230,
    market_cap_change_percentage_24h: 1.80,
    circulating_supply: 87561234902,
    total_supply: 87561234902,
    max_supply: null,
    ath: 0.30,
    ath_change_percentage: -60.6,
    ath_date: '2018-01-05T00:00:00.000Z',
    atl: 0.00109,
    atl_change_percentage: 10725.4,
    atl_date: '2517-09-15T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [0.110, 0.112, 0.109, 0.114, 0.113, 0.116, 0.114, 0.119, 0.116, 0.121, 0.118, 0.122, 0.119, 0.124, 0.122, 0.116, 0.117, 0.118]
    }
  },
  {
    id: 'polygon',
    symbol: 'matic',
    name: 'Polygon',
    image: 'https://assets.coingecko.com/coins/images/4713/large/polygon.png',
    current_price: 0.684,
    market_cap: 6841203490,
    market_cap_rank: 16,
    fully_diluted_valuation: 6841203490,
    total_volume: 184561234,
    high_24h: 0.712,
    low_24h: 0.665,
    price_change_24h: -0.012,
    price_change_percentage_24h: -1.72,
    market_cap_change_24h: -120456120,
    market_cap_change_percentage_24h: -1.73,
    circulating_supply: 9912034912,
    total_supply: 10000000000,
    max_supply: 10000000000,
    ath: 2.92,
    ath_change_percentage: -76.5,
    ath_date: '2021-12-27T00:00:00.000Z',
    atl: 0.00314,
    atl_change_percentage: 21685.1,
    atl_date: '2019-05-09T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [0.695, 0.690, 0.682, 0.698, 0.685, 0.692, 0.681, 0.689, 0.680, 0.694, 0.682, 0.699, 0.685, 0.691, 0.688, 0.682, 0.686, 0.684]
    }
  },
  {
    id: 'uniswap',
    symbol: 'uni',
    name: 'Uniswap',
    image: 'https://assets.coingecko.com/coins/images/12504/large/uniswap-uni.png',
    current_price: 7.12,
    market_cap: 4272103490,
    market_cap_rank: 17,
    fully_diluted_valuation: 7120349120,
    total_volume: 124561230,
    high_24h: 7.42,
    low_24h: 6.85,
    price_change_24h: 0.18,
    price_change_percentage_24h: 2.59,
    market_cap_change_24h: 110256120,
    market_cap_change_percentage_24h: 2.65,
    circulating_supply: 599812034,
    total_supply: 1000000000,
    max_supply: 1000000000,
    ath: 44.92,
    ath_change_percentage: -84.15,
    ath_date: '2021-05-03T00:00:00.000Z',
    atl: 1.03,
    atl_change_percentage: 591.2,
    atl_date: '2020-09-17T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [6.50, 6.65, 6.45, 6.78, 6.72, 6.95, 6.88, 7.12, 7.02, 7.25, 7.10, 7.35, 7.18, 7.42, 7.35, 7.08, 7.10, 7.12]
    }
  },
  {
    id: 'litecoin',
    symbol: 'ltc',
    name: 'Litecoin',
    image: 'https://assets.coingecko.com/coins/images/2/large/litecoin.png',
    current_price: 78.50,
    market_cap: 5852103490,
    market_cap_rank: 18,
    fully_diluted_valuation: 6594120340,
    total_volume: 384561200,
    high_24h: 80.20,
    low_24h: 76.40,
    price_change_24h: 1.15,
    price_change_percentage_24h: 1.49,
    market_cap_change_24h: 85210340,
    market_cap_change_percentage_24h: 1.48,
    circulating_supply: 74561024,
    total_supply: 84000000,
    max_supply: 84000000,
    ath: 410.26,
    ath_change_percentage: -80.85,
    ath_date: '2021-05-10T00:00:00.000Z',
    atl: 1.15,
    atl_change_percentage: 6726.1,
    atl_date: '2015-01-14T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [74.5, 75.2, 74.0, 76.5, 76.1, 77.8, 77.2, 78.9, 78.1, 79.5, 78.8, 80.5, 79.2, 81.1, 80.4, 78.2, 78.8, 78.5]
    }
  },
  {
    id: 'pepe',
    symbol: 'pepe',
    name: 'Pepe',
    image: 'https://assets.coingecko.com/coins/images/29850/large/pepe-token.png',
    current_price: 0.00001245,
    market_cap: 5241034912,
    market_cap_rank: 19,
    fully_diluted_valuation: 5241034912,
    total_volume: 912045634,
    high_24h: 0.00001380,
    low_24h: 0.00001150,
    price_change_24h: 0.00000095,
    price_change_percentage_24h: 8.26,
    market_cap_change_24h: 395123412,
    market_cap_change_percentage_24h: 8.12,
    circulating_supply: 420690000000000,
    total_supply: 420690000000000,
    max_supply: 420690000000000,
    ath: 0.00001717,
    ath_change_percentage: -27.5,
    ath_date: '2024-05-27T00:00:00.000Z',
    atl: 0.000000055,
    atl_change_percentage: 22536.4,
    atl_date: '2023-04-17T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [0.0000095, 0.0000102, 0.0000098, 0.0000114, 0.0000108, 0.0000122, 0.0000115, 0.0000128, 0.0000121, 0.0000135, 0.0000124, 0.0000139, 0.0000128, 0.0000121, 0.0000130, 0.0000122, 0.0000123, 0.00001245]
    }
  },
  {
    id: 'sui',
    symbol: 'sui',
    name: 'Sui',
    image: 'https://assets.coingecko.com/coins/images/26375/large/sui_asset.png',
    current_price: 1.12,
    market_cap: 2612034912,
    market_cap_rank: 20,
    fully_diluted_valuation: 11204561230,
    total_volume: 184512034,
    high_24h: 1.19,
    low_24h: 1.05,
    price_change_24h: 0.06,
    price_change_percentage_24h: 5.66,
    market_cap_change_24h: 140561230,
    market_cap_change_percentage_24h: 5.70,
    circulating_supply: 2330124561,
    total_supply: 10000000000,
    max_supply: 10000000000,
    ath: 2.17,
    ath_change_percentage: -48.4,
    ath_date: '2024-03-27T00:00:00.000Z',
    atl: 0.36,
    atl_change_percentage: 211.1,
    atl_date: '2023-10-19T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [0.92, 0.98, 0.95, 1.02, 1.01, 1.08, 1.04, 1.11, 1.08, 1.14, 1.10, 1.17, 1.11, 1.20, 1.16, 1.09, 1.10, 1.12]
    }
  },
  {
    id: 'near',
    symbol: 'near',
    name: 'NEAR Protocol',
    image: 'https://assets.coingecko.com/coins/images/10365/large/near.png',
    current_price: 6.15,
    market_cap: 6561203490,
    market_cap_rank: 21,
    fully_diluted_valuation: 6150456120,
    total_volume: 312056120,
    high_24h: 6.45,
    low_24h: 5.88,
    price_change_24h: 0.19,
    price_change_percentage_24h: 3.19,
    market_cap_change_24h: 195612340,
    market_cap_change_percentage_24h: 3.07,
    circulating_supply: 1067210349,
    total_supply: 1000000000,
    max_supply: null,
    ath: 20.44,
    ath_change_percentage: -69.9,
    ath_date: '2022-01-16T00:00:00.000Z',
    atl: 0.52,
    atl_change_percentage: 1082.7,
    atl_date: '2020-11-04T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [5.25, 5.42, 5.20, 5.58, 5.48, 5.80, 5.72, 6.02, 5.92, 6.18, 6.05, 6.32, 6.15, 6.42, 6.30, 6.08, 6.12, 6.15]
    }
  },
  {
    id: 'stellar',
    symbol: 'xlm',
    name: 'Stellar',
    image: 'https://assets.coingecko.com/coins/images/100/large/Stellar_symbol_black_RGB.png',
    current_price: 0.102,
    market_cap: 2951234120,
    market_cap_rank: 22,
    fully_diluted_valuation: 5100000000,
    total_volume: 75210456,
    high_24h: 0.105,
    low_24h: 0.098,
    price_change_24h: 0.0015,
    price_change_percentage_24h: 1.49,
    market_cap_change_24h: 42103450,
    market_cap_change_percentage_24h: 1.45,
    circulating_supply: 29120456123,
    total_supply: 50001784920,
    max_supply: 50001784920,
    ath: 0.875,
    ath_change_percentage: -88.35,
    ath_date: '2018-01-03T00:00:00.000Z',
    atl: 0.00047,
    atl_change_percentage: 21590.2,
    atl_date: '2015-03-05T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [0.095, 0.098, 0.096, 0.101, 0.099, 0.104, 0.101, 0.106, 0.103, 0.108, 0.102, 0.110, 0.105, 0.112, 0.109, 0.101, 0.102, 0.102]
    }
  },
  {
    id: 'cosmos',
    symbol: 'atom',
    name: 'Cosmos Hub',
    image: 'https://assets.coingecko.com/coins/images/1481/large/cosmos_hub.png',
    current_price: 8.20,
    market_cap: 3214561230,
    market_cap_rank: 23,
    fully_diluted_valuation: 3214561230,
    total_volume: 114561230,
    high_24h: 8.42,
    low_24h: 7.95,
    price_change_24h: -0.12,
    price_change_percentage_24h: -1.44,
    market_cap_change_24h: -45612340,
    market_cap_change_percentage_24h: -1.40,
    circulating_supply: 390456123,
    total_supply: 390456123,
    max_supply: null,
    ath: 44.45,
    ath_change_percentage: -81.54,
    ath_date: '2522-01-17T00:00:00.000Z',
    atl: 1.16,
    atl_change_percentage: 606.8,
    atl_date: '2020-03-13T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [8.50, 8.42, 8.25, 8.38, 8.24, 8.40, 8.31, 8.49, 8.25, 8.48, 8.30, 8.52, 8.38, 8.59, 8.44, 8.16, 8.22, 8.20]
    }
  },
  {
    id: 'aptos',
    symbol: 'apt',
    name: 'Aptos',
    image: 'https://assets.coingecko.com/coins/images/26455/large/aptos_release.png',
    current_price: 7.85,
    market_cap: 3456123490,
    market_cap_rank: 24,
    fully_diluted_valuation: 8561234120,
    total_volume: 75612450,
    high_24h: 8.15,
    low_24h: 7.55,
    price_change_24h: 0.22,
    price_change_percentage_24h: 2.88,
    market_cap_change_24h: 91203490,
    market_cap_change_percentage_24h: 2.71,
    circulating_supply: 441024561,
    total_supply: 1105612349,
    max_supply: null,
    ath: 19.92,
    ath_change_percentage: -60.55,
    ath_date: '2023-01-26T00:00:00.000Z',
    atl: 3.08,
    atl_change_percentage: 154.8,
    atl_date: '2022-12-29T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [6.85, 7.12, 6.95, 7.25, 7.18, 7.42, 7.31, 7.58, 7.40, 7.74, 7.55, 7.90, 7.75, 8.05, 7.94, 7.72, 7.80, 7.85]
    }
  },
  {
    id: 'fantom',
    symbol: 'ftm',
    name: 'Fantom',
    image: 'https://assets.coingecko.com/coins/images/4001/large/Fantom_round.png',
    current_price: 0.752,
    market_cap: 2112456120,
    market_cap_rank: 25,
    fully_diluted_valuation: 2382000000,
    total_volume: 45612349,
    high_24h: 0.782,
    low_24h: 0.721,
    price_change_24h: 0.015,
    price_change_percentage_24h: 2.04,
    market_cap_change_24h: 32456120,
    market_cap_change_percentage_24h: 1.56,
    circulating_supply: 2803491234,
    total_supply: 3175000000,
    max_supply: 3175000000,
    ath: 3.46,
    ath_change_percentage: -78.25,
    ath_date: '2022-01-16T00:00:00.000Z',
    atl: 0.0019,
    atl_change_percentage: 39456.2,
    atl_date: '2020-03-13T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [0.68, 0.70, 0.69, 0.72, 0.71, 0.74, 0.72, 0.76, 0.74, 0.78, 0.75, 0.81, 0.76, 0.83, 0.80, 0.74, 0.76, 0.752]
    }
  },
  {
    id: 'aave',
    symbol: 'aave',
    name: 'Aave',
    image: 'https://assets.coingecko.com/coins/images/12645/large/AAVE.png',
    current_price: 88.40,
    market_cap: 1312564890,
    market_cap_rank: 26,
    fully_diluted_valuation: 1414120340,
    total_volume: 24561230,
    high_24h: 91.20,
    low_24h: 85.50,
    price_change_24h: -1.25,
    price_change_percentage_24h: -1.39,
    market_cap_change_24h: -18451230,
    market_cap_change_percentage_24h: -1.38,
    circulating_supply: 14856123,
    total_supply: 16000000,
    max_supply: 16000000,
    ath: 661.69,
    ath_change_percentage: -86.64,
    ath_date: '2021-05-18T00:00:00.000Z',
    atl: 25.95,
    atl_change_percentage: 240.6,
    atl_date: '2020-11-05T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [92.1, 91.8, 90.5, 91.4, 90.1, 91.5, 90.4, 91.7, 89.9, 91.2, 89.0, 91.1, 89.2, 90.8, 89.6, 88.0, 88.5, 88.4]
    }
  },
  {
    id: 'render-token',
    symbol: 'rndr',
    name: 'Render',
    image: 'https://assets.coingecko.com/coins/images/11636/large/render.png',
    current_price: 7.42,
    market_cap: 2845612450,
    market_cap_rank: 27,
    fully_diluted_valuation: 3951234500,
    total_volume: 120561240,
    high_24h: 7.82,
    low_24h: 7.15,
    price_change_24h: 0.18,
    price_change_percentage_24h: 2.49,
    market_cap_change_24h: 68456230,
    market_cap_change_percentage_24h: 2.47,
    circulating_supply: 388561230,
    total_supply: 536821034,
    max_supply: 536821034,
    ath: 13.53,
    ath_change_percentage: -45.15,
    ath_date: '2024-03-17T00:00:00.000Z',
    atl: 0.036,
    atl_change_percentage: 20511.4,
    atl_date: '2020-06-16T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [6.12, 6.35, 6.20, 6.58, 6.42, 6.85, 6.71, 7.12, 6.95, 7.24, 7.05, 7.42, 7.18, 7.65, 7.50, 7.15, 7.25, 7.42]
    }
  },
  {
    id: 'algorand',
    symbol: 'algo',
    name: 'Algorand',
    image: 'https://assets.coingecko.com/coins/images/4380/large/download.png',
    current_price: 0.165,
    market_cap: 1341203490,
    market_cap_rank: 28,
    fully_diluted_valuation: 1650349120,
    total_volume: 34120349,
    high_24h: 0.171,
    low_24h: 0.158,
    price_change_24h: 0.003,
    price_change_percentage_24h: 1.85,
    market_cap_change_24h: 24561230,
    market_cap_change_percentage_24h: 1.86,
    circulating_supply: 8152103490,
    total_supply: 10000000000,
    max_supply: 10000000000,
    ath: 3.56,
    ath_change_percentage: -95.3,
    ath_date: '2019-06-20T00:00:00.000Z',
    atl: 0.082,
    atl_change_percentage: 101.2,
    atl_date: '2023-09-11T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [0.151, 0.154, 0.152, 0.158, 0.155, 0.161, 0.158, 0.165, 0.161, 0.168, 0.163, 0.171, 0.165, 0.174, 0.170, 0.161, 0.163, 0.165]
    }
  },
  {
    id: 'dogwifhat',
    symbol: 'wif',
    name: 'Dogwifhat',
    image: 'https://assets.coingecko.com/coins/images/33566/large/dogwifhat.png',
    current_price: 2.15,
    market_cap: 2154561230,
    market_cap_rank: 29,
    fully_diluted_valuation: 2154561230,
    total_volume: 245120349,
    high_24h: 2.38,
    low_24h: 1.95,
    price_change_24h: 0.12,
    price_change_percentage_24h: 5.91,
    market_cap_change_24h: 120561240,
    market_cap_change_percentage_24h: 5.88,
    circulating_supply: 998902034,
    total_supply: 998902034,
    max_supply: 998902034,
    ath: 4.83,
    ath_change_percentage: -55.48,
    ath_date: '2024-03-31T00:00:00.000Z',
    atl: 0.0015,
    atl_change_percentage: 143530.2,
    atl_date: '2023-12-13T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [1.75, 1.82, 1.70, 1.95, 1.88, 2.05, 1.98, 2.12, 2.02, 2.22, 2.12, 2.35, 2.20, 2.45, 2.38, 2.08, 2.11, 2.15]
    }
  },
  {
    id: 'jupiter-exchange-solana',
    symbol: 'jup',
    name: 'Jupiter',
    image: 'https://assets.coingecko.com/coins/images/34188/large/jup.png',
    current_price: 0.854,
    market_cap: 1152103490,
    market_cap_rank: 30,
    fully_diluted_valuation: 8540123490,
    total_volume: 58456123,
    high_24h: 0.892,
    low_24h: 0.812,
    price_change_24h: 0.032,
    price_change_percentage_24h: 3.89,
    market_cap_change_24h: 42103490,
    market_cap_change_percentage_24h: 3.79,
    circulating_supply: 1350000000,
    total_supply: 10000000000,
    max_supply: 10000000000,
    ath: 2.00,
    ath_change_percentage: -57.3,
    ath_date: '2024-01-31T00:00:00.000Z',
    atl: 0.45,
    atl_change_percentage: 89.7,
    atl_date: '2024-02-21T00:00:00.000Z',
    last_updated: new Date().toISOString(),
    sparkline_in_7d: {
      price: [0.75, 0.78, 0.76, 0.81, 0.79, 0.84, 0.81, 0.86, 0.83, 0.88, 0.84, 0.91, 0.85, 0.93, 0.90, 0.83, 0.84, 0.854]
    }
  }
];

// Active global state of coins (automatically updated or fluctuated)
let CURRENT_COINS: any[] = JSON.parse(JSON.stringify(MOCK_COINS_BASE));

// Simple In-Memory Caching Class
class MemCache {
  private cache = new Map<string, { value: any; expiry: number }>();

  get(key: string): any {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() > cached.expiry) {
      this.cache.delete(key);
      return null;
    }
    return cached.value;
  }

  set(key: string, value: any, ttlSec: number): void {
    this.cache.set(key, {
      value,
      expiry: Date.now() + ttlSec * 1000,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

const coinCache = new MemCache();

// Utility: introduce small realistic fluctuations to a price
function fluctuatePrice(price: number, percentMax: number = 0.0015): number {
  const direction = Math.random() > 0.48 ? 1 : -1;
  const change = price * (Math.random() * percentMax) * direction;
  return parseFloat((price + change).toFixed(price > 500 ? 2 : price > 1 ? 3 : 5));
}

// Global active loop for tick simulation - run every 15 seconds to push live WebSocket alerts
function updatePricesAndVolumeSimulated() {
  CURRENT_COINS = CURRENT_COINS.map(coin => {
    const oldPrice = coin.current_price;
    const newPrice = fluctuatePrice(oldPrice, 0.002);
    const dPrice = parseFloat((newPrice - oldPrice).toFixed(5));
    
    // Updates
    const totalVolume = Math.round(coin.total_volume + (Math.random() - 0.4) * 500000);
    const priceChange24h = parseFloat((coin.price_change_24h + dPrice).toFixed(5));
    const priceChangePercentage24h = parseFloat(((priceChange24h / (newPrice - priceChange24h)) * 100).toFixed(2));
    
    // update sparkline arrays
    let sp = coin.sparkline_in_7d?.price || [oldPrice];
    if (sp.length >= 24) {
      sp.shift();
    }
    sp.push(newPrice);

    return {
      ...coin,
      current_price: newPrice,
      total_volume: totalVolume,
      price_change_24h: priceChange24h,
      price_change_percentage_24h: priceChangePercentage24h,
      last_updated: new Date().toISOString(),
      sparkline_in_7d: { price: sp }
    };
  });
}

// Fetch from CoinGecko API or return fallback
async function fetchCoinsFromAPI(): Promise<any[]> {
  const cacheKey = 'coingecko_coins_list';
  const cachedData = coinCache.get(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  try {
    const response = await fetch(
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=150&page=1&sparkline=true&price_change_percentage=24h',
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LiveCryptoTrackerApp/1.0'
        }
      }
    );

    if (response.status === 429) {
      console.warn('CoinGecko API Rate Limit exceeded (429). Utilizing localized real-time engine.');
      throw new Error('RateLimit');
    }

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    if (data && Array.isArray(data) && data.length > 0) {
      // Map properties to ensure they fit our strict interface
      const sanitizedCoins = data.map((item: any) => ({
        id: item.id,
        symbol: item.symbol,
        name: item.name,
        image: item.image,
        current_price: item.current_price || 0,
        market_cap: item.market_cap || 0,
        market_cap_rank: item.market_cap_rank || 99,
        fully_diluted_valuation: item.fully_diluted_valuation || null,
        total_volume: item.total_volume || 0,
        high_24h: item.high_24h || item.current_price,
        low_24h: item.low_24h || item.current_price,
        price_change_24h: item.price_change_24h || 0,
        price_change_percentage_24h: item.price_change_percentage_24h || 0,
        market_cap_change_24h: item.market_cap_change_24h || 0,
        market_cap_change_percentage_24h: item.market_cap_change_percentage_24h || 0,
        circulating_supply: item.circulating_supply || 0,
        total_supply: item.total_supply || null,
        max_supply: item.max_supply || null,
        ath: item.ath || 0,
        ath_change_percentage: item.ath_change_percentage || 0,
        ath_date: item.ath_date || '',
        atl: item.atl || 0,
        atl_change_percentage: item.atl_change_percentage || 0,
        atl_date: item.atl_date || '',
        last_updated: item.last_updated || new Date().toISOString(),
        sparkline_in_7d: item.sparkline_in_7d || { price: [item.current_price] }
      }));

      coinCache.set(cacheKey, sanitizedCoins, 45); // Cache for 45 seconds
      
      // Update our memory reference of CURRENT_COINS with the new data
      // For any coin that exists in sanitizedCoins, overwrite in CURRENT_COINS. For new ones, append.
      sanitizedCoins.forEach((newCoin: any) => {
        const idx = CURRENT_COINS.findIndex(c => c.id === newCoin.id);
        if (idx >= 0) {
          CURRENT_COINS[idx] = newCoin;
        } else {
          CURRENT_COINS.push(newCoin);
        }
      });
      
      return sanitizedCoins;
    }
    throw new Error('Empty API Response');
  } catch (error) {
    console.warn('Unable to reach CoinGecko. Seamlessly serving buffered asset repository.', error);
    // Return our live memory copy which has our static mock data + latest simulated fluctuations
    return CURRENT_COINS;
  }
}

// Generate realistic 7-day brownian walk history points for a coin
function generateHistoricalFallbackData(currentPrice: number, days: number = 7): { timestamp: number; price: number }[] {
  const points: { timestamp: number; price: number }[] = [];
  const hours = days * 24;
  const now = Date.now();
  let basePrice = currentPrice * 0.96; // starts a bit lower so it generally trends upwards

  for (let i = hours; i >= 0; i--) {
    const timestamp = now - i * 60 * 60 * 1000;
    // Walk price with elegant sine waves combined with random walk
    const cycle = (i / hours) * Math.PI * 4;
    const wave = Math.sin(cycle) * 0.035;
    const noise = (Math.random() - 0.49) * 0.015;
    basePrice = basePrice * (1 + wave / 24 + noise);
    points.push({
      timestamp,
      price: parseFloat(basePrice.toFixed(currentPrice > 500 ? 2 : currentPrice > 1 ? 3 : 5))
    });
  }
  
  // Make the last point align precisely with the current price
  if (points.length > 0) {
    points[points.length - 1].price = currentPrice;
  }
  return points;
}

async function fetchCoinHistoryFromAPI(coinId: string, days: number = 7): Promise<{ timestamp: number; price: number }[]> {
  const cacheKey = `history_${coinId}_${days}`;
  const cachedHistory = coinCache.get(cacheKey);
  if (cachedHistory) {
    return cachedHistory;
  }

  // Find coin in our memory bank to reference its current price
  const activeCoin = CURRENT_COINS.find(c => c.id === coinId);
  const currentPrice = activeCoin ? activeCoin.current_price : 100;

  try {
    const response = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`,
      {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'LiveCryptoTrackerApp/1.0'
        }
      }
    );

    if (response.status === 429) {
      console.warn(`CoinGecko history API Rate Limit (429) for ${coinId}. Generating mathematically smooth brownian curve.`);
      throw new Error('RateLimit');
    }

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status}`);
    }

    const data = await response.json();
    if (data && data.prices && Array.isArray(data.prices)) {
      const historicalPoints = data.prices.map((pt: [number, number]) => ({
        timestamp: pt[0],
        price: pt[1]
      }));

      coinCache.set(cacheKey, historicalPoints, 300); // Cache historical data for 5 minutes
      return historicalPoints;
    }
    throw new Error('Empty history payload');
  } catch (err) {
    console.warn(`Leveraging generated math curves for historical chart of ${coinId}`);
    const fallbackHistory = generateHistoricalFallbackData(currentPrice, days);
    return fallbackHistory;
  }
}

async function startServer() {
  const app = express();
  const server = createServer(app);
  
  // Initialize WebSocket Server
  const io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST']
    }
  });

  app.use(express.json());

  // WebSocket event listeners
  io.on('connection', (socket) => {
    console.log(`Client attached to live ticker: ${socket.id}`);
    
    // Send initial values instantly upon handshaking
    socket.emit('initial_prices', CURRENT_COINS);

    socket.on('disconnect', () => {
      console.log(`Client detached from live ticker: ${socket.id}`);
    });
  });

  // Background ticker loop: Fluctuate prices and broadcast to all sockets every 15 seconds
  setInterval(async () => {
    // 1. Update prices in our active data state with slight fluctuations
    updatePricesAndVolumeSimulated();

    // 2. Refresh from actual API if cache expired (which returns cache or handles errors silently)
    await fetchCoinsFromAPI();

    // 3. Broadcast updated tracking payload to all attached sockets
    io.emit('price_updates', CURRENT_COINS);
  }, 15000);

  // REST API: Get list of coins
  app.get('/api/coins', async (req, res) => {
    try {
      const coins = await fetchCoinsFromAPI();
      
      const search = req.query.search ? String(req.query.search).toLowerCase().trim() : '';
      const page = req.query.page ? parseInt(String(req.query.page), 10) : 1;
      const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 10;

      let filtered = [...coins];
      if (search) {
        filtered = filtered.filter(coin => 
          coin.name.toLowerCase().includes(search) || 
          coin.symbol.toLowerCase().includes(search) ||
          coin.id.toLowerCase().includes(search)
        );
      }

      const totalItems = filtered.length;
      const totalPages = Math.ceil(totalItems / limit);
      const offset = (page - 1) * limit;
      const paginated = filtered.slice(offset, offset + limit);

      res.json({
        success: true,
        data: paginated,
        pagination: {
          page,
          limit,
          totalItems,
          totalPages
        }
      });
    } catch (e: any) {
      res.status(500).json({
        success: false,
        error: e.message || 'Internal Server Error'
      });
    }
  });

  // REST API: Get chart history for a coin
  app.get('/api/coins/:id/history', async (req, res) => {
    try {
      const { id } = req.params;
      const days = req.query.days ? parseInt(String(req.query.days), 10) : 7;
      
      const history = await fetchCoinHistoryFromAPI(id, days);
      res.json({
        success: true,
        coinId: id,
        days,
        prices: history
      });
    } catch (e: any) {
      res.status(500).json({
        success: false,
        error: e.message || 'Error loading history parameters'
      });
    }
  });

  // Trigger cache purge route for testing
  app.post('/api/cache/purge', (req, res) => {
    coinCache.clear();
    res.json({ success: true, message: 'Crypto caching registers fully cleared' });
  });

  // Client assets handler matching Vite middleware in dev / static in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`Unified Express + Socket.io Server active on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Fatal failure launching fullstack tracker:', err);
});
