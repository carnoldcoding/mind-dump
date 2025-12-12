import PageHeader from "../../components/common/PageHeader";
import LoginForm from "./LoginForm";
import { PieChart } from "./components/pieChart";
import { BarChart } from "./components/barChart";
import { ReviewPanel } from "./components/ReviewPanel";
const System = () => {
    const isLoggedIn = true;
    return (
        <>
            <PageHeader name="SYSTEM" />
            {isLoggedIn ? 
                <article className="bg-nier-100 mt-5 relative">
                    <div className="h-10 w-full bg-nier-150 flex items-center justify-between px-5">
                        <h3 className="text-nier-text-dark text-xl">Control Panel</h3>
                    </div>
                    {/* Control Panel Content */}
                    <div className="p-4 flex flex-col gap-4">
                        {/*Data Row */} 
                        <div className="flex gap-4 relative z-1 flex-col md:flex-row">
                            <PieChart />
                            <BarChart />
                        </div>
                        {/* Review Section */}
                        <ReviewPanel />
                    </div>
                    <aside className="absolute h-full w-full bg-nier-shadow -z-1 top-1 left-1"></aside>
                </article>
                :
                <LoginForm />
            }
        </>
    )
}

export default System;