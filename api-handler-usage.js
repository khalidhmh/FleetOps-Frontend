/**
 * fake-store-api-usage.js
 *
 * Real usage examples for api-handler.js
 * using the Beeceptor Fake Store API.
 *
 * Base URL : https://fake-store-api.mock.beeceptor.com
 * Docs     : https://app.beeceptor.com/mock-server/fake-store-api
 *
 * Available Endpoints:
 * ─────────────────────────────────────────────────────────
 *  GET  /api/products                        → All products
 *  GET  /api/users                           → All users
 *  GET  /api/carts                           → Shopping cart (logged-in user)
 *  GET  /api/orders                          → All orders
 *  GET  /api/orders/status?order_id={id}     → Single order status
 *  PUT  /api/orders                          → Create / update an order
 * ─────────────────────────────────────────────────────────
 *
 * HTML setup:
 * <script type="module" src="fake-store-api-usage.js"></script>
 */

import api from "./Server/scripts/api-handler.js";

// ─── Global Setup ─────────────────────────────────────────────────────────────

api.setBaseURL("https://fake-store-api.mock.beeceptor.com");

// ─────────────────────────────────────────────────────────────────────────────
// 1. GET /api/products
//    Returns a full list of products with name, price, brand,
//    category, rating, discount, availability, and reviews.
// ─────────────────────────────────────────────────────────────────────────────

