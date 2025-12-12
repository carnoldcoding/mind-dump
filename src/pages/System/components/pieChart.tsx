import { Pie } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';

export const PieChart = () => {
    ChartJS.register(ArcElement, Tooltip, Legend);
    
    const pieData = {
        labels: ['Cinema', 'Books', 'Games'],
        datasets: [
            {
            data: [30, 60, 10],
            backgroundColor: ['#48483D', '#6D6858', '#BDB7A8'],
            hoverBackgroundColor: ['#5A5A4D', '#7F7A69', '#D6D0C1'],
            borderWidth: 0,
            },
        ],
    }

    const pieOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: { position: 'bottom' },
            tooltip: { enabled: true },
        },
    };
    return(
            <div className="w-full h-64 bg-nier-100-lighter relative">
                <div className="h-7 w-full bg-nier-150 flex items-center justify-between px-2">
                    <h3 className="text-nier-text-dark">Review Distribution</h3>
                </div>
                <aside className="absolute h-full w-full bg-nier-shadow -z-1 top-1 left-1"></aside>
                <div className="w-full h-full p-8">
                    <Pie data={pieData} options={pieOptions} />
                </div>
            </div>
    )
}