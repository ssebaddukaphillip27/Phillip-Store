
let cart = [];

const telegram = window.Telegram?.WebApp;

let tonConnectUI = null;
let checkoutInProgress = false;


/*
 * Initialize Telegram Mini App
 */

if (telegram) {
    telegram.ready();
    telegram.expand();
}


/*
 * Initialize TON Connect
 */

function initializeTONConnect() {

    const connectArea = document.getElementById("ton-connect");

    if (!connectArea) {
        console.error("TON Connect container not found.");
        return;
    }

    connectArea.innerHTML = `
        <button
            id="customWalletButton"
            type="button"
            style="
                width:100%;
                max-width:240px;
                padding:14px 20px;
                border:0;
                border-radius:12px;
                background:#229ED9;
                color:white;
                font-size:15px;
                font-weight:700;
                cursor:pointer;
            ">
            Connect TON Wallet
        </button>

        <p id="walletStatus" style="
            margin-top:10px;
            color:#94a3b8;
            font-size:13px;
            text-align:center;
        ">
            No wallet connected
        </p>
    `;

    const button = document.getElementById("customWalletButton");
    const status = document.getElementById("walletStatus");

    button.addEventListener("click", async () => {

        if (!tonConnectUI) {

            status.textContent =
                "TON Connect library is not available. Please reload the shop.";

            status.style.color = "#f87171";
            return;
        }

        try {
            await tonConnectUI.openModal();

        } catch (error) {

            console.error("Wallet opening error:", error);

            status.textContent =
                "Could not open wallet selector. Please try again.";

            status.style.color = "#f87171";
        }
    });

    if (!window.TON_CONNECT_UI) {

        status.textContent =
            "TON Connect library failed to load.";

        status.style.color = "#f87171";

        console.error("TON_CONNECT_UI is not available.");
        return;
    }

    try {

        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({

            manifestUrl:
                "https://ssebaddukaphillip27.github.io/Phillip-Store/tonconnect-manifest.json"

        });

        tonConnectUI.onStatusChange(wallet => {

            if (wallet) {

                const address = wallet.account.address;

                const shortAddress =
                    address.slice(0, 6) +
                    "..." +
                    address.slice(-6);

                status.textContent =
                    "✓ Connected: " + shortAddress;

                status.style.color = "#22c55e";

                button.textContent = "Wallet Connected";
                button.style.background = "#15803d";

                console.log("Connected wallet:", address);

                if (telegram) {
                    telegram.HapticFeedback?.notificationOccurred("success");
                }

            } else {

                status.textContent = "No wallet connected";
                status.style.color = "#94a3b8";

                button.textContent = "Connect TON Wallet";
                button.style.background = "#229ED9";

                console.log("Wallet disconnected");
            }
        });

        console.log("TON Connect initialized.");

    } catch (error) {

        console.error("TON Connect initialization error:", error);

        status.textContent =
            "Wallet initialization failed. Check the manifest.";

        status.style.color = "#f87171";
    }
}


/*
 * Normalize product names
 */

function normalizeProductName(name) {

    return String(name)
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");
}


/*
 * Add product to cart
 */

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


/*
 * Remove item
 */

function removeFromCart(index) {

    cart.splice(index, 1);

    updateCart();
}


/*
 * Calculate cart total
 */

function getCartTotal() {

    return cart.reduce((total, item) => {
        return total + Number(item.price);
    }, 0);
}


/*
 * Update cart display
 */

function updateCart() {

    const countElement =
        document.getElementById("cartCount");

    const itemsElement =
        document.getElementById("cartItems");

    const totalElement =
        document.getElementById("cartTotal");

    countElement.textContent = cart.length;

    if (cart.length === 0) {

        itemsElement.innerHTML = `
            <p style="
                color:#94a3b8;
                text-align:center;
                padding:25px 0;
            ">
                Your cart is empty.
            </p>
        `;

        totalElement.textContent = "0 UGX";
        return;
    }

    itemsElement.innerHTML = cart
        .map((item, index) => {

            return `
                <div class="cart-item">

                    <div>
                        <div class="cart-item-name">
                            ${escapeHtml(item.name)}
                        </div>

                        <div class="cart-item-price">
                            ${formatUGX(item.price)}
                        </div>
                    </div>

                    <button
                        class="remove-button"
                        onclick="removeFromCart(${index})">
                        Remove
                    </button>

                </div>
            `;

        })
        .join("");

    totalElement.textContent =
        formatUGX(getCartTotal());
}


