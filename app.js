
let cart = [];

const telegram = window.Telegram?.WebApp;

let tonConnectUI = null;


/*
 * Initialize Telegram Mini App
 */

if (telegram) {
    telegram.ready();
    telegram.expand();
}


/*
 * Initialize TON Connect with a custom visible button
 */

function initializeTONConnect() {

    const connectArea = document.getElementById("ton-connect");

    if (!connectArea) {
        console.error("TON Connect container not found.");
        return;
    }

    // Create our own visible button
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


    // Handle wallet button click
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


    // Check whether the library loaded
    if (!window.TON_CONNECT_UI) {

        status.textContent =
            "TON Connect library failed to load.";

        status.style.color = "#f87171";

        console.error("TON_CONNECT_UI is not available.");

        return;
    }


    try {

        // Initialize TON Connect without its automatic button
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({

            manifestUrl:
                "https://ssebaddukaphillip27.github.io/Phillip-Store/tonconnect-manifest.json"

        });


        // Monitor wallet connection
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
 * Each product can only appear once
 */

function addToCart(name, price) {

    const productName = normalizeProductName(name);

    // Check for an existing product
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

    // Add product once
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


    let total = 0;


    itemsElement.innerHTML = cart
        .map((item, index) => {

            total += item.price;

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
        formatUGX(total);
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
 * Checkout
 */

function checkout() {

    if (cart.length === 0) {

        showMessage("Your cart is empty.");

        return;
    }


    let total = 0;

    cart.forEach(item => {
        total += item.price;
    });


    showMessage(
        "Your order is ready for the next payment stage.\n\n" +
        "Total: " + formatUGX(total) +
        "\n\nUSDT payments on TON will be added after wallet connection is tested."
    );
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
