export const snakeToCamel = (str: string): string => {
    return str.replace(/_([a-z])/g, (match, group1) => group1.toUpperCase());
};

export const createParentElement = (type : string, classes: string) : HTMLElement => {
    const element = document.createElement(type);
    const parsedClasses = classes.split(' ');
    console.log(parsedClasses);
    parsedClasses.forEach((c) => {
        if(c.length > 0){
            element.classList.add(c);
        }
    })
    return element;
}