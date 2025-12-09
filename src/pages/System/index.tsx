import PageHeader from "../../components/common/PageHeader";
import LoginForm from "./LoginForm";

const System = () => {
    const isLoggedIn = true;
    return (
        <>
            <PageHeader name="SYSTEM" />
            {isLoggedIn ? 
                <article className="md:h-134 bg-nier-100 mt-5 relative ">
                    <div className="h-10 w-full bg-nier-150 flex items-center justify-between px-5">
                        <h3 className="text-nier-text-dark text-xl">Control Panel</h3>
                    </div>
                    {/*Control Panel Content*/}
                    <div className="">
                        {/*Data Row */}
                        <div className="flex p-4 gap-4 relative z-1">
                            <div className="w-full h-64 bg-nier-100-lighter relative">
                                <div className="h-7 w-full bg-nier-150 flex items-center justify-between px-2">
                                    <h3 className="text-nier-text-dark">Review Partition</h3>
                                </div>
                                <aside className="absolute h-full w-full bg-nier-shadow -z-1 top-1 left-1"></aside>

                                {/*ChartJS here*/}
                            </div>
                        </div>
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