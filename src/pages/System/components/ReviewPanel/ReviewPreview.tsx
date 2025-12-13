export const ReviewPreview = (review : any) => {
    const typeIconMap = {
        'book': 'book-sharp',
        'game': 'game-controller-sharp',
        'cinema': 'videocam-sharp'
    }
    return (
        <li className="grid grid-cols-6 [&>p]:text-lg [&>div>p:text-center] h-15 px-4 border-b border-b-nier-dark/50 items-center">
            <p className="col-span-2">{review.title}</p>
            <div className="flex items-center justify-center">
                <div className="flex gap-2 rounded-md border px-2 py-1 min-w-30 max-w-30 items-center justify-around">
                    <ion-icon className="h-7 w-7" name={typeIconMap[review.type]}></ion-icon>
                    <p className="capitalize flex items-center">{review.type}</p>
                </div>
            </div>
            <div className="flex justify-center">
                <p className="">{review.rating}</p>
            </div>
            <div>
                <p className="">{review.release_date}</p>
            </div>
            <div className="flex gap-2 [&>button>ion-icon]:w-6 [&>button>ion-icon]:h-6
            [&>button]:cursor-pointer justify-center">
                <button><ion-icon name="pencil-sharp"></ion-icon></button>
                <button><ion-icon name="trash-sharp"></ion-icon></button>
            </div>
        </li>
    )
}