import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, RefreshCw, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const CURRENCIES = [
  "USD", "EUR","JPY", "AUD", "CAD", "CHF","INR", "THB", "IDR",
   "KRW","MXN", "BRL", "ZAR", "AED", "NZD", "SEK", "NOK", "DKK","VND",

];

async function fetchRates(base: string): Promise<Record<string, number>> {
  const res = await fetch(`https://open.er-api.com/v6/latest/${base}`);
  if (!res.ok) throw new Error("Failed to fetch exchange rates");
  const data = await res.json();
  return { ...data.rates, [base]: 1 };
}

interface Props {
  defaultFrom?: string;
}

export function CurrencyConverter({ defaultFrom = "USD" }: Props) {
  const [from, setFrom] = useState(defaultFrom);
  const [to, setTo] = useState(defaultFrom === "USD" ? "EUR" : "USD");
  const [amount, setAmount] = useState("100");

  const { data: rates, isLoading, error, dataUpdatedAt, refetch, isFetching } = useQuery({
    queryKey: ["exchange-rates", from],
    queryFn: () => fetchRates(from),
    staleTime: 1000 * 60 * 10,
    retry: 2,
  });

  const swap = () => {
    setFrom(to);
    setTo(from);
  };

  const rate = rates?.[to];
  const numericAmount = parseFloat(amount) || 0;
  const converted = rate ? numericAmount * rate : null;

  const updatedAt = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : null;

  const popularPairs = rates
    ? ["USD", "EUR","VND", "JPY", "AUD", "SGD"]
        .filter((c) => c !== from && rates[c])
        .slice(0, 5)
    : [];

  return (
    <div className="space-y-5">
      {/* Main Converter */}
      <div className="space-y-3">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</label>
          <div className="flex gap-2">
            <Input
              type="number"
              min={0}
              step="any"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="text-lg font-semibold"
              data-testid="converter-amount"
            />
            <Select value={from} onValueChange={setFrom}>
              <SelectTrigger className="w-28 font-semibold" data-testid="converter-from">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto scrollbar-thin">
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-center">
          <button
            onClick={swap}
            className="flex items-center gap-2 text-xs text-muted-foreground hover:text-primary transition-colors group"
            data-testid="converter-swap"
          >
            <ArrowLeftRight className="h-4 w-4 group-hover:scale-110 transition-transform" />
            <span>Swap</span>
          </button>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Converted To</label>
          <div className="flex gap-2">
            <div className="flex-1 bg-primary/5 border border-primary/20 rounded-md px-3 py-2 flex items-center">
              {isLoading || isFetching ? (
                <Skeleton className="h-7 w-32" />
              ) : error ? (
                <span className="text-destructive text-sm">Failed to load rates</span>
              ) : (
                <span className="text-lg font-bold text-primary" data-testid="converter-result">
                  {converted !== null
                    ? converted.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })
                    : "—"}
                </span>
              )}
            </div>
            <Select value={to} onValueChange={setTo}>
              <SelectTrigger className="w-28 font-semibold" data-testid="converter-to">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60 overflow-y-auto scrollbar-thin">
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {rate && !isLoading && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <span>
              1 {from} = <strong className="text-foreground">{rate.toFixed(4)}</strong> {to}
            </span>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-1 hover:text-primary transition-colors"
              title="Refresh rates"
            >
              <RefreshCw className={`h-3 w-3 ${isFetching ? "animate-spin" : ""}`} />
              {updatedAt && <span>Updated {updatedAt}</span>}
            </button>
          </div>
        )}
      </div>

      {/* Quick Reference Rates */}
      {popularPairs.length > 0 && rates && !isLoading && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wide">
            <TrendingUp className="h-3.5 w-3.5" />
            Quick Reference (1 {from})
          </div>
          <div className="grid grid-cols-1 gap-1.5">
            {popularPairs.map((currency) => {
              const r = rates[currency];
              const convertedQuick = r ? numericAmount * r : null;
              return (
                <button
                  key={currency}
                  onClick={() => setTo(currency)}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors border ${
                    to === currency
                      ? "bg-primary/10 border-primary/30 text-primary"
                      : "bg-muted/40 border-transparent hover:bg-muted hover:border-border"
                  }`}
                  data-testid={`quick-rate-${currency}`}
                >
                  <span className="font-medium">{currency}</span>
                  <div className="text-right">
                    <span className="font-semibold">
                      {convertedQuick !== null
                        ? convertedQuick.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : "—"}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1.5">
                      (1:{r?.toFixed(3)})
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground text-center">
        Rates from{" "}
        <a href="https://www.ecb.europa.eu" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">
          European Central Bank
        </a>{" "}
        · Updated daily
      </p>
    </div>
  );
}
