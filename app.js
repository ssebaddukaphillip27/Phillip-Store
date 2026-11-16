let cart = [];

const telegram = window.Telegram?.WebApp;


/*
 * Initialize Telegram Mini App
 */

if (telegram) {
    telegram.ready();
    telegram.expand();
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
        "Checkout will be connected to USDT on TON in the next stage.\n\n" +
        "Total: " + formatUGX(total)
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
