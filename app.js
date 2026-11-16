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

let cachedUSDTPerUSD = null;

let cachedRateTime = 0;


// Cache exchange rate for 5 minutes
const RATE_CACHE_TIME = 5 * 60 * 1000;


// ======================================
// RECEIVING WALLET
// ======================================

const RECEIVING_WALLET =
    "UQD4hsyZoOBXjUxWyJlwZGtcQk-v3VXNdPR3WVlwdyh3qb8N";


// ======================================
// OFFICIAL USDT ON TON
// ======================================

const USDT_MASTER =
    "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs";


// USDT on TON has 6 decimals
const USDT_DECIMALS = 6;


// TON Connect mainnet network ID
const TON_MAINNET = "-239";


// ======================================
// TELEGRAM
// ======================================

const telegram =
    window.Telegram?.WebApp;


if (telegram) {

    telegram.ready();

    telegram.expand();

}


// ======================================
// TON CONNECT
// ======================================

function initializeTONConnect() {

    const container =
        document.getElementById("ton-connect");


    if (!container) {

        console.log(
            "TON Connect container not found."
        );

        return;

    }


    if (
        typeof TON_CONNECT_UI === "undefined" ||
        typeof TON_CONNECT_UI.TonConnectUI === "undefined"
    ) {

        console.error(
            "TON Connect UI library not loaded."
        );

        return;

    }


    try {

        tonConnectUI =
            new TON_CONNECT_UI.TonConnectUI({

                manifestUrl:
                    "https://ssebaddukaphillip27.github.io/Phillip-Store/tonconnect-manifest.json",

                buttonRootId:
                    "ton-connect"

            });


        tonConnectUI.onStatusChange(
            wallet => {

                console.log(
                    "TON wallet status:",
                    wallet
                );


                let walletStatus =
                    document.getElementById(
                        "walletStatus"
                    );


                if (!walletStatus) {

                    walletStatus =
                        document.createElement(
                            "div"
                        );

                    walletStatus.id =
                        "walletStatus";

                    walletStatus.style.marginTop =
                        "10px";

                    walletStatus.style.fontSize =
                        "13px";

                    walletStatus.style.color =
                        "var(--muted)";

                    walletStatus.style.overflowWrap =
                        "anywhere";


                    container.appendChild(
                        walletStatus
                    );

                }


                if (wallet) {

                    const address =
                        wallet.account?.address || "";


                    if (address) {

                        const shortAddress =
                            address.substring(
                                0,
                                6
                            ) +
                            "..." +
                            address.substring(
                                address.length - 6
                            );


                        walletStatus.textContent =
                            "Connected: " +
                            shortAddress;

                    } else {

                        walletStatus.textContent =
                            "Wallet connected.";

                    }

                } else {

                    walletStatus.textContent =
                        "Wallet not connected.";

                }

            }
        );


    } catch (error) {

        console.error(
            "TON Connect initialization error:",
            error
        );

    }

}


// ======================================
// NORMALIZE PRODUCT NAME
// ======================================

function normalizeProductName(name) {

    return String(name)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

}


// ======================================
// ADD TO CART
// ======================================

