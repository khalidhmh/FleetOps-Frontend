import api from "/shared/api-handler.js";

// ─── Global Setup ─────────────────────────────────────────────────────────────

api.setBaseURL("http://localhost:8000");

// ─── API Methods ─────────────────────────────────────────────────────────────



// ────────────────────────────────────────────────────────────────
const OrdersAPI = {
  /**
   * Fetches all orders for a specific route.
   * @param {string|number} routeId 
   * @returns {Promise<Object>}
   */
  getOrdersByRoute: (routeId) => api.get(`/api/v1/orders/route/${routeId}`),

  /**
   * Saves Proof of Delivery (POD) for an order.
   * @param {string|number} orderId 
   * @param {Object} payload 
   * @returns {Promise<Object>}
   */
  savePOD: (orderId, payload) => api.post(`/api/v1/orders/${orderId}/pod`, payload),
};

export default OrdersAPI;