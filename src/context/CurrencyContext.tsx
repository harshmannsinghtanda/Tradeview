import React, { createContext, useContext, useState, useEffect } from 'react';

type Currency = 'INR' | 'USD';

interface CurrencyContextType {
  currency: Currency;
  setCurrency: (c: Currency) => void;
  usdToInrRate: number;
  setUsdToInrRate: (rate: number) => void;
  formatCurrency: (value: number, overrideCurrency?: Currency) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState<Currency>('INR');
  const [usdToInrRate, setUsdToInrRateState] = useState<number>(83.5);

  // Load from local storage on mount
  useEffect(() => {
    const savedCurrency = localStorage.getItem('tradeview_currency') as Currency;
    if (savedCurrency && (savedCurrency === 'INR' || savedCurrency === 'USD')) {
      setCurrencyState(savedCurrency);
    }
    const savedRate = localStorage.getItem('tradeview_usd_to_inr_rate');
    if (savedRate && !isNaN(Number(savedRate))) {
      setUsdToInrRateState(Number(savedRate));
    }
  }, []);

  const setCurrency = (c: Currency) => {
    setCurrencyState(c);
    localStorage.setItem('tradeview_currency', c);
  };

  const setUsdToInrRate = (rate: number) => {
    setUsdToInrRateState(rate);
    localStorage.setItem('tradeview_usd_to_inr_rate', rate.toString());
  };

  const formatCurrency = (value: number, overrideCurrency?: Currency): string => {
    const targetCurrency = overrideCurrency || currency;
    
    // Assuming base data is in INR.
    let displayValue = value;
    if (targetCurrency === 'USD') {
      displayValue = value / usdToInrRate;
    }

    const symbol = targetCurrency === 'INR' ? '₹' : '$';
    
    // Format with commas and 2 decimal places
    const formattedNumber = Math.abs(displayValue).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

    const sign = displayValue < 0 ? '-' : '';
    return `${sign}${symbol}${formattedNumber}`;
  };

  return (
    <CurrencyContext.Provider value={{
      currency,
      setCurrency,
      usdToInrRate,
      setUsdToInrRate,
      formatCurrency
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}
