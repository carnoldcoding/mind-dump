import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';

export const BarChart = () => {
  ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

  const barData = {
    labels: ['5', '4', '3'],
    datasets: [
      {
        label: 'Rating Data',
        data: [5, 10, 8],
        backgroundColor: ['#48483D', '#6D6858', '#BDB7A8'],
        hoverBackgroundColor: ['#5A5A4D', '#7F7A69', '#D6D0C1'],
        borderWidth: 0,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'bottom' },
      tooltip: { enabled: true },
    },
    scales: {
      x: {
        beginAtZero: true,
      },
      y: {
        beginAtZero: true,
      },
    },
  };

  return (
    <div className="w-full h-64 bg-nier-100-lighter relative">
      <div className="h-7 w-full bg-nier-150 flex items-center justify-between px-2">
        <h3 className="text-nier-text-dark">Rating Distribution</h3>
      </div>
      <aside className="absolute h-full w-full bg-nier-shadow -z-1 top-1 left-1"></aside>
      <div className="w-full h-full p-8">
        <Bar data={barData} options={barOptions} />
      </div>
    </div>
  );
};