/*
 * Add required exchange-rate attribution
 */

function addRateAttribution() {

    if (document.getElementById("rateAttribution")) {
        return;
    }

    const totalElement =
        document.getElementById("cartTotal");

    if (!totalElement) return;

    const link = document.createElement("a");

    link.id = "rateAttribution";
    link.href = "https://www.exchangerate-api.com";
    link.target = "_blank";
    link.rel = "noopener noreferrer";

    link.textContent = "Rates By Exchange Rate API";

    link.style.display = "block";
    link.style.marginTop = "8px";
    link.style.fontSize = "11px";
    link.style.color = "#94a3b8";

    totalElement.insertAdjacentElement("afterend", link);
}


/*
 * Fetch UGX exchange rate
 */

async function getUSDTExchangeRate() {

    const response = await fetch(
        "https://open.er-api.com/v6/latest/USD",
        {
            cache: "no-store"
        }
    );

    if (!response.ok) {
        throw new Error("Exchange rate request failed.");
    }

    const data = await response.json();

    if (
        data.result !== "success" ||
        !data.rates ||
        !Number.isFinite(data.rates.UGX) ||
        data.rates.UGX <= 0
    ) {
        throw new Error("Invalid exchange rate received.");
    }

    return {
        ugxPerUSD: data.rates.UGX,
        updatedAt: data.time_last_update_utc || "Unknown"
    };
}


/*
 * Checkout with automatic UGX to USDT estimate
 */

async function checkout() {

    if (cart.length === 0) {

        showMessage("Your cart is empty.");
        return;
    }

    if (checkoutInProgress) {
        return;
    }

    checkoutInProgress = true;

    const totalUGX = getCartTotal();

    try {

        showMessage(
            "Getting the latest available exchange rate. Please wait."
        );

        const exchange = await getUSDTExchangeRate();

        const estimatedUSDT =
            totalUGX / exchange.ugxPerUSD;

        const formattedUSDT =
            estimatedUSDT.toFixed(2);

        addRateAttribution();

        showMessage(
            "YOUR ORDER SUMMARY\n\n" +
            "Total: " + formatUGX(totalUGX) +
            "\nEstimated payment: " + formattedUSDT + " USDT" +
            "\n\nExchange rate: 1 USD = " +
            formatUGX(exchange.ugxPerUSD) +
            "\nRate updated: " + exchange.updatedAt +
            "\n\nThis is an estimate only. No payment has been sent or received yet."
        );

    } catch (error) {

        console.error("Currency conversion error:", error);

        showMessage(
            "We could not retrieve the exchange rate.\n\n" +
            "Please try checkout again later. No payment has been made."
        );

    } finally {

        checkoutInProgress = false;
    }
}


/*
 * Open cart
 */

document
    .getElementById("cartButton")
    .addEventListener("click", () => {

        document
            .getElementById("cart")
            .classList.remove("hidden");
    });


/*
 * Close cart
 */

function closeCart() {

    document
        .getElementById("cart")
        .classList.add("hidden");
}


/*
 * Format Ugandan Shillings
 */

function formatUGX(amount) {

    return new Intl.NumberFormat("en-UG", {
        maximumFractionDigits: 0
    }).format(amount) + " UGX";
}


/*
 * Telegram popup / browser fallback
 */

function showMessage(message) {

    if (telegram) {

        telegram.showPopup({
            title: "Phillip Store",
            message: message,
            buttons: [
                {
                    type: "ok"
                }
            ]
        });

    } else {

        alert(message);
    }
}


/*
 * Prevent HTML injection
 */

function escapeHtml(value) {

    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/*
 * Initial cart
 */

updateCart();


/*
 * Initialize wallet connection
 */

initializeTONConnect();
