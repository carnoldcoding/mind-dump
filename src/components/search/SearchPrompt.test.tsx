import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, cleanup, act, fireEvent, within } from "@testing-library/react";
import { RouterProvider, createMemoryRouter, useLocation } from "react-router";
import Layout from "../layout/Layout";
import Now from "../../pages/Now";
import { backend } from "../../api/backend";
import { resetReviewsStore } from "../../store/reviews";
import { TrustedDeviceProvider } from "../../context/TrustedDeviceContext";

vi.mock("../../api/backend", () => ({
    backend: { getReviews: vi.fn(), probeTrustedDevice: vi.fn() },
}));

const mocked = vi.mocked(backend);

const review = (title: string, over: Record<string, unknown> = {}) => ({
    _id: `id-${title}`,
    slug: title.toLowerCase().replace(/\s+/g, "-"),
    title,
    type: "game",
    status: "done",
    rating: 8,
    genres: [],
    review: {},
    image_path: "",
    release_date: "1999-01-01",
    date_completed: "2026-01-01",
    ...over,
});

// Shows the URL under test, so URL assertions read as "what does the address
// bar say" rather than reaching into router internals.
const LocationProbe = () => {
    const location = useLocation();
    return <div data-testid="url">{location.pathname + location.search}</div>;
};

const url = () => screen.getByTestId("url").textContent;

const flushBoot = async () => {
    await act(async () => { await vi.advanceTimersByTimeAsync(4000); });
};

const Shell = () => (
    <>
        <LocationProbe />
        <Layout />
    </>
);

// The whole app shell, because Search is a property of the shell rather than
// of any page — mounted in Layout, opened from the nav, closed by the URL.
//
// A *data* router, like production's createBrowserRouter: Layout renders
// ScrollRestoration, which only works inside one.
const renderApp = async (initialEntries: string[] = ["/"]) => {
    const router = createMemoryRouter(
        [{
            path: "/",
            element: <Shell />,
            children: [
                { index: true, element: <Now /> },
                { path: ":category", element: <div>category shelf</div> },
                { path: ":category/:slug", element: <div>review detail</div> },
            ],
        }],
        { initialEntries },
    );

    const result = render(
        <TrustedDeviceProvider>
            <RouterProvider router={router} />
        </TrustedDeviceProvider>,
    );
    await flushBoot();
    return { ...result, router };
};

const openSearch = async () => {
    fireEvent.click(screen.getByLabelText("Open search"));
    await act(async () => {});
};

const type = async (value: string) => {
    fireEvent.change(screen.getByLabelText("Search Reviews"), { target: { value } });
    await act(async () => {});
};

// The prompt is open when its field exists; the results are their own
// labelled region hanging off the bar.
const promptIsOpen = () => screen.queryByLabelText("Search Reviews") !== null;
const results = () => screen.getByRole("listbox", { name: "Search results" });

beforeEach(() => {
    vi.stubEnv("VITE_DISABLE_ANIMATIONS", "true");
    vi.useFakeTimers({ shouldAdvanceTime: true });
    resetReviewsStore();
    vi.clearAllMocks();
    mocked.probeTrustedDevice.mockResolvedValue(false);
    mocked.getReviews.mockResolvedValue([
        review("Nioh", { type: "game", status: "done" }),
        review("Nioh 3", { type: "game", status: "todo" }),
        review("Inception", { type: "cinema", status: "active" }),
        review("The Hobbit", { type: "book", status: "done" }),
    ]);
    // jsdom has no layout, so Layout's breakpoint logic sees width 1024 and
    // renders the desktop nav. Both navs expose the same "Open search" label.
    window.innerWidth = 1280;
    // ScrollRestoration calls this on every navigation and jsdom has no
    // scrolling — without a stub every test logs a "Not implemented" notice.
    vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllEnvs();
});

