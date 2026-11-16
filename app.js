
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
 * Initialize TON Connect
 */

function initializeTONConnect() {

    const connectArea = document.getElementById("ton-connect");

    if (!connectArea) {
        console.error("TON Connect button container not found.");
        return;
    }

    if (!window.TON_CONNECT_UI) {
        console.error("TON Connect library failed to load.");
        connectArea.textContent =
            "Wallet connection is currently unavailable.";
        return;
    }

    try {

        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({

            manifestUrl:
                "https://ssebaddukaphillip27.github.io/Phillip-Store/tonconnect-manifest.json",

            buttonRootId: "ton-connect"

        });


        /*
         * Create wallet status display
         */

        let statusElement =
            document.getElementById("walletStatus");

        if (!statusElement) {

            statusElement = document.createElement("p");

            statusElement.id = "walletStatus";

            statusElement.style.cssText = `
                text-align: center;
                color: #94a3b8;
                font-size: 13px;
                margin-top: 10px;
                word-break: break-word;
            `;

            connectArea.insertAdjacentElement(
                "afterend",
                statusElement
            );
        }


        /*
         * Monitor wallet connection
         */

        tonConnectUI.onStatusChange(wallet => {

            if (wallet) {

                const address = wallet.account.address;

                const shortAddress =
                    address.slice(0, 6) +
                    "..." +
                    address.slice(-6);

                statusElement.textContent =
                    "✓ Wallet connected: " + shortAddress;

                statusElement.style.color = "#22c55e";

                console.log("TON wallet connected:", address);

                if (telegram) {
                    telegram.HapticFeedback?.notificationOccurred(
                        "success"
                    );
                }

            } else {

                statusElement.textContent =
                    "No wallet connected";

                statusElement.style.color = "#94a3b8";

                console.log("TON wallet disconnected");
            }

        });

        console.log("TON Connect initialized successfully.");

    } catch (error) {

        console.error("TON Connect initialization error:", error);

        connectArea.textContent =
            "Could not initialize wallet connection.";
    }
}


/*
 * Add product to cart
 */

function addToCart(name, price) {

    cart.push({
        name: name,
        price: price
    });

    updateCart();

    if (telegram) {
        telegram.HapticFeedback?.impactOccurred("light");
    }
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
 *
 * Payment will be added in Stage 4.
 * No money is transferred here.
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
 * Start TON Connect after page loads
 */

initializeTONConnect();
