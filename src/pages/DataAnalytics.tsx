import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { ChartGrid } from '@/components/analytics/ChartGrid';
import { ChartModal } from '@/components/analytics/ChartModal';
import { motion } from 'framer-motion';

export interface ChartData {
  id: string;
  title: string;
  type: 'line' | 'bar' | 'pie' | 'area' | 'column';
  data: (string | number)[][];
  config: any;
  isLoading: boolean;
  error: string | null;
}

const DataAnalytics = () => {
  const [selectedChart, setSelectedChart] = useState<ChartData | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [allChartData, setAllChartData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchChartData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [
          revenueTrendRes,
          transactionVolumeRes,
          expensesRes,
          productsServicesRes, // This one needs correction
          invoicesRes,
          customersRes,
        ] = await Promise.all([
          fetch('https://madebyquantbackend.onrender.com/api/charts/revenue-trend'),
          fetch('https://madebyquantbackend.onrender.com/api/charts/transaction-volume'),
          fetch('https://madebyquantbackend.onrender.com/transactions?filter=expense'), // Assuming /transactions returns expenses with category
          fetch('https://madebyquantbackend.onrender.com/products-services'), // Corrected endpoint
          fetch('https://madebyquantbackend.onrender.com/api/invoices'),
          fetch('https://madebyquantbackend.onrender.com/api/customers'),
        ]);

        if (!revenueTrendRes.ok) throw new Error('Failed to fetch revenue trend data');
        if (!transactionVolumeRes.ok) throw new Error('Failed to fetch transaction volume data');
        if (!expensesRes.ok) throw new Error('Failed to fetch expenses data');
        if (!productsServicesRes.ok) throw new Error('Failed to fetch products/services data');
        if (!invoicesRes.ok) throw new Error('Failed to fetch invoices data');
        if (!customersRes.ok) throw new Error('Failed to fetch customers data');

        const revenueTrendData = await revenueTrendRes.json();
        const transactionVolumeData = await transactionVolumeRes.json();
        const expensesData = await expensesRes.json();
        const productsServicesData = await productsServicesRes.json();
        const invoicesData = await invoicesRes.json();
        const customersData = await customersRes.json();

        const charts: ChartData[] = [];

        // 1. Revenue, Expenses, and Profit Trend (Existing)
        const revenueCategories = revenueTrendData.map((d: any) => d.month);
        const revenueSeriesData = revenueTrendData.map((d: any) => d.revenue);
        const expensesSeriesData = revenueTrendData.map((d: any) => d.expenses);
        const profitSeriesData = revenueTrendData.map((d: any) => d.profit);

        charts.push({
          id: 'revenue-trend',
          title: 'Revenue, Expenses, and Profit Trend',
          type: 'line',
          data: [],
          config: {
            chart: { type: 'line' },
            title: { text: 'Monthly Financial Performance' },
            xAxis: { categories: revenueCategories },
            yAxis: { title: { text: 'Amount (ZAR)' } },
            series: [
              { name: 'Revenue', data: revenueSeriesData, type: 'line' },
              { name: 'Expenses', data: expensesSeriesData, type: 'line' },
              { name: 'Profit', data: profitSeriesData, type: 'line' },
            ],
          },
          isLoading: false,
          error: null,
        });

        // 2. Transaction Volume (Existing)
        const transactionCategories = transactionVolumeData.map((d: any) => d.month);
        const quotesSeriesData = transactionVolumeData.map((d: any) => d.quotes);
        const invoicesSeriesData = transactionVolumeData.map((d: any) => d.invoices);
        const purchasesSeriesData = transactionVolumeData.map((d: any) => d.purchases);

        charts.push({
          id: 'transaction-volume',
          title: 'Transaction Volume',
          type: 'column',
          data: [],
          config: {
            chart: { type: 'column' },
            title: { text: 'Monthly Transaction Volume' },
            xAxis: { categories: transactionCategories },
            yAxis: { title: { text: 'Count' } },
            series: [
              { name: 'Quotations', data: quotesSeriesData, type: 'column' },
              { name: 'Invoices', data: invoicesSeriesData, type: 'column' },
              { name: 'Purchases', data: purchasesSeriesData, type: 'column' },
            ],
          },
          isLoading: false,
          error: null,
        });

        // 3. Expenses by Category (New - Pie Chart)
        const expenseCategoryMap: { [key: string]: number } = {};
        expensesData.forEach((expense: any) => {
          const category = expense.category || 'Uncategorized';
          expenseCategoryMap[category] = (expenseCategoryMap[category] || 0) + parseFloat(expense.amount);
        });

        const expenseSeries = Object.entries(expenseCategoryMap).map(([name, y]) => ({ name, y }));

        charts.push({
          id: 'expenses-by-category',
          title: 'Expenses by Category',
          type: 'pie',
          data: [], // Highcharts pie series expects data in the series array itself
          config: {
            chart: { type: 'pie' },
            title: { text: 'Expense Distribution' },
            series: [{
              name: 'Expenses',
              data: expenseSeries,
              type: 'pie',
              innerSize: '50%',
              dataLabels: {
                enabled: true,
                format: '<b>{point.name}</b>: {point.percentage:.1f} %'
              }
            }],
          },
          isLoading: false,
          error: null,
        });

        // 4. Product Sales by Category (New - Bar Chart - simplified)
        // This is a simplification. A real-world scenario would need sales transactions linked to products.
        // For demonstration, we'll group products by category and assume a dummy sales value.
        const productCategorySalesMap: { [key: string]: number } = {};
        productsServicesData.forEach((product: any) => {
          const category = product.category || 'Other';
          // Assume a sales value based on unit_price or a mock value
          productCategorySalesMap[category] = (productCategorySalesMap[category] || 0) + (parseFloat(product.price) * (Math.floor(Math.random() * 50) + 1)); // Random sales count
        });

        const productSalesCategories = Object.keys(productCategorySalesMap);
        const productSalesData = Object.values(productCategorySalesMap);

        charts.push({
          id: 'product-sales-by-category',
          title: 'Product Sales by Category',
          type: 'bar',
          data: [],
          config: {
            chart: { type: 'bar' },
            title: { text: 'Sales Value by Product Category (Simulated)' },
            xAxis: { categories: productSalesCategories },
            yAxis: { title: { text: 'Sales Value (ZAR)' } },
            series: [{ name: 'Sales', data: productSalesData, type: 'bar' }],
          },
          isLoading: false,
          error: null,
        });

        // 5. Invoice Status Distribution (New - Pie Chart)
        const invoiceStatusMap: { [key: string]: number } = {
          'paid': 0,
          'pending': 0,
          'overdue': 0,
          'cancelled': 0,
          'draft': 0,
        };
        invoicesData.forEach((invoice: any) => {
          const status = invoice.status ? invoice.status.toLowerCase() : 'draft'; // Assuming a 'status' field
          if (invoiceStatusMap.hasOwnProperty(status)) {
            invoiceStatusMap[status]++;
          } else {
            // Handle any other unexpected statuses
            invoiceStatusMap['pending']++; // Default to pending if status is unknown
          }
        });

        const invoiceSeries = Object.entries(invoiceStatusMap).map(([name, y]) => ({ name: name.charAt(0).toUpperCase() + name.slice(1), y }));

        charts.push({
          id: 'invoice-status-distribution',
          title: 'Invoice Status Distribution',
          type: 'pie',
          data: [],
          config: {
            chart: { type: 'pie' },
            title: { text: 'Invoice Status Overview' },
            series: [{
              name: 'Invoices',
              data: invoiceSeries,
              type: 'pie',
              innerSize: '50%',
              dataLabels: {
                enabled: true,
                format: '<b>{point.name}</b>: {point.percentage:.1f} %'
              }
            }],
          },
          isLoading: false,
          error: null,
        });

        // 6. Customer Acquisition Trend (New - Line Chart)
        const customerAcquisitionMap: { [key: string]: number } = {}; // Month-Year -> Count
        customersData.forEach((customer: any) => {
          if (customer.created_at) {
            const date = new Date(customer.created_at);
            const monthYear = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
            customerAcquisitionMap[monthYear] = (customerAcquisitionMap[monthYear] || 0) + 1;
          }
        });

        const sortedMonths = Object.keys(customerAcquisitionMap).sort();
        const customerCounts = sortedMonths.map(month => customerAcquisitionMap[month]);

        charts.push({
          id: 'customer-acquisition-trend',
          title: 'Customer Acquisition Trend',
          type: 'line',
          data: [],
          config: {
            chart: { type: 'line' },
            title: { text: 'Monthly New Customer Sign-ups' },
            xAxis: { categories: sortedMonths },
            yAxis: { title: { text: 'New Customers' } },
            series: [{ name: 'New Customers', data: customerCounts, type: 'line' }],
          },
          isLoading: false,
          error: null,
        });


        setAllChartData(charts);
      } catch (err: any) {
        setError(err.message);
        console.error('Error fetching chart data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChartData();
  }, []); // Empty dependency array means this effect runs once on mount

  const handleExpandChart = (chart: ChartData) => {
    setSelectedChart(chart);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedChart(null);
  };

  return (
    <div className='flex-1 space-y-4 p-4 md:p-6 lg:p-8'>
      <Header title='Data Analytics' />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {loading && <p>Loading charts...</p>}
        {error && <p className="text-red-500">Error: {error}</p>}
        {!loading && !error && (
          <ChartGrid onExpandChart={handleExpandChart} chartData={allChartData} />
        )}
      </motion.div>

      <ChartModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        chart={selectedChart}
      />
    </div>
  );
};

export default DataAnalytics;