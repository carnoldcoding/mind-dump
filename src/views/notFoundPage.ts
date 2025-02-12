export const createNotFoundPage = () : string => {
    return `
    <div class="max-w-4xl m-auto">
        <img src="https://static-00.iconduck.com/assets.00/404-page-not-found-illustration-2048x998-yjzeuy4v.png">
    </div>
    <h1 class="text-white text-xl sm:text-2xl md:text-4xl lg:text-6xl text-center pt-10">Sorry! This page couldn't be found.</h1>
    <a href="/">
        <button class="m-auto block text-sm md:text-lg lg:text-xl uppercase tracking-wide bg-sky-300 
        rounded-sm  py-2 px-5 mt-5
        cursor-pointer
        hover:bg-sky-400
        duration-75
        ">Return</button>
    </a>
    
    `
}