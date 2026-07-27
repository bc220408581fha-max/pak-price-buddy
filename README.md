# 🛒 AI Price Tracker — Crowdsourced Grocery Price Tracker for Pakistan

## 📌 Overview

**AI Price Tracker** is a web app designed to help Pakistani households track and compare grocery prices across different stores and cities.

With rising inflation, it’s difficult to know if you're paying a fair price for everyday items like rice, chicken, or cooking oil. This app solves that problem by building a **community-driven (crowdsourced) price database** that anyone can use.

Users can also:

* Plan shopping within a **monthly budget**
* Build a **shopping list**
* Get **AI-powered recommendations** based on real market data

---

## Problem It Solves

* No reliable, real-time grocery price comparison in Pakistan
* Prices vary across cities and stores
* People rely on guesswork or word of mouth
* No budget-aware shopping tools

💡 **Solution:** A shared platform where users report prices and everyone benefits.

---

## 👥 Target Users

* Families
* Students
* Housewives
* Daily shoppers

Anyone who wants smarter, budget-friendly shopping decisions.

---

## 🌐 Live App

🔗 https://pak-price-buddy.lovable.app

👉 Open the link and start using instantly — no approval required.

### 🔑 Demo Account

* **Email:** [demo@pricetracker.com](mailto:demo@pricetracker.com)
* **Password:** PriceTracker@2026

Or sign up with your own email / Google account.

---

## 🚀 Features

### 🔐 Authentication

* Email + Password login
* Google Sign-in (Supabase Auth)
* Secure logout
* demo user

### Product Catalog

* Categories: Grocery, Dairy, Produce, Household
* Auto-categorization for new items

### 💰 Price Reporting

* Submit prices from real stores
* Includes: store name, city, price

### 📊 Price History

* View all reported prices
* Sorted by latest updates

### ✅ Data Validation

* “Still Accurate” feature
* Keeps crowdsourced data reliable

### 📈 Dashboard

* Monthly budget overview
* Shopping list cost estimate
* Budget usage progress bar
* Live feed of recent price reports

### 📝 Shopping List

* Add items with quantity
* Auto cost estimation using latest prices

### 💡 Budget Planner

* Set monthly spending limit
* Track overspending in real-time

### 🤖 AI Shopping Assistant

* Chat-based assistant
* Personalized recommendations
* Works with real user-submitted data
* Saves chat history

### 👤 User Profile

* Update name, email, and budget anytime

### 🔒 Security

* Row-Level Security (RLS) via Supabase
* Private data stays protected
* Public data = price reports only

---

## 🤖 AI Feature

### 💬 What It Does

The AI Shopping Assistant helps users make smarter decisions using:

* Shopping list
* Monthly budget
* Real-time price data

### 🧠 Capabilities

* Suggest cheapest stores
* Detect outdated prices
* Estimate total shopping cost
* Warn if over budget
* Suggest cost-cutting strategies

### 💡 Example Questions

* *“Where can I find the cheapest rice?”*
* *“Can I afford chicken this week?”*

---

## 🧾 System Prompt

```
You are a budget-conscious shopping assistant for users in Pakistan. 
You receive the user's shopping list, their monthly budget, and recent price data submitted by other users.

Recommend the cheapest reliable option per item, note if a price looks outdated (more than 30 days old), estimate the total cost, and clearly tell the user if they are over budget.

Respond in simple, friendly English, use PKR for currency, and be concise and practical like a helpful friend.
```

---

## 🛠️ Tech Stack

| Tool                   | Purpose                    |
| ---------------------- | -------------------------- |
| **Lovable**            | Full-stack AI app builder  |
| **Supabase**           | Auth + PostgreSQL database |
| **Lovable AI Gateway** | AI assistant backend       |
| **GitHub**             | Version control            |

---

## 📸 Screenshots

* Dashboard
* Products & Price Reports
* AI Assistant
* Login / Signup

*(Add images here later for better presentation)*

---

## ⚙️ How to Run Locally

### 1️⃣ Clone Repository

```bash
git clone https://github.com/bc220408581fha-max/pak-price-buddy.git
cd pak-price-buddy
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Setup Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
```

### 4️⃣ Run App

```bash
npm run dev
```

📌 Note:
For full AI functionality, connect your own Supabase + AI Gateway setup.

---

## 📂 Project Structure (Optional)

```
/src
  /components
  /pages
  /services
  /hooks
```

---

## ✨ Future Improvements

* Location-based price filtering
* Store rating system
* Price trend graphs
* Mobile app version

---

## 👩‍💻 Author

**Farwa Hassan**

🎓 Final Year Project — *Build & Ship Your Own AI App*

---

## ⭐ Support

If you like this project:

* ⭐ Star the repo
* 🍴 Fork it
* 🧠 Share ideas

---

## 📜 License

This project is for educational purposes.
