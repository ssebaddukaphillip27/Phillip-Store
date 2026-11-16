// ======================================
// Phillip Store - app.js
// ======================================


// ======================================
// CART
// ======================================

let cart = [];

let tonConnectUI = null;

let checkoutInProgress = false;

let rateRequestId = 0;


// ======================================
// TELEGRAM
// ======================================

const telegram = window.Telegram?.WebApp;

if (telegram) {
    telegram.ready();
    telegram.expand();
}


// ======================================
// OPEN CART
// ======================================

function openCart() {

    const cartSection =
        document.getElementById("cart");

    if (!cartSection) {
        console.error("Cart element not found.");
        return;
    }

    cartSection.classList.remove("hidden");

    console.log("Cart opened.");
}


// ======================================
// CLOSE CART
// ======================================

function closeCart() {

    const cartSection =
        document.getElementById("cart");

    if (!cartSection) {
        console.error("Cart element not found.");
        return;
    }

    cartSection.classList.add("hidden");

    console.log("Cart closed.");
}


// ======================================
// ADD TO CART
// ======================================

function addToCart(name, price) {

    const numericPrice = Number(price);

    if (
        !Number.isFinite(numericPrice) ||
        numericPrice <= 0
    ) {
        console.error(
            "Invalid product price:",
            price
        );

        return;
    }

    cart.push({
        name: name,
        price: numericPrice
    });

    updateCart();

    console.log(
        "Added:",
        name,
        numericPrice
    );
}


// ======================================
// REMOVE FROM CART
// ======================================

function removeFromCart(index) {

    if (
        index < 0 ||
        index >= cart.length
    ) {
        return;
    }

    cart.splice(index, 1);

    updateCart();
}


// ======================================
// UPDATE CART
// ======================================

function updateCart() {

    const cartItems =
        document.getElementById("cartItems");

    const cartCount =
        document.getElementById("cartCount");

    const cartTotal =
        document.getElementById("cartTotal");


    if (
        !cartItems ||
        !cartCount ||
        !cartTotal
    ) {

        console.error(
            "Cart elements missing."
        );

        return;
    }


    // ----------------------------------
    // CART COUNT
    // ----------------------------------

    cartCount.textContent =
        cart.length;


    // ----------------------------------
    // EMPTY CART
    // ----------------------------------

    if (cart.length === 0) {

        cartItems.innerHTML = `
            <p style="
                color: var(--muted);
                text-align: center;
                padding: 20px 0;
            ">
                Your cart is empty.
            </p>
        `;

        cartTotal.textContent =
            "0 UGX";

        return;
    }


    // ----------------------------------
    // CART ITEMS
    // ----------------------------------

    cartItems.innerHTML = "";


    let total = 0;


    cart.forEach(function(item, index) {

        total += Number(item.price);


        const itemElement =
            document.createElement("div");


        itemElement.className =
            "cart-item";


        itemElement.innerHTML = `
            <div>

                <div class="cart-item-name">
                    ${item.name}
                </div>

                <div class="cart-item-price">
                    ${Number(item.price).toLocaleString()} UGX
                </div>

            </div>

            <button
                class="remove-button"
                type="button">

                Remove

            </button>
        `;


        const removeButton =
            itemElement.querySelector(
                ".remove-button"
            );


        removeButton.addEventListener(
            "click",
            function() {

                removeFromCart(index);

            }
        );


        cartItems.appendChild(
            itemElement
        );

    });


    // ----------------------------------
    // TOTAL
    // ----------------------------------

    cartTotal.textContent =
        total.toLocaleString() +
        " UGX";


    console.log(
        "Cart total:",
        total,
        "UGX"
    );
}


// ======================================
// UGX → USDT
// ======================================

async function convertUGXToUSDT(
    ugxAmount
) {

    const requestId =
        ++rateRequestId;


    try {

        const response =
            await fetch(
                "https://open.er-api.com/v6/latest/USD"
            );


        if (!response.ok) {

            throw new Error(
                "Exchange rate request failed."
            );

        }


        const data =
            await response.json();


        if (
            !data ||
            !data.rates ||
            !data.rates.UGX
        ) {

            throw new Error(
                "UGX exchange rate unavailable."
            );

        }


        const usdToUGX =
            Number(data.rates.UGX);


        if (
            !Number.isFinite(usdToUGX) ||
            usdToUGX <= 0
        ) {

            throw new Error(
                "Invalid UGX exchange rate."
            );

        }


        // Convert UGX → USD
        const usdAmount =
            Number(ugxAmount) /
            usdToUGX;


        // USDT is treated as approximately
        // equal to USD for the estimate.
        const usdtAmount =
            usdAmount;


        if (requestId !== rateRequestId) {
            return null;
        }


        return usdtAmount;


    } catch (error) {

        console.error(
            "UGX → USDT conversion failed:",
            error
        );

        return null;
    }
}


// ======================================
// TON CONNECT
// ======================================

