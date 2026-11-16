// ======================================
// Phillip Store - app.js
// Stage 4: USDT payments on TON
// ======================================


// ======================================
// CONFIGURATION
// ======================================

const RECEIVING_WALLET =
    "UQD4hsyZoOBXjUxWyJlwZGtcQk-v3VXNdPR3WVlwdyh3qb8N";

const USDT_MASTER =
    "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs";

const USDT_DECIMALS = 6;

const TON_NETWORK = "-239"; // TON mainnet

const TON_CONNECT_MANIFEST =
    "https://ssebaddukaphillip27.github.io/Phillip-Store/tonconnect-manifest.json";

const RATE_CACHE_TIME = 5 * 60 * 1000;


// ======================================
// APP STATE
// ======================================

let cart = [];

let tonConnectUI = null;

let cachedUSDTPerUSD = null;
let cachedRateTime = 0;

let checkoutInProgress = false;


// ======================================
// TELEGRAM MINI APP
// ======================================

const telegram = window.Telegram?.WebApp;

if (telegram) {
    telegram.ready();
    telegram.expand();
}


// ======================================
// HELPERS
// ======================================

function formatUGX(amount) {
    return Number(amount).toLocaleString("en-UG") + " UGX";
}

function showMessage(message) {
    if (telegram?.showAlert) {
        telegram.showAlert(message);
    } else {
        alert(message);
    }
}

function getWalletAddress() {
    return tonConnectUI?.wallet?.account?.address || null;
}


// ======================================
// CART
// ======================================

function addToCart(name, price) {
    price = Number(price);

    if (!name || !Number.isFinite(price) || price <= 0) {
        return;
    }

    cart.push({
        name: name,
        price: price
    });

    updateCart();
}

function removeFromCart(index) {
    if (index < 0 || index >= cart.length) {
        return;
    }

    cart.splice(index, 1);
    updateCart();
}

function updateCart() {
    const cartItems = document.getElementById("cartItems");
    const cartCount = document.getElementById("cartCount");
    const cartTotal = document.getElementById("cartTotal");

    const total = cart.reduce(
        (sum, item) => sum + item.price,
        0
    );

    if (cartCount) {
        cartCount.textContent = cart.length;
    }

    if (cartTotal) {
        cartTotal.textContent = formatUGX(total);
    }

    if (!cartItems) return;

    if (cart.length === 0) {
        cartItems.innerHTML =
            '<p style="color:#94a3b8;padding:12px 0;">Your cart is empty.</p>';
        return;
    }

    cartItems.innerHTML = cart.map((item, index) => `
        <div class="cart-item">

            <div>
                <div class="cart-item-name">
                    ${item.name}
                </div>

                <div class="cart-item-price">
                    ${formatUGX(item.price)}
                </div>
            </div>

            <button
                class="remove-button"
                type="button"
                data-remove="${index}">
                Remove
            </button>

        </div>
    `).join("");
}


// ======================================
// OPEN / CLOSE CART
// ======================================

function openCart() {
    document.getElementById("cart")?.classList.remove("hidden");
}

function closeCart() {
    document.getElementById("cart")?.classList.add("hidden");
}


// ======================================
// UGX TO USDT EXCHANGE RATE
// ======================================

async function getUSDTPerUSD() {

    const now = Date.now();

    if (
        cachedUSDTPerUSD &&
        now - cachedRateTime < RATE_CACHE_TIME
    ) {
        return cachedUSDTPerUSD;
    }

    const response = await fetch(
        "https://open.er-api.com/v6/latest/USD"
    );

    if (!response.ok) {
        throw new Error("Could not get the exchange rate.");
    }

    const data = await response.json();

    if (
        data.result !== "success" ||
        !data.rates ||
        !data.rates.UGX
    ) {
        throw new Error("Invalid exchange-rate response.");
    }

    cachedUSDTPerUSD = Number(data.rates.UGX);
    cachedRateTime = now;

    return cachedUSDTPerUSD;
}


