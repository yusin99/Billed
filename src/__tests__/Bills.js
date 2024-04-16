/**
 * @jest-environment jsdom
 */

import { screen, waitFor } from "@testing-library/dom";
import userEvent from "@testing-library/user-event";
import Bills from "../containers/Bills.js";
import BillsUI from "../views/BillsUI.js";
import { bills } from "../fixtures/bills.js";
import { ROUTES, ROUTES_PATH } from "../constants/routes.js";
import { localStorageMock } from "../__mocks__/localStorage.js";
import mockStore from "../__mocks__/store";
import { formatDate, formatStatus } from "../app/format.js";

import router from "../app/Router.js";

describe("Given I am connected as an employee", () => {
    // Setting up the local storage
    beforeEach(() => {
        Object.defineProperty(window, "localStorage", {
            value: localStorageMock,
        });

        window.localStorage.setItem(
            "user",
            JSON.stringify({
                type: "Employee",
                email: "yusin@yusin",
            })
        );
    });
    describe("When I am on Bills Page", () => {
        test("Then bill icon in vertical layout should be highlighted", async () => {
            const root = document.createElement("div");
            root.setAttribute("id", "root");
            document.body.append(root);
            router();
            window.onNavigate(ROUTES_PATH.Bills);
            await waitFor(() => screen.getByTestId("icon-window"));
            const windowIcon = screen.getByTestId("icon-window");
            //to-do write expect expression
            expect(windowIcon.classList).toContain("active-icon");
        });
        test("Then bills should be ordered from earliest to latest", () => {
            document.body.innerHTML = BillsUI({ data: bills });
            const dates = screen
                .getAllByText(
                    /^(19|20)\d\d[- /.](0[1-9]|1[012])[- /.](0[1-9]|[12][0-9]|3[01])$/i
                )
                .map((a) => a.innerHTML);
            const antiChrono = (a, b) => (a < b ? 1 : -1);
            const datesSorted = [...dates].sort(antiChrono);
            expect(dates).toEqual(datesSorted);
        });
        describe("And when I check the bills container", () => {
            let billsObject;

            beforeEach(() => {
                document.body.innerHTML = BillsUI({ data: bills });

                const onNavigate = (pathname) => {
                    document.body.innerHTML = ROUTES({ pathname });
                };

                billsObject = new Bills({
                    document,
                    onNavigate,
                    store: mockStore,
                    localStorage: window.localStorage,
                });
            });

            describe("And when I click on New Bill button", () => {
                test("Then it should navigate to New Bill page", () => {
                    const newBillBtn = screen.getByTestId("btn-new-bill");
                    const handleClickNewBill = jest.fn(() =>
                        billsObject.handleClickNewBill()
                    );
                    newBillBtn.addEventListener("click", handleClickNewBill);
                    userEvent.click(newBillBtn);
                    expect(handleClickNewBill).toHaveBeenCalled();
                    expect(screen.getByTestId("form-new-bill")).toBeTruthy();
                });
            });

            describe("And when I click on Eye icon", () => {
                test("Then a modal should open", () => {
                    const iconEyes = screen.getAllByTestId("icon-eye");
                    const handleClickIconEye = jest.fn((icon) =>
                        billsObject.handleClickIconEye(icon)
                    );

                    // simulate the modal function
                    $.fn.modal = jest.fn();

                    iconEyes.forEach((icon) => {
                        icon.addEventListener("click", () =>
                            handleClickIconEye(icon)
                        );

                        userEvent.click(icon);

                        //the function is called
                        expect(handleClickIconEye).toHaveBeenCalled();

                        //new bill page is displayed
                        expect(screen.getByText("Justificatif")).toBeTruthy();
                    });
                });
            });
        });
    });

    // getBill's integration test
    describe("When I navigate to bill's page", () => {
        let billsObject;

        beforeEach(() => {
            const root = document.createElement("div");
            root.setAttribute("id", "root");

            document.body.append(root);

            router();
            window.onNavigate(ROUTES_PATH.Bills);

            billsObject = new Bills({
                document,
                onNavigate,
                store: mockStore,
                localStorage: window.localStorage,
            });
        });

        test("fetches bills from mock API GET", async () => {
            await waitFor(() => screen.getByText("Mes notes de frais"));

            //the table is displayed
            expect(screen.getByTestId("tbody")).toBeTruthy();
        });

        test("then it would display bills", async () => {
            // init bills display

            const data = await billsObject.getBills();
            const mockBills = await mockStore.bills().list();

            expect(data[0].date).toEqual(formatDate(mockBills[0].date));

        });
      

        describe("When an error occurs on API", () => {
            beforeEach(() => {
                jest.spyOn(mockStore, "bills");
            });

            test("fetches bills from an API and fails with 404 message error", async () => {
                // implement the store and set it up to return a Promise.reject() with a new Error("Erreur 404") error
                mockStore.bills.mockImplementationOnce(() => {
                    return {
                        list: () => {
                            return Promise.reject(new Error("Erreur 404"));
                        },
                    };
                });

                // Wait for the next tick of the event loop
                await new Promise(process.nextTick);

                let response;

                try {
                    response = await mockStore.bills().list();
                } catch (err) {
                    response = err;
                }

                // Set the error message in the UI to be displayed
                document.body.innerHTML = BillsUI({ error: response });

                // Find the error message in the UI
                const message = await screen.getByText(/Erreur 404/);

                // Expect the error message to be present in the UI
                expect(message).toBeTruthy();
            });

            test("fetches messages from an API and fails with 500 message error", async () => {
                // implement the store and set it up to return a Promise.reject() with a new Error("Erreur 500") error
                mockStore.bills.mockImplementationOnce(() => {
                    return {
                        list: () => {
                            return Promise.reject(new Error("Erreur 500"));
                        },
                    };
                });

                // Wait for the next tick of the event loop
                await new Promise(process.nextTick);

                let response;

                try {
                    response = await mockStore.bills().list();
                } catch (err) {
                    response = err;
                }

                // Set the error message in the UI to be displayed
                document.body.innerHTML = BillsUI({ error: response });

                // Find the error message in the UI
                const message = await screen.getByText(/Erreur 500/);

                // Expect the error message to be present in the UI
                expect(message).toBeTruthy();
            });
        });
        
    });
});
