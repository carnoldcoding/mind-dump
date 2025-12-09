const LoginForm = () => {
    return (
         <article className="min-h-screen flex justify-center items-start">
                <form className="flex flex-col gap-4">
                    <div className="border-2 border-nier-150 flex w-md relative">
                        <ion-icon className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2" name="person-circle-outline"></ion-icon>
                        <input autoFocus className="focus:outline focus:border-nier-dark w-full p-2 px-4 pl-12"
                        type="text" name="username" />
                    </div>
                    
                    <div className="border-2 border-nier-150 flex w-md relative">
                        <ion-icon className="absolute left-3 top-1/2 h-6 w-6 -translate-y-1/2" name="lock-closed"></ion-icon>
                        <input className="focus:outline focus:border-nier-dark w-full p-2 px-4 pl-12"
                        type="password" name="password" />
                    </div>
                </form>
            </article>
    )
}

export default LoginForm