async function getAllProducts() {
  const { data, status } = await api.get("/api/products");

  console.log("Status:", status); // 200

  // Each product shape:
  // {
  //   product_id  : number
  //   name        : string
  //   description : string
  //   price       : number
  //   unit        : string   ("Piece")
  //   image       : string   (URL)
  //   discount    : number   (% off)
  //   availability: boolean
  //   brand       : string
  //   category    : string
  //   rating      : number
  //   reviews     : [ { user_id, rating, comment } ]
  // }

  console.log("Total products:", data.length);
  console.log("First product:", data[0]);

  // Calculate discounted price for each product
  const withFinalPrice = data.map((p) => ({
    ...p,
    finalPrice: +(p.price - (p.price * p.discount) / 100).toFixed(2),
  }));
  console.log("Products with discounted price:", withFinalPrice);

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET /api/products  →  Filter by category (client-side)
//    The API doesn't support query filtering, so we filter after fetching.
// ─────────────────────────────────────────────────────────────────────────────

async function getProductsByCategory(category) {
  const { data } = await api.get("/api/products");

  // Filter locally (API has no server-side filter param)
  const filtered = data.filter(
    (p) => p.category.toLowerCase() === category.toLowerCase()
  );

  console.log(`Products in "${category}":`, filtered);
  return filtered;
}

// Usage: getProductsByCategory("Electronics");
// Usage: getProductsByCategory("Gaming");

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET /api/products  →  Find a single product by ID (client-side)
// ─────────────────────────────────────────────────────────────────────────────

async function getProductById(productId) {
  const { data } = await api.get("/api/products");

  const product = data.find((p) => p.product_id === productId);

  if (!product) {
    console.warn(`Product ${productId} not found.`);
    return null;
  }

  console.log("Found product:", product);
  return product;
}

// Usage: getProductById(3);  →  Wireless Headphones

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET /api/users
//    Returns all registered users.
// ─────────────────────────────────────────────────────────────────────────────

async function getAllUsers() {
  const { data } = await api.get("/api/users");

  // Each user shape:
  // {
  //   user_id  : number
  //   username : string
  //   email    : string
  //   password : string  ("hashed_password" in mock)
  // }

  console.log("Total users:", data.length);
  console.log("Users:", data);

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. GET /api/users  →  Find a user by username (client-side)
// ─────────────────────────────────────────────────────────────────────────────

async function getUserByUsername(username) {
  const { data } = await api.get("/api/users");

  const user = data.find(
    (u) => u.username.toLowerCase() === username.toLowerCase()
  );

  if (!user) {
    console.warn(`User "${username}" not found.`);
    return null;
  }

  console.log("Found user:", user);
  return user;
}

// Usage: getUserByUsername("john_doe");

// ─────────────────────────────────────────────────────────────────────────────
// 6. GET /api/carts
//    Returns the shopping cart for the currently logged-in user.
//    Mock returns one cart object for user_id: 1.
// ─────────────────────────────────────────────────────────────────────────────

async function getCart() {
  const { data } = await api.get("/api/carts");

  // Cart shape:
  // {
  //   cart_id : number
  //   user_id : number
  //   items   : [ { product_id, quantity } ]
  // }

  const cart = data[0]; // mock returns only one cart (logged-in user)
  console.log("Cart:", cart);
  console.log("Items in cart:", cart.items.length);

  return cart;
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. GET /api/carts  →  Enrich cart items with product details
//    Combines cart items with full product info.
// ─────────────────────────────────────────────────────────────────────────────

async function getEnrichedCart() {
  // Fetch both in parallel
  const [cartRes, productsRes] = await Promise.all([
    api.get("/api/carts"),
    api.get("/api/products"),
  ]);

  const cart    = cartRes.data[0];
  const products = productsRes.data;

  // Merge cart items with product details
  const enrichedItems = cart.items.map((item) => {
    const product = products.find((p) => p.product_id === item.product_id);
    return {
      ...item,
      name       : product?.name,
      price      : product?.price,
      discount   : product?.discount,
      finalPrice : product
        ? +((product.price - (product.price * product.discount) / 100) * item.quantity).toFixed(2)
        : null,
    };
  });

  const totalPrice = enrichedItems.reduce((sum, i) => sum + (i.finalPrice || 0), 0);

  console.log("Enriched cart items:", enrichedItems);
  console.log("Cart total (after discounts): $" + totalPrice.toFixed(2));

  return { ...cart, items: enrichedItems, totalPrice };
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. GET /api/orders
//    Returns all orders with their items, total price, and status.
// ─────────────────────────────────────────────────────────────────────────────

async function getAllOrders() {
  const { data } = await api.get("/api/orders");

  // Each order shape:
  // {
  //   order_id    : number
  //   user_id     : number
  //   items       : [ { product_id, quantity } ]
  //   total_price : number
  //   status      : "Shipped" | "Delivered" | "Processing"
  // }

  console.log("Total orders:", data.length);
  console.log("Orders:", data);

  // Group by status
  const byStatus = data.reduce((acc, order) => {
    acc[order.status] = acc[order.status] || [];
    acc[order.status].push(order);
    return acc;
  }, {});
  console.log("Orders grouped by status:", byStatus);

  return data;
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. GET /api/orders/status?order_id={id}
//    Returns details and current status for a specific order.
// ─────────────────────────────────────────────────────────────────────────────

async function getOrderStatus(orderId) {
  const { data } = await api.get("/api/orders/status", {
    params: { order_id: orderId },
  });

  // Response shape:
  // {
  //   order_id    : number
  //   user_id     : number
  //   status      : string
  //   total_price : number
  //   items       : [ { product_id, quantity } ]
  // }

  console.log(`Order #${data.order_id} status: ${data.status}`);
  console.log("Order details:", data);

  return data;
}

// Usage: getOrderStatus(1);  →  { order_id: 1, status: "Shipped", ... }

// ─────────────────────────────────────────────────────────────────────────────
// 10. PUT /api/orders
//     Create a new order or update an existing one.
//     Send user_id + items array in the request body.
// ─────────────────────────────────────────────────────────────────────────────

async function placeOrder(userId, items) {
  // items format: [ { product_id, quantity }, ... ]
  const { data } = await api.put("/api/orders", {
    user_id: userId,
    items,
  });

  // Response shape:
  // {
  //   order_id : number
  //   status   : "Placed"
  //   message  : "Order successfully placed."
  // }

  console.log(`Order placed! ID: ${data.order_id}, Status: ${data.status}`);
  console.log("Server message:", data.message);

  return data;
}

// Usage:
// placeOrder(1, [
//   { product_id: 1, quantity: 2 },
//   { product_id: 3, quantity: 1 },
// ]);

// ─────────────────────────────────────────────────────────────────────────────
// 11. ERROR HANDLING
//     Always wrap calls in try/catch to handle network errors
//     or unexpected server responses.
// ─────────────────────────────────────────────────────────────────────────────

async function safeGetOrderStatus(orderId) {
  try {
    const { data } = await api.get("/api/orders/status", {
      params: { order_id: orderId },
    });

    console.log("Order status:", data.status);
    return data;
  } catch (err) {
    console.error("Error fetching order:", err.message);
    console.error("HTTP status:", err.status);   // e.g. 404
    console.error("Server body:", err.data);     // server error payload
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 12. FULL SHOPPING FLOW
//     Fetches products → picks items → places an order → checks status.
// ─────────────────────────────────────────────────────────────────────────────

async function fullShoppingFlow() {
  console.log("── Step 1: Load products ──");
  const { data: products } = await api.get("/api/products");
  const available = products.filter((p) => p.availability);
  console.log(`${available.length} products available.`);

  console.log("── Step 2: Pick top-rated items ──");
  const topRated = available
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 2); // pick the 2 best-rated
  console.log("Picked:", topRated.map((p) => p.name));

  console.log("── Step 3: Place order ──");
  const orderItems = topRated.map((p) => ({ product_id: p.product_id, quantity: 1 }));
  const { data: order } = await api.put("/api/orders", {
    user_id: 1,
    items: orderItems,
  });
  console.log("Order placed:", order);

  console.log("── Step 4: Check order status ──");
  const { data: status } = await api.get("/api/orders/status", {
    params: { order_id: 1 }, // mock always returns order 1
  });
  console.log("Order status:", status.status);
}

// ─────────────────────────────────────────────────────────────────────────────
// RUN
// Comment out anything you don't want to run.
// ─────────────────────────────────────────────────────────────────────────────

(async () => {
  await getAllProducts();
  await getProductsByCategory("Electronics");
  await getProductById(3);
  await getAllUsers();
  await getUserByUsername("john_doe");
  await getCart();
  await getEnrichedCart();
  await getAllOrders();
  await getOrderStatus(1);
  await placeOrder(1, [{ product_id: 1, quantity: 2 }, { product_id: 3, quantity: 1 }]);
  await safeGetOrderStatus(1);
  await fullShoppingFlow();
})();

const headers = {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
};

// إضافة التوكن لو موجود
const token = localStorage.getItem('token');
if (token && token !== "undefined") { // التأكد أن التوكن موجود فعلياً
    headers['Authorization'] = `Bearer ${token}`;
}