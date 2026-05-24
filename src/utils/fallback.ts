import { CoinHistoryPoint } from '../types';

export function generateClientHistoricalFallbackData(currentPrice: number, days: number = 7): CoinHistoryPoint[] {
  const points: CoinHistoryPoint[] = [];
  const hours = days * 24;
  const now = Date.now();
  let basePrice = currentPrice * 0.96; // starts slightly lower so it generally trends upwards

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