function initializeTONConnect() {

    try {

        if (
            typeof TON_CONNECT_UI ===
            "undefined"
        ) {

            console.warn(
                "TON Connect UI library not available."
            );

            return;
        }


        tonConnectUI =
            new TON_CONNECT_UI.TonConnectUI({

                manifestUrl:
                    "https://ssebaddukaphillip27.github.io/Phillip-Store/tonconnect-manifest.json",

                buttonRootId:
                    "ton-connect"

            });


        console.log(
            "TON Connect initialized."
        );


    } catch (error) {

        console.error(
            "TON Connect initialization failed:",
            error
        );

    }
}


// ======================================
// CHECKOUT
// ======================================

async function checkout() {

    if (checkoutInProgress) {
        return;
    }


    if (cart.length === 0) {

        alert(
            "Your cart is empty."
        );

        return;
    }


    checkoutInProgress = true;


    try {

        // ----------------------------------
        // CALCULATE TOTAL FROM CART
        // ----------------------------------

        let totalUGX = 0;


        cart.forEach(function(item) {

            totalUGX +=
                Number(item.price);

        });


        console.log(
            "Checkout total:",
            totalUGX,
            "UGX"
        );


        // ----------------------------------
        // CONVERT TO USDT
        // ----------------------------------

        const usdtAmount =
            await convertUGXToUSDT(
                totalUGX
            );


        if (
            usdtAmount === null ||
            !Number.isFinite(usdtAmount)
        ) {

            alert(
                "Unable to get the current USDT exchange rate."
            );

            checkoutInProgress = false;

            return;
        }


        const formattedUSDT =
            usdtAmount.toFixed(2);


        // ----------------------------------
        // CHECKOUT MESSAGE
        // ----------------------------------

        const message =
            "Order total: " +
            totalUGX.toLocaleString() +
            " UGX\n\n" +

            "Estimated payment: " +
            formattedUSDT +
            " USDT";


        console.log(
            "Checkout:",
            message
        );


        // ----------------------------------
        // TELEGRAM POPUP
        // ----------------------------------

        if (telegram) {

            telegram.showPopup(

                {

                    title:
                        "Checkout",

                    message:
                        message,

                    buttons: [

                        {
                            id:
                                "continue",

                            type:
                                "default",

                            text:
                                "Continue"
                        },

                        {
                            id:
                                "cancel",

                            type:
                                "cancel",

                            text:
                                "Cancel"
                        }

                    ]

                },

                function(buttonId) {

                    if (
                        buttonId ===
                        "continue"
                    ) {

                        startUSDTWalletPayment(
                            usdtAmount
                        );

                    } else {

                        checkoutInProgress =
                            false;

                    }

                }

            );

        } else {

            const confirmed =
                confirm(
                    message +
                    "\n\nContinue?"
                );


            if (confirmed) {

                await startUSDTWalletPayment(
                    usdtAmount
                );

            }


            checkoutInProgress =
                false;

        }


    } catch (error) {

        console.error(
            "Checkout error:",
            error
        );

        alert(
            "Checkout could not be started."
        );

        checkoutInProgress =
            false;
    }
}


// ======================================
// START USDT PAYMENT
// ======================================

async function startUSDTWalletPayment(
    usdtAmount
) {

    try {

        if (!tonConnectUI) {

            alert(
                "Please connect your TON wallet first."
            );

            checkoutInProgress =
                false;

            return;
        }


        const wallet =
            tonConnectUI.wallet;


        if (!wallet) {

            alert(
                "Please connect your TON wallet first."
            );

            checkoutInProgress =
                false;

            return;
        }


        /*
         * Actual USDT transaction will be
         * added after verifying the current
         * TON Connect Jetton transaction
         * format.
         */

        alert(
            "Your wallet is connected.\n\n" +

            "USDT payment amount: " +

            usdtAmount.toFixed(2) +

            " USDT"
        );


        checkoutInProgress =
            false;


    } catch (error) {

        console.error(
            "Wallet payment error:",
            error
        );

        alert(
            "Unable to start wallet payment."
        );

        checkoutInProgress =
            false;
    }
}


// ======================================
// PAGE INITIALIZATION
// ======================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        console.log(
            "Phillip Store loaded."
        );


        // ----------------------------------
        // INITIAL CART
        // ----------------------------------

        updateCart();


        // ----------------------------------
        // CART BUTTON
        // ----------------------------------

        const cartButton =
            document.getElementById(
                "cartButton"
            );


        if (cartButton) {

            cartButton.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();

                    console.log(
                        "Cart button clicked."
                    );

                    openCart();

                }
            );

        } else {

            console.error(
                "Cart button not found."
            );
        }


        // ----------------------------------
        // CLOSE CART
        // ----------------------------------

        const closeCartButton =
            document.getElementById(
                "closeCartButton"
            );


        if (closeCartButton) {

            closeCartButton.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();

                    closeCart();

                }
            );

        } else {

            console.error(
                "Close cart button not found."
            );
        }


        // ----------------------------------
        // CHECKOUT BUTTON
        // ----------------------------------

        const checkoutButton =
            document.getElementById(
                "checkoutButton"
            );


        if (checkoutButton) {

            checkoutButton.addEventListener(
                "click",
                function(event) {

                    event.preventDefault();

                    checkout();

                }
            );

        } else {

            console.error(
                "Checkout button not found."
            );
        }


        // ----------------------------------
        // TON CONNECT LAST
        // ----------------------------------

        initializeTONConnect();

    }
);