describe("opening and closing Search", () => {
    it("opens from the nav control and puts a bare param on the URL", async () => {
        await renderApp();
        expect(url()).toBe("/");

        await openSearch();

        expect(promptIsOpen()).toBe(true);
        expect(url()).toBe("/?search");
    });

    it("opens on Ctrl+K from anywhere", async () => {
        await renderApp();

        fireEvent.keyDown(window, { key: "k", ctrlKey: true });
        await act(async () => {});

        expect(promptIsOpen()).toBe(true);
    });

    it("opens already showing the prompt at a URL that carries the param", async () => {
        await renderApp(["/?search"]);

        expect(promptIsOpen()).toBe(true);
    });

    it("closes on Escape and takes the param back off the URL", async () => {
        await renderApp();
        await openSearch();

        fireEvent.keyDown(window, { key: "Escape" });
        await act(async () => {});

        expect(promptIsOpen()).toBe(false);
        expect(url()).toBe("/");
    });

    it("closes from its own control", async () => {
        await renderApp();
        await openSearch();

        fireEvent.click(screen.getByLabelText("Close search"));
        await act(async () => {});

        expect(promptIsOpen()).toBe(false);
    });

    // Story 21: closing should leave no entry behind, so pressing back again
    // goes where you were before Search, not back through your own searching.
    it("leaves no history entry behind when it closes", async () => {
        const { router } = await renderApp(["/games", "/"]);

        await openSearch();
        fireEvent.keyDown(window, { key: "Escape" });
        await act(async () => {});

        await act(async () => { router.navigate(-1); });

        expect(url()).toBe("/games");
    });

    // Story 19: the back-swipe is the dismiss gesture on a phone, and it acts
    // on history rather than on the modal.
    it("closes when the browser goes back", async () => {
        const { router } = await renderApp();
        await openSearch();
        expect(promptIsOpen()).toBe(true);

        await act(async () => { router.navigate(-1); });

        expect(promptIsOpen()).toBe(false);
        expect(url()).toBe("/");
    });

    // A URL that arrived carrying the param has nothing of ours to pop —
    // closing it must not walk the owner off the site.
    it("closes without popping when the param was already in the URL", async () => {
        const { router } = await renderApp(["/games", "/?search"]);

        fireEvent.keyDown(window, { key: "Escape" });
        await act(async () => {});

        expect(url()).toBe("/");
        // Still one entry back to where we came from, not zero.
        await act(async () => { router.navigate(-1); });
        expect(url()).toBe("/games");
    });

    it("focuses the field so opening and typing are one motion", async () => {
        await renderApp();
        await openSearch();

        expect(document.activeElement).toBe(screen.getByLabelText("Search Reviews"));
    });
});

describe("results", () => {
    it("shows nothing until something is typed", async () => {
        await renderApp();
        await openSearch();

        // Not an empty panel — no panel. The results are a consequence of a
        // query, so with no query there is nothing hanging off the bar.
        // (Reviews are visible on the page behind, which is not this.)
        expect(screen.queryByRole("listbox", { name: "Search results" })).toBeNull();
    });

    it("groups matches by Category", async () => {
        await renderApp();
        await openSearch();
        await type("n");

        expect(within(within(results()).getByRole("group", { name: "GAMES" })).getByText("Nioh")).toBeDefined();
        expect(within(within(results()).getByRole("group", { name: "CINEMA" })).getByText("Inception")).toBeDefined();
    });

    // The behaviour change from the old page, which excluded `todo` and so
    // couldn't answer "have I already added that?" (ADR-0003).
    it("finds a queued Review and marks it as queued", async () => {
        await renderApp();
        await openSearch();
        await type("nioh 3");

        const result = within(results()).getByText("Nioh 3").closest("button");
        expect(result).not.toBeNull();
        expect(result!.textContent).toContain("QUEUED");
    });

    it("marks a finished Review differently from one in progress", async () => {
        await renderApp();
        await openSearch();
        await type("i");

        expect(within(results()).getByText("Nioh").closest("button")!.textContent).toContain("FINISHED");
        expect(within(results()).getByText("Inception").closest("button")!.textContent).toContain("IN PROGRESS");
    });

    // "Nothing matches" is a claim about the collection, and answering
    // "have I already added that?" with a confident no before the collection
    // has arrived is the wrong answer (story 16).
    it("does not claim nothing matches while the collection is still loading", async () => {
        let release: (value: unknown[]) => void = () => {};
        mocked.getReviews.mockReturnValue(new Promise(resolve => { release = resolve; }));

        await renderApp();
        await openSearch();
        await type("nioh");

        expect(within(results()).queryByText(/nothing matches/i)).toBeNull();

        await act(async () => { release([review("Nioh")]); });

        expect(within(results()).getByText("Nioh")).toBeDefined();
    });

    it("says so when nothing matches", async () => {
        await renderApp();
        await openSearch();
        await type("zzzz");

        expect(within(results()).getByText(/nothing matches/i)).toBeDefined();
    });
});

