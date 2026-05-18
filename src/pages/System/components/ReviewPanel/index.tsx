import { ReviewList } from "./ReviewList"

export const ReviewPanel = () => {
    return (
        <div className="relative">
            <aside className="absolute w-full h-full bg-nier-shadow top-1 left-1" />
            <div className="w-full bg-nier-100-lighter relative">
                <div className="h-7 w-full bg-nier-150 flex items-center justify-between px-2">
                    <h3 className="text-nier-text-dark">Review Management</h3>
                </div>
                <ReviewList />
            </div>
        </div>
    )
}