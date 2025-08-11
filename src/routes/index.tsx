import { createBrowserRouter } from "react-router";
import Layout from "../components/layout/Layout";
import Search from "../pages/Search";
import Games from "../pages/Games";
import GameDetail from "../pages/Games/GameDetail";
import Books from "../pages/Books";
import BookDetail from "../pages/Books/BookDetail";
import Cinema from "../pages/Cinema";
import CinemaDetail from "../pages/Cinema/CinemaDetail";

export const router = createBrowserRouter([
    {
      path: '/',
      element: <Layout />,
      children: [
        {
          index: true,
          element: <Search />,
        },
        {
          path: 'games',
          element: <Games />
        },
        {
          path: 'games/:id',
          element: <GameDetail />
        },
        {
          path: 'books',
          element: <Books />
        },
        {
          path: 'books/:id',
          element: <BookDetail />
        },
        {
          path: 'cinema',
          element: <Cinema />
        },
        {
          path: 'cinema/:id',
          element: <CinemaDetail />
        },
        {
          path: 'system',
          element: <></>
        },
        {
          path: 'journal',
          element: <></>
        }
      ],
    },
  ]);