async function convertUGXToUSDT(ugxAmount) {

    const ugxPerUSD = await getUSDTPerUSD();

    // USDT is estimated at approximately 1 USD.
    const usdAmount = Number(ugxAmount) / ugxPerUSD;

    return usdAmount;
}


// ======================================
// CONFIRM CHECKOUT
// ======================================

function askBuyerToPay(message) {

    return new Promise((resolve) => {

        if (telegram?.showPopup) {

            telegram.showPopup({
                title: "Confirm USDT payment",
                message: message,
                buttons: [
                    {
                        id: "pay",
                        type: "default",
                        text: "Pay with USDT"
                    },
                    {
                        id: "cancel",
                        type: "cancel",
                        text: "Cancel"
                    }
                ]
            }, (buttonId) => {
                resolve(buttonId === "pay");
            });

        } else {

            resolve(window.confirm(message));

        }

    });
}


// ======================================
// CHECKOUT
// ======================================

async function checkout() {

    if (checkoutInProgress) return;

    if (cart.length === 0) {
        showMessage("Your cart is empty.");
        return;
    }

    if (!tonConnectUI?.wallet) {
        showMessage("Please connect your TON wallet first.");

        try {
            await tonConnectUI?.openModal();
        } catch (error) {
            console.error("Wallet connection error:", error);
        }

        return;
    }

    const wallet = tonConnectUI.wallet;

    if (wallet.account.chain !== TON_NETWORK) {
        showMessage(
            "Please connect a TON mainnet wallet before paying."
        );
        return;
    }

    checkoutInProgress = true;

    const checkoutButton =
        document.getElementById("checkoutButton");

    if (checkoutButton) {
        checkoutButton.disabled = true;
        checkoutButton.textContent = "Calculating...";
    }

    try {

        const totalUGX = cart.reduce(
            (sum, item) => sum + item.price,
            0
        );

        const usdAmount =
            await convertUGXToUSDT(totalUGX);

        // Round up to the nearest micro-USDT.
        const usdtAmount =
            Math.ceil(usdAmount * 1000000) / 1000000;

        const orderReference =
            "PS-" + Date.now().toString();

        const message =
            "Order: " + orderReference +
            "\n\nTotal: " + formatUGX(totalUGX) +
            "\nEstimated payment: " + usdtAmount.toFixed(6) +
            " USDT" +
            "\n\nYour wallet will ask you to approve the transaction." +
            "\n\nA small amount of TON is also needed for network fees.";

        const confirmed = await askBuyerToPay(message);

        if (!confirmed) return;

        await startUSDTWalletPayment(
            usdtAmount,
            orderReference
        );

    } catch (error) {

        console.error("Checkout error:", error);

        showMessage(
            "Checkout failed: " +
            (error.message || "Please try again.")
        );

    } finally {

        checkoutInProgress = false;

        if (checkoutButton) {
            checkoutButton.disabled = false;
            checkoutButton.textContent = "Continue to Checkout";
        }

    }
}


// ======================================
// RESOLVE BUYER'S USDT JETTON WALLET
// ======================================

async function resolveJettonWalletAddress(
    TonClient,
    Address,
    beginCell,
    buyerAddress
) {

    const client = new TonClient({
        endpoint: "https://toncenter.com/api/v2/jsonRPC"
    });

    const result = await client.runMethod(
        Address.parse(USDT_MASTER),
        "get_wallet_address",
        [
            {
                type: "slice",
                cell: beginCell()
                    .storeAddress(Address.parse(buyerAddress))
                    .endCell()
            }
        ]
    );

    const jettonWalletAddress = result.stack.readAddress();

    return jettonWalletAddress.toString({
        urlSafe: true,
        bounceable: true
    });
}


// ======================================
// SEND REAL USDT PAYMENT
// ======================================

