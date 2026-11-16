// ===============================
// Phillip Store - app.js
// ===============================

let cart = [];
let tonConnectUI = null;
let checkoutInProgress = false;

let rateRequestId = 0;
let cachedUSDTPerUSD = null;
let cachedRateTime = 0;

// Cache exchange rate for 5 minutes
const RATE_CACHE_TIME = 5 * 60 * 1000;

// Your receiving TON wallet address
const RECEIVING_WALLET =
    "UQD4hsyZoOBXjUxWyJlwZGtcQk-v3VXNdPR3WVlwdyh3qb8N";


// ===============================
// TELEGRAM
// ===============================

const telegram = window.Telegram?.WebApp;

if (telegram) {
    telegram.ready();
    telegram.expand();
}


// ===============================
// TON CONNECT
// ===============================

function initializeTONConnect() {

    const tonConnectContainer = document.getElementById("ton-connect");

    if (!tonConnectContainer) {
        console.log("TON Connect container not found.");
        return;
    }

    if (
        typeof TON_CONNECT_UI === "undefined" ||
        typeof TON_CONNECT_UI.TonConnectUI === "undefined"
    ) {
        console.error("TON Connect UI library not loaded.");
        return;
    }

    try {

        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl:
                "https://ssebaddukaphillip27.github.io/Phillip-Store/tonconnect-manifest.json",
            buttonRootId: "ton-connect"
        });

        tonConnectUI.onStatusChange(wallet => {

            console.log("TON wallet status:", wallet);

            let walletStatus = document.getElementById("walletStatus");

            if (!walletStatus) {

                walletStatus = document.createElement("div");
                walletStatus.id = "walletStatus";

                tonConnectContainer.appendChild(walletStatus);
            }

            if (wallet) {

                const address = wallet.account?.address || "";

                if (address) {

                    const shortAddress =
                        address.substring(0, 6) +
                        "..." +
                        address.substring(address.length - 6);

                    walletStatus.textContent =
                        "Connected: " + shortAddress;

                } else {

                    walletStatus.textContent = "Wallet connected.";

                }

            } else {

                walletStatus.textContent = "Wallet not connected.";

            }

        });

    } catch (error) {

        console.error("TON Connect initialization error:", error);

    }
}


// ===============================
// PRODUCT NAME NORMALIZATION
// ===============================

function normalizeProductName(name) {

    return String(name)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

}


// ===============================
// ADD TO CART
// ===============================

function addToCart(name, price) {

    const productName = normalizeProductName(name);

    const existingProduct = cart.find(item =>
        normalizeProductName(item.name) === productName
    );

    if (existingProduct) {

        showMessage(
            existingProduct.name + " is already in your cart."
        );

        if (telegram) {
            telegram.HapticFeedback?.notificationOccurred("warning");
        }

        return;
    }

    cart.push({
        name: name,
        price: price
    });

    updateCart();

    if (telegram) {
        telegram.HapticFeedback?.impactOccurred("light");
    }

    showMessage(name + " added to your cart.");
}


// ===============================
// REMOVE FROM CART
// ===============================

function removeFromCart(index) {

    if (index < 0 || index >= cart.length) {
        return;
    }

    const removedItem = cart[index];

    cart.splice(index, 1);

    updateCart();

    if (telegram) {
        telegram.HapticFeedback?.impactOccurred("light");
    }

    if (removedItem) {
        showMessage(removedItem.name + " removed from your cart.");
    }
}


// ===============================
// GET CART TOTAL
// ===============================

function getCartTotal() {

    return cart.reduce(
        (total, item) => total + Number(item.price || 0),
        0
    );

}


// ===============================
// CREATE USDT DISPLAY
// ===============================

