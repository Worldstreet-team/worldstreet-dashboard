
# GlobalPay Integration Guide for Next.js

## 📌 Overview
Seamlessly integrate **GlobalPay** payment processing into your Next.js application using their secure APIs. This guide covers:
- Authentication & Base URL setup  
- Generating payment links  
- Handling redirects & webhooks  
- Requerying transactions  

---

## 🔑 Base URL & Authentication
All API requests must be sent to the **Base URL**:

```
https://paygw.globalpay.com.ng/globalpay-paymentgateway/api
```

### Headers
Include your **public API key** in the request headers:

```http
apiKey: YOUR_PUBLIC_KEY
```

Other required headers:
```http
Content-Type: application/json
language: en
```

---

## 💳 Generate Payment Link
**Endpoint:**  
```
POST /paymentgateway/generate-payment-link
```

**Description:**  
Creates a checkout URL for customers to complete payments.

### Request Example (Next.js API Route)
```javascript
// pages/api/create-payment-link.js
export default async function handler(req, res) {
  const response = await fetch(
    "https://paygw.globalpay.com.ng/globalpay-paymentgateway/api/paymentgateway/generate-payment-link",
    {
      method: "POST",
      headers: {
        "apiKey": process.env.GLOBALPAY_API_KEY,
        "Content-Type": "application/json",
        "language": "en"
      },
      body: JSON.stringify({
        amount: 100,
        merchantTransactionReference: "txn_12345",
        redirectUrl: "https://yourapp.com/payment-success",
        customer: {
          firstName: "John",
          lastName: "Doe",
          currency: "NGN",
          phoneNumber: "08123456789",
          address: "Lagos, Nigeria",
          emailAddress: "john@example.com"
        }
      })
    }
  );

  const data = await response.json();
  res.status(200).json(data);
}
```

### Sample Response
```json
{
  "isSuccessful": true,
  "data": {
    "checkoutUrl": "https://checkout.globalpay.ng/pay?txnRef=552305106709XXXX",
    "transactionReference": "552305106709XXXX",
    "merchantCurrencies": ["NGN"]
  },
  "successMessage": "Request was successful",
  "responseCode": "0000"
}
```

---

## 🔄 Requery Transaction
**Endpoint:**  
```
POST /paymentgateway/query-single-transaction/{transref}
```

**Description:**  
Retrieve transaction details using the **GlobalPay reference**.  
⚠️ Must be called from your **backend only** to avoid exposing your secret key.

### Example (Next.js API Route)
```javascript
// pages/api/requery-transaction.js
export default async function handler(req, res) {
  const { transRef } = req.query;

  const response = await fetch(
    `https://paygw.globalpay.com.ng/globalpay-paymentgateway/api/paymentgateway/query-single-transaction/${transRef}`,
    {
      method: "POST",
      headers: {
        "apiKey": process.env.GLOBALPAY_API_KEY
      }
    }
  );

  const data = await response.json();
  res.status(200).json(data);
}
```

### Sample Response
```json
{
  "isSuccessful": true,
  "data": {
    "amountPaid": 100.00,
    "transactionStatus": "Failed",
    "transactionDate": "2025-01-02T11:56:47.64",
    "customerName": "Jerry Lisa",
    "currency": "NGN"
  },
  "successMessage": "Transaction retrieved",
  "responseCode": "0000"
}
```

---


---

## ✅ Best Practices
- Always store your **API key** in environment variables (`.env.local`).  
- Use **Next.js API routes** for server-side calls (never expose keys in frontend).  
- Implement **webhooks** for real-time payment confirmation.  
- Use **Requery** as a fallback to confirm payment status.  

---

## 📂 Suggested Project Structure
```
/pages
  /api
    create-payment-link.js
    requery-transaction.js
/webhooks
  payment.js
.env.local
```
```

---

Would you like me to extend this with a **sequence diagram (Mermaid.js)** showing the flow from frontend → backend → GlobalPay → webhook → confirmation? That would make the integration steps visually clear.
