import { createBrowserRouter } from "react-router";
import Layout from "../components/layout/Layout";
import Now from "../pages/Now";
import Backlog from "../pages/Backlog";
import System from "../pages/System";
import Review from "../pages/Review";
import { UnderConstruction } from "../components/common/UnderConstruction";
import ReviewDetail from "../pages/ReviewDetail";

export const router = createBrowserRouter([
    {
      path: '/',
      element: <Layout />,
      children: [
        {
          index: true,
          element: <Now />,
        },
        // Before ':category', which would otherwise match "backlog" and hand
        // it to the Category shelf.
        {
          path: 'backlog',
          element: <Backlog />
        },
        {
          path: ':category',
          element: <Review/>
        },
        {
          path: ':category/:slug',
          element: <ReviewDetail />
        },
        {
          path: 'system',
          element: <System />
        },
        {
          path: 'journal',
          element: <UnderConstruction />
        }
      ],
    },
  ]);