function getOrCreateCartUSDTElement() {

    const cartTotal = document.getElementById("cartTotal");

    if (!cartTotal) {
        return null;
    }

    let cartUSDT = document.getElementById("cartUSDT");

    if (!cartUSDT) {

        cartUSDT = document.createElement("div");

        cartUSDT.id = "cartUSDT";

        cartUSDT.style.marginTop = "8px";
        cartUSDT.style.fontSize = "14px";
        cartUSDT.style.fontWeight = "600";
        cartUSDT.style.lineHeight = "1.5";
        cartUSDT.style.overflowWrap = "anywhere";

        cartTotal.insertAdjacentElement(
            "afterend",
            cartUSDT
        );
    }

    return cartUSDT;
}


// ===============================
// USDT EXCHANGE RATE
// ===============================

async function getUSDTExchangeRate() {

    const now = Date.now();

    // Use cached rate if still fresh
    if (
        cachedUSDTPerUSD !== null &&
        now - cachedRateTime < RATE_CACHE_TIME
    ) {

        return {
            ugxPerUSD: cachedUSDTPerUSD,
            source: "ExchangeRate-API"
        };

    }

    const response = await fetch(
        "https://open.er-api.com/v6/latest/USD",
        {
            method: "GET",
            cache: "no-store"
        }
    );

    if (!response.ok) {
        throw new Error(
            "Exchange rate request failed: " + response.status
        );
    }

    const data = await response.json();

    if (
        !data ||
        data.result !== "success" ||
        !data.rates ||
        !data.rates.UGX
    ) {

        throw new Error("UGX exchange rate was not available.");

    }

    const ugxPerUSD = Number(data.rates.UGX);

    if (!Number.isFinite(ugxPerUSD) || ugxPerUSD <= 0) {
        throw new Error("Invalid UGX exchange rate.");
    }

    cachedUSDTPerUSD = ugxPerUSD;
    cachedRateTime = Date.now();

    return {
        ugxPerUSD: ugxPerUSD,
        source: "ExchangeRate-API"
    };

}


// ===============================
// UPDATE CART USDT ESTIMATE
// ===============================

async function updateCartUSDT() {

    const cartUSDT = getOrCreateCartUSDTElement();

    if (!cartUSDT) {
        return;
    }

    const totalUGX = getCartTotal();

    if (totalUGX <= 0) {

        cartUSDT.textContent = "";

        return;
    }

    const currentRequestId = ++rateRequestId;

    cartUSDT.textContent = "Calculating USDT estimate...";

    try {

        const exchange = await getUSDTExchangeRate();

        // Ignore old request if another cart update happened
        if (currentRequestId !== rateRequestId) {
            return;
        }

        const ugxPerUSD = exchange.ugxPerUSD;

        // USDT is approximately USD for this estimate
        const estimatedUSDT =
            totalUGX / ugxPerUSD;

        cartUSDT.innerHTML =
            "Estimated payment: <strong>" +
            estimatedUSDT.toFixed(2) +
            " USDT</strong>" +
            "<br>" +
            "<span style=\"font-size:12px;font-weight:400;opacity:0.7;\">" +
            "Based on " +
            formatUGX(ugxPerUSD) +
            " UGX ≈ 1 USD" +
            "</span>";

        addRateAttribution();

    } catch (error) {

        console.error(
            "Unable to calculate USDT:",
            error
        );

        if (currentRequestId !== rateRequestId) {
            return;
        }

        cartUSDT.textContent =
            "USDT rate temporarily unavailable.";

        addRateAttribution();

    }

}


// ===============================
// RATE ATTRIBUTION
// ===============================

function addRateAttribution() {

    const cartUSDT = document.getElementById("cartUSDT");

    if (!cartUSDT) {
        return;
    }

    let attribution =
        document.getElementById("rateAttribution");

    if (!attribution) {

        attribution = document.createElement("div");

        attribution.id = "rateAttribution";

        attribution.style.marginTop = "4px";
        attribution.style.fontSize = "11px";
        attribution.style.fontWeight = "400";
        attribution.style.opacity = "0.65";

        cartUSDT.appendChild(attribution);
    }

    attribution.innerHTML =
        'Rates by <a href="https://www.exchangerate-api.com/" target="_blank" rel="noopener noreferrer" style="color:inherit;">ExchangeRate-API</a>';

}


