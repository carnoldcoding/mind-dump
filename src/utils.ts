export const snakeToCamel = (str: string): string => {
    return str.replace(/_([a-z])/g, (match, group1) => group1.toUpperCase());
};