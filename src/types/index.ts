export type BreakpointType = 'mobile' | 'tablet' | 'desktop';

export type GamePost = {
    _id : string,
    type: string,
    title: string,
    description: string,
    slug: string,
    rating: Number,
    review: {
        story: string | null;
        gameplay: string | null;
        graphics: string | null;
        sound: string | null;
    },
    genres: string[],
    developers: string[],
    platforms: string[],
    release_date: string,
    image_path: string
}

export type CinemaPost = {
    _id : string,
    type: string,
    title: string,
    description: string,
    slug: string,
    rating: Number,
    review: {
        story: string | null;
        cinematography: string | null;
        casting: string | null;
        sound: string | null;
    },
    genres: string[],
    director: string,
    release_date: string,
    image_path: string
}

export type BookPost = {
    _id : string,
    type: string,
    title: string,
    description: string,
    slug: string,
    rating: Number,
    review: {
        story: string | null;
        world: string | null;
        characters: string | null;
        writing: string | null;
    },
    genres: string[],
    author: string,
    release_date: string,
    image_path: string
}