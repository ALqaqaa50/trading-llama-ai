#!/usr/bin/env python3
"""
Real Technical Indicator Calculations using TA-Lib
This script calculates actual technical indicators from OHLCV data
"""

import sys
import json
import numpy as np
import pandas as pd
import talib

def calculate_indicators(ohlcv_data):
    """
    Calculate real technical indicators from OHLCV data
    
    Args:
        ohlcv_data: List of [timestamp, open, high, low, close, volume]
    
    Returns:
        Dictionary with calculated indicators
    """
    try:
        # Convert to pandas DataFrame
        df = pd.DataFrame(ohlcv_data, columns=['timestamp', 'open', 'high', 'low', 'close', 'volume'])
        
        # Convert to numpy arrays for TA-Lib
        close = np.array(df['close'], dtype=float)
        high = np.array(df['high'], dtype=float)
        low = np.array(df['low'], dtype=float)
        volume = np.array(df['volume'], dtype=float)
        
        # Calculate RSI
        rsi = talib.RSI(close, timeperiod=14)
        current_rsi = float(rsi[-1]) if not np.isnan(rsi[-1]) else None
        
        # Calculate MACD
        macd, macd_signal, macd_hist = talib.MACD(close, fastperiod=12, slowperiod=26, signalperiod=9)
        current_macd = float(macd[-1]) if not np.isnan(macd[-1]) else None
        current_macd_signal = float(macd_signal[-1]) if not np.isnan(macd_signal[-1]) else None
        current_macd_hist = float(macd_hist[-1]) if not np.isnan(macd_hist[-1]) else None
        
        # Calculate Bollinger Bands
        upper, middle, lower = talib.BBANDS(close, timeperiod=20, nbdevup=2, nbdevdn=2)
        current_bb_upper = float(upper[-1]) if not np.isnan(upper[-1]) else None
        current_bb_middle = float(middle[-1]) if not np.isnan(middle[-1]) else None
        current_bb_lower = float(lower[-1]) if not np.isnan(lower[-1]) else None
        
        # Calculate ATR (Average True Range)
        atr = talib.ATR(high, low, close, timeperiod=14)
        current_atr = float(atr[-1]) if not np.isnan(atr[-1]) else None
        
        # Calculate Stochastic Oscillator
        slowk, slowd = talib.STOCH(high, low, close, fastk_period=14, slowk_period=3, slowd_period=3)
        current_stoch_k = float(slowk[-1]) if not np.isnan(slowk[-1]) else None
        current_stoch_d = float(slowd[-1]) if not np.isnan(slowd[-1]) else None
        
        # Calculate Moving Averages
        sma_20 = talib.SMA(close, timeperiod=20)
        sma_50 = talib.SMA(close, timeperiod=50)
        ema_20 = talib.EMA(close, timeperiod=20)
        ema_50 = talib.EMA(close, timeperiod=50)
        
        current_sma_20 = float(sma_20[-1]) if not np.isnan(sma_20[-1]) else None
        current_sma_50 = float(sma_50[-1]) if not np.isnan(sma_50[-1]) else None
        current_ema_20 = float(ema_20[-1]) if not np.isnan(ema_20[-1]) else None
        current_ema_50 = float(ema_50[-1]) if not np.isnan(ema_50[-1]) else None
        
        # Detect trend based on moving averages
        trend = None
        if current_sma_20 and current_sma_50:
            if current_sma_20 > current_sma_50 and close[-1] > current_sma_20:
                trend = 'uptrend'
            elif current_sma_20 < current_sma_50 and close[-1] < current_sma_20:
                trend = 'downtrend'
            else:
                trend = 'sideways'
        
        # Calculate support and resistance levels
        recent_highs = high[-20:]
        recent_lows = low[-20:]
        resistance = float(np.max(recent_highs))
        support = float(np.min(recent_lows))
        
        return {
            'success': True,
            'indicators': {
                'rsi': current_rsi,
                'macd': {
                    'macd': current_macd,
                    'signal': current_macd_signal,
                    'histogram': current_macd_hist
                },
                'bollinger_bands': {
                    'upper': current_bb_upper,
                    'middle': current_bb_middle,
                    'lower': current_bb_lower
                },
                'atr': current_atr,
                'stochastic': {
                    'k': current_stoch_k,
                    'd': current_stoch_d
                },
                'moving_averages': {
                    'sma_20': current_sma_20,
                    'sma_50': current_sma_50,
                    'ema_20': current_ema_20,
                    'ema_50': current_ema_50
                },
                'trend': trend,
                'support': support,
                'resistance': resistance,
                'current_price': float(close[-1])
            }
        }
    
    except Exception as e:
        return {
            'success': False,
            'error': str(e)
        }

if __name__ == '__main__':
    try:
        # Read OHLCV data from stdin
        input_data = json.loads(sys.stdin.read())
        
        # Calculate indicators
        result = calculate_indicators(input_data['ohlcv'])
        
        # Output result as JSON
        print(json.dumps(result))
        sys.exit(0)
    
    except Exception as e:
        error_result = {
            'success': False,
            'error': str(e)
        }
        print(json.dumps(error_result))
        sys.exit(1)
