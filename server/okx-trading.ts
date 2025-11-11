import crypto from 'crypto';

/**
 * OKX Trading API Integration
 * Handles real trading execution on OKX exchange
 */

export interface OKXCredentials {
  apiKey: string;
  secretKey: string;
  passphrase: string;
  testnet?: boolean;
}

export interface TradeOrder {
  symbol: string; // e.g., "BTC-USDT"
  side: 'buy' | 'sell';
  orderType: 'market' | 'limit';
  size: string; // Amount in base currency
  price?: string; // Required for limit orders
  stopLoss?: string;
  takeProfit?: string;
}

export interface OrderResponse {
  orderId: string;
  clientOrderId: string;
  symbol: string;
  side: string;
  orderType: string;
  size: string;
  price?: string;
  status: string;
  timestamp: number;
}

export interface Position {
  symbol: string;
  side: 'long' | 'short';
  size: string;
  entryPrice: string;
  markPrice: string;
  unrealizedPnl: string;
  leverage: string;
}

/**
 * OKX Trading Client
 */
export class OKXTradingClient {
  private apiKey: string;
  private secretKey: string;
  private passphrase: string;
  private baseUrl: string;

  constructor(credentials: OKXCredentials) {
    this.apiKey = credentials.apiKey;
    this.secretKey = credentials.secretKey;
    this.passphrase = credentials.passphrase;
    this.baseUrl = credentials.testnet
      ? 'https://www.okx.com' // OKX uses same endpoint, testnet via demo trading
      : 'https://www.okx.com';
  }

  /**
   * Generate OKX API signature
   */
  private generateSignature(
    timestamp: string,
    method: string,
    requestPath: string,
    body: string = ''
  ): string {
    const message = timestamp + method + requestPath + body;
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(message)
      .digest('base64');
  }

  /**
   * Make authenticated request to OKX API
   */
  private async makeRequest(
    method: string,
    endpoint: string,
    body?: any
  ): Promise<any> {
    const timestamp = new Date().toISOString();
    const requestPath = `/api/v5${endpoint}`;
    const bodyStr = body ? JSON.stringify(body) : '';
    
    const signature = this.generateSignature(
      timestamp,
      method,
      requestPath,
      bodyStr
    );

    const headers = {
      'OK-ACCESS-KEY': this.apiKey,
      'OK-ACCESS-SIGN': signature,
      'OK-ACCESS-TIMESTAMP': timestamp,
      'OK-ACCESS-PASSPHRASE': this.passphrase,
      'Content-Type': 'application/json',
    };

    const url = `${this.baseUrl}${requestPath}`;
    const options: RequestInit = {
      method,
      headers,
    };

    if (body) {
      options.body = bodyStr;
    }

    const response = await fetch(url, options);
    const data = await response.json();

    if (data.code !== '0') {
      throw new Error(`OKX API Error: ${data.msg || 'Unknown error'}`);
    }

    return data.data;
  }

  /**
   * Place a spot trade order
   */
  async placeSpotOrder(order: TradeOrder): Promise<OrderResponse> {
    const body = {
      instId: order.symbol,
      tdMode: 'cash', // Spot trading
      side: order.side,
      ordType: order.orderType,
      sz: order.size,
      ...(order.price && { px: order.price }),
    };

    const result = await this.makeRequest('POST', '/trade/order', body);
    
    return {
      orderId: result[0].ordId,
      clientOrderId: result[0].clOrdId,
      symbol: order.symbol,
      side: order.side,
      orderType: order.orderType,
      size: order.size,
      price: order.price,
      status: result[0].sCode === '0' ? 'success' : 'failed',
      timestamp: Date.now(),
    };
  }

  /**
   * Place a futures trade order with stop loss and take profit
   */
  async placeFuturesOrder(order: TradeOrder): Promise<OrderResponse> {
    const body = {
      instId: order.symbol.replace('-', '-SWAP'), // Convert to perpetual swap
      tdMode: 'cross', // Cross margin mode
      side: order.side,
      ordType: order.orderType,
      sz: order.size,
      ...(order.price && { px: order.price }),
    };

    const result = await this.makeRequest('POST', '/trade/order', body);
    const orderId = result[0].ordId;

    // Add stop loss if specified
    if (order.stopLoss) {
      await this.makeRequest('POST', '/trade/order-algo', {
        instId: body.instId,
        tdMode: body.tdMode,
        side: order.side === 'buy' ? 'sell' : 'buy',
        ordType: 'conditional',
        sz: order.size,
        slTriggerPx: order.stopLoss,
        slOrdPx: '-1', // Market price
      });
    }

    // Add take profit if specified
    if (order.takeProfit) {
      await this.makeRequest('POST', '/trade/order-algo', {
        instId: body.instId,
        tdMode: body.tdMode,
        side: order.side === 'buy' ? 'sell' : 'buy',
        ordType: 'conditional',
        sz: order.size,
        tpTriggerPx: order.takeProfit,
        tpOrdPx: '-1', // Market price
      });
    }

    return {
      orderId,
      clientOrderId: result[0].clOrdId,
      symbol: order.symbol,
      side: order.side,
      orderType: order.orderType,
      size: order.size,
      price: order.price,
      status: result[0].sCode === '0' ? 'success' : 'failed',
      timestamp: Date.now(),
    };
  }

  /**
   * Get all open positions
   */
  async getPositions(): Promise<Position[]> {
    const result = await this.makeRequest('GET', '/account/positions');
    
    return result.map((pos: any) => ({
      symbol: pos.instId,
      side: pos.posSide === 'long' ? 'long' : 'short',
      size: pos.pos,
      entryPrice: pos.avgPx,
      markPrice: pos.markPx,
      unrealizedPnl: pos.upl,
      leverage: pos.lever,
    }));
  }

  /**
   * Close all positions
   */
  async closeAllPositions(): Promise<void> {
    const positions = await this.getPositions();
    
    for (const position of positions) {
      await this.makeRequest('POST', '/trade/close-position', {
        instId: position.symbol,
        mgnMode: 'cross',
      });
    }
  }

  /**
   * Get order details
   */
  async getOrder(orderId: string, symbol: string): Promise<any> {
    const result = await this.makeRequest('GET', `/trade/order?ordId=${orderId}&instId=${symbol}`);
    return result[0];
  }

  /**
   * Cancel an order
   */
  async cancelOrder(orderId: string, symbol: string): Promise<void> {
    await this.makeRequest('POST', '/trade/cancel-order', {
      ordId: orderId,
      instId: symbol,
    });
  }

  /**
   * Get account balance
   */
  async getBalance(): Promise<any> {
    const result = await this.makeRequest('GET', '/account/balance');
    return result[0];
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.getBalance();
      return true;
    } catch (error) {
      console.error('OKX API connection test failed:', error);
      return false;
    }
  }
}

/**
 * Helper function to create trading client from user credentials
 */
export function createTradingClient(credentials: OKXCredentials): OKXTradingClient {
  return new OKXTradingClient(credentials);
}
