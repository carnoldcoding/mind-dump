import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';

export const BarChart = ({ data }: { data: any[] }) => {
  ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

  function getRatingDistribution(reviews: any[]) {
    return reviews.reduce(
      (acc, review) => {
        if (review.rating == null) return acc;

        // Normalize rating (string, decimals, whitespace-safe)
        const rating = Math.floor(Number(review.rating));

        if (rating >= 1 && rating <= 5) {
          acc[rating]++;
        }

        return acc;
      },
      { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    );
  }

  const ratingCounts = getRatingDistribution(data);

  const barData = {
    labels: ['5', '4', '3', '2', '1'],
    datasets: [
      {
        label: 'Rating Distribution',
        data: [
          ratingCounts[5],
          ratingCounts[4],
          ratingCounts[3],
          ratingCounts[2],
          ratingCounts[1],
        ],
        backgroundColor: [
          '#48483D',
          '#6D6858',
          '#8A8473',
          '#A8A28F',
          '#BDB7A8',
        ],
        hoverBackgroundColor: [
          '#5A5A4D',
          '#7F7A69',
          '#9A9484',
          '#BDB7A8',
          '#D6D0C1',
        ],
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
        ticks: {
          stepSize: 1,
          precision: 0,
        },
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