import { createBrowserRouter } from "react-router";
import Layout from "../components/layout/Layout";
import Search from "../pages/Search";
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
          element: <Search />,
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