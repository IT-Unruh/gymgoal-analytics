import { createContext, useContext, useState } from 'react';

interface DateRangeCtx {
  from: string;
  to: string;
  setFrom: (v: string) => void;
  setTo: (v: string) => void;
  clear: () => void;
}

const DateRangeContext = createContext<DateRangeCtx>({
  from: '', to: '', setFrom: () => {}, setTo: () => {}, clear: () => {},
});

export function DateRangeProvider({ children }: { children: React.ReactNode }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  return (
    <DateRangeContext.Provider value={{ from, to, setFrom, setTo, clear: () => { setFrom(''); setTo(''); } }}>
      {children}
    </DateRangeContext.Provider>
  );
}

export const useDateRange = () => useContext(DateRangeContext);