// ===============================
// UPDATE CART
// ===============================

function updateCart() {

    const cartItems =
        document.getElementById("cartItems");

    const cartTotal =
        document.getElementById("cartTotal");

    const cartCount =
        document.getElementById("cartCount");

    if (!cartItems || !cartTotal) {
        return;
    }

    cartItems.innerHTML = "";

    let total = 0;

    cart.forEach((item, index) => {

        total += Number(item.price || 0);

        const itemElement =
            document.createElement("div");

        itemElement.className = "cart-item";

        itemElement.innerHTML = `
            <div>
                <strong>${escapeHtml(item.name)}</strong>
                <div>${formatUGX(item.price)} UGX</div>
            </div>

            <button
                type="button"
                onclick="removeFromCart(${index})"
            >
                Remove
            </button>
        `;

        cartItems.appendChild(itemElement);

    });

    cartTotal.textContent =
        "Total: " + formatUGX(total) + " UGX";

    if (cartCount) {

        cartCount.textContent =
            cart.length;

        if (cart.length === 0) {
            cartCount.style.display = "none";
        } else {
            cartCount.style.display = "inline-flex";
        }

    }

    updateCartUSDT();

}


// ===============================
// OPEN CART
// ===============================

function openCart() {

    const cartSection =
        document.getElementById("cartSection");

    if (cartSection) {
        cartSection.style.display = "block";
    }

}


// ===============================
// CLOSE CART
// ===============================

function closeCart() {

    const cartSection =
        document.getElementById("cartSection");

    if (cartSection) {
        cartSection.style.display = "none";
    }

}


// ===============================
// CHECKOUT
// ===============================

async function checkout() {

    if (checkoutInProgress) {
        return;
    }

    if (cart.length === 0) {

        showMessage("Your cart is empty.");

        if (telegram) {
            telegram.HapticFeedback?.notificationOccurred("warning");
        }

        return;
    }

    checkoutInProgress = true;

    try {

        const totalUGX = getCartTotal();

        const exchange =
            await getUSDTExchangeRate();

        const ugxPerUSD =
            exchange.ugxPerUSD;

        const estimatedUSDT =
            totalUGX / ugxPerUSD;

        const message =
            "Phillip Store\n\n" +
            "Total: " +
            formatUGX(totalUGX) +
            " UGX\n\n" +
            "Estimated payment:\n" +
            estimatedUSDT.toFixed(2) +
            " USDT\n\n" +
            "Rate:\n" +
            formatUGX(ugxPerUSD) +
            " UGX ≈ 1 USD\n\n" +
            "Network: TON\n\n" +
            "USDT payment will be added in the next payment step.";

        if (telegram && telegram.showPopup) {

            telegram.showPopup(
                {
                    title: "Checkout",
                    message: message,
                    buttons: [
                        {
                            id: "ok",
                            type: "ok",
                            text: "OK"
                        }
                    ]
                }
            );

        } else {

            alert(message);

        }

    } catch (error) {

        console.error(
            "Checkout error:",
            error
        );

        showMessage(
            "Unable to calculate the USDT amount right now."
        );

    } finally {

        checkoutInProgress = false;

    }

}


// ===============================
// FORMAT UGX
// ===============================

function formatUGX(amount) {

    return Number(amount || 0).toLocaleString(
        "en-UG",
        {
            maximumFractionDigits: 0
        }
    );

}


// ===============================
// MESSAGE
// ===============================

function showMessage(message) {

    if (
        telegram &&
        typeof telegram.showPopup === "function"
    ) {

        telegram.showPopup(
            {
                title: "Phillip Store",
                message: String(message),
                buttons: [
                    {
                        id: "ok",
                        type: "ok",
                        text: "OK"
                    }
                ]
            }
        );

        return;
    }

    alert(message);

}


// ===============================
// ESCAPE HTML
// ===============================

function escapeHtml(value) {

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");

}


// ===============================
// START APP
// ===============================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        updateCart();

        initializeTONConnect();

    }
);