function addToCart(name, price) {

    const productName =
        normalizeProductName(name);


    const existingProduct =
        cart.find(item =>
            normalizeProductName(item.name) ===
            productName
        );


    if (existingProduct) {

        showMessage(
            existingProduct.name +
            " is already in your cart."
        );


        if (telegram) {

            telegram.HapticFeedback
                ?.notificationOccurred(
                    "warning"
                );

        }


        return;

    }


    cart.push({

        name: name,

        price: price

    });


    updateCart();


    if (telegram) {

        telegram.HapticFeedback
            ?.impactOccurred(
                "light"
            );

    }


    showMessage(
        name +
        " added to your cart."
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


    const removedItem =
        cart[index];


    cart.splice(
        index,
        1
    );


    updateCart();


    if (telegram) {

        telegram.HapticFeedback
            ?.impactOccurred(
                "light"
            );

    }


    if (removedItem) {

        showMessage(
            removedItem.name +
            " removed from your cart."
        );

    }

}


// ======================================
// CART TOTAL
// ======================================

function getCartTotal() {

    return cart.reduce(
        (total, item) =>
            total +
            Number(item.price || 0),
        0
    );

}


// ======================================
// CREATE USDT DISPLAY
// ======================================

function getOrCreateCartUSDTElement() {

    const cartTotal =
        document.getElementById(
            "cartTotal"
        );


    if (!cartTotal) {

        return null;

    }


    let cartUSDT =
        document.getElementById(
            "cartUSDT"
        );


    if (!cartUSDT) {

        cartUSDT =
            document.createElement(
                "div"
            );


        cartUSDT.id =
            "cartUSDT";


        cartUSDT.style.marginTop =
            "8px";

        cartUSDT.style.fontSize =
            "14px";

        cartUSDT.style.fontWeight =
            "600";

        cartUSDT.style.lineHeight =
            "1.5";

        cartUSDT.style.overflowWrap =
            "anywhere";


        cartTotal.insertAdjacentElement(
            "afterend",
            cartUSDT
        );

    }


    return cartUSDT;

}


// ======================================
// GET EXCHANGE RATE
// ======================================

async function getUSDTExchangeRate() {

    const now =
        Date.now();


    if (
        cachedUSDTPerUSD !== null &&
        now - cachedRateTime <
        RATE_CACHE_TIME
    ) {

        return {

            ugxPerUSD:
                cachedUSDTPerUSD,

            source:
                "ExchangeRate-API"

        };

    }


    const response =
        await fetch(
            "https://open.er-api.com/v6/latest/USD",
            {
                method: "GET",
                cache: "no-store"
            }
        );


    if (!response.ok) {

        throw new Error(
            "Exchange rate request failed: " +
            response.status
        );

    }


    const data =
        await response.json();


    if (
        !data ||
        data.result !== "success" ||
        !data.rates ||
        !data.rates.UGX
    ) {

        throw new Error(
            "UGX exchange rate unavailable."
        );

    }


    const ugxPerUSD =
        Number(data.rates.UGX);


    if (
        !Number.isFinite(
            ugxPerUSD
        ) ||
        ugxPerUSD <= 0
    ) {

        throw new Error(
            "Invalid UGX exchange rate."
        );

    }


    cachedUSDTPerUSD =
        ugxPerUSD;

    cachedRateTime =
        Date.now();


    return {

        ugxPerUSD:
            ugxPerUSD,

        source:
            "ExchangeRate-API"

    };

}


// ======================================
// UPDATE USDT ESTIMATE
// ======================================

async function updateCartUSDT() {

    const cartUSDT =
        getOrCreateCartUSDTElement();


    if (!cartUSDT) {

        return;

    }


    const totalUGX =
        getCartTotal();


    if (totalUGX <= 0) {

        cartUSDT.textContent =
            "";

        return;

    }


    const currentRequestId =
        ++rateRequestId;


    cartUSDT.textContent =
        "Calculating USDT estimate...";


    try {

        const exchange =
            await getUSDTExchangeRate();


        if (
            currentRequestId !==
            rateRequestId
        ) {

            return;

        }


        const estimatedUSDT =
            totalUGX /
            exchange.ugxPerUSD;


        cartUSDT.innerHTML =

            "Estimated payment: " +

            "<strong>" +

            estimatedUSDT.toFixed(2) +

            " USDT</strong>" +

            "<br>" +

            "<span style=\"" +

            "font-size:12px;" +

            "font-weight:400;" +

            "opacity:0.7;" +

            "\">" +

            "Based on " +

            formatUGX(
                exchange.ugxPerUSD
            ) +

            " UGX ≈ 1 USD" +

            "</span>";


        addRateAttribution();


    } catch (error) {

        console.error(
            "USDT rate error:",
            error
        );


        if (
            currentRequestId !==
            rateRequestId
        ) {

            return;

        }


        cartUSDT.textContent =
            "USDT rate temporarily unavailable.";


        addRateAttribution();

    }

}


// ======================================
// RATE ATTRIBUTION
// ======================================

function addRateAttribution() {

    const cartUSDT =
        document.getElementById(
            "cartUSDT"
        );


    if (!cartUSDT) {

        return;

    }


    let attribution =
        document.getElementById(
            "rateAttribution"
        );


    if (!attribution) {

        attribution =
            document.createElement(
                "div"
            );


        attribution.id =
            "rateAttribution";


        attribution.style.marginTop =
            "4px";

        attribution.style.fontSize =
            "11px";

        attribution.style.fontWeight =
            "400";

        attribution.style.opacity =
            "0.65";


        cartUSDT.appendChild(
            attribution
        );

    }


    attribution.innerHTML =
        'Rates by <a href="https://www.exchangerate-api.com/" target="_blank" rel="noopener noreferrer" style="color:inherit;">ExchangeRate-API</a>';

}


// ======================================
// UPDATE CART
// ======================================

function updateCart() {

    const cartItems =
        document.getElementById(
            "cartItems"
        );


    const cartTotal =
        document.getElementById(
            "cartTotal"
        );


    const cartCount =
        document.getElementById(
            "cartCount"
        );


    if (
        !cartItems ||
        !cartTotal
    ) {

        return;

    }


    cartItems.innerHTML =
        "";


    let total =
        0;


    cart.forEach(
        (item, index) => {

            total +=
                Number(
                    item.price || 0
                );


            const itemElement =
                document.createElement(
                    "div"
                );


            itemElement.className =
                "cart-item";


            itemElement.innerHTML = `

                <div>

                    <strong>
                        ${escapeHtml(item.name)}
                    </strong>

                    <div>
                        ${formatUGX(item.price)}
                        UGX
                    </div>

                </div>


                <button
                    type="button"
                    onclick="removeFromCart(${index})">

                    Remove

                </button>

            `;


            cartItems.appendChild(
                itemElement
            );

        }
    );


    cartTotal.textContent =
        "Total: " +
        formatUGX(total) +
        " UGX";


    if (cartCount) {

        cartCount.textContent =
            cart.length;


        if (cart.length === 0) {

            cartCount.style.display =
                "none";

        } else {

            cartCount.style.display =
                "inline-flex";

        }

    }


    updateCartUSDT();

}


// ======================================
// OPEN CART
// ======================================

function openCart() {

    const cartSection =
        document.getElementById(
            "cart"
        );


    if (!cartSection) {

        console.error(
            "Cart element not found."
        );

        return;

    }


    cartSection.classList.remove(
        "hidden"
    );


    console.log(
        "Cart opened."
    );

}


// ======================================
// CLOSE CART
// ======================================

function closeCart() {

    const cartSection =
        document.getElementById(
            "cart"
        );


    if (!cartSection) {

        console.error(
            "Cart element not found."
        );

        return;

    }


    cartSection.classList.add(
        "hidden"
    );


    console.log(
        "Cart closed."
    );

}


// ======================================
// CHECKOUT
// ======================================

async function checkout() {

    if (checkoutInProgress) {

        return;

    }


    if (cart.length === 0) {

        showMessage(
            "Your cart is empty."
        );


        return;

    }


    if (!tonConnectUI) {

        showMessage(
            "TON wallet connection is not ready."
        );


        return;

    }


    const wallet =
        tonConnectUI.account;


    if (
        !wallet ||
        !wallet.address
    ) {

        showMessage(
            "Please connect your TON wallet first."
        );


        return;

    }


    checkoutInProgress =
        true;


    try {

        const totalUGX =
            getCartTotal();


        const exchange =
            await getUSDTExchangeRate();


        const estimatedUSDT =
            totalUGX /
            exchange.ugxPerUSD;


        if (
            !Number.isFinite(
                estimatedUSDT
            ) ||
            estimatedUSDT <= 0
        ) {

            throw new Error(
                "Invalid USDT amount."
            );

        }


        // Convert USDT to smallest units.
        // 1 USDT = 1,000,000 units.
        const usdtUnits =
            Math.round(
                estimatedUSDT *
                Math.pow(
                    10,
                    USDT_DECIMALS
                )
            );


        if (usdtUnits <= 0) {

            throw new Error(
                "USDT amount is too small."
            );

        }


        const message =

            "Phillip Store\n\n" +

            "Total: " +

            formatUGX(totalUGX) +

            " UGX\n\n" +

            "Payment: " +

            estimatedUSDT.toFixed(2) +

            " USDT\n\n" +

            "Network: TON\n\n" +

            "You will be asked to approve this payment in your wallet.";


        if (
            telegram &&
            typeof telegram.showPopup ===
            "function"
        ) {

            telegram.showPopup(

                {

                    title:
                        "Confirm USDT Payment",

                    message:
                        message,

                    buttons: [

                        {
                            id:
                                "pay",

                            type:
                                "default",

                            text:
                                "Pay " +
                                estimatedUSDT.toFixed(2) +
                                " USDT"
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
                        "pay"
                    ) {

                        sendUSDTPayment(
                            usdtUnits,
                            estimatedUSDT
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

                await sendUSDTPayment(
                    usdtUnits,
                    estimatedUSDT
                );

            } else {

                checkoutInProgress =
                    false;

            }

        }


    } catch (error) {

        console.error(
            "Checkout error:",
            error
        );


        showMessage(
            "Unable to prepare the USDT payment."
        );


        checkoutInProgress =
            false;

    }

}


// ======================================
// SEND USDT PAYMENT
// ======================================

async function sendUSDTPayment(
    usdtUnits,
    estimatedUSDT
) {

    try {

        if (!tonConnectUI) {

            throw new Error(
                "TON Connect is unavailable."
            );

        }


        const account =
            tonConnectUI.account;


        if (
            !account ||
            !account.address
        ) {

            throw new Error(
                "TON wallet is not connected."
            );

        }


        console.log(
            "Preparing USDT payment:",
            estimatedUSDT,
            "USDT"
        );


        console.log(
            "Recipient:",
            RECEIVING_WALLET
        );


        /*
         * TON Connect structured Jetton transaction.
         *
         * USDT master:
         * EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs
         *
         * USDT uses 6 decimals.
         */

        const transaction = {

            validUntil:
                Math.floor(
                    Date.now() / 1000
                ) + 600,

            network:
                TON_MAINNET,

            items: [

                {

                    type:
                        "jetton",

                    master:
                        USDT_MASTER,

                    destination:
                        RECEIVING_WALLET,

                    amount:
                        String(
                            usdtUnits
                        ),

                    // 0.05 TON for Jetton transaction fees
                    attachAmount:
                        "50000000",

                    responseDestination:
                        account.address

                }

            ]

        };


        console.log(
            "Sending transaction:",
            transaction
        );


        const result =
            await tonConnectUI.sendTransaction(
                transaction
            );


        console.log(
            "Transaction result:",
            result
        );


        checkoutInProgress =
            false;


        showMessage(

            "Payment request sent to your wallet.\n\n" +

            "Please wait for the blockchain transaction " +
            "to be confirmed."

        );


        if (telegram) {

            telegram.HapticFeedback
                ?.notificationOccurred(
                    "success"
                );

        }


    } catch (error) {

        console.error(
            "USDT payment error:",
            error
        );


        checkoutInProgress =
            false;


        if (
            error &&
            error.code ===
            300
        ) {

            showMessage(
                "Payment was cancelled."
            );


            return;

        }


        if (
            error &&
            error.code ===
            400
        ) {

            showMessage(
                "This wallet does not support this payment request."
            );


            return;

        }


        showMessage(

            "The USDT payment could not be sent.\n\n" +

            "Please make sure your wallet supports TON USDT payments and has enough TON for network fees."

        );

    }

}


// ======================================
// FORMAT UGX
// ======================================

function formatUGX(amount) {

    return Number(
        amount || 0
    ).toLocaleString(
        "en-UG",
        {
            maximumFractionDigits:
                0
        }
    );

}


// ======================================
// MESSAGE
// ======================================

function showMessage(message) {

    if (
        telegram &&
        typeof telegram.showPopup ===
        "function"
    ) {

        telegram.showPopup({

            title:
                "Phillip Store",

            message:
                String(message),

            buttons: [

                {
                    id:
                        "ok",

                    type:
                        "ok",

                    text:
                        "OK"
                }

            ]

        });


        return;

    }


    alert(message);

}


// ======================================
// ESCAPE HTML
// ======================================

function escapeHtml(value) {

    return String(value)

        .replace(
            /&/g,
            "&amp;"
        )

        .replace(
            /</g,
            "&lt;"
        )

        .replace(
            />/g,
            "&gt;"
        )

        .replace(
            /"/g,
            "&quot;"
        )

        .replace(
            /'/g,
            "&#039;"
        );

}


// ======================================
// START APP
// ======================================

document.addEventListener(
    "DOMContentLoaded",
    function() {

        updateCart();

        initializeTONConnect();

    }
);
