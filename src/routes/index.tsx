import { createBrowserRouter } from "react-router";
import Layout from "../components/layout/Layout";
import Search from "../pages/Search";
import Games from "../pages/Games";
import GameDetail from "../pages/Games/GameDetail";

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
          path: 'cinema',
          element: <></>
        },
        {
          path: 'books',
          element: <></>
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