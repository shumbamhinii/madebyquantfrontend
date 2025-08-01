import { useState, useEffect, useCallback } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Heart, FileText, BarChart3, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

const API_BASE_URL = 'https://madebyquantbackend.onrender.com';

interface StatResponse {
  count?: number;
  value?: number;
  previousCount?: number;
  previousValue?: number;
  changePercentage?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
}

// Update component props to accept a date range
export function StatsCards({ startDate, endDate }: { startDate: Date | null, endDate: Date | null }) {
  const [clientStats, setClientStats] = useState<StatResponse | null>(null);
  const [quoteStats, setQuoteStats] = useState<StatResponse | null>(null);
  const [invoiceStats, setInvoiceStats] = useState<StatResponse | null>(null);
  const [invoiceValueStats, setInvoiceValueStats] = useState<StatResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Helper function to format date for API
  const formatDateForApi = (date: Date | null): string | null => {
    if (!date) return null;
    return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
  };

  // Construct query parameters for the date range
  const getPeriodQueryParams = useCallback(() => {
    const params = new URLSearchParams();
    const formattedStartDate = formatDateForApi(startDate);
    const formattedEndDate = formatDateForApi(endDate);

    if (formattedStartDate) {
      params.append('startDate', formattedStartDate);
    }
    if (formattedEndDate) {
      params.append('endDate', formattedEndDate);
    }
    return params.toString() ? `?${params.toString()}` : '';
  }, [startDate, endDate]);


  const fetchStats = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const queryParams = getPeriodQueryParams(); // Use the new helper
      const [
        clientsRes,
        quotesRes,
        invoicesRes,
        invoiceValueRes
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/api/stats/clients${queryParams}`),
        fetch(`${API_BASE_URL}/api/stats/quotes${queryParams}`),
        fetch(`${API_BASE_URL}/api/stats/invoices${queryParams}`),
        fetch(`${API_BASE_URL}/api/stats/invoice-value${queryParams}`),
      ]);

      const clientData: StatResponse = await clientsRes.json();
      const quotesData: StatResponse = await quotesRes.json();
      const invoicesData: StatResponse = await invoicesRes.json();
      const invoiceValueData: StatResponse = await invoiceValueRes.json();

      if (!clientsRes.ok || !quotesRes.ok || !invoicesRes.ok || !invoiceValueRes.ok) {
        throw new Error('Failed to fetch one or more stats.');
      }

      setClientStats(clientData);
      setQuoteStats(quotesData);
      setInvoiceStats(invoicesData);
      setInvoiceValueStats(invoiceValueData);

    } catch (err: any) {
      console.error('Error fetching stats:', err);
      setError(err.message || 'Failed to load dashboard statistics.');
    } finally {
      setIsLoading(false);
    }
  }, [getPeriodQueryParams]); // Dependency changed to getPeriodQueryParams

  useEffect(() => {
    fetchStats();
  }, [fetchStats]); // This dependency is fine, as getPeriodQueryParams covers startDate/endDate

  // Helper to format change string
  const formatChange = (percentage: number | undefined, type: 'increase' | 'decrease' | 'neutral' | undefined) => {
    if (percentage === undefined || type === undefined) {
      return 'N/A';
    }
    const symbol = type === 'increase' ? '↑' : type === 'decrease' ? '↓' : '→';
    return `${symbol} ${Math.abs(percentage).toFixed(2)}%`;
  };

  const stats = [
    {
      title: 'Clients',
      value: clientStats?.count !== undefined ? clientStats.count.toLocaleString() : 'Loading...',
      change: formatChange(clientStats?.changePercentage, clientStats?.changeType),
      changeType: clientStats?.changeType || 'neutral',
      icon: Users,
      color: 'text-blue-600'
    },
    {
      title: 'Quotes',
      value: quoteStats?.count !== undefined ? quoteStats.count.toLocaleString() : 'Loading...',
      change: formatChange(quoteStats?.changePercentage, quoteStats?.changeType),
      changeType: quoteStats?.changeType || 'neutral',
      icon: Heart,
      color: 'text-pink-600'
    },
    {
      title: 'Invoices',
      value: invoiceStats?.count !== undefined ? invoiceStats.count.toLocaleString() : 'Loading...',
      change: formatChange(invoiceStats?.changePercentage, invoiceStats?.changeType),
      changeType: invoiceStats?.changeType || 'neutral',
      icon: FileText,
      color: 'text-purple-600'
    },
    {
      title: 'Invoice Value',
      value: invoiceValueStats?.value !== undefined ? `R${invoiceValueStats.value.toLocaleString('en-ZA', { minimumFractionDigits: 2 })}` : 'Loading...',
      change: formatChange(invoiceValueStats?.changePercentage, invoiceValueStats?.changeType),
      changeType: invoiceValueStats?.changeType || 'neutral',
      icon: BarChart3,
      color: 'text-green-600'
    }
  ];

  if (isLoading) {
    return (
      <div className='flex justify-center items-center h-40'>
        <Loader2 className='h-8 w-8 animate-spin text-gray-500' />
        <span className='ml-2 text-gray-600'>Loading statistics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className='text-center text-red-500 p-4 border border-red-300 rounded-md'>
        <p>Error: {error}</p>
        <Button onClick={fetchStats} className='mt-2'>Retry</Button>
      </div>
    );
  }

  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6'>
      {stats.map((stat, index) => (
        <motion.div
          key={stat.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <Card>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className='text-2xl font-bold'>{stat.value}</div>
              <Badge
                variant={
                  stat.changeType === 'increase' ? 'default' : stat.changeType === 'decrease' ? 'destructive' : 'secondary'
                }
                className='mt-1'
              >
                {stat.change}
              </Badge>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  );
}
