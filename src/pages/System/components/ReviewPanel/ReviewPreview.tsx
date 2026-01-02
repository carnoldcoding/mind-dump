import { useState } from "react";
import { Button } from "../../../../components/common/Button";

export const ReviewPreview = ({review, deletePost, onDelete, onEdit} :{review: any, deletePost: any, onDelete: any, onEdit:any}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [deleteInput, setDeleteInput] = useState('');
    const [error, setError] = useState('');

    const handleEdit = () => {
        onEdit(review);
    }
    const typeIconMap = {
        'book': 'book-sharp',
        'game': 'game-controller-sharp',
        'cinema': 'videocam-sharp'
    }

    const statusIconMap = {
        'todo': 'close-circle-outline',
        'active': 'timer-outline',
        'done': 'checkmark-circle-outline'
    }

    const handleOpen = () => {
        document.body.style.overflow = "hidden";
        setIsOpen(true);
    }

    const handleClose = () => {
        document.body.style.overflow = "auto";
        setError('');
        setDeleteInput('');
        setIsOpen(false);
    }

    const authenticateDeletion = () => {
        console.log(deleteInput, review.slug);
        if(deleteInput === review.slug){
            console.log("valid");
            handleDelete(deleteInput);
        }else{
            setError("incorrect input");
        }
    }

    const handleDelete = async (slug : string) => {
        handleClose();
        await deletePost(slug);
        await onDelete();
    }
    return (
        <li  
        data-slug={review.slug} className="grid grid-cols-6 [&>p]:text-lg [&>div>p:text-center] h-15 px-4 border-b border-b-nier-dark/50 items-center">
            <p className="col-span-2">{review.title}</p>
            <div className="flex items-center justify-center">
                 <div className="grid grid-cols-2 rounded-md px-2 py-1 min-w-30 max-w-30 ">
                    <ion-icon className="h-7 w-7" name={typeIconMap[review.type]}></ion-icon>
                    <p className="capitalize flex items-center">{review.type}</p>
                </div>
            </div>
            <div className="flex justify-center">
                <p className="">{review.rating}</p>
            </div>
            
            <div className="flex items-center justify-center">
                <div className="grid grid-cols-2 rounded-md px-2 py-1 min-w-30 max-w-30 place-items-center">
                    <ion-icon className="h-7 w-7" name={statusIconMap[review.status]}></ion-icon>
                    <p className="capitalize flex items-center">{review.status}</p>
                </div>
            </div>

            <div className="flex gap-2 [&>button>ion-icon]:w-6 [&>button>ion-icon]:h-6
            [&>button]:cursor-pointer justify-center">
                <button onClick={handleEdit}><ion-icon name="pencil-sharp"></ion-icon></button>
                <button onClick={handleOpen}><ion-icon name="trash-sharp"></ion-icon></button>
            </div>

            {
                isOpen && 
                <aside className="fixed top-0 left-0 h-screen w-screen bg-black/40 z-99 flex items-center justify-center">
                <div className="w-lg bg-nier-100-lighter relative ">
                    <div className="h-7 w-full bg-nier-150 flex items-center justify-between px-2">
                        <h3 className="text-nier-text-dark">Confirmation Message</h3>
                    </div>
                    <div className="flex flex-col items-center justify-start h-full p-4 gap-4">
                        <ion-icon className="h-30 w-30" name="close-circle-outline"></ion-icon>
                        <h3 className="text-2xl">Are you sure?</h3>
                        <p>To delete, type the keyword: <span className="italic">{review.slug}</span></p>
                        <div>
                            <input
                                className="focus:outline focus:border-nier-dark border-nier-150 border w-full p-2 px-4"
                                type="text"
                                value={deleteInput}
                                onChange={(e) => setDeleteInput(e.currentTarget.value)}
                            />
                            {error && <p className="capitalize text-red-700 mt-4">{error}</p>}
                        </div>
                        <div className="flex gap-4">
                            <Button label="cancel" handleClick={handleClose}></Button>
                            <Button label="confirm" type="primary" handleClick={authenticateDeletion}></Button>
                        </div>
                    </div>
                    <aside className="absolute h-full w-full bg-nier-shadow -z-1 top-1 left-1">
                    </aside>
                </div>
            </aside>
            }
        </li>
    )
}