describe("keyboard navigation", () => {
    it("moves the highlight with the arrow keys and opens with Enter", async () => {
        await renderApp();
        await openSearch();
        await type("nioh");

        // Ranked: "Nioh" then "Nioh 3", both games.
        const firstResult = within(results()).getByText("Nioh").closest("button")!;
        expect(firstResult.getAttribute("aria-selected")).toBe("true");

        fireEvent.keyDown(window, { key: "ArrowDown" });
        await act(async () => {});

        expect(within(results()).getByText("Nioh 3").closest("button")!.getAttribute("aria-selected")).toBe("true");

        fireEvent.keyDown(window, { key: "Enter" });
        await act(async () => {});

        expect(url()).toBe("/games/nioh-3");
        expect(promptIsOpen()).toBe(false);
    });

    it("wraps the highlight around the ends of the list", async () => {
        await renderApp();
        await openSearch();
        await type("nioh");

        fireEvent.keyDown(window, { key: "ArrowUp" });
        await act(async () => {});

        // Up from the first lands on the last.
        expect(within(results()).getByText("Nioh 3").closest("button")!.getAttribute("aria-selected")).toBe("true");
    });

    // Opening a result replaces the ?search entry rather than popping it and
    // pushing the Review, so back from the Review goes where Search was opened
    // from. A memory router applies `go` synchronously, so this asserts the
    // history shape rather than the race it prevents — see openResult.
    it("leaves no search entry behind when it opens a result", async () => {
        const { router } = await renderApp(["/games", "/"]);
        await openSearch();
        await type("hobbit");

        fireEvent.keyDown(window, { key: "Enter" });
        await act(async () => {});
        expect(url()).toBe("/books/the-hobbit");

        await act(async () => { router.navigate(-1); });

        expect(url()).toBe("/");
        expect(promptIsOpen()).toBe(false);
    });

    it("opens a result when it is clicked", async () => {
        await renderApp();
        await openSearch();
        await type("hobbit");

        fireEvent.click(within(results()).getByText("The Hobbit"));
        await act(async () => {});

        expect(url()).toBe("/books/the-hobbit");
    });
});

// The footer stopped being decorative chrome and became content. It is
// exercised here because this suite already renders the whole app shell.
describe("the footer readouts", () => {
    it("counts what is in progress and what is queued", async () => {
        mocked.getReviews.mockResolvedValue([
            review("A", { status: "active" }),
            review("B", { status: "active" }),
            review("C", { status: "todo" }),
            review("D", { status: "done", date_completed: "2026-05-18" }),
        ]);

        await renderApp();

        const footer = screen.getByRole("contentinfo", { name: "Collection status" });
        expect(footer.textContent).toContain("In Progress2");
        expect(footer.textContent).toContain("Queued1");
    });

    it("counts only what was finished this calendar year", async () => {
        mocked.getReviews.mockResolvedValue([
            review("A", { status: "done", date_completed: "2026-01-05" }),
            review("B", { status: "done", date_completed: "2026-11-30" }),
            review("C", { status: "done", date_completed: "2025-12-31" }),
        ]);

        await renderApp();

        expect(screen.getByText(/Finished 2026/).parentElement?.textContent).toContain("2");
    });

    it("averages the finished Reviews", async () => {
        mocked.getReviews.mockResolvedValue([
            review("A", { status: "done", rating: 8, date_completed: "2026-01-01" }),
            review("B", { status: "done", rating: 10, date_completed: "2026-01-02" }),
            review("C", { status: "todo", rating: 0 }),
        ]);

        await renderApp();

        expect(screen.getByText("Avg Rating").parentElement?.textContent).toContain("9.0");
    });

    it("says nothing about an average when nothing is finished", async () => {
        mocked.getReviews.mockResolvedValue([review("C", { status: "todo", rating: 0 })]);

        await renderApp();

        expect(screen.queryByText("Avg Rating")).toBeNull();
    });

    it("is present on more than the front page", async () => {
        mocked.getReviews.mockResolvedValue([review("A", { status: "active" })]);

        await renderApp(["/games"]);

        expect(screen.getByText("In Progress")).toBeDefined();
    });
});