async function startUSDTWalletPayment(
    usdtAmount,
    orderReference
) {

    if (!tonConnectUI?.wallet) {
        throw new Error("Wallet is no longer connected.");
    }

    const buyerAddress =
        tonConnectUI.wallet.account.address;

    if (tonConnectUI.wallet.account.chain !== TON_NETWORK) {
        throw new Error("Your wallet must be on TON mainnet.");
    }

    // Load the official TON libraries.
    const core = await import(
        "https://esm.sh/@ton/core"
    );

    const ton = await import(
        "https://esm.sh/@ton/ton"
    );

    const Address = core.Address;
    const beginCell = core.beginCell;
    const TonClient = ton.TonClient;

    // Find the buyer's USDT wallet contract.
    const buyerJettonWallet =
        await resolveJettonWalletAddress(
            TonClient,
            Address,
            beginCell,
            buyerAddress
        );

    // Convert USDT to its smallest units.
    const jettonAmount = BigInt(
        Math.ceil(usdtAmount * (10 ** USDT_DECIMALS))
    );

    // Create a payment comment for the order.
    const forwardPayload = beginCell()
        .storeUint(0, 32)
        .storeStringTail(orderReference)
        .endCell();

    // Build the official Jetton transfer message.
    const transferBody = beginCell()
        .storeUint(0x0f8a7ea5, 32)
        .storeUint(BigInt(Date.now()), 64)
        .storeCoins(jettonAmount)
        .storeAddress(Address.parse(RECEIVING_WALLET))
        .storeAddress(Address.parse(buyerAddress))
        .storeBit(0)
        .storeCoins(1n)
        .storeBit(1)
        .storeRef(forwardPayload)
        .endCell()
        .toBoc()
        .toString("base64");

    // Ask the buyer's wallet to approve and send.
    const result = await tonConnectUI.sendTransaction({

        validUntil: Math.floor(Date.now() / 1000) + 600,

        network: TON_NETWORK,

        messages: [
            {
                address: buyerJettonWallet,

                // TON attached for Jetton wallet execution.
                amount: "50000000",

                payload: transferBody
            }
        ]

    });

    console.log(
        "TON Connect transaction response:",
        result
    );

    showMessage(
        "Your wallet has returned a transaction response for order " +
        orderReference +
        ". Check the wallet and blockchain transaction status before considering this order paid."
    );

}


// ======================================
// TON CONNECT
// ======================================

function initializeTONConnect() {

    if (!window.TON_CONNECT_UI) {
        console.error("TON Connect library is unavailable.");
        showMessage("Wallet connection could not load. Please reload.");
        return;
    }

    try {

        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({

            manifestUrl: TON_CONNECT_MANIFEST,

            buttonRootId: "ton-connect"

        });

        tonConnectUI.onStatusChange((wallet) => {

            console.log("Wallet status:", wallet);

            let status = document.getElementById("walletStatus");

            if (!status) {

                status = document.createElement("div");

                status.id = "walletStatus";

                document
                    .getElementById("ton-connect")
                    ?.appendChild(status);

            }

            if (wallet) {

                status.textContent =
                    "Wallet connected: " +
                    wallet.account.address.slice(0, 8) +
                    "..." +
                    wallet.account.address.slice(-6);

            } else {

                status.textContent = "Wallet not connected.";

            }

        });

    } catch (error) {

        console.error("TON Connect initialization failed:", error);

        showMessage("Could not initialize TON Connect.");

    }
}


// ======================================
// INITIALIZE APP
// ======================================

document.addEventListener("DOMContentLoaded", () => {

    document
        .getElementById("cartButton")
        ?.addEventListener("click", openCart);

    document
        .getElementById("closeCartButton")
        ?.addEventListener("click", closeCart);

    document
        .getElementById("checkoutButton")
        ?.addEventListener("click", checkout);

    document
        .getElementById("cartItems")
        ?.addEventListener("click", (event) => {

            const button = event.target.closest("[data-remove]");

            if (!button) return;

            removeFromCart(
                Number(button.dataset.remove)
            );

        });

    updateCart();

    // Initialize TON Connect after cart setup.
    initializeTONConnect();

});


// Keep inline HTML onclick handlers working.
window.addToCart = addToCart;
